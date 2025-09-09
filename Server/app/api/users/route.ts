import { NextRequest, NextResponse } from "next/server";
import { mockUsers } from "@/lib/mock";
import { UserRole } from "@/types/types";

export async function GET() {
  return NextResponse.json(mockUsers);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, role } = body as { id: string; name?: string; role?: UserRole };
  const u = mockUsers.find(x => x.id === id);
  if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (name) u.name = name;
  if (role) u.role = role;
  return NextResponse.json(u);
}

import { NextResponse } from 'next/server';

export async function GET() { }



// Get all users        
// Get specific user    userId
// Create user          data
// Delete user          userId
// Update user          userId  data