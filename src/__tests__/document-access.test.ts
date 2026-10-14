import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import {
  parseMarkdownToHtml,
  parsePlainTextToHtml,
  exportHtmlToMarkdown,
} from "@/lib/markdown";
import { GET as getDocuments, POST as createDocument } from "@/app/api/documents/route";
import {
  GET as getDocumentById,
  PATCH as patchDocumentById,
  DELETE as deleteDocumentById,
} from "@/app/api/documents/[id]/route";
import { PATCH as patchDocumentShare } from "@/app/api/documents/[id]/share/route";

const ALICE_ID = "user_alice_123";
const BOB_ID = "user_bob_456";
const CHARLIE_ID = "user_charlie_789";

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

describe("Document Model & API Route RBAC Integration Tests", () => {
  let createdDocId: string;

  beforeAll(async () => {
    await connectToDatabase();
    await DocumentModel.deleteMany({ ownerId: { $in: [ALICE_ID, BOB_ID, CHARLIE_ID] } });
  });

  afterAll(async () => {
    if (createdDocId) {
      await DocumentModel.findByIdAndDelete(createdDocId);
    }
    await DocumentModel.deleteMany({ ownerId: { $in: [ALICE_ID, BOB_ID, CHARLIE_ID] } });
    await mongoose.connection.close();
  });

  it("1. POST /api/documents creates a document with active user as owner (HTTP 201)", async () => {
    const req = makeRequest("http://localhost:3000/api/documents", {
      method: "POST",
      headers: { "x-user-id": ALICE_ID },
      body: {
        title: "Alice's Project Roadmap",
        content: "<p>Initial roadmap details</p>",
        ownerId: ALICE_ID,
      },
    });

    const res = await createDocument(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data._id).toBeDefined();
    expect(data.title).toBe("Alice's Project Roadmap");
    expect(data.ownerId).toBe(ALICE_ID);
    expect(data.sharedWith).toEqual([]);
    createdDocId = data._id;
  });

  it("2. POST /api/documents applies default title when none provided", async () => {
    const req = makeRequest("http://localhost:3000/api/documents", {
      method: "POST",
      body: {
        ownerId: ALICE_ID,
      },
    });

    const res = await createDocument(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe("Untitled Document");

    await DocumentModel.findByIdAndDelete(data._id);
  });

  it("3. GET /api/documents retrieves documents list filtered by user and tab", async () => {
    const req = makeRequest(`http://localhost:3000/api/documents?userId=${ALICE_ID}&filter=owned`);
    const res = await getDocuments(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.some((d: { _id: string }) => d._id === createdDocId)).toBe(true);
  });

  it("4. GET /api/documents search with regex special characters does not crash (HTTP 200)", async () => {
    // Testing adversarial regex search query containing unbalanced parentheses
    const req = makeRequest(
      `http://localhost:3000/api/documents?userId=${ALICE_ID}&search=${encodeURIComponent("Alice's (Project")}`
    );
    const res = await getDocuments(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("5. GET /api/documents/[id] allows Owner (Alice) to view (HTTP 200)", async () => {
    const req = makeRequest(`http://localhost:3000/api/documents/${createdDocId}?userId=${ALICE_ID}`);
    const res = await getDocumentById(req, { params: { id: createdDocId } });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data._id).toBe(createdDocId);
    expect(data.ownerId).toBe(ALICE_ID);
  });

  it("6. GET /api/documents/[id] denies access to non-shared user Bob (HTTP 403)", async () => {
    const req = makeRequest(`http://localhost:3000/api/documents/${createdDocId}?userId=${BOB_ID}`);
    const res = await getDocumentById(req, { params: { id: createdDocId } });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Access denied");
    expect(data.documentOwnerId).toBe(ALICE_ID);
  });

  it("7. PATCH /api/documents/[id]/share denies non-owner Bob from managing sharing (HTTP 403)", async () => {
    const req = makeRequest(`http://localhost:3000/api/documents/${createdDocId}/share`, {
      method: "PATCH",
      headers: { "x-user-id": BOB_ID },
      body: {
        userId: BOB_ID,
        sharedWith: [BOB_ID, CHARLIE_ID],
      },
    });
    const res = await patchDocumentShare(req, { params: { id: createdDocId } });
    expect(res.status).toBe(403);
  });

  it("8. PATCH /api/documents/[id]/share allows Owner (Alice) to share with Bob (HTTP 200)", async () => {
    const req = makeRequest(`http://localhost:3000/api/documents/${createdDocId}/share`, {
      method: "PATCH",
      headers: { "x-user-id": ALICE_ID },
      body: {
        userId: ALICE_ID,
        sharedWith: [BOB_ID],
      },
    });
    const res = await patchDocumentShare(req, { params: { id: createdDocId } });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.sharedWith).toContain(BOB_ID);
  });

  it("9. GET /api/documents/[id] allows shared collaborator Bob to view (HTTP 200)", async () => {
    const req = makeRequest(`http://localhost:3000/api/documents/${createdDocId}?userId=${BOB_ID}`);
    const res = await getDocumentById(req, { params: { id: createdDocId } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sharedWith).toContain(BOB_ID);
  });

  it("10. PATCH /api/documents/[id] allows shared collaborator Bob to edit content (HTTP 200)", async () => {
    const req = makeRequest(`http://localhost:3000/api/documents/${createdDocId}`, {
      method: "PATCH",
      headers: { "x-user-id": BOB_ID },
      body: {
        userId: BOB_ID,
        content: "<p>Roadmap updated by Bob</p>",
      },
    });
    const res = await patchDocumentById(req, { params: { id: createdDocId } });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.content).toBe("<p>Roadmap updated by Bob</p>");
  });

  it("11. GET /api/documents/[id] denies access to third party Charlie (HTTP 403)", async () => {
    const req = makeRequest(`http://localhost:3000/api/documents/${createdDocId}?userId=${CHARLIE_ID}`);
    const res = await getDocumentById(req, { params: { id: createdDocId } });
    expect(res.status).toBe(403);
  });

  it("12. PATCH /api/documents/[id]/share allows Alice to revoke Bob's access (HTTP 200)", async () => {
    const req = makeRequest(`http://localhost:3000/api/documents/${createdDocId}/share`, {
      method: "PATCH",
      headers: { "x-user-id": ALICE_ID },
      body: {
        userId: ALICE_ID,
        sharedWith: [],
      },
    });
    const res = await patchDocumentShare(req, { params: { id: createdDocId } });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.sharedWith).not.toContain(BOB_ID);

    // Verify Bob is now blocked again with 403
    const bobReq = makeRequest(`http://localhost:3000/api/documents/${createdDocId}?userId=${BOB_ID}`);
    const bobRes = await getDocumentById(bobReq, { params: { id: createdDocId } });
    expect(bobRes.status).toBe(403);
  });

  it("13. DELETE /api/documents/[id] denies non-owner Bob from deleting (HTTP 403)", async () => {
    const req = makeRequest(`http://localhost:3000/api/documents/${createdDocId}?userId=${BOB_ID}`, {
      method: "DELETE",
    });
    const res = await deleteDocumentById(req, { params: { id: createdDocId } });
    expect(res.status).toBe(403);
  });

  it("14. DELETE /api/documents/[id] allows Owner Alice to delete (HTTP 200)", async () => {
    const req = makeRequest(`http://localhost:3000/api/documents/${createdDocId}?userId=${ALICE_ID}`, {
      method: "DELETE",
    });
    const res = await deleteDocumentById(req, { params: { id: createdDocId } });
    expect(res.status).toBe(200);

    // Subsequent retrieval returns 404
    const getReq = makeRequest(`http://localhost:3000/api/documents/${createdDocId}?userId=${ALICE_ID}`);
    const getRes = await getDocumentById(getReq, { params: { id: createdDocId } });
    expect(getRes.status).toBe(404);
  });

  it("15. GET /api/documents/[id] with invalid ID returns HTTP 400 Bad Request", async () => {
    const req = makeRequest(`http://localhost:3000/api/documents/invalid-id?userId=${ALICE_ID}`);
    const res = await getDocumentById(req, { params: { id: "invalid-id" } });
    expect(res.status).toBe(400);
  });

  it("16. RBAC: Owner shares with Charlie as Viewer; Charlie can view (200) but cannot edit (403)", async () => {
    // Create doc
    const createReq = makeRequest("http://localhost:3000/api/documents", {
      method: "POST",
      headers: { "x-user-id": ALICE_ID },
      body: {
        title: "Alice's RBAC Test Spec",
        content: "<p>Original specification</p>",
        ownerId: ALICE_ID,
      },
    });
    const createRes = await createDocument(createReq);
    expect(createRes.status).toBe(201);
    const docData = await createRes.json();
    const testDocId = docData._id;

    // Share with Charlie as Viewer
    const shareReq = makeRequest(`http://localhost:3000/api/documents/${testDocId}/share`, {
      method: "PATCH",
      headers: { "x-user-id": ALICE_ID },
      body: {
        userId: ALICE_ID,
        sharedWith: [CHARLIE_ID],
        viewers: [CHARLIE_ID],
      },
    });
    const shareRes = await patchDocumentShare(shareReq, { params: { id: testDocId } });
    expect(shareRes.status).toBe(200);
    const shareData = await shareRes.json();
    expect(shareData.sharedWith).toContain(CHARLIE_ID);
    expect(shareData.viewers).toContain(CHARLIE_ID);

    // Charlie can view (HTTP 200)
    const viewReq = makeRequest(`http://localhost:3000/api/documents/${testDocId}?userId=${CHARLIE_ID}`);
    const viewRes = await getDocumentById(viewReq, { params: { id: testDocId } });
    expect(viewRes.status).toBe(200);

    // Charlie is denied edit (HTTP 403)
    const editReq = makeRequest(`http://localhost:3000/api/documents/${testDocId}`, {
      method: "PATCH",
      headers: { "x-user-id": CHARLIE_ID },
      body: {
        userId: CHARLIE_ID,
        content: "<p>Hacked by viewer</p>",
      },
    });
    const editRes = await patchDocumentById(editReq, { params: { id: testDocId } });
    expect(editRes.status).toBe(403);

    // Alice promotes Charlie to Editor (removes from viewers)
    const promoteReq = makeRequest(`http://localhost:3000/api/documents/${testDocId}/share`, {
      method: "PATCH",
      headers: { "x-user-id": ALICE_ID },
      body: {
        userId: ALICE_ID,
        sharedWith: [CHARLIE_ID],
        viewers: [],
      },
    });
    const promoteRes = await patchDocumentShare(promoteReq, { params: { id: testDocId } });
    expect(promoteRes.status).toBe(200);
    const promoteData = await promoteRes.json();
    expect(promoteData.viewers).not.toContain(CHARLIE_ID);

    // Charlie can now edit (HTTP 200)
    const editorEditReq = makeRequest(`http://localhost:3000/api/documents/${testDocId}`, {
      method: "PATCH",
      headers: { "x-user-id": CHARLIE_ID },
      body: {
        userId: CHARLIE_ID,
        content: "<p>Updated by Charlie as Editor</p>",
      },
    });
    const editorEditRes = await patchDocumentById(editorEditReq, { params: { id: testDocId } });
    expect(editorEditRes.status).toBe(200);

    // Clean up
    await DocumentModel.findByIdAndDelete(testDocId);
  });

  it("17. RBAC: Test Account (test@ex.com) shares document by email with hraza5701@gmail.com; second account can view and edit without Access Restricted (HTTP 200)", async () => {
    const TEST_USER_ID = "user_test_account";
    const HRAZA_USER_ID = "user_hraza_5701";
    const HRAZA_EMAIL = "hraza5701@gmail.com";

    // 1. Create document as Test Account
    const createReq = makeRequest("http://localhost:3000/api/documents", {
      method: "POST",
      headers: { "x-user-id": TEST_USER_ID, "x-user-email": "test@ex.com" },
      body: {
        title: "Test Account Shared Document",
        content: "<p>Original content from test account</p>",
        ownerId: TEST_USER_ID,
      },
    });
    const createRes = await createDocument(createReq);
    expect(createRes.status).toBe(201);
    const docData = await createRes.json();
    const sharedDocId = docData._id;

    // 2. Share by direct email with hraza5701@gmail.com
    const shareReq = makeRequest(`http://localhost:3000/api/documents/${sharedDocId}/share`, {
      method: "PATCH",
      headers: { "x-user-id": TEST_USER_ID, "x-user-email": "test@ex.com" },
      body: {
        userId: TEST_USER_ID,
        userEmail: "test@ex.com",
        sharedWith: [HRAZA_EMAIL],
        viewers: [],
      },
    });
    const shareRes = await patchDocumentShare(shareReq, { params: { id: sharedDocId } });
    expect(shareRes.status).toBe(200);
    const shareData = await shareRes.json();
    expect(shareData.sharedWith).toContain(HRAZA_EMAIL);

    // 3. Second account lists documents on dashboard (GET /api/documents)
    const listReq = makeRequest(
      `http://localhost:3000/api/documents?userId=${HRAZA_USER_ID}&userEmail=${HRAZA_EMAIL}&filter=all`,
      {
        headers: { "x-user-id": HRAZA_USER_ID, "x-user-email": HRAZA_EMAIL },
      }
    );
    const listRes = await getDocuments(listReq);
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.some((d: { _id: string }) => d._id === sharedDocId)).toBe(true);

    // 4. Second account opens document (GET /api/documents/[id]) - must be 200, NOT 403 Forbidden
    const getReq = makeRequest(
      `http://localhost:3000/api/documents/${sharedDocId}?userId=${HRAZA_USER_ID}&userEmail=${HRAZA_EMAIL}`,
      {
        headers: { "x-user-id": HRAZA_USER_ID, "x-user-email": HRAZA_EMAIL },
      }
    );
    const getRes = await getDocumentById(getReq, { params: { id: sharedDocId } });
    expect(getRes.status).toBe(200);
    const getDocData = await getRes.json();
    expect(getDocData.title).toBe("Test Account Shared Document");

    // 5. Second account updates document content (PATCH /api/documents/[id])
    const patchReq = makeRequest(`http://localhost:3000/api/documents/${sharedDocId}`, {
      method: "PATCH",
      headers: { "x-user-id": HRAZA_USER_ID, "x-user-email": HRAZA_EMAIL },
      body: {
        userId: HRAZA_USER_ID,
        userEmail: HRAZA_EMAIL,
        content: "<p>Successfully edited by second account hraza5701@gmail.com!</p>",
      },
    });
    const patchRes = await patchDocumentById(patchReq, { params: { id: sharedDocId } });
    expect(patchRes.status).toBe(200);
    const patchedData = await patchRes.json();
    expect(patchedData.content).toBe("<p>Successfully edited by second account hraza5701@gmail.com!</p>");

    // Cleanup
    await DocumentModel.findByIdAndDelete(sharedDocId);
  });
});

