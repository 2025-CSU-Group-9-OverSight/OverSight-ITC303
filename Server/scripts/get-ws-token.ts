import { MongoClient } from 'mongodb';

async function getWebSocketToken() {
    // First, let's check if there's a WS_BEARER_TOKEN in environment
    const envToken = process.env.WS_BEARER_TOKEN;
    if (envToken) {
        console.log('WebSocket Token from environment:', envToken);
        return envToken;
    }

    // If not in environment, we need to get it from the server
    // Let's try to make a request to the ws-token endpoint
    try {
        const response = await fetch('http://localhost:3000/api/ws-token');
        if (response.ok) {
            const data = await response.json();
            console.log('WebSocket Token from API:', data.token);
            return data.token;
        } else {
            console.log('API returned status:', response.status);
            console.log('Response:', await response.text());
        }
    } catch (error) {
        console.log('Failed to get token from API:', error);
    }

    // If API fails, let's check the server code to see what the default token would be
    console.log('Could not get token from API. The server generates a random token on startup.');
    console.log('Check the server console output for the generated token.');
    console.log('Look for a line like: "Generated token: [hex string]"');
    
    return null;
}

getWebSocketToken();
