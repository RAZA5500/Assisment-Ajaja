import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import { getEffectiveUser } from "@/lib/auth";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/documents/[id]?userId=...&userEmail=...
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid document ID format" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const user = getEffectiveUser(
      request,
      searchParams.get("userId"),
      searchParams.get("userEmail") || request.headers.get("x-user-email")
    );

    const doc = await DocumentModel.findById(id).lean();

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // 1. If document has General Access enabled ("anyoneWithLink"), allow public viewing
    const isPublicLink = doc.generalAccess === "anyoneWithLink";
    if (isPublicLink) {
      return NextResponse.json(doc, { status: 200 });
    }

    // 2. Restricted documents require authenticated user identity
    if (!user) {
      return NextResponse.json(
        { error: "User ID is required for access verification" },
        { status: 400 }
      );
    }

    // Access control check: user must be owner or in sharedWith (matching ID or email)
    const userIdentifiersLower = user.identifiers.map((i) => i.toLowerCase());
    const docOwnerLower = (doc.ownerId || "").toLowerCase();
    const isOwner = userIdentifiersLower.includes(docOwnerLower);

    const sharedWithList = Array.isArray(doc.sharedWith) ? doc.sharedWith : [];
    const isShared = sharedWithList.some((s: string) =>
      userIdentifiersLower.includes(s.toLowerCase())
    );

    if (!isOwner && !isShared) {
      return NextResponse.json(
        {
          error: "Access denied. You do not have permission to view this document.",
          documentOwnerId: doc.ownerId,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(doc, { status: 200 });
  } catch (error) {
    console.error(`GET /api/documents/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Failed to retrieve document", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PATCH /api/documents/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid document ID format" }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { title, content, userId: bodyUserId, userEmail: bodyUserEmail } = body;

    if (title !== undefined && typeof title !== "string") {
      return NextResponse.json({ error: "Document title must be a string" }, { status: 400 });
    }

    if (content !== undefined && typeof content !== "string") {
      return NextResponse.json({ error: "Document content must be a string" }, { status: 400 });
    }

    const user = getEffectiveUser(
      request,
      bodyUserId,
      bodyUserEmail || request.headers.get("x-user-email")
    );

    const doc = await DocumentModel.findById(id);

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const isPublicLink = doc.generalAccess === "anyoneWithLink";
    const isPublicEditor = isPublicLink && doc.generalAccessRole === "editor";

    // If document is public with Editor role, edits are allowed
    if (isPublicEditor) {
      if (title !== undefined) {
        doc.title = title.trim().slice(0, 200) || "Untitled Document";
      }

      if (content !== undefined) {
        doc.content = content;
      }
      doc.updatedAt = new Date();
      await doc.save();
      return NextResponse.json(doc, { status: 200 });
    }

    if (!user) {
      return NextResponse.json(
        { error: "User ID is required to update document" },
        { status: 400 }
      );
    }

    const userIdentifiersLower = user.identifiers.map((i) => i.toLowerCase());
    const docOwnerLower = (doc.ownerId || "").toLowerCase();
    const isOwner = userIdentifiersLower.includes(docOwnerLower);

    const sharedWithList = Array.isArray(doc.sharedWith) ? doc.sharedWith : [];
    const isShared = sharedWithList.some((s: string) =>
      userIdentifiersLower.includes(s.toLowerCase())
    );

    const viewersList = Array.isArray(doc.viewers) ? doc.viewers : [];
    const isViewer = viewersList.some((v: string) =>
      userIdentifiersLower.includes(v.toLowerCase())
    );

    if (!isOwner && !isShared) {
      return NextResponse.json(
        {
          error: "Access denied. You do not have permission to edit this document.",
        },
        { status: 403 }
      );
    }

    if ((!isOwner && isViewer) || (isPublicLink && !isOwner && !isShared && doc.generalAccessRole === "viewer")) {
      return NextResponse.json(
        {
          error: "Access denied. Viewers have read-only permissions on this document.",
        },
        { status: 403 }
      );
    }

    if (title !== undefined) {
      doc.title = title.trim().slice(0, 200) || "Untitled Document";
    }


    if (content !== undefined) {
      doc.content = content;
    }

    doc.updatedAt = new Date();
    await doc.save();

    return NextResponse.json(doc, { status: 200 });
  } catch (error) {
    console.error(`PATCH /api/documents/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Failed to update document", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid document ID format" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const user = getEffectiveUser(
      request,
      searchParams.get("userId"),
      searchParams.get("userEmail") || request.headers.get("x-user-email")
    );

    if (!user) {
      return NextResponse.json(
        { error: "User ID is required to delete document" },
        { status: 400 }
      );
    }

    const doc = await DocumentModel.findById(id);

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Only the owner can delete a document (matching ID or email)
    const userIdentifiersLower = user.identifiers.map((i) => i.toLowerCase());
    const docOwnerLower = (doc.ownerId || "").toLowerCase();
    const isOwner = userIdentifiersLower.includes(docOwnerLower);

    if (!isOwner) {
      return NextResponse.json(
        { error: "Access denied. Only the document owner can delete this document." },
        { status: 403 }
      );
    }

    await DocumentModel.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Document deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error(`DELETE /api/documents/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Failed to delete document", details: (error as Error).message },
      { status: 500 }
    );
  }
}
