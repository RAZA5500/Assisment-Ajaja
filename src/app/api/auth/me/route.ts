import { NextRequest, NextResponse } from "next/server";
import { SEEDED_PROFILES } from "@/lib/auth";

// GET /api/auth/me
export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("ajaia_session_user");
  const userIdHeader = request.headers.get("x-user-id");

  if (sessionCookie?.value) {
    try {
      const user = JSON.parse(sessionCookie.value);
      return NextResponse.json({ user }, { status: 200 });
    } catch {
      // Cookie parsing error
    }
  }

  if (userIdHeader) {
    const user = SEEDED_PROFILES.find((u) => u.id === userIdHeader);
    if (user) {
      return NextResponse.json({ user }, { status: 200 });
    }
  }

  return NextResponse.json(
    { error: "Unauthenticated", user: null },
    { status: 401 }
  );
}
