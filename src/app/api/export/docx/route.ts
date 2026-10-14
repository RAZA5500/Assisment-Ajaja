import { NextRequest, NextResponse } from "next/server";
import { generateDocxFromHtml } from "@/lib/docx";

function sanitizeFilename(name: string): string {
  return (name || "document")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .trim()
    .slice(0, 100) || "document";
}

// POST /api/export/docx
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { html = "<p></p>", title = "Document" } = body;

    const docxBuffer = await generateDocxFromHtml(html, {
      title,
    });

    const filename = sanitizeFilename(title);
    const asciiFilename = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, '\\"');
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${asciiFilename}.docx"; filename*=UTF-8''${encodedFilename}.docx`,
        "Content-Length": docxBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("POST /api/export/docx error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate Word document",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
