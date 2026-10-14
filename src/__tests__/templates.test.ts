import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import { POST as createDocument } from "@/app/api/documents/route";
import {
  TEMPLATES,
  BLANK_TEMPLATE,
  getTemplateById,
  calculateTemplateWordCount,
} from "@/lib/templates";

const ALICE_ID = "user_alice_123";

function makeJsonRequest(
  url: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
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

describe("Template Gallery & Document Creation Unit and Integration Tests", () => {
  const createdDocIds: string[] = [];

  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    if (createdDocIds.length > 0) {
      await DocumentModel.deleteMany({ _id: { $in: createdDocIds } });
    }
  });

  describe("1. Template Definitions and Visual Identity Data", () => {
    it("provides the BLANK_TEMPLATE with valid defaults", () => {
      expect(BLANK_TEMPLATE).toBeDefined();
      expect(BLANK_TEMPLATE.id).toBe("blank");
      expect(BLANK_TEMPLATE.title).toBe("Blank Document");
      expect(BLANK_TEMPLATE.category).toBe("General");
      expect(BLANK_TEMPLATE.content).toContain("<p>");
    });

    it("defines all 5 realistic starter templates", () => {
      expect(TEMPLATES).toHaveLength(5);
      const ids = TEMPLATES.map((t) => t.id);
      expect(ids).toContain("proposal");
      expect(ids).toContain("meeting-notes");
      expect(ids).toContain("software-spec");
      expect(ids).toContain("resume");
      expect(ids).toContain("weekly-report");
    });

    it("verifies Project Proposal contains executive summary & milestones", () => {
      const proposal = getTemplateById("proposal");
      expect(proposal).toBeDefined();
      expect(proposal?.title).toBe("Project Proposal");
      expect(proposal?.content).toContain("Executive Summary");
      expect(proposal?.content).toContain("Key Milestones");
      expect(proposal?.badgeColor).toBe("bg-blue-500");
    });

    it("verifies Team Meeting Notes contains attendees, agenda & action items", () => {
      const meetingNotes = getTemplateById("meeting-notes");
      expect(meetingNotes).toBeDefined();
      expect(meetingNotes?.title).toBe("Meeting Notes");
      expect(meetingNotes?.content).toContain("Attendees");
      expect(meetingNotes?.content).toContain("Agenda");
      expect(meetingNotes?.content).toContain("Action Items");
      expect(meetingNotes?.badgeColor).toBe("bg-emerald-500");
    });

    it("verifies Software Spec contains architecture and code block", () => {
      const spec = getTemplateById("software-spec");
      expect(spec).toBeDefined();
      expect(spec?.title).toBe("Software Spec");
      expect(spec?.content).toContain("High-Level Architecture");
      expect(spec?.content).toContain("<code>");
      expect(spec?.badgeColor).toBe("bg-indigo-500");
    });

    it("verifies Resume / CV contains 2-column resume layout elements", () => {
      const resume = getTemplateById("resume");
      expect(resume).toBeDefined();
      expect(resume?.title).toBe("Resume / CV");
      expect(resume?.content).toContain("Alex Mercer");
      expect(resume?.content).toContain("Experience");
      expect(resume?.content).toContain("Professional Summary");
      expect(resume?.badgeColor).toBe("bg-purple-500");
    });

    it("verifies Weekly Report contains KPI metrics and deliverables table", () => {
      const report = getTemplateById("weekly-report");
      expect(report).toBeDefined();
      expect(report?.title).toBe("Weekly Report");
      expect(report?.content).toContain("Key Highlights");
      expect(report?.content).toContain("Metrics Overview");
      expect(report?.content).toContain("Deliverables");
      expect(report?.badgeColor).toBe("bg-amber-500");
    });
  });

  describe("2. Word Count and Template Lookup Utilities", () => {
    it("handles getTemplateById for existing, blank, and non-existing IDs", () => {
      expect(getTemplateById("blank")?.id).toBe("blank");
      expect(getTemplateById("proposal")?.id).toBe("proposal");
      expect(getTemplateById("unknown-id")).toBeUndefined();
    });

    it("correctly calculates word count for plain text and rich HTML markup", () => {
      expect(calculateTemplateWordCount("")).toBe(0);
      expect(calculateTemplateWordCount("   ")).toBe(0);
      expect(calculateTemplateWordCount("<p></p>")).toBe(0);
      expect(calculateTemplateWordCount("<p>&nbsp;&nbsp;</p>")).toBe(0);
      expect(calculateTemplateWordCount("<p>Hello&nbsp;world!</p>")).toBe(2);
      expect(calculateTemplateWordCount("<p>Hello world!</p>")).toBe(2);
      expect(
        calculateTemplateWordCount("<h1>Heading</h1><p>Three more words</p>")
      ).toBe(4);
    });

    it("returns positive word counts for all starter templates", () => {
      for (const tmpl of TEMPLATES) {
        const count = calculateTemplateWordCount(tmpl.content);
        expect(count).toBeGreaterThan(15);
      }
    });
  });

  describe("3. Creating Documents From Each Template via API", () => {
    it("creates a new document from Blank Document template", async () => {
      const req = makeJsonRequest("http://localhost:3000/api/documents", "POST", {
        title: BLANK_TEMPLATE.title,
        content: BLANK_TEMPLATE.content,
        ownerId: ALICE_ID,
      }, { "x-user-id": ALICE_ID });

      const res = await createDocument(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data._id).toBeDefined();
      expect(data.title).toBe("Blank Document");
      expect(data.ownerId).toBe(ALICE_ID);
      createdDocIds.push(data._id);
    });

    it("creates a new document from Project Proposal template", async () => {
      const proposal = getTemplateById("proposal")!;
      const req = makeJsonRequest("http://localhost:3000/api/documents", "POST", {
        title: proposal.title,
        content: proposal.content,
        ownerId: ALICE_ID,
      }, { "x-user-id": ALICE_ID });

      const res = await createDocument(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data._id).toBeDefined();
      expect(data.title).toBe("Project Proposal");
      expect(data.content).toContain("Executive Summary");
      createdDocIds.push(data._id);
    });

    it("creates a new document from Meeting Notes template", async () => {
      const notes = getTemplateById("meeting-notes")!;
      const req = makeJsonRequest("http://localhost:3000/api/documents", "POST", {
        title: notes.title,
        content: notes.content,
        ownerId: ALICE_ID,
      }, { "x-user-id": ALICE_ID });

      const res = await createDocument(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data._id).toBeDefined();
      expect(data.title).toBe("Meeting Notes");
      expect(data.content).toContain("Attendees");
      createdDocIds.push(data._id);
    });

    it("creates a new document from Software Spec template", async () => {
      const spec = getTemplateById("software-spec")!;
      const req = makeJsonRequest("http://localhost:3000/api/documents", "POST", {
        title: spec.title,
        content: spec.content,
        ownerId: ALICE_ID,
      }, { "x-user-id": ALICE_ID });

      const res = await createDocument(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data._id).toBeDefined();
      expect(data.title).toBe("Software Spec");
      expect(data.content).toContain("High-Level Architecture");
      createdDocIds.push(data._id);
    });

    it("creates a new document from Resume / CV template", async () => {
      const resume = getTemplateById("resume")!;
      const req = makeJsonRequest("http://localhost:3000/api/documents", "POST", {
        title: resume.title,
        content: resume.content,
        ownerId: ALICE_ID,
      }, { "x-user-id": ALICE_ID });

      const res = await createDocument(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data._id).toBeDefined();
      expect(data.title).toBe("Resume / CV");
      expect(data.content).toContain("Alex Mercer");
      createdDocIds.push(data._id);
    });

    it("creates a new document from Weekly Report template", async () => {
      const report = getTemplateById("weekly-report")!;
      const req = makeJsonRequest("http://localhost:3000/api/documents", "POST", {
        title: report.title,
        content: report.content,
        ownerId: ALICE_ID,
      }, { "x-user-id": ALICE_ID });

      const res = await createDocument(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data._id).toBeDefined();
      expect(data.title).toBe("Weekly Report");
      expect(data.content).toContain("Metrics Overview");
      createdDocIds.push(data._id);
    });

    it("fails with 400 when ownerId and user auth header are missing", async () => {
      const req = makeJsonRequest("http://localhost:3000/api/documents", "POST", {
        title: "Missing Owner Doc",
        content: "<p>test</p>",
      });

      const res = await createDocument(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });
});
