const fetch = require('node-fetch');

async function getToken() {
    try {
        const response = await fetch('http://localhost:3000/api/ws-token');
        const data = await response.json();
        console.log('WebSocket Token:', data.token);
        return data.token;
    } catch (error) {
        console.log('Error getting token:', error.message);
        console.log('The server might not be running or the endpoint might require authentication.');
        return null;
    }
}

getToken();
