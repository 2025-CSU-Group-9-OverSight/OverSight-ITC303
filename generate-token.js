#!/usr/bin/env node

/**
 * Generate secure tokens for OverSight authentication
 * Usage: 
 *   node generate-token.js [type] [length]
 *   node generate-token.js ws [32]     - Generate WebSocket bearer token
 *   node generate-token.js nextauth   - Generate NextAuth secret
 *   node generate-token.js all        - Generate both tokens
 */

const crypto = require('crypto');

const args = process.argv.slice(2);
const type = args[0] || 'ws';
const length = parseInt(args[1]) || 32;

function generateToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
}

function generateBase64Token(bytes = 32) {
    return crypto.randomBytes(bytes).toString('base64url');
}

function showTokenDetails(tokenName, token, bytes, description) {
    console.log(`🔐 Generated ${tokenName}:`);
    console.log('');
    console.log(token);
    console.log('');
    console.log(`📋 ${description}`);
    console.log('');
    console.log(`📊 Token Details:`);
    console.log(`- Length: ${bytes} bytes (${token.split('=')[1].length} characters)`);
    console.log(`- Entropy: ${bytes * 8} bits`);
    console.log(`- Generated: ${new Date().toISOString()}`);
    console.log('');
}

function generateWebSocketToken() {
    if (length < 16) {
        console.error('❌ Token length must be at least 16 bytes for security');
        process.exit(1);
    }

    const token = generateToken(length);
    const envVar = `WS_BEARER_TOKEN=${token}`;

    showTokenDetails('WebSocket Bearer Token', envVar, length, 'Add this to your .env files:');
    
    console.log('Server (.env.local):');
    console.log(`WS_BEARER_TOKEN=${token}`);
    console.log('');
    console.log('Monitoring Script (.env):');
    console.log(`WS_BEARER_TOKEN=${token}`);
    console.log('');
    console.log('⚠️  Security Notes:');
    console.log('- Keep this token secure and private');
    console.log('- Never commit it to version control');
    console.log('- Rotate tokens regularly in production');
    console.log('- Use different tokens for different environments');
}

function generateNextAuthSecret() {
    // NextAuth recommends at least 32 bytes for production
    const token = generateBase64Token(32);
    const envVar = `NEXTAUTH_SECRET=${token}`;

    showTokenDetails('NextAuth Secret', envVar, 32, 'Add this to your Server/.env.local file:');
    
    console.log('Server (.env.local):');
    console.log(`NEXTAUTH_SECRET=${token}`);
    console.log('');
    console.log('⚠️  NextAuth Security Notes:');
    console.log('- This secret is used to encrypt JWT tokens and session data');
    console.log('- Keep this secret secure and never expose it publicly');
    console.log('- Use different secrets for different environments');
    console.log('- Changing this secret will invalidate all existing sessions');
}

function generateAllTokens() {
    const wsToken = generateToken(32);
    const nextAuthSecret = generateBase64Token(32);

    console.log('🔐 Generated All Authentication Tokens:');
    console.log('');
    console.log('📋 Complete .env.local configuration for Server:');
    console.log('');
    console.log(`# WebSocket Authentication`);
    console.log(`WS_BEARER_TOKEN=${wsToken}`);
    console.log('');
    console.log(`# NextAuth Secret`);
    console.log(`NEXTAUTH_SECRET=${nextAuthSecret}`);
    console.log('');
    console.log('📋 MonitoringScript/config.json configuration:');
    console.log('');
    console.log(`{`);
    console.log(`    "uri": "wss://your-hostname:3000/api/ws/monitoring",`);
    console.log(`    "connection_attempts": 20,`);
    console.log(`    "ping_interval": 20,`);
    console.log(`    "ping_timeout": 20,`);
    console.log(`    "bearer_token": "${wsToken}"`);
    console.log(`}`);
    console.log('');
    console.log('⚠️  Security Checklist:');
    console.log('✅ Copy WebSocket token to Server/.env.local and MonitoringScript/config.json');
    console.log('✅ Copy NextAuth secret to Server/.env.local only');
    console.log('✅ Never commit these tokens to version control');
    console.log('✅ Use different tokens for different environments');
    console.log('✅ Rotate tokens regularly in production');
    console.log('');
    console.log(`📊 Generation Details:`);
    console.log(`- WebSocket Token: 32 bytes (${wsToken.length} hex characters, 256-bit entropy)`);
    console.log(`- NextAuth Secret: 32 bytes (${nextAuthSecret.length} base64url characters, 256-bit entropy)`);
    console.log(`- Generated: ${new Date().toISOString()}`);
}

function showUsage() {
    console.log('🔧 OverSight Token Generator');
    console.log('');
    console.log('Usage:');
    console.log('  node generate-token.js [type] [options]');
    console.log('');
    console.log('Types:');
    console.log('  ws, websocket     Generate WebSocket bearer token (default)');
    console.log('  nextauth, auth    Generate NextAuth secret');
    console.log('  all, both         Generate both tokens');
    console.log('  help, --help      Show this help');
    console.log('');
    console.log('Options:');
    console.log('  [length]          Token length in bytes (default: 32, min: 16)');
    console.log('');
    console.log('Examples:');
    console.log('  node generate-token.js                 # WebSocket token (32 bytes)');
    console.log('  node generate-token.js ws 64           # WebSocket token (64 bytes)');
    console.log('  node generate-token.js nextauth        # NextAuth secret');
    console.log('  node generate-token.js all             # Both tokens');
    console.log('');
    console.log('Makefile shortcuts:');
    console.log('  make generate-token                    # WebSocket token');
    console.log('  make generate-nextauth                 # NextAuth secret');
    console.log('  make generate-all-tokens               # Both tokens');
}

// Main execution
switch (type.toLowerCase()) {
    case 'ws':
    case 'websocket':
        generateWebSocketToken();
        break;
    case 'nextauth':
    case 'auth':
        generateNextAuthSecret();
        break;
    case 'all':
    case 'both':
        generateAllTokens();
        break;
    case 'help':
    case '--help':
    case '-h':
        showUsage();
        break;
    default:
        console.error(`❌ Unknown token type: ${type}`);
        console.error('Use "node generate-token.js help" to see available options');
        process.exit(1);
}
