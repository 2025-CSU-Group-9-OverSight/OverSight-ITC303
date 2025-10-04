import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import getDb from '@/lib/getDb';
import { clearAlertSettingsCache } from '@/lib/websocketDb';

// GET - Fetch current alert thresholds
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const db = await getDb();
    const settingsCollection = db.collection('settings');
    
    // Get current alert settings
    const alertSettings = await settingsCollection.findOne({ type: 'alertSettings' });
    
    if (!alertSettings) {
      return NextResponse.json({ error: 'Alert settings not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      thresholds: {
        cpu: alertSettings.cpu || 85,
        ram: alertSettings.ram || 80,
        disk: alertSettings.disk || 95
      },
      timeout: alertSettings.timeout || 30
    });

  } catch (error) {
    console.error('Error fetching alert thresholds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert thresholds' },
      { status: 500 }
    );
  }
}

// PUT - Update alert thresholds
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { cpu, ram, disk, timeout } = body;

    // Validate input
    if (typeof cpu !== 'number' || cpu < 1 || cpu > 100) {
      return NextResponse.json({ error: 'CPU threshold must be between 1 and 100' }, { status: 400 });
    }
    if (typeof ram !== 'number' || ram < 1 || ram > 100) {
      return NextResponse.json({ error: 'RAM threshold must be between 1 and 100' }, { status: 400 });
    }
    if (typeof disk !== 'number' || disk < 1 || disk > 100) {
      return NextResponse.json({ error: 'Disk threshold must be between 1 and 100' }, { status: 400 });
    }
    if (typeof timeout !== 'number' || timeout < 5 || timeout > 300) {
      return NextResponse.json({ error: 'Timeout must be between 5 and 300 seconds' }, { status: 400 });
    }

    const db = await getDb();
    const settingsCollection = db.collection('settings');
    
    // Update alert settings
    const result = await settingsCollection.findOneAndUpdate(
      { type: 'alertSettings' },
      { 
        $set: { 
          cpu, 
          ram, 
          disk, 
          timeout,
          updatedAt: new Date(),
          updatedBy: session.user.email
        } 
      },
      { upsert: true, returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to update thresholds' }, { status: 500 });
    }

    // Clear cached alert settings to force refresh
    clearAlertSettingsCache();

    return NextResponse.json({
      success: true,
      message: 'Alert thresholds updated successfully',
      thresholds: {
        cpu,
        ram,
        disk,
        timeout
      }
    });

  } catch (error) {
    console.error('Error updating alert thresholds:', error);
    return NextResponse.json(
      { error: 'Failed to update alert thresholds' },
      { status: 500 }
    );
  }
}
