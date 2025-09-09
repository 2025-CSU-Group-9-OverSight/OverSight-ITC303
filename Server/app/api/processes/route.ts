import { NextRequest, NextResponse } from "next/server";
import { mockProcesses } from "@/lib/mock";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = (searchParams.get("search") || "").toLowerCase();
  const data = mockProcesses.filter(p => {
    const okStatus = !status || status === "all" || p.status === status;
    const okSearch = !search || `${p.name} ${p.host}`.toLowerCase().includes(search);
    return okStatus && okSearch;
  });
  return NextResponse.json(data);
}


