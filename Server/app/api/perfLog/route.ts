import { NextResponse } from 'next/server';
import getDb from '@/lib/getDb';

// Get all performance logs with optional filtering
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const deviceName = searchParams.get('deviceName');
        const limit = parseInt(searchParams.get('limit') || '100');
        const hours = parseInt(searchParams.get('hours') || '24');
        
        const db = await getDb();
        const performanceLog = db.collection('performanceLog');
        
        // Build query
        const query: any = {};
        if (deviceName && deviceName !== 'all') {
            query['meta.deviceName'] = deviceName;
        }
        
        // Add time range filter
        const timeFilter = new Date();
        timeFilter.setHours(timeFilter.getHours() - hours);
        query.timestamp = { $gte: timeFilter };
        
        const logs = await performanceLog
            .find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();
            
        return NextResponse.json({ logs });
    } catch (error) {
        console.error('Error fetching performance logs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch performance logs' },
            { status: 500 }
        );
    }
}