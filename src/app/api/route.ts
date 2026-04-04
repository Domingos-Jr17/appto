import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "aptto-api",
    version: "3.1.0",
    docs: "/api/health",
  });
}