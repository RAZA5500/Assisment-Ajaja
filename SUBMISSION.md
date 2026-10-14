# Deliverable Submission & Project Documentation

**Project:** Lightweight Collaborative Document Editor (Google Docs Inspired)  
**Assessment for:** Ajaia LLC  
**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, TipTap Editor, MongoDB & Mongoose, Puppeteer, DOCX Generator, Vitest  
**Status:** Complete & Production Ready (104/104 Tests Passing, Clean Next.js Build)

---

## 🔑 Test Accounts & Credentials

The platform features full cookie/session authentication, MongoDB user persistence, and pre-seeded test accounts covering all collaboration roles. You can sign in directly or register new custom accounts via the Sign Up page.

| Name / Persona | Email | Password | Primary Role & Intended Test Scenario |
| :--- | :--- | :--- | :--- |
| **Primary Test Account** | `test@ex.com` | `12345678` | Document Owner & Creator. Use to create docs, share with collaborators, set General Access, and export files. |
| **Secondary Test Account** | `hraza5701@gmail.com` | `12345678` | Collaborator. Use to verify email-based sharing, editor/viewer permissions, and real-time document access. |
| **Alice Vance** | `alice@example.com` | `password123` | Seeded Lead Author & Owner. Pre-owns documents and templates. |
| **Bob Smith** | `bob@example.com` | `password123` | Seeded Collaborator / Editor. Ideal for testing co-editing and edit permissions. |
| **Charlie Day** | `charlie@example.com` | `password123` | Seeded Reviewer / Viewer. Ideal for testing read-only access and viewer restrictions. |

> **Sign Up & Registration:** Anyone can also create a new account directly via `/signup`. New accounts are stored in MongoDB and receive their own initials and avatar badge.

---

## 🌟 Executive Overview & Architectural Highlights

