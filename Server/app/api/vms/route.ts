import { NextRequest, NextResponse } from "next/server";
import { mockVms } from "@/lib/mock";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").toLowerCase();
  const data = mockVms.filter(v => !search || `${v.name} ${v.host}`.toLowerCase().includes(search));
  return NextResponse.json(data);
}


