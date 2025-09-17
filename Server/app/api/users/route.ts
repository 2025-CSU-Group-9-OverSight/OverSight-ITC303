import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/types/types";
import getDb from "@/lib/getDb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

// GET /api/users - Get all users from database
export async function GET() {
  try {
    const db = await getDb();
    const usersCollection = db.collection("users");
    
    const users = await usersCollection.find({}, { projection: { password: 0 } }).toArray();
    
    return NextResponse.json(users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
    })));
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// PATCH /api/users - Update user role
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, role } = body as { id: string; name?: string; role?: UserRole };
    
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    const db = await getDb();
    const usersCollection = db.collection("users");
    
    const updateData: any = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Return updated user
    const updatedUser = await usersCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );
    
    if (!updatedUser) {
      return NextResponse.json({ error: "User not found after update" }, { status: 404 });
    }
    
    return NextResponse.json({
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/users - Delete user from database
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body as { id: string };
    
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    const db = await getDb();
    const usersCollection = db.collection("users");
    
    const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role } = body as { 
      name: string; 
      email: string; 
      password: string; 
      role: UserRole 
    };
    
    if (!name || !email || !password || !role) {
      return NextResponse.json({ 
        error: "Name, email, password, and role are required" 
      }, { status: 400 });
    }
    
    const db = await getDb();
    const usersCollection = db.collection("users");
    
    // Check if user with email already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ 
        error: "User with this email already exists" 
      }, { status: 409 });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create new user
    const newUser = {
      _id: new ObjectId(),
      name,
      email,
      password: hashedPassword,
      role,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await usersCollection.insertOne(newUser);
    
    if (!result.insertedId) {
      return NextResponse.json({ 
        error: "Failed to create user" 
      }, { status: 500 });
    }
    
    // Return created user (without password)
    return NextResponse.json({
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt.toISOString().split('T')[0]
    }, { status: 201 });
    
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

// PUT /api/users - Reset user password
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, newPassword } = body as { id: string; newPassword?: string };
    
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    const db = await getDb();
    const usersCollection = db.collection("users");
    
    // Generate a default password if none provided
    const password = newPassword || "password123";
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: "Password reset successfully",
      newPassword: password // Return the new password for display
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}