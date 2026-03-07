import { NextRequest, NextResponse } from "next/server";
import { searchFilms } from "@/lib/db";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ films: [] });
  const films = searchFilms(q.trim(), 10);
  return NextResponse.json({ films });
}
