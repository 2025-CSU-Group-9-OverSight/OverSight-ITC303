const WebSocket = require('ws');

// Test WebSocket connection with different tokens
const tokens = [
    'temp_token_for_testing_1234567890abcdef',
    'test_token_123',
    'default_token',
    'your_bearer_token_here'
];

async function testConnection(token) {
    return new Promise((resolve) => {
        console.log(`Testing with token: ${token}`);
        
        // Try with query parameter method
        const ws = new WebSocket(`ws://localhost:3000/api/ws/monitoring?token=${token}`);
        
        ws.on('open', () => {
            console.log(`✅ SUCCESS: Connected with token: ${token}`);
            ws.close();
            resolve(token);
        });
        
        ws.on('error', (error) => {
            console.log(`❌ FAILED: ${error.message}`);
            resolve(null);
        });
        
        ws.on('close', (code, reason) => {
            console.log(`Connection closed: ${code} - ${reason}`);
            resolve(null);
        });
        
        // Timeout after 3 seconds
        setTimeout(() => {
            ws.close();
            resolve(null);
        }, 3000);
    });
}

async function findWorkingToken() {
    for (const token of tokens) {
        const result = await testConnection(token);
        if (result) {
            console.log(`\n🎉 Found working token: ${result}`);
            return result;
        }
    }
    console.log('\n❌ No working token found. Check server logs for the actual token.');
    return null;
}

findWorkingToken();
