import { URL } from 'node:url';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { readFileSync } from 'node:fs';
import next from 'next';
import { WebSocket, WebSocketServer } from 'ws';
import { Socket } from 'node:net';
import { inputData } from './lib/websocketDb.ts';
import dotenv from 'dotenv';
import crypto from 'node:crypto';

class WebSocket2 extends WebSocket {
  subscriptions?: Set<string>;
}

dotenv.config({ path: ['.env', '.env.local'], quiet: true });                               // Import environment variables

const hostname = process.env.HOSTNAME || 'localhost';
const useHttps = process.env.USE_HTTPS === 'true';
const defaultPort = process.env.NODE_ENV === 'production' ? (useHttps ? 443 : 80) : 3000;
const port = process.env.PORT || defaultPort;
const sslKeyPath = process.env.SSL_KEY_PATH;
const sslCertPath = process.env.SSL_CERT_PATH;

// Bearer token configuration
const WS_BEARER_TOKEN = process.env.WS_BEARER_TOKEN || crypto.randomBytes(32).toString('hex');
if (!process.env.WS_BEARER_TOKEN) {
    console.warn(`⚠️  No WS_BEARER_TOKEN environment variable set. Generated token: ${WS_BEARER_TOKEN}`);
    console.warn(`⚠️  Please set WS_BEARER_TOKEN in your environment variables for production use.`);
}

// Log MongoDB configuration at startup
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/";
const database = process.env.NODE_ENV !== 'production' ? 'test' : 'oversight';
console.log(`🔧 Server Configuration:`);
console.log(`   Hostname: ${hostname}`);
console.log(`   Port: ${port}`);
console.log(`   HTTPS Enabled: ${useHttps}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   MongoDB URI: ${mongoUri}`);
console.log(`   Database: ${database}`);
console.log(`   WebSocket Authentication: Enabled`);
const liveviewSubscriptions = new Map<string, Set<WebSocket2>>();

const app = next({dev: process.env.NODE_ENV !== 'production', turbopack: true});            // Create the next app
const handle = app.getRequestHandler();

app.prepare().then(()=>{                                                                    // Start the next app

    let server: Server;
    
    if (useHttps && sslKeyPath && sslCertPath) {
        // Create HTTPS server for WSS support
        try {
            const serverOptions = {
                key: readFileSync(sslKeyPath),
                cert: readFileSync(sslCertPath)
            };
            server = createHttpsServer(serverOptions, (req: IncomingMessage, res: ServerResponse) => {
                handle(req, res);
            });
            console.log(`🔒 HTTPS server created with SSL certificates`);
        } catch (error) {
            console.error(`❌ Failed to load SSL certificates:`, error);
            console.log(`🔄 Falling back to HTTP server`);
            server = createServer((req: IncomingMessage, res: ServerResponse) => {
                handle(req, res);
            });
        }
    } else {
        // Create HTTP server
        server = createServer((req: IncomingMessage, res: ServerResponse) => {
            handle(req, res);
        });
        if (process.env.NODE_ENV === 'production') {
            console.warn(`⚠️  Running HTTP server in production. Consider enabling HTTPS with SSL certificates.`);
        }
    }

    const wss = new WebSocketServer({ noServer: true});

    wss.on('connection', (ws: WebSocket2, req: IncomingMessage) => {

        const { pathname } = new URL(req.url || '', `http://${hostname}:${port}`);
        
        // Validate authentication
        const isAuthenticated = validateBearerToken(req) || validateTokenFromQuery(req.url || '');
        
        if (!isAuthenticated) {
            console.log(`❌ Unauthorized WebSocket connection attempt to ${pathname}`);
            ws.close(1008, 'Unauthorized: Invalid or missing bearer token');
            return;
        }

        switch (pathname) {
            case '/api/ws/monitoring':  console.log('✅ New authenticated monitoring client connected'); break;
            case '/api/ws/liveview':    console.log('✅ New authenticated live view client connected');  break;
            default: break;
        } 

        ws.send('Connected');
       
        ws.on('message',(message: Buffer, isBinary: boolean) => {
            let data = parseData(message);
            if(!data) return;

            switch (pathname) {
                case '/api/ws/monitoring':
                    inputData(data);
                    relayData(data);
                    ws.send(`Data received ${data.timestamp}`);
                    break;
                case '/api/ws/liveview':
                    if(data.type === 'subscribe' && data.deviceName) {
                       subscribe(ws, data.deviceName);
                       ws.send(`Subscribed to ${data.deviceName}`);
                    }
                    if(data.type === 'unsubscribe' && data.deviceName) {
                        unsubscribe(ws, data.deviceName);
                        ws.send(`Unsubscribed from ${data.deviceName}`);
                    }
                    break;
                default:
                    break;
            }            
        });

        ws.on('close',() => {
            switch (pathname) {
                case '/api/ws/monitoring':
                    console.log('Monotoring Client disconnected');
                    //  TODO - Create alert
                    break;
                case '/api/ws/liveview':
                    let subscriptions = ws.subscriptions;               // Remove websocket from all subscriptions
                    if (subscriptions) {
                        for(const deviceName of subscriptions){
                            unsubscribe(ws, deviceName);
                        }
                    }
                    console.log('Live View Client disconnected');
                    break;
                default:
                    break;
            } 
        });

        ws.on('error',() => {
            console.log('WS: error');
        });

        ws.on('upgrade',() => {
            console.log('WS: upgrade');
        });

        ws.on('open',() => {
            console.log('WS: open');
        });

        ws.on('ping',() => {
            console.log('WS: ping');
        });

        ws.on('redirect',() => {
            console.log('WS: redirect');
        });

        ws.on('unexpected-response',() => {
            console.log('WS: unexpected-response');
        });

    });

    server.on('upgrade',(req: IncomingMessage, socket: Socket, head: Buffer) => {           // Hand over upgrade requests to the websocket server
        const { pathname } = new URL(req.url || '', `http://${hostname}:${port}`);

        if (pathname === '/_next/webpack-hmr') {                                            // Exception for next hot module reloading
            app.getUpgradeHandler()(req, socket, head);
            return;
        }

        if(['/api/ws/monitoring','/api/ws/liveview'].includes(pathname)) {
            // Validate authentication before upgrading connection
            const isAuthenticated = validateBearerToken(req) || validateTokenFromQuery(req.url || '');
            
            if (!isAuthenticated) {
                console.log(`❌ Unauthorized WebSocket upgrade attempt to ${pathname}`);
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit('connection', ws, req);
            });
        }
    });
      
    server.listen(port, () => {                                                             // Start the web server  
      console.log(` ▲ Ready on https://${hostname}:${port}`);
    });
})

