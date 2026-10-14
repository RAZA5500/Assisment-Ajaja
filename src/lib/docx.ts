// @ts-expect-error - html-to-docx does not ship with official ts declarations
import HTMLtoDOCX from "html-to-docx";
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

interface DocxExportOptions {
  title?: string;
  creator?: string;
}

/**
 * Decodes standard HTML entities to plain text equivalents
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–");
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

  // Normalize TipTap empty paragraphs (including trailing break tags)
  html = html.replace(/<p>\s*(<br[^>]*>)?\s*<\/p>/gi, "<p>&nbsp;</p>");

  return html;
}

/**
 * Fallback generator using docx library if html-to-docx fails on malformed HTML
 */
export async function fallbackGenerateDocx(htmlContent: string, title: string): Promise<Buffer> {
  // Extract structured block items: headings, list items, and standard paragraphs
  const blockRegex = /<(h[1-3]|p|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
  const elements: Paragraph[] = [];
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(htmlContent)) !== null) {
    const tag = match[1].toLowerCase();
    const rawInner = match[2];
    const textContent = decodeHtmlEntities(rawInner.replace(/<[^>]+>/g, "").trim());

    if (!textContent) continue;

    if (tag === "h1") {
      elements.push(
        new Paragraph({
          text: textContent,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (tag === "h2") {
      elements.push(
        new Paragraph({
          text: textContent,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (tag === "h3") {
      elements.push(
        new Paragraph({
          text: textContent,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        })
      );
    } else if (tag === "li") {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: textContent, font: "Arial", size: 22 })],
          bullet: { level: 0 },
          spacing: { after: 60, line: 320 },
        })
      );
    } else {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: textContent, font: "Arial", size: 22 })],
          spacing: { after: 160, line: 360 },
        })
      );
    }
  }

  // If no structured blocks were parsed, fallback to plain text chunks
  if (elements.length === 0) {
    const plainText = decodeHtmlEntities(
      htmlContent
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/h[1-6]>/gi, "\n\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<[^>]+>/g, "")
    );

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

    elements.push(...paragraphs);
  }

  // Check if first element is already a heading with the same title to avoid duplicate title headers
  const firstElemText = (elements[0] as unknown as { text?: string })?.text?.trim().toLowerCase();
  const hasTitleAtTop = firstElemText === (title || "").trim().toLowerCase();

  const docChildren: Paragraph[] = [];
  if (!hasTitleAtTop && title && title.trim()) {
    docChildren.push(
      new Paragraph({
        text: title.trim(),
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 280 },
      })
    );
  }

  docChildren.push(...(elements.length > 0 ? elements : [new Paragraph({ text: "" })]));

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
        children: docChildren,
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
