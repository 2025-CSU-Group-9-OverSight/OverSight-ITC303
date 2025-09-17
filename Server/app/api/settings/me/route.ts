import { NextRequest, NextResponse } from "next/server";
import { mockSettingsByUserId } from "@/lib/mock";

export async function GET() {
  const data = mockSettingsByUserId["default"];
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  mockSettingsByUserId["default"] = { ...mockSettingsByUserId["default"], ...body };
  return NextResponse.json(mockSettingsByUserId["default"]);
}


