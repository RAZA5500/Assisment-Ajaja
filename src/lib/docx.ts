// @ts-expect-error - html-to-docx does not ship with official ts declarations
import HTMLtoDOCX from "html-to-docx";
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel, Table as DocxTable, TableRow, TableCell, WidthType } from "docx";

interface DocxExportOptions {
  title?: string;
  creator?: string;
}

/**
 * Sanitizes and normalizes HTML for Word (.docx) generation
 */
function normalizeHtmlForWord(rawHtml: string): string {
  if (!rawHtml || !rawHtml.trim()) {
    return "<p></p>";
  }

  let html = rawHtml;

  // Replace stray <br> with <br/>
  html = html.replace(/<br(?!\s*\/)>/gi, "<br/>");
  // Replace stray <hr> with <hr/>
  html = html.replace(/<hr(?!\s*\/)>/gi, "<hr/>");

  // Ensure paragraphs or list items aren't completely blank
  html = html.replace(/<p>\s*<\/p>/gi, "<p>&nbsp;</p>");

  return html;
}

/**
 * Fallback generator using docx library if html-to-docx fails on malformed HTML
 */
async function fallbackGenerateDocx(htmlContent: string, title: string): Promise<Buffer> {
  const plainText = htmlContent
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  const paragraphs = plainText
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (text) =>
        new Paragraph({
          children: [new TextRun({ text, font: "Arial", size: 22 })],
          spacing: { after: 200, line: 360 },
        })
    );

  const doc = new DocxDocument({
    title,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 300 },
          }),
          ...(paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: "" })]),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Generates a clean Microsoft Word (.docx) file buffer from HTML content
 */
export async function generateDocxFromHtml(
  htmlContent: string,
  options: DocxExportOptions = {}
): Promise<Buffer> {
  const { title = "Document", creator = "Google Docs Clone" } = options;
  const cleanHtml = normalizeHtmlForWord(htmlContent);

  try {
    const docxBlobOrBuffer = await HTMLtoDOCX(cleanHtml, null, {
      title,
      creator,
      description: "Exported from Document Editor",
      margins: {
        top: 1440,
        right: 1440,
        bottom: 1440,
        left: 1440,
      },
      font: "Arial",
      fontSize: 22, // 11pt
      table: {
        row: {
          cantSplit: true,
        },
      },
      footer: true,
      pageNumber: true,
    });

    if (Buffer.isBuffer(docxBlobOrBuffer)) {
      return docxBlobOrBuffer;
    }

    if (docxBlobOrBuffer instanceof ArrayBuffer) {
      return Buffer.from(docxBlobOrBuffer);
    }

    if (docxBlobOrBuffer instanceof Uint8Array) {
      return Buffer.from(docxBlobOrBuffer);
    }

    if (typeof (docxBlobOrBuffer as Blob)?.arrayBuffer === "function") {
      const arrayBuf = await (docxBlobOrBuffer as Blob).arrayBuffer();
      return Buffer.from(arrayBuf);
    }

    return Buffer.from(docxBlobOrBuffer as ArrayBuffer);
  } catch (error) {
    console.warn("HTMLtoDOCX primary converter failed, using docx fallback...", error);
    return await fallbackGenerateDocx(cleanHtml, title);
  }
}
