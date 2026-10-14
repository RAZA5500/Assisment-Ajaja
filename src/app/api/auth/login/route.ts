import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, SeededUserProfile } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import UserModel from "@/models/User";

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required to sign in" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check in-memory store & seeded profiles
    let user: SeededUserProfile | undefined = findUserByEmail(normalizedEmail);

    // 2. Check MongoDB if not found in memory
    if (!user) {
      try {
        await connectToDatabase();
        const dbUser = await UserModel.findOne({ email: normalizedEmail }).lean();
        if (dbUser) {
          user = {
            id: dbUser._id.toString(),
            name: dbUser.name,
            email: dbUser.email,
            avatarColor: dbUser.avatarColor,
            initials: dbUser.initials,
            roleTitle: dbUser.roleTitle || "Member",
            password: dbUser.password,
          };
        }
      } catch {
        // DB error ignored
      }
    }

    // 3. Reject unregistered accounts (Guest sign-in is disabled)
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email. Please sign up first." },
        { status: 401 }
      );
    }

    // 4. Password validation
    if (!password || typeof password !== "string" || !password.trim()) {
      return NextResponse.json(
        { error: "Password is required to sign in" },
        { status: 400 }
      );
    }

    if (user.password && user.password !== password) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 401 }
      );
    }

    // Prepare safe user object (omit password)
    const safeUser = { ...user };
    delete safeUser.password;

    const response = NextResponse.json(
      {
        success: true,
        message: `Welcome back, ${safeUser.name}!`,
        user: safeUser,
      },
      { status: 200 }
    );

    // Set cookie for session persistence (7 days)
    response.cookies.set({
      name: "ajaia_session_user",
      value: JSON.stringify(safeUser),
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Auth login error:", error);
    return NextResponse.json(
      { error: "Failed to authenticate", details: (error as Error).message },
      { status: 500 }
    );
  }
}
