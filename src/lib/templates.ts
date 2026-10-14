export interface TemplateItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  badgeColor: string;
  content: string;
}

export const BLANK_TEMPLATE: TemplateItem = {
  id: "blank",
  title: "Blank Document",
  subtitle: "Start fresh with a clean, unformatted canvas",
  category: "General",
  badgeColor: "bg-blue-600",
  content: "<p>Start writing your new document here...</p>",
};

export const TEMPLATES: TemplateItem[] = [
  {
    id: "proposal",
    title: "Project Proposal",
    subtitle: "Enterprise cloud workspace proposal & implementation roadmap",
    category: "Work",
    badgeColor: "bg-blue-500",
    content: `<h1>PROJECT PROPOSAL: ENTERPRISE CLOUD WORKSPACE</h1><p><strong>Prepared for:</strong> Global Operations Board &bull; <strong>Prepared by:</strong> Lead Solutions Architect<br><strong>Date:</strong> October 2026 &bull; <strong>Status:</strong> Approved for Execution</p><hr><h2>1. Executive Summary</h2><p>This proposal outlines the strategic roadmap for deploying a next-generation real-time document collaboration platform. Designed to eliminate workflow friction, enforce end-to-end access boundaries, and deliver sub-second collaborative performance across enterprise teams.</p><h2>2. Strategic Objectives</h2><ul><li><strong>Sub-second Synchronization:</strong> High-efficiency debounced autosave with real-time peer visibility.</li><li><strong>Enterprise RBAC Governance:</strong> Granular Owner, Editor, and Viewer permission controls.</li><li><strong>Multi-Format Interoperability:</strong> Seamless export pipelines for Markdown, HTML, and Print-ready PDF.</li></ul><h2>3. Key Milestones &amp; Implementation Roadmap</h2><table><thead><tr><th>Phase</th><th>Milestone Deliverable</th><th>Lead Owner</th><th>Target Window</th><th>Status</th></tr></thead><tbody><tr><td>Phase 1</td><td>Core Canvas Engine &amp; Rich Formatting</td><td>Alice Vance</td><td>Q1 2026</td><td>Completed</td></tr><tr><td>Phase 2</td><td>RBAC Permission Matrix &amp; Share Engine</td><td>Bob Smith</td><td>Q2 2026</td><td>Completed</td></tr><tr><td>Phase 3</td><td>Enterprise Template Suite &amp; Performance Hardening</td><td>Charlie Day</td><td>Q3 2026</td><td>Active</td></tr></tbody></table><h2>4. Investment &amp; Resource Allocation</h2><blockquote><p>&ldquo;Investing in reliable, low-latency collaborative infrastructure delivers compounding engineering velocity and guarantees data security at scale.&rdquo;</p></blockquote><hr><p><strong>Authorization &amp; Sign-off:</strong> Alice Vance, VP of Product Engineering &mdash; <em>Approved October 2026</em></p>`,
  },
  {
    id: "meeting-notes",
    title: "Meeting Notes",
    subtitle: "Sprint sync, discussion points & actionable ownership",
    category: "General",
    badgeColor: "bg-emerald-500",
    content: `<h1>TEAM SPRINT SYNC &amp; PRODUCT ALIGNMENT</h1><p><strong>Date:</strong> October 14, 2026 &bull; <strong>Time:</strong> 10:00 AM &ndash; 11:00 AM EST &bull; <strong>Location:</strong> Room 402 / Virtual<br><strong>Attendees:</strong> Alice Vance (Lead Author &amp; Owner), Bob Smith (Core Collaborator), Charlie Day (Reviewer &amp; QA)</p><hr><h2>1. Meeting Agenda</h2><ol><li>Review quarterly collaboration benchmarks and latency telemetry</li><li>Google Docs inspired UI/UX overhaul: document canvas, toolbars, and template gallery</li><li>Security boundaries, token verification, and RBAC authorization policies</li></ol><h2>2. Discussion Points &amp; Strategic Decisions</h2><p>The team reviewed recent user feedback on the editor experience. Unanimous agreement to adopt a clean, Google Docs sheet aesthetic with distraction-free margins, unified theme switcher, and instant auto-fill demo accounts.</p><h2>3. Action Items &amp; Ownership</h2><table><thead><tr><th>Action Item</th><th>Lead Owner</th><th>Priority</th><th>Due Date</th></tr></thead><tbody><tr><td>Finalize high-fidelity template gallery and realistic previews</td><td>Alice Vance</td><td>High</td><td>Oct 18, 2026</td></tr><tr><td>Benchmark mobile viewport responsiveness and toolbar overflow</td><td>Bob Smith</td><td>Medium</td><td>Oct 20, 2026</td></tr><tr><td>Execute automated RBAC permission penetration tests</td><td>Charlie Day</td><td>High</td><td>Oct 22, 2026</td></tr></tbody></table><hr><p><em>Next Meeting Scheduled: Wednesday, October 21, 2026 at 10:00 AM EST</em></p>`,
  },
  {
    id: "software-spec",
    title: "Software Spec",
    subtitle: "System architecture, core data models & RBAC API contracts",
    category: "Engineering",
    badgeColor: "bg-indigo-500",
    content: `<h1>SYSTEM ARCHITECTURE SPECIFICATION</h1><p><strong>Document ID:</strong> SPEC-2026-ENG-04 &bull; <strong>Version:</strong> 2.0-Production &bull; <strong>Status:</strong> Approved<br><strong>Principal Architect:</strong> Alex Mercer &bull; <strong>Target System:</strong> Ajaia Collaborative Docs Engine</p><hr><h2>1. High-Level Architecture Overview</h2><p>The collaborative editor engine is built upon a high-concurrency Next.js App Router hybrid model with MongoDB state persistence and client-side reactive state trees.</p><h2>2. Core Data Models &amp; Schema</h2><p>The primary document entity enforces strict schema-level authorization attributes:</p><pre><code>interface IDocument {
  _id: ObjectId;
  title: string;
  content: string; // Sanitized TipTap HTML
  ownerId: string; // Root author with administrative rights
  sharedWith: string[]; // Explicit collaborator user IDs
  createdAt: Date;
  updatedAt: Date;
}</code></pre><h2>3. Security Boundaries &amp; Access Control (RBAC)</h2><ul><li><strong>Owner:</strong> Full read, write, rename, share management, and document deletion.</li><li><strong>Editor:</strong> Real-time read and write content mutations; restricted from deleting or revoking owner.</li><li><strong>Viewer:</strong> Read-only access with disabled formatting tools and protected document tree.</li></ul><h2>4. API Contract Endpoints</h2><table><thead><tr><th>Endpoint</th><th>Method</th><th>RBAC Scope</th><th>Function</th></tr></thead><tbody><tr><td><code>/api/documents</code></td><td>GET / POST</td><td>Authenticated</td><td>List user documents or create new canvas</td></tr><tr><td><code>/api/documents/[id]</code></td><td>GET / PUT / DELETE</td><td>Owner / Collaborator</td><td>Fetch document, autosave mutations, or delete</td></tr><tr><td><code>/api/documents/[id]/share</code></td><td>POST</td><td>Owner Only</td><td>Grant or revoke collaborator access</td></tr></tbody></table>`,
  },
  {
    id: "resume",
    title: "Resume / CV",
    subtitle: "Executive 2-column curriculum vitae & technical leadership",
    category: "Personal",
    badgeColor: "bg-purple-500",
    content: `<h1>Alex Mercer</h1><p><strong>Lead Full-Stack Architect &amp; Engineering Manager</strong><br>San Francisco, CA &bull; alex.mercer@example.com &bull; +1 (555) 019-2834 &bull; linkedin.com/in/alexmercer</p><hr><h2>Professional Summary</h2><p>Distinguished software architect with 8+ years of expertise engineering high-scale collaborative web platforms, low-latency document pipelines, and fault-tolerant distributed cloud services. Proven track record of leading cross-functional teams from ideation to multi-million user deployment.</p><h2>Core Competencies &amp; Technical Skills</h2><ul><li><strong>Languages &amp; Frameworks:</strong> TypeScript, React, Next.js, Node.js, Python, Tailwind CSS, TipTap / ProseMirror</li><li><strong>Architecture &amp; Cloud:</strong> Microservices, WebSockets, MongoDB, Redis, Docker, Kubernetes, AWS &amp; Vercel</li><li><strong>Leadership:</strong> Technical strategy, sprint planning, hiring &amp; mentorship, enterprise RBAC security</li></ul><h2>Professional Experience</h2><h3>Principal Software Architect &bull; CloudFlow Technologies (2022 &ndash; Present)</h3><ul><li>Architected real-time collaborative document engine serving 450,000+ monthly active enterprise users.</li><li>Engineered debounced sync pipeline reducing database write load by 68% while sustaining sub-50ms roundtrip save times.</li><li>Spearheaded role-based access control (RBAC) audit ensuring 100% compliance across all data boundaries.</li></ul><h3>Senior Full-Stack Engineer &bull; Horizon Labs (2019 &ndash; 2022)</h3><ul><li>Built intuitive document authoring surfaces with custom markdown formatting extensions and live previews.</li><li>Automated end-to-end integration test suites boosting deployment velocity by 40%.</li></ul><h2>Education &amp; Credentials</h2><p><strong>Bachelor of Science in Computer Science</strong> &bull; Stanford University (2015 &ndash; 2019)<br><strong>Certifications:</strong> AWS Certified Solutions Architect Professional &bull; Certified Scrum Master (CSM)</p>`,
  },
  {
    id: "weekly-report",
    title: "Weekly Report",
    subtitle: "Engineering velocity, weekly metrics & milestone deliverables",
    category: "Product",
    badgeColor: "bg-amber-500",
    content: `<h1>WEEKLY PRODUCT &amp; ENGINEERING STATUS REPORT</h1><p><strong>Reporting Period:</strong> Week 42 (October 13 &ndash; October 17, 2026) &bull; <strong>Department:</strong> Product Engineering<br><strong>Lead Author:</strong> Alice Vance &bull; <strong>Distribution:</strong> Executive Leadership Team &bull; <strong>Status:</strong> On Track</p><hr><h2>1. Executive Summary &amp; Key Highlights</h2><ul><li><strong>Google Docs Polish:</strong> Shipped Google Docs inspired canvas sheets, ruler bars, and high-fidelity template previews.</li><li><strong>Quality Assurance:</strong> Maintained 100% test pass rate across 56 automated authentication and document unit tests.</li><li><strong>Clean Production Look:</strong> Streamlined workspace dashboard, removed legacy evaluator banners, and enhanced theme contrast.</li></ul><h2>2. Weekly Metrics Overview &amp; KPIs</h2><table><thead><tr><th>Metric Category</th><th>Current Value</th><th>Previous Week</th><th>WoW Variance</th><th>Target Benchmark</th></tr></thead><tbody><tr><td>Active Documents Edited</td><td>1,248 docs</td><td>1,023 docs</td><td>+22.0%</td><td>1,000+ docs</td></tr><tr><td>Average Save Latency</td><td>48 ms</td><td>62 ms</td><td>-22.5% (Faster)</td><td>&lt; 100 ms</td></tr><tr><td>Test Suite Pass Rate</td><td>100.0%</td><td>100.0%</td><td>Stable</td><td>100%</td></tr><tr><td>Crash-Free Sessions</td><td>99.98%</td><td>99.95%</td><td>+0.03%</td><td>&gt; 99.9%</td></tr></tbody></table><h2>3. Deliverables &amp; Milestone Tracking</h2><table><thead><tr><th>Initiative</th><th>Lead Owner</th><th>Target Milestone</th><th>Status</th></tr></thead><tbody><tr><td>Collaborative Docs Canvas &amp; Toolbar</td><td>Alice Vance</td><td>Sprint 42</td><td>Completed</td></tr><tr><td>High-Fidelity Template Gallery</td><td>Bob Smith</td><td>Sprint 42</td><td>Completed</td></tr><tr><td>Automated RBAC Test Hardening</td><td>Charlie Day</td><td>Sprint 43</td><td>In Review</td></tr></tbody></table><h2>4. Next Sprint Priorities &amp; Blockers</h2><p><strong>Blockers:</strong> Zero blocking impediments identified.<br><strong>Top Priorities:</strong> Performance stress test under 500 concurrent connections, mobile landscape formatting, and offline sync queuing.</p>`,
  },
];

export function getTemplateById(id: string): TemplateItem | undefined {
  if (id === "blank") return BLANK_TEMPLATE;
  return TEMPLATES.find((t) => t.id === id);
}

export function calculateTemplateWordCount(html: string): number {
  if (!html) return 0;
  const plainText = html
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .trim();
  if (!plainText) return 0;
  return plainText.split(/\s+/).filter(Boolean).length;
}
