# Architecture & System Design Decisions

This document outlines the architectural patterns, engineering tradeoffs, and system design choices implemented in the **Ajaia Docs** collaborative document editor.

---

## 1. System Topology & Architecture Overview

The system follows a modern, modular Next.js 14 App Router architecture divided into four clean tiers:

```
┌─────────────────────────────────────────────────────────────┐
│                       Presentation Tier                     │
│  - Dashboard View (Filter tabs, Search, Document Grid)      │
│  - Document Editor (Sticky TipTap Toolbar, Inline Title)    │
│  - Modal Dialogs (ShareModal, FileUpload Dropzone)          │
│  - Global Shell (Navbar, UserSwitcher, Toast Notifications) │
└──────────────────────────────┬──────────────────────────────┘
                               │ React Context & Hooks
┌──────────────────────────────▼──────────────────────────────┐
│                        State Tier                           │
│  - UserContext (Mock Auth, LocalStorage persistence)        │
│  - ToastContext (Floating notification dispatch)            │
│  - Editor State (Save status: saved | saving | unsaved)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST HTTP (JSON, x-user-id)
┌──────────────────────────────▼──────────────────────────────┐
│                    Server API Tier (Next.js)                │
│  - /api/documents (GET list, POST create)                   │
│  - /api/documents/[id] (GET 403, PATCH update, DELETE)      │
│  - /api/documents/[id]/share (PATCH grant/revoke)           │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose ODM / Connection Pool
┌──────────────────────────────▼──────────────────────────────┐
│                         Data Tier                           │
│  - MongoDB (Document Collection with compound indexes)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Data Modeling & Database Tradeoffs

### Schema Design: `src/models/Document.ts`

```typescript
{
  title: string,           // Default: "Untitled Document", trim, max 200 chars
  content: string,         // TipTap HTML string
  ownerId: string,         // References active user ID, indexed
  sharedWith: string[],    // Array of user IDs granted edit/view access, indexed
  createdAt: Date,         // Auto-managed timestamp
  updatedAt: Date          // Auto-managed timestamp
}
```

### Key Tradeoffs & Justifications

1. **Embedded Collaborators (`sharedWith: string[]`) vs. Relational Join Collection (`Permissions`)**
   - *Alternative Considered*: A normalized `DocumentPermission` collection with `{ documentId, userId, role }`.
   - *Decision*: Embedded array `sharedWith: string[]` on the document model.
   - *Rationale*: Collaborative document sharing in Google DocsLite features low cardinality per document (typically < 50 collaborators). Embedding allows atomic permission checks within a single query (`$or: [{ ownerId }, { sharedWith: userId }]`), avoids expensive `$lookup` / JOIN queries, and leverages atomic MongoDB operators (`$addToSet`, `$pull`).
   - *Index Optimization*: Compound indexes `{ ownerId: 1, updatedAt: -1 }` and `{ sharedWith: 1, updatedAt: -1 }` ensure that dashboard queries scale efficiently.

2. **TipTap Content Storage: Clean HTML vs. ProseMirror JSON**
   - *Alternative Considered*: Storing the raw ProseMirror abstract syntax tree (JSON).
   - *Decision*: Storing sanitized semantic HTML.
   - *Rationale*:
     - HTML provides seamless interop with file imports (`.md` parsed directly to HTML).
     - Allows instant text extraction for search previews and snippets without needing a full ProseMirror runtime on the server or dashboard cards.
     - TipTap natively parses and serializes HTML back and forth with zero fidelity loss for bold, italic, underline, headings, lists, blockquotes, and code blocks.

---

## 3. Access Control & Authorization (RBAC)

The application enforces strict **Role-Based Access Control (RBAC)** across both server and client layers:

| Role | View Document | Edit Content | Rename Title | Manage Sharing | Delete Document |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Collaborator** (in `sharedWith`) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Unauthorized User** | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |

### Server-Side Enforcement
- Every API route validates identity via `x-user-id` header (or query parameter).
- `GET /api/documents/[id]` queries the database; if `doc.ownerId !== userId` and `!doc.sharedWith.includes(userId)`, it immediately returns an HTTP `403 Forbidden` response:
  ```json
  { "error": "Access denied...", "documentOwnerId": "user_alice_123" }
  ```
- `DELETE` and `PATCH /api/documents/[id]/share` verify that `doc.ownerId === userId`. Unauthorized modification attempts are rejected with `403`.

### Client-Side Defensive Handling
- When the active user navigates to an unauthorized document or switches users while viewing one, the editor does not crash or expose cached content. Instead, it transitions to a dedicated **HTTP 403 Access Denied** state explaining the permission boundary and providing a one-click action to switch back to the document owner.

---

## 4. Rich Text Engine & Persistence Mechanics

### TipTap Integration
- Uses `@tiptap/react` alongside `@tiptap/starter-kit` and `@tiptap/extension-underline`.
- The floating toolbar is rendered in a sticky bar pinned above the document canvas. Active node states (e.g. `editor.isActive('heading', { level: 1 })`) are tracked reactively to provide immediate visual feedback.

### Persistence Strategy: Debounced Auto-Save + Deterministic Save
- **Problem**: In naive auto-save implementations, updating on every keystroke causes write amplification, thrashing the database with dozens of HTTP requests per sentence.
- **Solution**:
  1. **Debounced Auto-Save (1500ms)**: After the user pauses typing for 1500ms, the editor automatically persists changes in the background.
  2. **Deterministic Save**: Users can explicitly trigger immediate persistence via `Ctrl+S` / `Cmd+S` or the toolbar "Save" button.
  3. **Visual State Machine**:
     - `saved`: Green checkmark indicating synchronized state.
     - `saving`: Amber spinner indicating an active patch request.
     - `unsaved`: Clock icon indicating dirty state awaiting debounce timer.

---

## 5. File Ingestion & Parsing Strategy

### Client-Side Parsing Engine (`src/lib/markdown.ts`)
- Instead of requiring multipart server uploads, file ingestion is performed client-side using native `FileReader` / `File.text()`.
- Supports `.md` and `.txt` files up to 5MB.
- **Markdown Conversion**:
  - Headings (`#`, `##`, `###`) $\rightarrow$ `<h1>`, `<h2>`, `<h3>`
  - Inline markers (`**`, `__`, `*`, `_`, `~~`, `` ` ``) $\rightarrow$ `<strong>`, `<em>`, `<s>`, `<code>`
  - Lists (`-`, `*`, `1.`) $\rightarrow$ `<ul><li>`, `<ol><li>`
  - Blockquotes (`>`) $\rightarrow$ `<blockquote><p>`
  - Code blocks (` ``` `) $\rightarrow$ `<pre><code>`
- **Plain Text Conversion**: Escapes raw HTML entities and wraps paragraphs into clean TipTap-compatible blocks while preserving double-newlines.

---

## 6. Production Readiness & Vercel Optimization

1. **MongoDB Connection Pooling for Serverless**:
   - In `src/lib/mongodb.ts`, a global singleton pattern (`global.mongooseCache`) caches the active connection across serverless warm lambdas, preventing connection exhaustion under concurrent requests.
2. **Buffer Commands Disabled (`bufferCommands: false`)**:
   - Fails fast if the database connection cannot be established within the timeout, rather than buffering commands indefinitely in memory.
3. **Strict TypeScript & Zero Build Warnings**:
   - All components, models, and routes are strictly typed with zero `any` evasions.
   - Tailwind utility classes are verified against standard Tailwind presets.
