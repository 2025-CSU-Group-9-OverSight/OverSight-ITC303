import { URL } from 'node:url';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import next from 'next';
import { WebSocket, WebSocketServer } from 'ws';
import { Socket } from 'node:net';
import { inputData } from './lib/websocketDb.ts';
import dotenv from 'dotenv';

class WebSocket2 extends WebSocket {
  subscriptions?: Set<string>;
}

dotenv.config({ path: ['.env', '.env.local'], quiet: true });                               // Import environment variables

const hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 3000;
const liveviewSubscriptions = new Map<string, Set<WebSocket2>>();

const app = next({dev: process.env.NODE_ENV !== 'production', turbopack: true});            // Create the next app
const handle = app.getRequestHandler();

app.prepare().then(()=>{                                                                    // Start the next app

    const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {    // Custom http server
        handle(req, res);                                                                   // Pass normal http requests to next app
    });

    const wss = new WebSocketServer({ noServer: true});

    wss.on('connection', (ws: WebSocket2, req: IncomingMessage) => {

        const { pathname } = new URL(req.url || '', `http://${hostname}:${port}`);
        switch (pathname) {
            case '/api/ws/monitoring':  console.log('New monitoring client connected'); break;
            case '/api/ws/liveview':    console.log('New live view client connected');  break;
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
                    ws.send(`Received JSON with keys: ${Object.keys(data).join(", ")}`);
                    break;
                case '/api/ws/liveview':
                    if(data.type === 'subscribe' && data.deviceName) {
                       subscribe(ws, data.deviceName);
                    }
                    if(data.type === 'unsubscribe' && data.deviceName) {
                        unsubscribe(ws, data.deviceName);
                    }
                    ws.send(`Received JSON with keys: ${Object.keys(data).join(", ")}`);
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
        }

        if(['/api/ws/monitoring','/api/ws/liveview'].includes(pathname)) {
            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit('connection', ws, req);
            });
        }
    });
      
    server.listen(port, () => {                                                             // Start the web server  
      console.log(` ▲ Ready on http://${hostname}:${port}`);
    });
})

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
        let dataString = data.toString();
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