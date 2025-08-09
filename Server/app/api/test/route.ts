import { NextResponse } from 'next/server';
import getDb from '@/lib/getDb';

export async function GET() {
    let db = await getDb();                                 // Get the database connection
    let collection = db.collection('test');                 // Use the test collection/'table'

    let insertResult = await collection.insertOne({         // Insert data
        name: 'test',
        type: 'mongoDB native driver'
    });

    let docCount = await collection.countDocuments();

    return NextResponse.json({                              // Return result
        insertTest: insertResult,
        docCount:  docCount
    });
}