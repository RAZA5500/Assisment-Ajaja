import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import { getEffectiveUser, getEffectiveUserId } from "@/lib/auth";

// GET /api/documents?userId=...&userEmail=...&filter=all|owned|shared&search=...
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const user = getEffectiveUser(
      request,
      searchParams.get("userId"),
      searchParams.get("userEmail") || request.headers.get("x-user-email")
    );
    const filter = searchParams.get("filter") || "all";
    const search = searchParams.get("search") || "";

    if (!user) {
      return NextResponse.json(
        { error: "User ID is required to fetch documents" },
        { status: 400 }
      );
    }

    const identifiers = user.identifiers;
    const query: Record<string, unknown> = {};

    if (filter === "owned") {
      query.ownerId = { $in: identifiers };
    } else if (filter === "shared") {
      query.sharedWith = { $in: identifiers };
    } else {
      // "all": either owned by the user OR shared with the user
      query.$or = [
        { ownerId: { $in: identifiers } },
        { sharedWith: { $in: identifiers } },
      ];
    }

    if (search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.title = { $regex: escapedSearch, $options: "i" };
    }

    const documents = await DocumentModel.find(query)
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(documents, { status: 200 });
  } catch (error) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/documents
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { title, content, ownerId, sharedWith } = body;

    const effectiveOwnerId = getEffectiveUserId(request, ownerId);

    if (!effectiveOwnerId) {
      return NextResponse.json(
        { error: "ownerId is required to create a document" },
        { status: 400 }
      );
    }

    const sanitizedSharedWith = Array.isArray(sharedWith)
      ? Array.from(
          new Set(
            sharedWith.filter(
              (id: unknown) => typeof id === "string" && id !== effectiveOwnerId
            )
          )
        )
      : [];

    const newDoc = await DocumentModel.create({
      title: title && title.trim() ? title.trim() : "Untitled Document",
      content: content ?? "<p>Start writing your document...</p>",
      ownerId: effectiveOwnerId,
      sharedWith: sanitizedSharedWith,
    });

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json(
      { error: "Failed to create document", details: (error as Error).message },
      { status: 500 }
    );
  }
}
