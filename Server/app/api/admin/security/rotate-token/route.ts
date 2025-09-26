import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import crypto from 'node:crypto';
import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { authOptions } from '@/lib/authOptions';

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { tokenType } = await req.json();

    if (!tokenType || !['websocket', 'nextauth', 'both'].includes(tokenType)) {
      return NextResponse.json(
        { error: 'Invalid token type. Must be: websocket, nextauth, or both' },
        { status: 400 }
      );
    }

    const projectRoot = path.resolve(process.cwd(), '..');
    const envPath = path.join(process.cwd(), '.env.local');
    
    // Generate new tokens
    const newWebSocketToken = crypto.randomBytes(32).toString('hex');
    const newNextAuthSecret = crypto.randomBytes(32).toString('base64url');

    let updatedTokens: any = {};

    try {
      // Read current .env.local file
      let envContent = '';
      try {
        envContent = readFileSync(envPath, 'utf8');
      } catch (error) {
        // If .env.local doesn't exist, create basic structure
        envContent = `# OverSight Environment Configuration
NODE_ENV=production
USE_HTTPS=true
`;
      }

      // Update tokens based on request
      if (tokenType === 'websocket' || tokenType === 'both') {
        // Update WebSocket token
        if (envContent.includes('WS_BEARER_TOKEN=')) {
          envContent = envContent.replace(
            /WS_BEARER_TOKEN=.*/,
            `WS_BEARER_TOKEN=${newWebSocketToken}`
          );
        } else {
          envContent += `\nWS_BEARER_TOKEN=${newWebSocketToken}\n`;
        }
        updatedTokens.websocketToken = {
          token: newWebSocketToken,
          length: newWebSocketToken.length
        };
      }

      if (tokenType === 'nextauth' || tokenType === 'both') {
        // Update NextAuth secret
        if (envContent.includes('NEXTAUTH_SECRET=')) {
          envContent = envContent.replace(
            /NEXTAUTH_SECRET=.*/,
            `NEXTAUTH_SECRET=${newNextAuthSecret}`
          );
        } else {
          envContent += `\nNEXTAUTH_SECRET=${newNextAuthSecret}\n`;
        }
        updatedTokens.nextauthSecret = {
          token: newNextAuthSecret,
          length: newNextAuthSecret.length
        };
      }

      // Write updated environment file
      writeFileSync(envPath, envContent);

      // Log the token rotation
      console.log(`🔄 Token rotation performed by ${session.user?.email}`);
      console.log(`   Type: ${tokenType}`);
      console.log(`   Timestamp: ${new Date().toISOString()}`);

      return NextResponse.json({
        success: true,
        message: `${tokenType} token(s) rotated successfully`,
        tokens: updatedTokens,
        timestamp: new Date().toISOString(),
        warning: 'Server restart required for changes to take effect'
      });

    } catch (error) {
      console.error('Error updating environment file:', error);
      return NextResponse.json(
        { error: 'Failed to update environment configuration' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error rotating tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
