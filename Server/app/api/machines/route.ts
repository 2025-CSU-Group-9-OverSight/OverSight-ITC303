import { NextResponse } from 'next/server';
import getDb from '@/lib/getDb';

// Get list of available machines from performanceLog collection
export async function GET() {
    try {
        const db = await getDb();
        const performanceLog = db.collection('performanceLog');
        
        // Get distinct device names from the meta field
        const machines = await performanceLog.distinct('meta.deviceName');
        
        return NextResponse.json({ machines });
    } catch (error) {
        console.error('Error fetching machines:', error);
        return NextResponse.json(
            { error: 'Failed to fetch machines' },
            { status: 500 }
        );
    }
}
