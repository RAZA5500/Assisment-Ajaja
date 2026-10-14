import fs from "fs";
import path from "path";
import puppeteer, { Browser } from "puppeteer";

interface PdfExportOptions {
  title?: string;
  format?: "A4" | "Letter";
  headerFooter?: boolean;
}

/**
 * Detect available browser executable paths as fallback if puppeteer's default fails
 */
function findSystemBrowserExecutable(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const commonPaths: string[] = [
    // Windows Chrome
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    // Windows Edge
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    // Linux Chrome & Chromium
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];

  for (const p of commonPaths) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch {
      // Ignore filesystem permission or syntax errors
    }
  }

  return undefined;
}

/**
 * Launches Puppeteer browser instance with fallback to system installed Chrome/Edge
 */
async function launchBrowser(): Promise<Browser> {
  const launchArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--font-render-hinting=medium",
    "--no-first-run",
    "--no-zygote",
  ];

  // Attempt 1: Try default bundled puppeteer
  try {
    return await puppeteer.launch({
      headless: true,
      args: launchArgs,
    });
  } catch (err) {
    console.warn("Default Puppeteer launch failed, attempting system browser fallback...", err);
  }

  // Attempt 2: Try explicit system browser executable
  const systemPath = findSystemBrowserExecutable();
  if (systemPath) {
    try {
      return await puppeteer.launch({
        headless: true,
        args: launchArgs,
        executablePath: systemPath,
      });
    } catch (err) {
      console.warn(`System browser launch failed with executable ${systemPath}:`, err);
    }
  }

  throw new Error("Unable to launch Puppeteer headless browser. Please ensure Chrome or Chromium is installed.");
}

/**
 * Builds high-fidelity HTML markup styled to match Google Docs print sheets
 */
function buildGoogleDocsPdfHtml(htmlContent: string, title: string): string {
  const safeTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 20mm 20mm 20mm;
      @bottom-right {
        content: counter(page);
      }
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    body {
      font-family: Arial, "Helvetica Neue", Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      color: #0f172a;
      page-break-after: avoid;
      break-after: avoid;
      margin-top: 1.4em;
      margin-bottom: 0.5em;
    }

    h1 {
      font-size: 22pt;
      font-weight: 700;
      line-height: 1.25;
      margin-top: 0;
      margin-bottom: 12pt;
      letter-spacing: -0.02em;
    }

    h2 {
      font-size: 16pt;
      font-weight: 700;
      line-height: 1.3;
      margin-top: 18pt;
      margin-bottom: 8pt;
      letter-spacing: -0.015em;
    }

    h3 {
      font-size: 13pt;
      font-weight: 600;
      line-height: 1.35;
      margin-top: 14pt;
      margin-bottom: 6pt;
    }

    p {
      margin-top: 0;
      margin-bottom: 8pt;
      line-height: 1.65;
      text-align: inherit;
    }

    p:empty::after, p:blank::after {
      content: "\\00a0";
      display: inline-block;
    }

    strong, b {
      font-weight: 700;
      color: #0f172a;
    }

    em, i {
      font-style: italic;
    }

    u {
      text-decoration: underline;
    }

    s, strike, del {
      text-decoration: line-through;
    }

    ul, ol {
      margin-top: 0;
      margin-bottom: 8pt;
      padding-left: 24pt;
    }

    li {
      margin-bottom: 4pt;
      line-height: 1.6;
    }

    blockquote {
      margin: 12pt 0;
      padding: 8pt 14pt;
      border-left: 4px solid #3b82f6;
      background-color: #f8fafc;
      color: #334155;
      font-style: italic;
      border-radius: 0 4pt 4pt 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14pt 0;
      font-size: 10pt;
      page-break-inside: auto;
    }

    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    th {
      background-color: #f1f5f9;
      font-weight: 700;
      color: #0f172a;
      text-align: left;
      border: 1px solid #cbd5e1;
      padding: 8pt 10pt;
    }

    td {
      border: 1px solid #cbd5e1;
      padding: 7pt 10pt;
      vertical-align: top;
    }

    tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    hr {
      border: 0;
      border-top: 1px solid #cbd5e1;
      margin: 16pt 0;
    }

    code {
      font-family: Consolas, Monaco, "Courier New", monospace;
      font-size: 9.5pt;
      background-color: #f1f5f9;
      color: #e11d48;
      padding: 2pt 4pt;
      border-radius: 3pt;
    }

    pre {
      background-color: #f1f5f9;
      padding: 10pt 14pt;
      border-radius: 6pt;
      overflow-x: auto;
      font-family: Consolas, Monaco, "Courier New", monospace;
      font-size: 9.5pt;
      line-height: 1.5;
      page-break-inside: avoid;
      break-inside: avoid;
      border: 1px solid #e2e8f0;
      margin: 10pt 0;
    }

    pre code {
      background: transparent;
      padding: 0;
      color: #1e293b;
    }

    img {
      max-width: 100%;
      height: auto;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .document-content {
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="document-content">
    ${htmlContent || "<p></p>"}
  </div>
</body>
</html>`;
}

/**
 * Generates a crisp PDF buffer using headless Puppeteer
 */
export async function generatePdfFromHtml(
  htmlContent: string,
  options: PdfExportOptions = {}
): Promise<Buffer> {
  const { title = "Document", format = "A4", headerFooter = true } = options;

  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    // Set standard viewport for letter/A4 rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2,
    });

    const fullHtml = buildGoogleDocsPdfHtml(htmlContent, title);
    await page.setContent(fullHtml, {
      waitUntil: ["load", "networkidle0"],
      timeout: 30000,
    });

    const safeTitleHeader = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const headerTemplate = `
      <div style="font-size: 8pt; font-family: Arial, sans-serif; color: #94a3b8; width: 100%; padding: 0 20mm; display: flex; justify-content: space-between; align-items: center;">
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;">${safeTitleHeader}</span>
        <span></span>
      </div>
    `;

    const footerTemplate = `
      <div style="font-size: 8pt; font-family: Arial, sans-serif; color: #94a3b8; width: 100%; padding: 0 20mm; display: flex; justify-content: space-between; align-items: center;">
        <span></span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `;

    const pdfUint8Array = await page.pdf({
      format,
      printBackground: true,
      displayHeaderFooter: headerFooter,
      headerTemplate: headerFooter ? headerTemplate : "<div></div>",
      footerTemplate: headerFooter ? footerTemplate : "<div></div>",
      margin: {
        top: headerFooter ? "22mm" : "20mm",
        right: "20mm",
        bottom: headerFooter ? "22mm" : "20mm",
        left: "20mm",
      },
    });

    return Buffer.from(pdfUint8Array);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error("Error closing puppeteer browser:", closeErr);
      }
    }
  }
}
