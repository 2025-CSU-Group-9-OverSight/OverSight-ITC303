import { URL } from 'node:url';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import next from 'next';
import { WebSocket, WebSocketServer } from 'ws';
import { Socket } from 'node:net';
import { inputData } from './lib/websocketDb.ts';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env', '.env.local'], quiet: true });                               // Import environment variables

const hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 3000;
const clients: Set<WebSocket> = new Set();                                                  // Set for websocket clients

const app = next({dev: process.env.NODE_ENV !== 'production', turbopack: true});            // Create the next app
const handle = app.getRequestHandler();

app.prepare().then(()=>{                                                                    // Start the next app

    const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {    // Custom http server
        handle(req, res);                                                                   // Pass normal http requests to next app
    });

    const wss = new WebSocketServer({ noServer: true}); // Above http server will handle upgrades

    wss.on('connection', (ws: WebSocket) => {

        /* TODO - Implement relay for live view clients */

        clients.add(ws);
        console.log('New client connected');

        ws.send('Connected');

        ws.on('message',(message: Buffer, isBinary: boolean) => {
            
            const text = message.toString();

            try {
                const data = JSON.parse(text);
                inputData(data);

                ws.send(`Received JSON with keys: ${Object.keys(data).join(", ")}`);
            } catch (err) {
                console.log("Non-JSON message:", text);
                ws.send(`Received text: ${text}`);
            }
        });

        ws.on('close',() => {
            clients.delete(ws);
            console.log('Client disconnected');
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

    // When the web server receives an upgrade request, hand it over to the websocket server
    server.on('upgrade',(req: IncomingMessage, socket: Socket, head: Buffer) => {
        const { pathname } = new URL(req.url || '', `http://${hostname}:${port}`);

        if (pathname === '/_next/webpack-hmr') {            //exception for next hot module reloading
            app.getUpgradeHandler()(req, socket, head);
        }

        if(pathname === '/api/ws') {
            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit('connection', ws, req);
            });
        }
    });

    // Start the web server    
    server.listen(port, () => {
      console.log(` ▲ Ready on http://${hostname}:${port}`);
    });
})
