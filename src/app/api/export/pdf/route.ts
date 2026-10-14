import { NextRequest, NextResponse } from "next/server";
import { generatePdfFromHtml } from "@/lib/pdf";

function sanitizeFilename(name: string): string {
  return (name || "document")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .trim()
    .slice(0, 100) || "document";
}

// POST /api/export/pdf
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { html = "<p></p>", title = "Document" } = body;

    const pdfBuffer = await generatePdfFromHtml(html, {
      title,
      format: "A4",
      headerFooter: true,
    });

    const filename = sanitizeFilename(title);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}.pdf`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("POST /api/export/pdf error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF document",
        fallback: true,
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
