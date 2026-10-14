import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserFromRequest,
  findUserByEmail,
  SEEDED_PROFILES,
  REGISTERED_USERS,
} from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import UserModel from "@/models/User";

// GET /api/auth/me
export async function GET(request: NextRequest) {
  try {
    let user = getAuthenticatedUserFromRequest(request);

    // If user is not found, or is a header stub lacking profile info, verify against MongoDB
    const isStubUser = Boolean(user && !("name" in user && user.name));
    if (!user || isStubUser) {
      const userIdHeader = request.headers.get("x-user-id");
      const userEmailHeader = request.headers.get("x-user-email");
      if (userIdHeader || userEmailHeader) {
        try {
          await connectToDatabase();
          const query = userIdHeader
            ? {
                $or: [
                  { email: userIdHeader.toLowerCase() },
                  ...(userIdHeader.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: userIdHeader }] : []),
                ],
              }
            : { email: userEmailHeader!.toLowerCase() };
          const dbUser = await UserModel.findOne(query).lean();
          if (dbUser) {
            user = {
              id: dbUser._id.toString(),
              name: dbUser.name,
              email: dbUser.email,
              avatarColor: dbUser.avatarColor,
              initials: dbUser.initials,
              roleTitle: dbUser.roleTitle || "Member",
            };
          } else if (isStubUser) {
            // Unregistered / invalid user ID in header
            user = null;
          }
        } catch {
          if (isStubUser) {
            user = null;
          }
        }
      }
    }

    if (user) {
      const safeUser = { ...user } as Record<string, unknown>;
      delete safeUser.password;
      return NextResponse.json({ user: safeUser }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Unauthenticated", user: null },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to verify session", details: (error as Error).message },
      { status: 500 }
    );
  }
}

