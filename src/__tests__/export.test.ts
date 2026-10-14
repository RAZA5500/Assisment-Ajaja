import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import { generatePdfFromHtml } from "@/lib/pdf";
import { generateDocxFromHtml } from "@/lib/docx";
import { GET as getPdfExport, POST as postPdfExport } from "@/app/api/documents/[id]/export/pdf/route";
import { GET as getDocxExport, POST as postDocxExport } from "@/app/api/documents/[id]/export/docx/route";
import { POST as postDirectPdfExport } from "@/app/api/export/pdf/route";
import { POST as postDirectDocxExport } from "@/app/api/export/docx/route";

const OWNER_ID = "user_alice_123";
const COLLABORATOR_ID = "user_bob_456";
const STRANGER_ID = "user_charlie_789";

function makeRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
) {
  const { method = "GET", body, headers = {} } = options;
  const reqInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body !== undefined) {
    reqInit.body = JSON.stringify(body);
  }
  return new NextRequest(new Request(url, reqInit));
}

describe("Document Export Functionality Tests", () => {
  let restrictedDocId: string;
  let publicDocId: string;

  beforeAll(async () => {
    await connectToDatabase();
    await DocumentModel.deleteMany({ ownerId: { $in: [OWNER_ID, "export_test_user"] } });

    // Create a restricted document
    const restrictedDoc = await DocumentModel.create({
      title: "Quarterly Strategy Report",
      content: "<h1>Quarterly Strategy</h1><p>Confidential roadmaps and <b>financial metrics</b>.</p><table><tr><th>KPI</th><th>Target</th></tr><tr><td>Growth</td><td>25%</td></tr></table>",
      ownerId: OWNER_ID,
      sharedWith: [COLLABORATOR_ID],
      viewers: [],
      generalAccess: "restricted",
    });
    restrictedDocId = restrictedDoc._id.toString();

    // Create a public document
    const publicDoc = await DocumentModel.create({
      title: "Public Product Overview",
      content: "<h1>Product Overview</h1><p>Accessible to everyone with the link.</p>",
      ownerId: OWNER_ID,
      sharedWith: [],
      viewers: [],
      generalAccess: "anyoneWithLink",
      generalAccessRole: "viewer",
    });
    publicDocId = publicDoc._id.toString();
  }, 30000);

  afterAll(async () => {
    if (restrictedDocId) await DocumentModel.findByIdAndDelete(restrictedDocId);
    if (publicDocId) await DocumentModel.findByIdAndDelete(publicDocId);
    await DocumentModel.deleteMany({ ownerId: { $in: [OWNER_ID, "export_test_user"] } });
    await mongoose.connection.close();
  });

  describe("Unit: PDF Generation with Puppeteer", () => {
    it("generates a valid PDF buffer matching PDF magic bytes (%PDF-)", async () => {
      const html = "<h1>Test Heading</h1><p>This is a paragraph with <b>bold</b> text.</p>";
      const buffer = await generatePdfFromHtml(html, { title: "Test Doc" });

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);
      // PDF specification magic header check: %PDF-
      const header = buffer.subarray(0, 5).toString("utf-8");
      expect(header).toBe("%PDF-");
    }, 20000);

    it("generates PDF for rich document with tables, lists, and blockquotes", async () => {
      const richHtml = `
        <h1>Rich Google Docs Sheet</h1>
        <p>Introduction paragraph.</p>
        <ul><li>Item 1</li><li>Item 2</li></ul>
        <blockquote>A distinguished quote</blockquote>
        <table>
          <thead><tr><th>Header 1</th><th>Header 2</th></tr></thead>
          <tbody><tr><td>Value 1</td><td>Value 2</td></tr></tbody>
        </table>
      `;
      const buffer = await generatePdfFromHtml(richHtml, { title: "Rich Document" });
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
    }, 20000);

    it("handles empty or blank HTML gracefully without crashing", async () => {
      const buffer = await generatePdfFromHtml("", { title: "Empty Document" });
      expect(buffer.length).toBeGreaterThan(500);
      expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
    }, 20000);
  });

  describe("Unit: Microsoft Word (.docx) Generation", () => {
    it("generates a valid DOCX buffer matching ZIP magic bytes (PK)", async () => {
      const html = "<h1>Word Export Test</h1><p>Hello <b>World</b> from Word!</p>";
      const buffer = await generateDocxFromHtml(html, { title: "Word Document" });

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);
      // Office Open XML (.docx) files are ZIP archives starting with magic bytes PK\x03\x04
      expect(buffer[0]).toBe(0x50); // P
      expect(buffer[1]).toBe(0x4b); // K
    }, 15000);

    it("generates DOCX with tables, headings, and lists", async () => {
      const richHtml = `
        <h1>Executive Summary</h1>
        <p>Paragraph with <i>italic</i> and <u>underline</u>.</p>
        <h2>Metrics Table</h2>
        <table>
          <tr><th>Quarter</th><th>Revenue</th></tr>
          <tr><td>Q1</td><td>$10M</td></tr>
        </table>
        <ul><li>Task A</li><li>Task B</li></ul>
      `;
      const buffer = await generateDocxFromHtml(richHtml, { title: "Metrics" });
      expect(buffer.length).toBeGreaterThan(2000);
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    }, 15000);

    it("handles empty or edge HTML cleanly", async () => {
      const buffer = await generateDocxFromHtml("", { title: "Blank" });
      expect(buffer.length).toBeGreaterThan(500);
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    }, 15000);
  });

  describe("Integration: Direct Export Routes (/api/export/pdf & /api/export/docx)", () => {
    it("POST /api/export/pdf returns PDF with application/pdf header and attachment filename", async () => {
      const req = makeRequest("http://localhost:3000/api/export/pdf", {
        method: "POST",
        body: {
          html: "<h1>Adhoc PDF</h1><p>Testing direct export endpoint.</p>",
          title: "Adhoc Document",
        },
      });

      const res = await postDirectPdfExport(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Content-Disposition")).toContain("attachment;");
      expect(res.headers.get("Content-Disposition")).toContain("Adhoc%20Document.pdf");

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      expect(buf.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
    }, 20000);

    it("POST /api/export/docx returns DOCX with correct MIME type and attachment filename", async () => {
      const req = makeRequest("http://localhost:3000/api/export/docx", {
        method: "POST",
        body: {
          html: "<h1>Adhoc DOCX</h1><p>Testing direct docx endpoint.</p>",
          title: "Word Direct",
        },
      });

      const res = await postDirectDocxExport(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      expect(res.headers.get("Content-Disposition")).toContain("Word%20Direct.docx");

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      expect(buf[0]).toBe(0x50);
      expect(buf[1]).toBe(0x4b);
    }, 15000);

    it("returns 400 when invalid JSON is sent to /api/export/pdf", async () => {
      const req = new NextRequest(
        new Request("http://localhost:3000/api/export/pdf", {
          method: "POST",
          body: "invalid-json",
          headers: { "Content-Type": "application/json" },
        })
      );
      const res = await postDirectPdfExport(req);
      expect(res.status).toBe(400);
    });
  });

  describe("Integration: Document PDF Export (/api/documents/[id]/export/pdf)", () => {
    it("returns 400 for invalid ObjectId format", async () => {
      const req = makeRequest("http://localhost:3000/api/documents/invalid-id/export/pdf");
      const res = await getPdfExport(req, { params: { id: "invalid-id" } });
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent document", async () => {
      const randomId = new mongoose.Types.ObjectId().toString();
      const req = makeRequest(`http://localhost:3000/api/documents/${randomId}/export/pdf`);
      const res = await getPdfExport(req, { params: { id: randomId } });
      expect(res.status).toBe(404);
    });

    it("returns 401 when exporting restricted doc without authentication", async () => {
      const req = makeRequest(`http://localhost:3000/api/documents/${restrictedDocId}/export/pdf`);
      const res = await getPdfExport(req, { params: { id: restrictedDocId } });
      expect(res.status).toBe(401);
    });

    it("returns 403 when authenticated as unauthorized user on restricted doc", async () => {
      const req = makeRequest(`http://localhost:3000/api/documents/${restrictedDocId}/export/pdf`, {
        headers: { "x-user-id": STRANGER_ID },
      });
      const res = await getPdfExport(req, { params: { id: restrictedDocId } });
      expect(res.status).toBe(403);
    });

    it("returns 200 and PDF binary for document owner via GET", async () => {
      const req = makeRequest(`http://localhost:3000/api/documents/${restrictedDocId}/export/pdf`, {
        headers: { "x-user-id": OWNER_ID },
      });
      const res = await getPdfExport(req, { params: { id: restrictedDocId } });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      expect(buf.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
    }, 20000);

    it("returns 200 and PDF binary for shared collaborator via GET", async () => {
      const req = makeRequest(`http://localhost:3000/api/documents/${restrictedDocId}/export/pdf`, {
        headers: { "x-user-id": COLLABORATOR_ID },
      });
      const res = await getPdfExport(req, { params: { id: restrictedDocId } });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
    }, 20000);

    it("returns 200 and exports live unsaved content via POST", async () => {
      const liveHtml = "<h1>Live Unsaved Draft</h1><p>Exporting latest changes from canvas</p>";
      const req = makeRequest(`http://localhost:3000/api/documents/${restrictedDocId}/export/pdf`, {
        method: "POST",
        headers: { "x-user-id": OWNER_ID },
        body: {
          html: liveHtml,
          title: "Live Draft",
        },
      });

      const res = await postPdfExport(req, { params: { id: restrictedDocId } });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Content-Disposition")).toContain("Live%20Draft.pdf");
    }, 20000);

    it("returns 200 for public document without any authentication", async () => {
      const req = makeRequest(`http://localhost:3000/api/documents/${publicDocId}/export/pdf`);
      const res = await getPdfExport(req, { params: { id: publicDocId } });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
    }, 20000);
  });

  describe("Integration: Document Word (.docx) Export (/api/documents/[id]/export/docx)", () => {
    it("returns 401 when exporting restricted doc without credentials", async () => {
      const req = makeRequest(`http://localhost:3000/api/documents/${restrictedDocId}/export/docx`);
      const res = await getDocxExport(req, { params: { id: restrictedDocId } });
      expect(res.status).toBe(401);
    });

    it("returns 403 when stranger tries to export restricted doc", async () => {
      const req = makeRequest(`http://localhost:3000/api/documents/${restrictedDocId}/export/docx`, {
        headers: { "x-user-id": STRANGER_ID },
      });
      const res = await getDocxExport(req, { params: { id: restrictedDocId } });
      expect(res.status).toBe(403);
    });

    it("returns 200 and valid DOCX binary for owner via GET", async () => {
      const req = makeRequest(`http://localhost:3000/api/documents/${restrictedDocId}/export/docx`, {
        headers: { "x-user-id": OWNER_ID },
      });
      const res = await getDocxExport(req, { params: { id: restrictedDocId } });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      expect(buf[0]).toBe(0x50);
      expect(buf[1]).toBe(0x4b);
    }, 15000);

    it("returns 200 and valid DOCX binary for public document without credentials", async () => {
      const req = makeRequest(`http://localhost:3000/api/documents/${publicDocId}/export/docx`);
      const res = await getDocxExport(req, { params: { id: publicDocId } });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    }, 15000);

    it("returns 200 and exports live unsaved content via POST", async () => {
      const liveHtml = "<h1>Live Word Draft</h1><p>Testing unsaved Word download</p>";
      const req = makeRequest(`http://localhost:3000/api/documents/${restrictedDocId}/export/docx`, {
        method: "POST",
        headers: { "x-user-id": OWNER_ID },
        body: {
          html: liveHtml,
          title: "Custom Word Title",
        },
      });

      const res = await postDocxExport(req, { params: { id: restrictedDocId } });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toContain("Custom%20Word%20Title.docx");
    }, 15000);
  });
});
