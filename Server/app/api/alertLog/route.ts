import { NextResponse } from 'next/server';
import getDb from '@/lib/getDb';
import { Alert, AlertStatus, AlertSeverity, AlertType } from '@/types/types';
import { ObjectId } from 'mongodb';

// GET /api/alertLog - Get all alerts with optional filtering
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') as AlertStatus;
        const severity = searchParams.get('severity') as AlertSeverity;
        const deviceName = searchParams.get('deviceName');
        const limit = parseInt(searchParams.get('limit') || '50');
        const page = parseInt(searchParams.get('page') || '1');
        const skip = (page - 1) * limit;

        const db = await getDb();
        const alertLog = db.collection('alertLog');

        // Build filter query
        const filter: any = {};
        if (status) filter.status = status;
        if (severity) filter.severity = severity;
        if (deviceName) filter.deviceName = deviceName;

        // Get total count for pagination
        const totalCount = await alertLog.countDocuments(filter);

        // Get alerts with pagination
        const alerts = await alertLog
            .find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        return NextResponse.json({
            alerts,
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

// POST /api/alertLog - Create a new alert
export async function POST(request: Request) {
    try {
        const alertData = await request.json();
        
        const db = await getDb();
        const alertLog = db.collection('alertLog');

        const newAlert: Omit<Alert, 'id'> = {
            ...alertData,
            id: new ObjectId().toString(),
            timestamp: new Date(),
            status: AlertStatus.ACTIVE
        };

        const result = await alertLog.insertOne(newAlert);

        return NextResponse.json({
            message: 'Alert created successfully',
            alert: { ...newAlert, _id: result.insertedId }
        });

    } catch (error) {
        console.error('Error creating alert:', error);
        return NextResponse.json(
            { error: 'Failed to create alert' },
            { status: 500 }
        );
    }
}

// PUT /api/alertLog - Update an alert
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

        // Add updated timestamp
        const updateFields = {
            ...updateData,
            updatedAt: new Date()
        };

        // Handle status-specific timestamps
        if (updateData.status === AlertStatus.ACKNOWLEDGED) {
            updateFields.acknowledgedAt = new Date();
        } else if (updateData.status === AlertStatus.RESOLVED) {
            updateFields.resolvedAt = new Date();
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
            message: 'Alert updated successfully'
        });

    } catch (error) {
        console.error('Error updating alert:', error);
        return NextResponse.json(
            { error: 'Failed to update alert' },
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