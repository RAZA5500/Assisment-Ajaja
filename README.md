# Ajaia Docs — Lightweight Collaborative Document Editor

> **Ajaia LLC Engineering Assessment Deliverable**  
> Built by Principal Full-Stack Product Engineer using **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **TipTap**, and **MongoDB (Mongoose)**. Fully optimized for production and Vercel deployment.

---

## 🚀 Live Demo & Project Overview

**Ajaia Docs** is a Google Docs-inspired collaborative document editor. It features real-time rich-text editing, granular document sharing with role-based access control (RBAC), simulated multi-user authentication with instantaneous profile switching, seamless file importing (`.md` and `.txt`), debounced auto-saving with clear status indicators, and full CRUD workflows.

### ✨ Key Features

1. **Authentication, Login Page & Demo Credentials Autofill**
   - Dedicated **/login** route with full-stack authentication (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`).
   - **One-Click Demo Credentials Autofill & Instant Login**:
     - 👩 **Alice Vance** (`alice@example.com` | `password123` | ID: `user_alice_123`) — Owner & Creator
     - 👨 **Bob Smith** (`bob@example.com` | `password123` | ID: `user_bob_456`) — Core Collaborator
     - 🧑 **Charlie Day** (`charlie@example.com` | `password123` | ID: `user_charlie_789`) — Reviewer & Viewer
   - Clicking "Autofill Fields" populates inputs; clicking "Instant Login" bypasses typing for immediate evaluation.
   - Header-level **Switch User** dropdown and "Sign Out" button to seamlessly test RBAC without losing sessions.
   - Session persisted in `localStorage` and HTTP cookie (`ajaia_session_user`).

2. **TipTap Rich Text Editing**
   - Integrated TipTap engine (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`).
   - Sticky formatting toolbar:
     - Headings (H1, H2, Paragraph)
     - Inline text formatting (Bold, Italic, Underline, Code)
     - Lists (Bulleted Lists, Numbered Lists)
     - Blockquotes and Code Blocks
     - History (Undo, Redo)
   - Visual status badges: `Saved` (green check), `Saving...` (amber spinner), and `Unsaved changes` (clock icon).
   - Debounced auto-save (1500ms after typing stops) and explicit save (`Ctrl+S` / `Cmd+S` or toolbar button).
   - Preserves complete document formatting across reloads.

3. **File Import & Parser Engine**
   - Drag-and-drop or file picker supporting **`.md`** and **`.txt`** files.
   - Client-side parser converts Markdown headings, lists, bold/italic, blockquotes, and code blocks into TipTap-compatible HTML.
   - Plain text newline preservation into structured paragraphs.
   - Automatically derives document title from filename (removing extension).
   - Validates file size (≤ 5MB) and file extension before ingestion.

4. **Document Sharing & Access Control (RBAC)**
   - Granular document-level permissions: Owner vs Collaborator.
   - Interactive **Share Modal** inside the editor and dashboard:
     - View owner and current collaborators.
     - Grant access to other seeded users or custom IDs.
     - Revoke access with immediate effect.
     - One-click "Copy Shareable Link" with feedback.
   - **Enforced Access Control**:
     - Visiting a document that is not owned by or shared with the active user triggers an HTTP `403 Forbidden` view with clear contextual instructions and a one-click profile switch.
     - Non-owners cannot delete documents or alter sharing settings.
   - Dashboard filtering tabs:
     - **All Documents** (accessible to active user)
     - **Owned by Me** (created by active user)
     - **Shared with Me** (granted access by others)
   - Color-coded badges: `Owner` vs `Shared by [Name]`.

5. **Production Quality & Polish**
   - Loading skeletons and empty state call-to-actions.
   - Non-intrusive floating toast notifications for success/error feedback.
   - Responsive design with Tailwind CSS dark/light theme foundation.
   - Automated integration tests with **Vitest**.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14.2 (App Router, Server API Routes)
