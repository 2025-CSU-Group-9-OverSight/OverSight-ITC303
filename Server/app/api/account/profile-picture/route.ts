import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import getDb from "@/lib/getDb";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

// POST /api/account/profile-picture - Upload profile picture
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession();
        
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("profilePicture") as File;
        
        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ 
                error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." 
            }, { status: 400 });
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json({ 
                error: "File too large. Maximum size is 5MB." 
            }, { status: 400 });
        }

        // Generate unique filename
        const fileExtension = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        
        // Create directory if it doesn't exist
        const uploadDir = join(process.cwd(), "public", "assets", "images", "profile-pictures");
        await mkdir(uploadDir, { recursive: true });
        
        // Save file
        const filePath = join(uploadDir, fileName);
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);
        
        // Update user in database
        const db = await getDb();
        const usersCollection = db.collection("users");
        
        const profilePictureUrl = `/assets/images/profile-pictures/${fileName}`;
        
        await usersCollection.updateOne(
            { email: session.user.email },
            { 
                $set: { 
                    profilePicture: profilePictureUrl,
                    updatedAt: new Date()
                }
            }
        );
        
        return NextResponse.json({ 
            message: "Profile picture uploaded successfully",
            profilePictureUrl 
        });
        
    } catch (error) {
        console.error("Error uploading profile picture:", error);
        return NextResponse.json(
            { error: "Failed to upload profile picture" },
            { status: 500 }
        );
    }
}

// DELETE /api/account/profile-picture - Remove profile picture
export async function DELETE() {
    try {
        const session = await getServerSession();
        
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = await getDb();
        const usersCollection = db.collection("users");
        
        // Remove profile picture from database
        await usersCollection.updateOne(
            { email: session.user.email },
            { 
                $unset: { profilePicture: "" },
                $set: { updatedAt: new Date() }
            }
        );
        
        return NextResponse.json({ 
            message: "Profile picture removed successfully" 
        });
        
    } catch (error) {
        console.error("Error removing profile picture:", error);
        return NextResponse.json(
            { error: "Failed to remove profile picture" },
            { status: 500 }
        );
    }
}