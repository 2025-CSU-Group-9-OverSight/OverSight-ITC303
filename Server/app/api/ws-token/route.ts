import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import crypto from 'node:crypto';

// Use the same token that the WebSocket server expects
const WS_BEARER_TOKEN = process.env.WS_BEARER_TOKEN || crypto.randomBytes(32).toString('hex');

export async function GET(req: NextRequest) {
  try {
    // Get the session to ensure user is authenticated
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return the WebSocket bearer token for authenticated users
    return NextResponse.json({
      token: WS_BEARER_TOKEN,
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
    });

  } catch (error) {
    console.error('Error generating WebSocket token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
