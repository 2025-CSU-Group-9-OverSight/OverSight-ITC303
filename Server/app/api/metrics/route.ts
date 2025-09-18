import { NextResponse } from 'next/server';
import getDb from '@/lib/getDb';

// Get aggregated metrics for dashboard
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const deviceName = searchParams.get('deviceName');
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
        
        // Get latest logs for each device
        const pipeline = [
            { $match: query },
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: '$meta.deviceName',
                    latestLog: { $first: '$$ROOT' }
                }
            }
        ];
        
        const latestLogs = await performanceLog.aggregate(pipeline).toArray();
        
        // Calculate averages
        let totalCpu = 0;
        let totalMemory = 0;
        let totalDisk = 0;
        let deviceCount = 0;
        
        latestLogs.forEach(({ latestLog }) => {
            if (latestLog.cpu && latestLog.ram) {
                // Calculate average CPU usage from individual core percentages
                if (latestLog.cpu.percentUsed && Array.isArray(latestLog.cpu.percentUsed)) {
                    const avgCpu = latestLog.cpu.percentUsed.reduce((sum: number, core: number) => sum + core, 0) / latestLog.cpu.percentUsed.length;
                    totalCpu += avgCpu;
                }
                
                // Use ram.percentUsed directly
                totalMemory += latestLog.ram.percentUsed || 0;
                
                // Handle disk usage - check if disk data exists and has usage
                if (latestLog.disk && latestLog.disk.usage !== undefined) {
                    totalDisk += latestLog.disk.usage;
                } else {
                    // If no disk data, don't count this device for disk average
                    // This prevents division by zero and shows 0% when no disk data
                }
                
                deviceCount++;
            }
        });
        
        const metrics = {
            cpuUsage: deviceCount > 0 ? Math.round(totalCpu / deviceCount) : 0,
            memoryUsage: deviceCount > 0 ? Math.round(totalMemory / deviceCount) : 0,
            diskUsage: deviceCount > 0 ? Math.round(totalDisk / deviceCount) : 0,
            deviceCount,
            latestLogs: latestLogs.map(({ latestLog }) => ({
                deviceName: latestLog.meta.deviceName,
                timestamp: latestLog.timestamp,
                cpu: latestLog.cpu,
                ram: latestLog.ram,
                disk: latestLog.disk
            }))
        };
        
        return NextResponse.json(metrics);
    } catch (error) {
        console.error('Error fetching metrics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch metrics' },
            { status: 500 }
        );
    }
}
