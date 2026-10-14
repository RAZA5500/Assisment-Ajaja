# AI Utilization & Engineering Workflow Record

This document provides transparent documentation of how AI was utilized throughout the design, development, and verification of the **Ajaia Docs** application.

---

## 1. AI Utilization Overview

AI assistance was utilized as an engineering pair-programmer and architecture sounding board across four core stages:
1. **Requirements Decomposition**: Translating product specifications into a modular Next.js 14 App Router file structure.
2. **Schema & RBAC Design**: Analyzing database normalization versus embedded collaborator arrays for document sharing.
3. **Editor & Parser Synthesis**: Implementing TipTap integration and client-side Markdown-to-HTML parser without external runtime overhead.
4. **Adversarial Verification**: Writing rigorous Vitest integration test cases to stress-test authorization boundaries, 403 enforcement, and edge cases.

---

## 2. Prompts & Directives Used

### Prompt 1: Initial Architecture & Tech Stack Scaffolding
> *"Act as a Principal Full-Stack Product Engineer. Build a lightweight, collaborative document editor inspired by Google Docs using Next.js (App Router), TypeScript, Tailwind CSS, TipTap, and MongoDB (with Mongoose). Ensure clean, modular, production-ready code with seeded mock auth (Alice & Bob), role-based access control, file import for .txt and .md, and debounced auto-save."*

### Prompt 2: Rich Text & File Ingestion
> *"Implement a robust TipTap editor toolbar supporting H1, H2, Bold, Italic, Underline, Bulleted List, Numbered List, and custom save status badges. For the File Import modal, build a client-side parser that converts .md syntax (headings, lists, inline emphasis) and .txt newlines directly into TipTap-compatible HTML."*

### Prompt 3: Access Control & Authorization Logic
> *"Enforce strict ownership and sharing rules. When User B attempts to access a document owned by User A that has not been shared, return HTTP 403 Forbidden on the backend and render a polished Access Denied screen on the frontend with a quick switch button."*

---

## 3. Rejected Suggestions & Critical Thinking Adjustments

| Suggestion | AI Proposal | Principal Engineer Decision | Rationale |
| :--- | :--- | :--- | :--- |
| **Collaborator Table** | Create a separate `DocumentCollaborator` collection in MongoDB. | **Rejected** in favor of an embedded `sharedWith: string[]` array. | Low collaborator cardinality (< 50) per doc. Embedding enables single-query atomic reads and updates (`$addToSet`, `$pull`), avoiding multi-collection transactions and `$lookup` latency. |
| **External Markdown Parser** | Install heavy third-party parsing dependencies (`marked`, `remark`, `rehype`). | **Rejected** in favor of a targeted lightweight parser (`src/lib/markdown.ts`). | Avoids bundle bloat, eliminates security concerns with unvetted parser extensions, and formats directly into the precise HTML tags TipTap expects. |
| **Instant Auto-Save on Keystroke** | Trigger a `PATCH` API request on every character typed. | **Rejected** in favor of a 1500ms debounce + deterministic `Ctrl+S` manual trigger. | Continuous keystroke requests cause severe database write amplification and rate limiting. A 1500ms debounce ensures smooth UX with minimal backend strain. |
| **Tailwind Arbitrary Class Names** | Using non-standard color shades like `slate-750` in `@apply`. | **Rejected & Refactored** to standard Tailwind utility tokens (`slate-800`, `slate-900`). | Non-standard classes cause PostCSS build failure during production Next.js webpack compilation. |

---

## 4. Verification & Testing Record

### 1. Integration Test Suite (`vitest run`)
- **Engine**: Vitest 2.1 in Node environment with local MongoDB.
- **Coverage**:
  - `POST /api/documents`: Document creation, default title generation, sanitized collaborator array, and owner assignment (HTTP 201).
  - `GET /api/documents`: Filtering by user and tab (all, owned, shared), plus adversarial regex character search without crashing (HTTP 200).
  - `GET /api/documents/[id]`: Owner access verified (HTTP 200); unauthorized access denied with `documentOwnerId` (HTTP 403).
  - `PATCH /api/documents/[id]/share`: Non-owner blocked from modifying permissions (HTTP 403); owner grants access to Bob (HTTP 200).
  - `GET /api/documents/[id]`: Newly shared collaborator Bob can view (HTTP 200).
  - `PATCH /api/documents/[id]`: Collaborator Bob successfully persists content updates (HTTP 200).
  - `Third party isolation`: Charlie remains blocked with HTTP 403.
  - `Access revocation`: Alice revokes Bob's access; Bob is immediately blocked again with HTTP 403.
  - `DELETE /api/documents/[id]`: Non-owner Bob is blocked (HTTP 403); Owner Alice deletes document (HTTP 200).
  - `404 verification`: Subsequent retrieval of deleted document returns HTTP 404.
  - `400 verification`: Malformed/invalid ObjectId returns HTTP 400.
  - `Markdown parser`: Validates H1, H2, H3, bulleted lists, numbered lists, bold, italic, and protected inline code spans without syntax corruption.
  - `Plain text parser`: Validates paragraph wrapping and empty input handling.
- **Result**: **19 passed across all integration test cases**.

### 2. Production Build Verification (`next build`)
- Executed `npm run build` targeting Next.js 14.2 production output.
- All dynamic routes (`/api/documents`, `/api/documents/[id]`, `/api/documents/[id]/share`, `/doc/[id]`) compiled cleanly with zero TypeScript errors and zero lint warnings.