describe("Markdown Parser & Plain Text Importer Tests", () => {
  it("Parses markdown headings, bold, italic, and lists accurately", () => {
    const md = `# Project Plan
## Sprint Goals
### Milestone 1
- Complete document editor
- Implement access control
1. Step one
2. Step two
This has **bold** and *italic* text.`;

    const html = parseMarkdownToHtml(md);

    expect(html).toContain("<h1>Project Plan</h1>");
    expect(html).toContain("<h2>Sprint Goals</h2>");
    expect(html).toContain("<h3>Milestone 1</h3>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>Complete document editor</li>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>Step one</li>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  it("Protects inline code spans from being corrupted by bold/italic syntax", () => {
    const md = "Here is inline code: `const result = a * b * c;` and variable `user_id_field`.";
    const html = parseMarkdownToHtml(md);

    expect(html).toContain("<code>const result = a * b * c;</code>");
    expect(html).not.toContain("<em> b </em>");
  });

  it("Parses plain text with newlines into paragraphs", () => {
    const plainText = `Line 1
Line 2

Line 3`;

    const html = parsePlainTextToHtml(plainText);
    expect(html).toContain("<p>Line 1</p>");
    expect(html).toContain("<p>Line 2</p>");
    expect(html).toContain("<p>Line 3</p>");
  });

  it("Handles empty or whitespace input gracefully", () => {
    expect(parseMarkdownToHtml("")).toBe("<p></p>");
    expect(parseMarkdownToHtml("   ")).toBe("<p></p>");
    expect(parsePlainTextToHtml("")).toBe("<p></p>");
  });

  it("Exports HTML headings, lists, tables, code blocks, and formatting to clean Markdown", () => {
    const html = `<h1>Title</h1><p>This is <strong>bold</strong> and <em>italic</em> and <s>strikethrough</s> and <code>inline code</code>.</p><ul><li>Bullet 1</li><li>Bullet 2</li></ul><ol><li>Step 1</li><li>Step 2</li></ol><blockquote><p>A wise quote</p></blockquote><pre><code>const a = 10;</code></pre><table><thead><tr><th>Name</th><th>Role</th></tr></thead><tbody><tr><td>Alice</td><td>Owner</td></tr></tbody></table>`;

    const md = exportHtmlToMarkdown(html);

    expect(md).toContain("# Title");
    expect(md).toContain("**bold**");
    expect(md).toContain("*italic*");
    expect(md).toContain("~~strikethrough~~");
    expect(md).toContain("`inline code`");
    expect(md).toContain("- Bullet 1");
    expect(md).toContain("- Bullet 2");
    expect(md).toContain("1. Step 1");
    expect(md).toContain("2. Step 2");
    expect(md).toContain("> A wise quote");
    expect(md).toContain("```\nconst a = 10;\n```");
    expect(md).toContain("| Name | Role |");
    expect(md).toContain("| Alice | Owner |");
  });

  it("exportHtmlToMarkdown handles empty and whitespace strings gracefully", () => {
    expect(exportHtmlToMarkdown("")).toBe("");
    expect(exportHtmlToMarkdown("   ")).toBe("");
  });
});
