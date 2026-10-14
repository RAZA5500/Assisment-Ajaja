import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import { getEffectiveUser } from "@/lib/auth";
import { generatePdfFromHtml } from "@/lib/pdf";

interface RouteParams {
  params: {
    id: string;
  };
}

function sanitizeFilename(name: string): string {
  return (name || "document")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .trim()
    .slice(0, 100) || "document";
}

async function handleExportPdf(request: NextRequest, id: string, bodyContent?: { html?: string; title?: string }) {
  await connectToDatabase();

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

  // Check access permissions:
  // Public access
  const isPublicLink = doc.generalAccess === "anyoneWithLink";
  if (!isPublicLink) {
    if (!user) {
      return NextResponse.json(
        { error: "User authentication required to export this document" },
        { status: 401 }
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

    if (!isOwner && !isShared && !isViewer) {
      return NextResponse.json(
        { error: "Access denied. You do not have permission to export this document." },
        { status: 403 }
      );
    }
  }

  const contentToExport = bodyContent?.html !== undefined ? bodyContent.html : (doc.content || "");
  const titleToExport = bodyContent?.title !== undefined ? bodyContent.title : (doc.title || "Untitled Document");

  try {
    const pdfBuffer = await generatePdfFromHtml(contentToExport, {
      title: titleToExport,
      format: "A4",
      headerFooter: true,
    });

    const filename = sanitizeFilename(titleToExport);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}.pdf`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (pdfErr) {
    console.error("PDF generation failure:", pdfErr);
    return NextResponse.json(
      {
        error: "Failed to generate PDF document with headless browser",
        fallback: true,
        details: (pdfErr as Error).message,
      },
      { status: 500 }
    );
  }
}

// GET /api/documents/[id]/export/pdf
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    return await handleExportPdf(request, params.id);
  } catch (error) {
    console.error(`GET /api/documents/${params.id}/export/pdf error:`, error);
    return NextResponse.json(
      { error: "Internal export server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/documents/[id]/export/pdf (with optional latest live HTML body)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    let body: { html?: string; title?: string } | undefined;
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    return await handleExportPdf(request, params.id, body);
  } catch (error) {
    console.error(`POST /api/documents/${params.id}/export/pdf error:`, error);
    return NextResponse.json(
      { error: "Internal export server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