- **Language**: TypeScript 5.7 (Strict mode)
- **Database**: MongoDB with Mongoose 8.8 ODM (Singleton connection pooling)
- **Rich Text Editor**: TipTap 2.10 (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-heading`, `@tiptap/extension-bullet-list`, `@tiptap/extension-ordered-list`, `@tiptap/extension-underline`)
- **Styling**: Tailwind CSS 3.4 & Lucide React icons
- **Testing**: Vitest 2.1 integration test suite (29 tests across auth, RBAC, and document suites)

---

## 📦 Directory Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts       # POST (credentials & demo autofill auth)
│   │   │   │   ├── logout/route.ts      # POST (session clear)
│   │   │   │   └── me/route.ts          # GET (session check)
│   │   │   └── documents/
│   │   │       ├── route.ts             # GET (list with filters), POST (create)
│   │   │       ├── [id]/
│   │   │       │   ├── route.ts         # GET (403 check), PATCH (edit), DELETE (owner only)
│   │   │       │   └── share/
│   │   │       │       └── route.ts     # PATCH (manage collaborators, owner check)
│   │   ├── doc/
│   │   │   └── [id]/
│   │   │       └── page.tsx             # Document Editor page (TipTap, 403 gate, inline title)
│   │   ├── login/
│   │   │   └── page.tsx                 # Full-stack Login page with 1-click Demo Autofill
│   │   ├── globals.css                  # Modern Tailwind directives, scrollbar & TipTap prose
│   │   ├── layout.tsx                   # App layout with UserProvider & ToastProvider
│   │   └── page.tsx                     # Dashboard with filter tabs, cards, search, & import
│   ├── components/
│   │   ├── Editor.tsx                   # TipTap Rich Text Toolbar, word count & Editor
│   │   ├── FileUpload.tsx               # Drag-and-drop .md / .txt file importer
│   │   ├── Navbar.tsx                   # Modern top header, breadcrumbs, inline title
│   │   ├── ShareModal.tsx               # Collaboration and permissions management
│   │   └── UserSwitcher.tsx             # Header profile switcher dropdown & Sign Out
│   ├── context/
│   │   ├── ToastContext.tsx             # Floating notification system
│   │   └── UserContext.tsx              # Authentication, login/logout & LocalStorage persistence
│   ├── lib/
│   │   ├── auth.ts                      # Seeded user profiles definitions
│   │   ├── markdown.ts                  # Markdown and plain text to HTML parser
│   │   ├── mongodb.ts                   # Mongoose singleton connection helper
│   │   └── utils.ts                     # Tailwind class merge & date formatting
│   └── models/
│       └── Document.ts                  # Mongoose Document Schema & Indexes
├── src/__tests__/
│   ├── auth.test.ts                     # Authentication & demo autofill integration tests
│   └── document-access.test.ts          # Vitest integration test suite (19 tests)
├── ARCHITECTURE.md                      # Engineering tradeoffs & system design decisions
├── AI_WORKFLOW.md                       # AI workflow transparency log
├── SUBMISSION.md                        # Final deliverable checklist
├── next.config.mjs                      # Next.js production configuration
├── vitest.config.ts                     # Vitest test configuration
├── tailwind.config.ts                   # Tailwind configuration
└── package.json                         # Dependencies and build scripts
```

---

## ⚡ Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ / v22+ recommended)
- **MongoDB**: A running local MongoDB instance (e.g., `mongodb://localhost:27017/ajaia-doc-editor`) OR a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster connection string.

### 2. Clone and Install
```bash
git clone <repository-url>
cd ajaia-assisment-documnet-editor
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
MONGODB_URI=mongodb://localhost:27017/ajaia-doc-editor
# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/ajaia-doc-editor?retryWrites=true&w=majority
```
*(If omitted, the singleton helper automatically falls back to `mongodb://127.0.0.1:27017/ajaia-doc-editor`)*.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Production Build
```bash
npm run build
npm run start
```

### 6. Run Integration Test Suite
```bash
npm test
```
Runs the 19 Vitest integration test cases directly against the Next.js API route handlers validating document creation, default schema attributes, permission boundaries, sharing workflows, 403 access denial, deletion constraints, adversarial regex search safety, and Markdown ingestion.

---

## 🧪 Testing Access Control & User Switching

To verify functional requirements in the browser:
1. **Create as Alice**: Ensure Alice Vance is selected in the top-right switcher. Click **"Create New Document"** or **"Import File"**.
2. **Rename and Edit**: Click the title to rename it (e.g., "Alice's Confidential Notes"). Add formatted text with headings and lists. Notice the "Saved" badge update automatically.
3. **Switch to Bob**: In the top-right switcher, select **Bob Smith**.
   - Notice the document disappeared from Bob's dashboard (because it hasn't been shared).
   - If Bob tries to access `/doc/<alice-doc-id>` directly, an explicit **HTTP 403 • Access Denied** view is rendered with a button to switch back to Alice.
4. **Share with Bob**: Switch back to Alice Vance, open the document, click **Share**, select **Bob Smith**, and click **Share**.
5. **Verify Bob's Access**: Switch back to Bob Smith. The document now appears in Bob's dashboard under **"Shared with Me"** with a green `Shared by Alice` badge. Bob can open the document and make edits.
6. **Revoke Access**: Switch back to Alice Vance, open **Share**, and click the trash icon next to Bob Smith. Bob's access is immediately revoked.

---

## ☁️ Vercel Deployment Guide

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Go to [Vercel Dashboard](https://vercel.com/new) and import the repository.
3. In **Environment Variables**, add:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI (`mongodb+srv://...`).
4. Click **Deploy**.
5. Vercel automatically builds the Next.js App Router application with zero custom build configuration required.
