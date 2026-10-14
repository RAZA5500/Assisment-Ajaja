import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import { getEffectiveUser, getEffectiveUserId, findUserByEmail } from "@/lib/auth";

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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const { title, content, ownerId, sharedWith, viewers, generalAccess, generalAccessRole } = body;

    if (title !== undefined && typeof title !== "string") {
      return NextResponse.json(
        { error: "Document title must be a string" },
        { status: 400 }
      );
    }

    if (content !== undefined && typeof content !== "string") {
      return NextResponse.json(
        { error: "Document content must be a string" },
        { status: 400 }
      );
    }

    const effectiveOwnerId = getEffectiveUserId(request, ownerId);

    if (!effectiveOwnerId) {
      return NextResponse.json(
        { error: "ownerId is required to create a document" },
        { status: 400 }
      );
    }

    const effectiveUser = getEffectiveUser(request, effectiveOwnerId);
    const ownerIdentifiersLower = (effectiveUser?.identifiers || [effectiveOwnerId]).map((i) => i.toLowerCase());

    const rawShared = Array.isArray(sharedWith) ? sharedWith : [];
    const rawViewers = Array.isArray(viewers) ? viewers : [];
    const allCollaborators = Array.from(new Set([...rawShared, ...rawViewers]));

    const sanitizedSharedWith = allCollaborators.filter(
      (id: unknown) =>
        typeof id === "string" &&
        id.trim() &&
        !ownerIdentifiersLower.includes(id.trim().toLowerCase())
    );

    const sharedIdentifiersLower = new Set<string>();
    sanitizedSharedWith.forEach((s: string) => {
      sharedIdentifiersLower.add(s.toLowerCase());
      const u = findUserByEmail(s);
      if (u) {
        sharedIdentifiersLower.add(u.id.toLowerCase());
        sharedIdentifiersLower.add(u.email.toLowerCase());
      }
    });

    const sanitizedViewers = Array.from(
      new Set(
        rawViewers.filter(
          (id: unknown) =>
            typeof id === "string" &&
            id.trim() &&
            !ownerIdentifiersLower.includes(id.trim().toLowerCase()) &&
            sharedIdentifiersLower.has(id.trim().toLowerCase())
        )
      )
    );

    const gaLower = typeof generalAccess === "string" ? generalAccess.toLowerCase().trim() : "";
    const garLower = typeof generalAccessRole === "string" ? generalAccessRole.toLowerCase().trim() : "";

    const newDoc = await DocumentModel.create({
      title: typeof title === "string" && title.trim() ? title.trim().slice(0, 200) : "Untitled Document",
      content: typeof content === "string" ? content : "<p>Start writing your document...</p>",
      ownerId: effectiveOwnerId,
      sharedWith: sanitizedSharedWith,
      viewers: sanitizedViewers,
      generalAccess: gaLower === "anyonewithlink" ? "anyoneWithLink" : "restricted",
      generalAccessRole: garLower === "editor" ? "editor" : "viewer",
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

