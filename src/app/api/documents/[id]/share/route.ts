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

// PATCH /api/documents/[id]/share
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid document ID format" }, { status: 400 });
    }

    const body = await request.json();
    const {
      userId: bodyUserId,
      userEmail: bodyUserEmail,
      sharedWith,
      viewers,
      action,
      targetUserId,
      targetRole,
      generalAccess,
      generalAccessRole,
    } = body;
    const user = getEffectiveUser(
      request,
      bodyUserId,
      bodyUserEmail || request.headers.get("x-user-email")
    );

    if (!user) {
      return NextResponse.json(
        { error: "User ID is required for authorization" },
        { status: 400 }
      );
    }

    const doc = await DocumentModel.findById(id);

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Only owner can manage sharing permissions (matching ID or email)
    const userIdentifiersLower = user.identifiers.map((i) => i.toLowerCase());
    const docOwnerLower = (doc.ownerId || "").toLowerCase();
    const isOwner = userIdentifiersLower.includes(docOwnerLower);

    if (!isOwner) {
      return NextResponse.json(
        { error: "Access denied. Only the document owner can manage sharing permissions." },
        { status: 403 }
      );
    }

    const isTargetOwner = (target: string) => {
      const t = target.toLowerCase();
      return t === docOwnerLower || userIdentifiersLower.includes(t);
    };

    let hasShareUpdate = false;

    // 1. General access settings (Restricted vs Anyone with the link)
    if (generalAccess === "restricted" || generalAccess === "anyoneWithLink") {
      doc.generalAccess = generalAccess;
      hasShareUpdate = true;
    }

    if (generalAccessRole === "viewer" || generalAccessRole === "editor") {
      doc.generalAccessRole = generalAccessRole;
      hasShareUpdate = true;
    }

    // 2. Collaborators access list
    if (Array.isArray(sharedWith)) {
      // Direct replacement of shared list (filtering out owner and duplicates)
      doc.sharedWith = Array.from(new Set(sharedWith.filter((uid: string) => !isTargetOwner(uid))));
      if (Array.isArray(viewers)) {
        doc.viewers = Array.from(new Set(viewers.filter((uid: string) => !isTargetOwner(uid) && doc.sharedWith.includes(uid))));
      } else {
        // Retain existing viewers that are still in sharedWith
        doc.viewers = (doc.viewers || []).filter((uid: string) => doc.sharedWith.includes(uid));
      }
      hasShareUpdate = true;
    } else if (action && targetUserId) {
      if (action === "add") {
        if (!isTargetOwner(targetUserId) && !doc.sharedWith.includes(targetUserId)) {
          doc.sharedWith.push(targetUserId);
        }
        if (targetRole === "Viewer") {
          if (!doc.viewers) doc.viewers = [];
          if (!doc.viewers.includes(targetUserId)) doc.viewers.push(targetUserId);
        } else if (targetRole === "Editor") {
          doc.viewers = (doc.viewers || []).filter((uid: string) => uid !== targetUserId);
        }
        hasShareUpdate = true;
      } else if (action === "updateRole") {
        if (targetRole === "Viewer") {
          if (!doc.viewers) doc.viewers = [];
          if (!doc.viewers.includes(targetUserId)) doc.viewers.push(targetUserId);
        } else {
          doc.viewers = (doc.viewers || []).filter((uid: string) => uid !== targetUserId);
        }
        hasShareUpdate = true;
      } else if (action === "remove") {
        doc.sharedWith = doc.sharedWith.filter((uid: string) => uid !== targetUserId);
        doc.viewers = (doc.viewers || []).filter((uid: string) => uid !== targetUserId);
        hasShareUpdate = true;
      }
    }

    if (!hasShareUpdate) {
      return NextResponse.json(
        { error: "Invalid share payload: provide 'sharedWith' array, 'action', or 'generalAccess'" },
        { status: 400 }
      );
    }

    doc.updatedAt = new Date();
    await doc.save();

    return NextResponse.json(
      {
        message: "Sharing permissions updated successfully",
        documentId: doc._id,
        sharedWith: doc.sharedWith,
        viewers: doc.viewers || [],
        generalAccess: doc.generalAccess || "restricted",
        generalAccessRole: doc.generalAccessRole || "viewer",
        ownerId: doc.ownerId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`PATCH /api/documents/${params.id}/share error:`, error);
    return NextResponse.json(
      { error: "Failed to update sharing permissions", details: (error as Error).message },
      { status: 500 }
    );
  }
}
