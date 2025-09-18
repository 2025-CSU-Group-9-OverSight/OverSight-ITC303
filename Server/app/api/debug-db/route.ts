import { NextResponse } from "next/server";
import getDb from "@/lib/getDb";

// GET /api/debug-db - Debug database connection
export async function GET() {
    try {
        const db = await getDb();
        const usersCollection = db.collection("users");
        
        // Get database stats
        const stats = await db.stats();
        const collections = await db.listCollections().toArray();
        const userCount = await usersCollection.countDocuments();
        
        return NextResponse.json({
            connection: {
                databaseName: db.databaseName,
                collectionName: usersCollection.collectionName,
                nodeEnv: process.env.NODE_ENV,
                mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/"
            },
            database: {
                name: stats.db,
                collections: collections.map(c => c.name),
                userCount: userCount
            },
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/"
            }
        });

    } catch (error) {
        console.error("Error debugging database:", error);
        return NextResponse.json(
            { error: "Failed to debug database", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