/**
 * Validate bearer token from WebSocket request
 * @param req Incoming message request
 * @returns boolean indicating if token is valid
 */
function validateBearerToken(req: IncomingMessage): boolean {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    return token === WS_BEARER_TOKEN;
}

/**
 * Extract bearer token from URL query parameters (fallback method)
 * @param url Request URL
 * @returns boolean indicating if token is valid
 */
function validateTokenFromQuery(url: string): boolean {
    try {
        const urlObj = new URL(url, `http://${hostname}:${port}`);
        const token = urlObj.searchParams.get('token');
        return token === WS_BEARER_TOKEN;
    } catch {
        return false;
    }
}

/**
 * Convert buffer to json
 * @param message
 * @returns JSON object
 */
function parseData(message: Buffer) {
    let text = message.toString();
    try {
        return JSON.parse(text);
    } catch (err) {
        console.log("Non-JSON message:", text);
        return null;
    }
}

/**
 * Send monitoring data to subscribed live view clients
 * @param data
 */
function relayData(data: any) {
    let clients = liveviewSubscriptions.get(data.device.deviceName);
    if (clients) {
        let dataString = JSON.stringify(data);
        for(const client of clients){
            if (client.OPEN) {
                client.send(dataString);
            }
        }
    }
}

/**
 * Subscribe the live view client to a given device
 * @param ws Websocket connection 
 * @param deviceName Name of the device
 */
function subscribe(ws: WebSocket2, deviceName: string){
    if(!liveviewSubscriptions.has(deviceName)){             // Add the websocket to the devices list of clients
        liveviewSubscriptions.set(deviceName, new Set());
    }
    liveviewSubscriptions.get(deviceName)!.add(ws);

    if(!ws.subscriptions){                                  // Add the device name to the websockets list of subscriptions
        ws.subscriptions = new Set();
    }
    ws.subscriptions.add(deviceName);
}

/**
 * Unsubscribe the live view client from a given device
 * @param ws Websocket connection 
 * @param deviceName Name of the device
 */
function unsubscribe(ws: WebSocket2, deviceName: string){
    let clients = liveviewSubscriptions.get(deviceName);    // Remove the websocket from the devices list of clients
    if(clients) {
        clients.delete(ws);
        if(clients.size ===0) {
            liveviewSubscriptions.delete(deviceName);
        }
    }

    let subscriptions = ws.subscriptions;                   // Remove the device from the websockets list of subscriptions
    if(subscriptions) {
        subscriptions.delete(deviceName);
    }
}