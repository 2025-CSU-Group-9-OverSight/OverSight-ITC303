import { NextResponse } from "next/server";
import { mockProcesses } from "@/lib/mock";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const target = mockProcesses.find(p => p.id === params.id);
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
  target.status = "running";
  return NextResponse.json({ id: target.id, status: target.status });
}


