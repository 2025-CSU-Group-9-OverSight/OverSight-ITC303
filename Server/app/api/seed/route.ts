import { NextResponse } from "next/server";
import getDb from "@/lib/getDb";
import { TEMPLATE_USERS } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

// POST /api/seed - Seed the database with template users
export async function POST() {
    try {
        const db = await getDb();
        const usersCollection = db.collection("users");
        
        // Debug: Log database and collection info
        console.log(`POST API Debug - Database name: ${db.databaseName}`);
        console.log(`POST API Debug - Collection name: ${usersCollection.collectionName}`);
        console.log(`POST API Debug - NODE_ENV: ${process.env.NODE_ENV}`);
        
        // Clear existing users
        await usersCollection.deleteMany({});
        console.log("Cleared existing users from database");
        
        // Hash passwords and prepare users for database
        const hashedUsers = await Promise.all(
            TEMPLATE_USERS.map(async (user) => ({
                _id: new ObjectId(user.id),
                name: user.name,
                email: user.email,
                password: await bcrypt.hash(user.password, 12),
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }))
        );
        
        // Insert users into database
        const result = await usersCollection.insertMany(hashedUsers);
        console.log(`Seeded database with ${result.insertedCount} users`);
        
        return NextResponse.json({
            message: `Successfully seeded database with ${result.insertedCount} users`,
            users: hashedUsers.map(user => ({
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }))
        });

    } catch (error) {
        console.error("Error seeding database:", error);
        return NextResponse.json(
            { error: "Failed to seed database" },
            { status: 500 }
        );
    }
}

// GET /api/seed - Check current users in database
export async function GET() {
    try {
        const db = await getDb();
        const usersCollection = db.collection("users");
        
        // Debug: Log database and collection info
        console.log(`API Debug - Database name: ${db.databaseName}`);
        console.log(`API Debug - Collection name: ${usersCollection.collectionName}`);
        console.log(`API Debug - NODE_ENV: ${process.env.NODE_ENV}`);
        
        const users = await usersCollection.find({}, { projection: { password: 0 } }).toArray();
        
        return NextResponse.json({
            message: `Found ${users.length} users in database`,
            database: db.databaseName,
            collection: usersCollection.collectionName,
            nodeEnv: process.env.NODE_ENV,
            users: users.map(user => ({
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }))
        });

    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}