This application is a production-grade, Google Docs-inspired collaborative document editor designed with modern full-stack web standards:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NEXT.JS 14 FRONTEND                            │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │     Dashboard (/)       │  │          Document Editor (/doc/[id])     │  │
│  │  • Template Gallery     │  │  • Google Docs Sheet Canvas & Ruler      │  │
│  │  • Live Search & Tabs   │  │  • TipTap Formatting Toolbar             │  │
│  │  • Grid & List Views    │  │  • Debounced Auto-Save & Cloud Status    │  │
│  │  • 3-Dot Quick Actions  │  │  • Mode Switcher (Editing vs Viewing)    │  │
│  │  • 5-Format Downloads   │  │  • Real-Time Collaborator Presence       │  │
│  └─────────────────────────┘  └──────────────────────────────────────────┘  │
│          │                                         │                        │
│          ▼                                         ▼                        │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │      Modals & UI        │  │              Export Engine               │  │
│  │  • Share Modal (RBAC)   │  │  • Puppeteer PDF (Print Sheet Styling)   │  │
│  │  • Template Preview     │  │  • Microsoft Word (.docx) Native File   │  │
│  │  • Delete Confirmation  │  │  • Markdown (.md) with Table Parsing     │  │
│  │  • File Upload (.md)    │  │  • Standalone HTML (.html) & Plain Text  │  │
│  └─────────────────────────┘  └──────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            NEXT.JS SERVER / API                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────┐ │
│  │     /api/auth/*       │  │   /api/documents/*    │  │   /api/export/*  │ │
│  │  • Cookie Sessions    │  │  • CRUD Operations     │  │  • Puppeteer    │ │
│  │  • Password Auth      │  │  • RBAC Permissions   │  │  • DOCX Engine  │ │
│  │  • MongoDB User Sync  │  │  • Email Collaboration │  │  • Magic Bytes  │ │
│  └───────────────────────┘  └───────────────────────┘  └──────────────────┘ │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MONGODB PERSISTENCE LAYER                          │
│     Documents Collection (Schemas, Indexes, General Access, Viewers)         │
│     Users Collection (Auth, Avatars, Roles, Bcrypt Hashed Passwords)        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Comprehensive Feature Breakdown

### 1. Authentication & Session Management
- **Full Authentication Flow**: Login (`/login`), Registration (`/signup`), and Logout.
- **Session Cookies & Header Fallbacks**: Seamless authentication using secure HTTP-only cookies (`ajaia_session_user`) with backward-compatible request header support (`x-user-id`, `x-user-email`).
- **Profile Avatars & Initials**: Custom generated initials and avatar badges with role titles.
- **Account Switcher**: Header component allows instantaneous testing by switching between seeded profiles or logging into custom accounts.
- **Access Denied Screen**: Unauthorized visitors on restricted documents see a Google Docs-inspired "You need access" view with one-click account switching or owner request guidance.

### 2. Google Docs Canvas & TipTap Rich Text Editor
- **Authentic Document Canvas**: Centered sheet layout with margins, optional visual ruler, and customizable zoom controls (50% to 200%).
- **Rich Formatting Toolbar**:
  - Typography: Heading 1, Heading 2, Heading 3, Body Paragraph.
  - Text Styles: Bold, Italic, Underline, Strikethrough, Inline Code.
  - Structure: Bulleted Lists, Numbered Lists, Blockquotes, Horizontal Dividers.
  - Real Tables: Native TipTap table node with headers, body rows, and clean borders.
  - Text Alignment: Left, Center, Right, Justify.
  - History: Undo and Redo with keyboard shortcuts.
- **Real-Time Word & Character Count**: Dynamic counters in the bottom toolbar updating on every keystroke.
- **Document Mode Switcher**:
  - **Editing**: Full editing and formatting capability.
  - **Viewing**: Read-only display simulating print preview.
- **Debounced Cloud Auto-Save**: Saves changes automatically 1500ms after typing stops, accompanied by instant `Ctrl+S` / `Cmd+S` shortcuts and visual status pills:
  - `Saving...` with spinner.
  - `Saved to Drive` with cloud icon and last saved timestamp.
  - `Unsaved changes` warning indicator.
- **Inline Title Renaming**: Click-to-edit document title in the header with Enter/Escape key support and Star toggling.
- **Active Collaborator Presence**: Avatars of the document owner and all invited collaborators shown in the header with status badges.

### 3. Sharing, Access Control & RBAC
- **Direct Email Collaboration**: Document owners can invite collaborators directly by typing their email.
- **Safe Default Role**: Collaborator invites default to **Viewer** (read-only) rather than Editor.
- **Custom Popover UI**: Custom-styled popover dropdowns replace unstyled browser `<select>` elements.
- **General Access Settings**:
  - **Restricted**: Only explicitly added collaborators can access. The "Copy link" button is cleanly hidden with helpful guidance.
  - **Anyone with the link**: The "Copy link" button dynamically appears with link-copied feedback. Supports configuring public role as **Viewer** or **Editor**.
- **Vercel Deployment Compatibility**:
  - Links are generated using dynamic `window.location.origin + "/doc/" + id`, ensuring links work immediately across `*.vercel.app` or custom domains.
  - Public link documents allow anonymous users to view/edit without forced login redirects or 403 Forbidden errors.

### 4. Comprehensive Document Export Engine
Supports 5 industry-standard export formats across the **File -> Download** menu, **Editor Toolbar**, and **Dashboard 3-Dot Menus**:

| Format | Technology / Engine | Key Capabilities |
| :--- | :--- | :--- |
| **PDF (.pdf)** | **Puppeteer (Headless Chromium)** | Server-rendered high-res PDF with authentic Google Docs print sheet layout, document title header, dynamic `Page X of Y` footer pagination, table styling, and print fallback. |
| **Word (.docx)** | **Native DOCX Generator** | Standard Microsoft Word file preserving headings, bulleted/numbered lists, tables, blockquotes, bold, italic, and code blocks. |
| **Markdown (.md)** | **Markdown AST Exporter** | Clean GitHub Flavored Markdown with preserved headers, lists, code spans, quotes, and pipe tables. |
| **Web Page (.html)**| **Standalone HTML Engine** | Complete self-contained HTML page with responsive typography and embedded styles. |
| **Plain Text (.txt)**| **Clean Text Serializer** | Plain text extract suitable for raw reading, scripting, or terminal usage. |

### 5. Template Gallery & Launcher
- **High-Fidelity Miniature Page Previews**: Visual Google Docs sheet mockups for each template:
  1. *Blank Document*: Clean canvas with plus sign.
  2. *Project Proposal*: Blue accent banner, executive summary, milestones, and signatures.
  3. *Team Meeting Notes*: Emerald header, agenda checklist, and action items.
  4. *Software Spec*: Tech layout with system architecture boxes and dark code block.
  5. *Resume / CV*: Two-column layout with profile silhouette, timeline, and skills pills.
  6. *Weekly Status Report*: Amber theme with KPI metric counter cards and progress tables.
- **Template Preview Modal**: Interactive modal showing full rendered template, word count, category badge, and a "Use this template" button.
- **File Upload / Import**: Modal supporting drag-and-drop or file selection for `.md` and `.txt` files up to 5MB.

### 6. Dashboard Document Management
- **Live Search**: Instant keyword filtering across document titles.
- **Ownership Filter Tabs**: "All Documents", "Owned by me", "Shared with me".
- **Sorting Options**: Last modified (newest/oldest), Title (A to Z, Z to A).
- **View Toggle**: Clean Google Drive Grid view and compact tabular List view.
- **Document Actions**: Direct open, inline rename, multi-format download submenu, sharing modal, and deletion.
- **Delete Confirmation Modal**: Custom modal prevents accidental document deletion.

### 7. UI/UX Polish & Feedback
- **Theme Support**: Complete Light and Dark theme with seamless contrast across sheets, modals, toolbars, and menus.
- **Toast Notifications**: Floating slide-in notifications from the right side for all user actions (saving, copying links, sharing, exporting, errors).
- **Loading Skeletons**: Animated skeletons during document loading to prevent content flashing.

---

## 🔌 API Routes Reference

| Endpoint | Method | Description | Access Control / Auth |
| :--- | :---: | :--- | :--- |
| `/api/auth/login` | `POST` | Authenticates user via email and password; sets session cookie | Public |
| `/api/auth/signup` | `POST` | Registers a new user account in MongoDB | Public |
| `/api/auth/me` | `GET` | Returns currently authenticated user profile | Authenticated / Cookie |
| `/api/auth/logout` | `POST` | Clears authentication session cookie | Authenticated |
| `/api/documents` | `GET` | Fetches documents list filtered by user (`all`, `owned`, `shared`) and search query | Authenticated |
| `/api/documents` | `POST` | Creates a new document with authenticated user as owner | Authenticated |
| `/api/documents/[id]` | `GET` | Retrieves document by ID; allows public viewing if General Access is enabled | Owner / Shared / Anyone with link |
| `/api/documents/[id]` | `PATCH` | Updates document title or content; supports autosave | Owner / Editor / Anyone with link (if editor) |
| `/api/documents/[id]` | `DELETE` | Deletes document; restricted strictly to document owner | Document Owner only (403 for others) |
| `/api/documents/[id]/share` | `PATCH` | Updates sharing list, collaborator roles, and General Access settings | Document Owner only |
| `/api/documents/[id]/export/pdf` | `GET`, `POST` | Exports document as PDF via Puppeteer (supports live unsaved content via POST) | Permitted Viewers / Public (if link enabled) |
| `/api/documents/[id]/export/docx`| `GET`, `POST` | Exports document as Microsoft Word `.docx` | Permitted Viewers / Public (if link enabled) |
| `/api/export/pdf` | `POST` | Direct converter transforming raw HTML payload to PDF buffer | Authenticated |
| `/api/export/docx` | `POST` | Direct converter transforming raw HTML payload to DOCX buffer | Authenticated |

---

## 🧪 Testing & Verification Record

All features are covered by automated unit and integration tests passing against live route handlers:

```bash
$ npm test

 RUN  v2.1.9 D:/ajaia-assisment-documnet-editor

 ✓ src/__tests__/templates.test.ts (17 tests)
 ✓ src/__tests__/auth.test.ts (24 tests)
 ✓ src/__tests__/document-access.test.ts (37 tests)
 ✓ src/__tests__/export.test.ts (26 tests)

 Test Files  4 passed (4)
      Tests  104 passed (104)
   Duration  7.84s
```

### Next.js Production Build:
```bash
$ npm run build

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
 ✓ Generating static pages (13/13)
   Finalizing page optimization ...

Route (app)                              Size     First Load JS
┌ ○ /                                    18.7 kB         134 kB
├ ○ /_not-found                          142 B          87.4 kB
├ ƒ /api/auth/login                      0 B                0 B
├ ƒ /api/auth/logout                     0 B                0 B
├ ƒ /api/auth/me                         0 B                0 B
├ ƒ /api/auth/signup                     0 B                0 B
├ ƒ /api/documents                       0 B                0 B
├ ƒ /api/documents/[id]                  0 B                0 B
├ ƒ /api/documents/[id]/export/docx      0 B                0 B
├ ƒ /api/documents/[id]/export/pdf       0 B                0 B
├ ƒ /api/documents/[id]/share            0 B                0 B
├ ƒ /api/export/docx                     0 B                0 B
├ ƒ /api/export/pdf                      0 B                0 B
├ ƒ /doc/[id]                            107 kB          223 kB
├ ○ /login                               7.78 kB         109 kB
└ ○ /signup                              142 B          87.4 kB
+ First Load JS shared by all            87.3 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

Exit code: 0
```

---

## 💻 Local Setup & Execution Guide

### Prerequisites
- **Node.js** 18.x or later
- **MongoDB** instance (Local or MongoDB Atlas connection string)

### 1. Environment Configuration
Create a `.env.local` file in the root directory:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ajaia-editor?retryWrites=true&w=majority
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Execute Automated Tests
```bash
npm test
```

### 5. Create Production Build
```bash
npm run build
npm start
```
