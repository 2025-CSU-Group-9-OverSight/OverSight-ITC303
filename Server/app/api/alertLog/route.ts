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
        const limit = parseInt(searchParams.get('limit') || '50');
        const page = parseInt(searchParams.get('page') || '1');
        const skip = (page - 1) * limit;

        const db = await getDb();
        const alertLog = db.collection('alertLog');

        // Build filter query - match database team's schema
        const filter: any = {};
        if (status) filter['meta.acknowledged'] = status === 'acknowledged';
        if (deviceName) filter['meta.deviceName'] = deviceName;

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

// POST /api/alertLog - Create a new alert (handled by database team)
export async function POST(request: Request) {
    return NextResponse.json(
        { message: 'Alert creation is handled by the database team' },
        { status: 501 }
    );
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

        // Handle status-specific timestamps - match database team's schema
        if (updateData.status === 'acknowledged') {
            updateFields['meta.acknowledged'] = true;
            updateFields.acknowledgedAt = new Date();
        } else if (updateData.status === 'resolved') {
            updateFields['meta.acknowledged'] = true;
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