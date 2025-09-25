import { NextResponse } from 'next/server';
import getDb from '@/lib/getDb';
import { AlertStatus } from '@/types/types';
import { ObjectId } from 'mongodb';

// GET /api/alertLog - Get all alerts with optional filtering
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const severity = searchParams.get('severity');
        const deviceName = searchParams.get('deviceName');
        const timeFilter = searchParams.get('timeFilter') || '7days'; // Default to last 7 days
        const limit = parseInt(searchParams.get('limit') || '50');
        const page = parseInt(searchParams.get('page') || '1');
        const skip = (page - 1) * limit;

        const db = await getDb();
        const alertLog = db.collection('alertLog');

        // Build time filter
        const now = new Date();
        let timeThreshold: Date;
        
        switch (timeFilter) {
            case '24hours':
                timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7days':
                timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30days':
                timeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'all':
                timeThreshold = new Date(0); // All time
                break;
            default:
                timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        // Build filter query - match database team's schema
        const filter: any = {
            timestamp: { $gte: timeThreshold }
        };
        
        if (status) {
            if (status === 'acknowledged') {
                filter['meta.acknowledged'] = true;
            } else if (status === 'unacknowledged') {
                filter['meta.acknowledged'] = { $ne: true };
            }
        }
        if (deviceName) filter['meta.deviceName'] = deviceName;

        // Get total count for pagination
        const totalCount = await alertLog.countDocuments(filter);

        // Get alerts with smart prioritization: unacknowledged first, then by timestamp
        const alerts = await alertLog
            .find(filter)
            .sort({ 
                'meta.acknowledged': 1,  // false (unacknowledged) first, then true (acknowledged)
                timestamp: -1            // Most recent first within each group
            })
            .skip(skip)
            .limit(limit)
            .toArray();

        // Process alerts for UI display with auto-archiving logic
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const alertsWithStatus = alerts.map(alert => {
            let currentStatus = alert.meta?.acknowledged ? 'acknowledged' : 'unacknowledged';
            
            // Auto-archive old acknowledged alerts (older than 30 days)
            if (alert.meta?.acknowledged && alert.timestamp < thirtyDaysAgo) {
                currentStatus = 'archived';
            }
            
            return {
                ...alert,
                currentStatus,
                acknowledgedAt: alert.acknowledgedAt || null
            };
        });

        return NextResponse.json({
            alerts: alertsWithStatus,
            pagination: {
                totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching alerts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch alerts' },
            { status: 500 }
        );
    }
}

// POST /api/alertLog - Create a new alert (handled by database team)
export async function POST(request: Request) {
    return NextResponse.json(
        { message: 'Alert creation is handled by the database team' },
        { status: 501 }
    );
}

// PUT /api/alertLog - Update an alert status (workaround for time-series collection)
export async function PUT(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const alertId = searchParams.get('id');
        
        if (!alertId) {
            return NextResponse.json(
                { error: 'Alert ID is required' },
                { status: 400 }
            );
        }

        const updateData = await request.json();
        const db = await getDb();
        const alertLog = db.collection('alertLog');
        
        // Now we can directly update the alertLog collection
        const updateFields: any = {
            'meta.acknowledged': updateData.status === 'acknowledged'
        };

        if (updateData.status === 'acknowledged') {
            updateFields.acknowledgedAt = new Date();
        }

        const result = await alertLog.updateOne(
            { _id: new ObjectId(alertId) },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { error: 'Alert not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'Alert status updated successfully'
        });

    } catch (error) {
        console.error('Error updating alert status:', error);
        return NextResponse.json(
            { error: 'Failed to update alert status' },
            { status: 500 }
        );
    }
}

// DELETE /api/alertLog - Delete an alert
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const alertId = searchParams.get('id');
        
        if (!alertId) {
            return NextResponse.json(
                { error: 'Alert ID is required' },
                { status: 400 }
            );
        }

        const db = await getDb();
        const alertLog = db.collection('alertLog');

        const result = await alertLog.deleteOne({ _id: new ObjectId(alertId) });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: 'Alert not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'Alert deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting alert:', error);
        return NextResponse.json(
            { error: 'Failed to delete alert' },
            { status: 500 }
        );
    }
}