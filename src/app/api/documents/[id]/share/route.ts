import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import { getEffectiveUser, findUserByEmail } from "@/lib/auth";

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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const {
      userId: bodyUserId,
      userEmail: bodyUserEmail,
      sharedWith,
      viewers,
      action,
      targetUserId,
      targetRole,
      removeUserId,
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
    if (typeof generalAccess === "string") {
      const gaLower = generalAccess.toLowerCase().trim();
      if (gaLower === "restricted" || gaLower === "anyonewithlink") {
        doc.generalAccess = gaLower === "anyonewithlink" ? "anyoneWithLink" : "restricted";
        hasShareUpdate = true;
      }
    }

    if (typeof generalAccessRole === "string") {
      const garLower = generalAccessRole.toLowerCase().trim();
      if (garLower === "viewer" || garLower === "editor") {
        doc.generalAccessRole = garLower as "viewer" | "editor";
        hasShareUpdate = true;
      }
    }

    // Validate targetRole if provided
    if (targetRole !== undefined) {
      if (typeof targetRole !== "string" || !["viewer", "editor"].includes(targetRole.toLowerCase().trim())) {
        return NextResponse.json(
          { error: "Invalid targetRole: must be 'viewer' or 'editor'" },
          { status: 400 }
        );
      }
    }

    // 2. Collaborators access list
    if (Array.isArray(sharedWith)) {
      // Direct replacement of shared list (filtering out owner and duplicates)
      doc.sharedWith = Array.from(new Set(sharedWith.filter((uid: string) => typeof uid === "string" && uid.trim() && !isTargetOwner(uid))));

      const sharedIdentifiersLower = new Set<string>();
      doc.sharedWith.forEach((s: string) => {
        sharedIdentifiersLower.add(s.toLowerCase());
        const u = findUserByEmail(s);
        if (u) {
          sharedIdentifiersLower.add(u.id.toLowerCase());
          sharedIdentifiersLower.add(u.email.toLowerCase());
        }
      });

      if (Array.isArray(viewers)) {
        doc.viewers = Array.from(
          new Set(
            viewers.filter(
              (uid: string) =>
                typeof uid === "string" &&
                uid.trim() &&
                !isTargetOwner(uid) &&
                sharedIdentifiersLower.has(uid.toLowerCase())
            )
          )
        );
      } else {
        // Retain existing viewers that are still in sharedWith
        doc.viewers = (doc.viewers || []).filter((uid: string) =>
          sharedIdentifiersLower.has(uid.toLowerCase())
        );
      }
      hasShareUpdate = true;
    } else if (removeUserId || action === "remove") {
      const userToRemove = removeUserId || targetUserId;
      if (userToRemove && typeof userToRemove === "string") {
        const removeLower = userToRemove.toLowerCase().trim();
        const removeUser = findUserByEmail(userToRemove);
        const removeIds = new Set<string>([removeLower]);
        if (removeUser) {
          removeIds.add(removeUser.id.toLowerCase());
          removeIds.add(removeUser.email.toLowerCase());
        }
        doc.sharedWith = (doc.sharedWith || []).filter((uid: string) => !removeIds.has(uid.toLowerCase()));
        doc.viewers = (doc.viewers || []).filter((uid: string) => !removeIds.has(uid.toLowerCase()));
        hasShareUpdate = true;
      }
    } else if (targetUserId && (action || targetRole)) {
      if (typeof targetUserId !== "string" || !targetUserId.trim()) {
        return NextResponse.json({ error: "targetUserId must be a valid string" }, { status: 400 });
      }

      if (isTargetOwner(targetUserId)) {
        return NextResponse.json(
          { error: "Cannot modify permissions for the document owner" },
          { status: 400 }
        );
      }

      const targetLower = targetUserId.toLowerCase().trim();
      const isViewerRole = typeof targetRole === "string" && targetRole.toLowerCase().trim() === "viewer";
      const isEditorRole = typeof targetRole === "string" && targetRole.toLowerCase().trim() === "editor";

      if (action === "updateRole") {
        if (!isViewerRole && !isEditorRole) {
          return NextResponse.json(
            { error: "Role must be 'viewer' or 'editor'" },
            { status: 400 }
          );
        }
        if (!doc.sharedWith.some((uid: string) => uid.toLowerCase() === targetLower)) {
          doc.sharedWith.push(targetUserId);
        }
        if (!doc.viewers) doc.viewers = [];
        if (isViewerRole) {
          if (!doc.viewers.some((uid: string) => uid.toLowerCase() === targetLower)) {
            doc.viewers.push(targetUserId);
          }
        } else {
          doc.viewers = doc.viewers.filter((uid: string) => uid.toLowerCase() !== targetLower);
        }
        hasShareUpdate = true;
      } else {
        // "add" or implicit role assignment
        const alreadyShared = doc.sharedWith.some((uid: string) => uid.toLowerCase() === targetLower);
        if (!alreadyShared) {
          doc.sharedWith.push(targetUserId);
        }
        if (!doc.viewers) doc.viewers = [];
        if (isViewerRole) {
          if (!doc.viewers.some((uid: string) => uid.toLowerCase() === targetLower)) {
            doc.viewers.push(targetUserId);
          }
        } else if (isEditorRole) {
          doc.viewers = doc.viewers.filter((uid: string) => uid.toLowerCase() !== targetLower);
        }
        hasShareUpdate = true;
      }
    }

    if (!hasShareUpdate) {
      return NextResponse.json(
        { error: "Invalid share payload: provide 'sharedWith' array, 'action', 'removeUserId', or 'generalAccess'" },
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
