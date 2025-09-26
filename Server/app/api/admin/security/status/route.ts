import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { authOptions } from '@/lib/authOptions';

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const projectRoot = path.resolve(process.cwd(), '..');
    const sslKeyPath = process.env.SSL_KEY_PATH;
    const sslCertPath = process.env.SSL_CERT_PATH;
    const wsToken = process.env.WS_BEARER_TOKEN;

    let certificateInfo = null;

    // Check SSL certificate status
    if (sslCertPath && sslKeyPath) {
      try {
        // Get certificate expiration date
        const certContent = readFileSync(sslCertPath, 'utf8');
        const expiryOutput = execSync(`openssl x509 -in "${sslCertPath}" -enddate -noout`, { encoding: 'utf8' });
        const expiryDateStr = expiryOutput.split('=')[1].trim();
        const expiryDate = new Date(expiryDateStr);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Get certificate subject info
        const subjectOutput = execSync(`openssl x509 -in "${sslCertPath}" -subject -noout`, { encoding: 'utf8' });
        const subject = subjectOutput.replace('subject=', '').trim();

        certificateInfo = {
          exists: true,
          expiryDate: expiryDate.toISOString(),
          daysUntilExpiry,
          subject,
          keyPath: sslKeyPath,
          certPath: sslCertPath,
          status: daysUntilExpiry < 0 ? 'expired' : 
                  daysUntilExpiry < 30 ? 'warning' : 'healthy'
        };
      } catch (error) {
        certificateInfo = {
          exists: false,
          error: 'Certificate file not found or invalid',
          keyPath: sslKeyPath,
          certPath: sslCertPath,
          status: 'error'
        };
      }
    } else {
      certificateInfo = {
        exists: false,
        error: 'SSL not configured (USE_HTTPS=false)',
        status: 'disabled'
      };
    }

    // WebSocket token info (include actual token for admin UI)
    const tokenInfo = {
      configured: !!wsToken,
      length: wsToken ? wsToken.length : 0,
      token: wsToken || null,
      lastRotated: null, // TODO: Could store this in database
      status: wsToken ? 'configured' : 'missing'
    };

    // NextAuth secret info
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    const nextAuthInfo = {
      configured: !!nextAuthSecret,
      length: nextAuthSecret ? nextAuthSecret.length : 0,
      secret: nextAuthSecret || null,
      status: nextAuthSecret ? 'configured' : 'missing'
    };

    // System security status
    const httpsEnabled = process.env.USE_HTTPS === 'true';
    const hostname = process.env.HOSTNAME || 'localhost';
    const port = process.env.PORT || (process.env.NODE_ENV === 'production' ? (httpsEnabled ? 443 : 80) : 3000);
    
    const securityStatus = {
      httpsEnabled,
      nodeEnv: process.env.NODE_ENV,
      hostname,
      port,
      websocketUri: `${httpsEnabled ? 'wss' : 'ws'}://${hostname}${port == (httpsEnabled ? 443 : 80) ? '' : `:${port}`}/api/ws/monitoring`
    };

    return NextResponse.json({
      certificate: certificateInfo,
      websocketToken: tokenInfo,
      nextAuthSecret: nextAuthInfo,
      system: securityStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking security status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
