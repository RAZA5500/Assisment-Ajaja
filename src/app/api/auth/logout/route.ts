import { NextResponse } from "next/server";

// POST /api/auth/logout
export async function POST() {
  const response = NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { status: 200 }
  );

  response.cookies.delete("ajaia_session_user");
  return response;
}
