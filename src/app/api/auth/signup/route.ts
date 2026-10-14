import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmail,
  registerUser,
  getInitials,
  AVATAR_COLORS,
  SeededUserProfile,
} from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import UserModel from "@/models/User";

// POST /api/auth/signup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Validate inputs
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Full name must be at least 2 characters long." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Valid email address is required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // 1. Check in-memory / seeded users
    const existingInMemory = findUserByEmail(normalizedEmail);
    if (existingInMemory) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    // 2. Check MongoDB if connected
    try {
      await connectToDatabase();
      const existingInDb = await UserModel.findOne({ email: normalizedEmail }).lean();
      if (existingInDb) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in." },
          { status: 409 }
        );
      }
    } catch {
      // If MongoDB is offline, proceed with in-memory persistence
    }

    // Assign consistent avatar color based on name hash
    const colorIndex =
      Math.abs(
        name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
      ) % AVATAR_COLORS.length;
    const avatarColor = AVATAR_COLORS[colorIndex];
    const initials = getInitials(name);

    const newUser: SeededUserProfile = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: normalizedEmail,
      avatarColor,
      initials,
      roleTitle: "Member",
      password,
    };

    // Save in memory
    registerUser(newUser);

    // Save in MongoDB if available
    try {
      await UserModel.create({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        avatarColor: newUser.avatarColor,
        initials: newUser.initials,
        roleTitle: newUser.roleTitle,
      });
    } catch {
      // Ignored if DB unavailable
    }

    // Prepare response without password
    const safeUser = { ...newUser };
    delete safeUser.password;

    const response = NextResponse.json(
      {
        success: true,
        message: `Welcome to Ajaia Docs, ${newUser.name}!`,
        user: safeUser,
      },
      { status: 201 }
    );

    // Set authentication session cookie (7 days)
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
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account", details: (error as Error).message },
      { status: 500 }
    );
  }
}
