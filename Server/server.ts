import { parse, URL } from 'node:url';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';

import next from 'next';
import { WebSocket, WebSocketServer } from 'ws';
import { Socket } from 'node:net';


const app = next({dev: process.env.NODE_ENV !== 'production', turbopack: true});
const handle = app.getRequestHandler();
const clients: Set<WebSocket> = new Set();  // Set for clients
const hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 3000;

app.prepare().then(()=>{                    // Start the next app

    // Handle normal http requests
    const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
        const myURL = new URL(req.url || '', 'https://localhost:3000/');
        handle(req, res);
    });

    const wss = new WebSocketServer({ noServer: true}); // Above http server will handle upgrades

    wss.on('connection', (ws: WebSocket) => {
        clients.add(ws);
        console.log('New client connected');

        ws.send('Connected');

        ws.on('message',(message: Buffer, isBinary: boolean) => {
            console.log(`New message received: ${message}`);
            ws.send(`Recieved: ${message}`);
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
        const myURL = new URL(req.url || '', 'https://localhost:3000/');

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
