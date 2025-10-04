import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { execSync } from 'node:child_process';
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

    const { hostname } = await req.json();

    if (!hostname || typeof hostname !== 'string') {
      return NextResponse.json(
        { error: 'Hostname is required' },
        { status: 400 }
      );
    }

    const projectRoot = path.resolve(process.cwd(), '..');
    const sslDir = path.join(projectRoot, 'ssl');
    const keyPath = path.join(sslDir, 'key.pem');
    const certPath = path.join(sslDir, 'cert.pem');

    try {
      // Create SSL directory if it doesn't exist
      execSync(`mkdir -p "${sslDir}"`);

      // Generate new SSL certificate  
      const opensslCommand = `openssl req -x509 -newkey rsa:4096 -nodes -days 3650 ` +
        `-keyout "${keyPath}" -out "${certPath}" ` +
        `-subj "/CN=${hostname}/O=OverSight/C=AU" ` +
        `-addext "subjectAltName=DNS:${hostname},DNS:localhost,IP:127.0.0.1"`;

      execSync(opensslCommand);

      // Verify the certificate was created
      const certInfo = execSync(`openssl x509 -in "${certPath}" -subject -enddate -noout`, { encoding: 'utf8' });
      const lines = certInfo.split('\n');
      const subject = lines[0].replace('subject=', '').trim();
      const expiryDateStr = lines[1].split('=')[1].trim();
      const expiryDate = new Date(expiryDateStr);

      // Update environment file with new paths (if they changed)
      const envPath = path.join(process.cwd(), '.env.local');
      try {
        let envContent = readFileSync(envPath, 'utf8');
        
        // Update SSL paths
        if (envContent.includes('SSL_KEY_PATH=')) {
          envContent = envContent.replace(/SSL_KEY_PATH=.*/, `SSL_KEY_PATH=${keyPath}`);
        } else {
          envContent += `\nSSL_KEY_PATH=${keyPath}\n`;
        }
        
        if (envContent.includes('SSL_CERT_PATH=')) {
          envContent = envContent.replace(/SSL_CERT_PATH=.*/, `SSL_CERT_PATH=${certPath}`);
        } else {
          envContent += `\nSSL_CERT_PATH=${certPath}\n`;
        }

        // Ensure HTTPS is enabled
        if (envContent.includes('USE_HTTPS=')) {
          envContent = envContent.replace(/USE_HTTPS=.*/, 'USE_HTTPS=true');
        } else {
          envContent += `\nUSE_HTTPS=true\n`;
        }

        writeFileSync(envPath, envContent);
      } catch (error) {
        console.warn('Could not update .env.local file:', error);
      }

      // Log the certificate renewal
      console.log(`SSL certificate renewed by ${session.user?.email}`);
      console.log(`   Hostname: ${hostname}`);
      console.log(`   Expiry: ${expiryDate.toISOString()}`);
      console.log(`   Timestamp: ${new Date().toISOString()}`);

      return NextResponse.json({
        success: true,
        message: 'SSL certificate renewed successfully',
        certificate: {
          hostname,
          subject,
          expiryDate: expiryDate.toISOString(),
          keyPath,
          certPath,
          daysValid: 3650
        },
        timestamp: new Date().toISOString(),
        warning: 'Server restart required for new certificate to take effect'
      });

    } catch (error) {
      console.error('Error generating SSL certificate:', error);
      return NextResponse.json(
        { error: 'Failed to generate SSL certificate: ' + (error as Error).message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error renewing certificate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
