"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Share2,
  Lock,
  ShieldAlert,
  ArrowRight,
  Clock,
  Loader2,
  Users,
  Shield,
  Save,
  Check,
  Upload,
  Trash2,
  Download,
  Copy,
  Pencil,
  Sparkles,
  Sun,
  Moon,
  Cloud,
  Star,
  Printer,
  Eye,
  Sliders,
  Keyboard,
  HelpCircle,
  X,
  FileDown,
  BookOpen,
  ChevronDown,
  Globe,
} from "lucide-react";
import Editor, { SaveStatus } from "@/components/Editor";
import ShareModal from "@/components/ShareModal";
import FileUpload from "@/components/FileUpload";
import UserSwitcher from "@/components/UserSwitcher";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { useUser, SEEDED_USERS } from "@/context/UserContext";
import { useToast } from "@/context/ToastContext";
import { formatDate } from "@/lib/utils";
import { exportHtmlToMarkdown } from "@/lib/markdown";

interface DocumentData {
  _id: string;
  title: string;
  content: string;
  ownerId: string;
  sharedWith: string[];
  viewers?: string[];
  generalAccess?: "restricted" | "anyoneWithLink";
  generalAccessRole?: "viewer" | "editor";
  createdAt: string;
  updatedAt: string;
}

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params?.id as string;

  const { currentUser, getUserById, switchUser, isHydrated, theme, toggleTheme } =
    useUser();
  const toast = useToast();

  const [document, setDocument] = useState<DocumentData | null>(null);
  const [docTitle, setDocTitle] = useState("Untitled Document");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<{
    denied: boolean;
    ownerId?: string;
  }>({ denied: false });
  const [notFound, setNotFound] = useState(false);

  // Google Docs View & Canvas states
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [editorMode, setEditorMode] = useState<"editing" | "viewing">("editing");
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);

  // Latest saved content
  const latestContentRef = useRef<string>("");
  const menuBarRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  // Close menubar and mode dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setModeDropdownOpen(false);
      }
    }
    window.document.addEventListener("mousedown", handleClickOutside);
    return () => window.document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Re-fetch document whenever user switches profiles or document ID changes
  useEffect(() => {
    let isCancelled = false;
    if (!docId || !isHydrated) return;

    setIsLoading(true);
    setAccessDenied({ denied: false });
    setNotFound(false);

    const load = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (currentUser?.id) {
          queryParams.set("userId", currentUser.id);
        }
        if (currentUser?.email) {
          queryParams.set("userEmail", currentUser.email);
        }

        const headers: Record<string, string> = {};
        if (currentUser?.id) {
          headers["x-user-id"] = currentUser.id;
        }
        if (currentUser?.email) {
          headers["x-user-email"] = currentUser.email;
        }

        const res = await fetch(
          `/api/documents/${docId}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
          { headers }
        );

        if (isCancelled) return;

        if (res.status === 403) {
          const errorData = await res.json();
          if (!currentUser) {
            router.push(`/login?redirect=/doc/${docId}`);
            return;
          }
          if (!isCancelled) {
            setAccessDenied({
              denied: true,
              ownerId: errorData.documentOwnerId,
            });
            setIsLoading(false);
          }
          return;
        }

        if (res.status === 400 || res.status === 404) {
          if (!currentUser && res.status !== 400) {
            router.push(`/login?redirect=/doc/${docId}`);
            return;
          }
          if (!isCancelled) {
            setNotFound(true);
            setIsLoading(false);
          }
          return;
        }

        if (!res.ok) {
          if (!currentUser) {
            router.push(`/login?redirect=/doc/${docId}`);
            return;
          }
          if (!isCancelled) {
            setNotFound(true);
            setIsLoading(false);
          }
          return;
        }

        const data: DocumentData = await res.json();
        if (!isCancelled) {
          setDocument(data);
          setDocTitle(data.title);
          latestContentRef.current = data.content;
          setSaveStatus("saved");
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error(err);
          toast.error("Error loading document");
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, [docId, currentUser?.id, currentUser?.email, isHydrated, toast, router]);

  // Handle document deletion (invoked by confirmation modal)
  const handleConfirmDelete = async () => {
    if (!currentUser) return;
    setIsDeletingDoc(true);

    try {
      const queryParams = new URLSearchParams({
        userId: currentUser.id,
      });
      if (currentUser.email) {
        queryParams.set("userEmail", currentUser.email);
      }

      const res = await fetch(`/api/documents/${docId}?${queryParams.toString()}`, {
        method: "DELETE",
        headers: {
          "x-user-id": currentUser.id,
          "x-user-email": currentUser.email || "",
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete document");
      }

      toast.success("Document deleted");
      setIsDeleteModalOpen(false);
      router.push("/");
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Could not delete document");
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // Handle importing file content directly into this document
  const handleImportToCurrent = async (parsedHtml: string, importedTitle: string) => {
    try {
      await handleSaveContent(parsedHtml);
      if (importedTitle && importedTitle !== "Imported Document") {
        await handleTitleUpdate(importedTitle);
      }
      setDocument((prev) =>
        prev
          ? {
              ...prev,
              content: parsedHtml,
              title: importedTitle || prev.title,
            }
          : prev
      );
      toast.success("File imported into document!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to import file into document");
    }
  };

  // Handle title rename
  const handleTitleUpdate = async (newTitle: string) => {
    const trimmed = newTitle.trim().slice(0, 200) || "Untitled Document";
    setDocTitle(trimmed);


    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (currentUser?.id) {
        headers["x-user-id"] = currentUser.id;
      }
      if (currentUser?.email) {
        headers["x-user-email"] = currentUser.email;
      }

      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          title: trimmed,
          userId: currentUser?.id || "public-editor",
          userEmail: currentUser?.email || "",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to rename document");
      }

      const updated = await res.json();
      setDocument((prev) => (prev ? { ...prev, title: updated.title } : prev));
      toast.success("Document renamed");
    } catch (err) {
      console.error(err);
      toast.error("Could not rename document");
    }
  };

  // Handle content save
  const handleSaveContent = async (htmlContent: string) => {
    try {
      latestContentRef.current = htmlContent;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (currentUser?.id) {
        headers["x-user-id"] = currentUser.id;
      }
      if (currentUser?.email) {
        headers["x-user-email"] = currentUser.email;
      }

      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          content: htmlContent,
          userId: currentUser?.id || "public-editor",
          userEmail: currentUser?.email || "",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      const updated = await res.json();
      setDocument((prev) =>
        prev
          ? {
              ...prev,
              content: updated.content,
              updatedAt: updated.updatedAt,
            }
          : prev
      );
      setSaveStatus("saved");
    } catch (err) {
      console.error(err);
      setSaveStatus("unsaved");
      toast.error((err as Error).message || "Auto-save failed");
    }
  };

  // Export handlers
  const handleExportText = () => {
    if (!document) return;
    const plain = document.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const blob = new Blob([plain], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${document.title || "document"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setActiveMenu(null);
    toast.success("Downloaded plain text file");
  };

  const handleExportHtml = () => {
    if (!document) return;
    const blob = new Blob([document.content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${document.title || "document"}.html`;
    link.click();
    URL.revokeObjectURL(url);
    setActiveMenu(null);
    toast.success("Downloaded HTML file");
  };

  const handleExportMarkdown = () => {
    if (!document) return;
    const md = exportHtmlToMarkdown(document.content);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${document.title || "document"}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setActiveMenu(null);
    toast.success("Downloaded Markdown file");
  };

  // Render 403 Access Denied State (Google Docs style)
  if (accessDenied.denied) {
    const docOwner = accessDenied.ownerId ? getUserById(accessDenied.ownerId) : undefined;

    return (
      <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shadow-xs">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Docs</span>
          </Link>
          <UserSwitcher />
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-5 shadow-xs">
              <Lock className="w-8 h-8" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 mb-3">
              Access Restricted
            </span>

            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              You need access
            </h1>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              You are signed in as{" "}
              <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                {currentUser?.name || "your account"}
              </strong>
              . This document belongs to{" "}
              <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                {docOwner?.name || "the document owner"}
              </strong>
              . Ask the owner for access, or switch to an account with permissions.
            </p>

            <div className="space-y-3">
              {docOwner && (
                <button
                  type="button"
                  onClick={() => switchUser(docOwner.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition active:scale-95"
                >
                  <span>Switch to {docOwner.name}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <Link
                href="/"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Return to Docs Home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render 404 Not Found
  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Document Not Found
          </h2>
          <p className="text-xs text-slate-500 mt-2">
            The document you are looking for may have been removed or does not exist.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Docs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading skeleton
  if (isLoading || !document || (!currentUser && document?.generalAccess !== "anyoneWithLink")) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            Loading Google Docs document...
          </div>
        </div>
      </div>
    );
  }

  const userEmail = (currentUser?.email || "").toLowerCase().trim();
  const currentUserId = currentUser?.id || "";
  const ownerUser = getUserById(document.ownerId);

  const isOwner = currentUserId
    ? currentUserId === document.ownerId ||
      (Boolean(userEmail) && (document.ownerId || "").toLowerCase().trim() === userEmail) ||
      (ownerUser && ownerUser.id === currentUserId) ||
      (ownerUser && Boolean(userEmail) && ownerUser.email.toLowerCase().trim() === userEmail)
    : false;

  const isShared = currentUserId
    ? Boolean(
        document.sharedWith?.some(
          (uid) =>
            uid === currentUserId ||
            (Boolean(userEmail) && (uid || "").toLowerCase().trim() === userEmail)
        )
      )
    : false;

  const isViewer = currentUserId
    ? Boolean(
        (document.viewers || []).some(
          (uid) =>
            uid === currentUserId ||
            (Boolean(userEmail) && (uid || "").toLowerCase().trim() === userEmail)
        )
      )
    : false;

  const isPublicLink = document.generalAccess === "anyoneWithLink";
  const isPublicEditor = isPublicLink && document.generalAccessRole === "editor";
  const canEdit = isOwner || (isShared && !isViewer) || isPublicEditor;
  const isReadOnly = !canEdit || editorMode === "viewing";

  // Active collaborators presence simulation (owner + shared users, deduplicated)
  const collaboratorsMap = new Map<string, ReturnType<typeof getUserById>>();
  if (ownerUser) collaboratorsMap.set(ownerUser.id, ownerUser);
  (document.sharedWith || []).forEach((uid) => {
    const u = getUserById(uid);
    if (u && !collaboratorsMap.has(u.id)) {
      collaboratorsMap.set(u.id, u);
    }
  });
  const collaborators = Array.from(collaboratorsMap.values()).filter(Boolean);


  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafd] dark:bg-[#141517] text-slate-900 dark:text-slate-100">
      {/* Google Docs Primary Top Header */}
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#1f2125] border-b border-slate-200 dark:border-slate-800 no-print transition-colors">
        <div className="px-4 py-2 flex items-center justify-between gap-3">
          {/* Left section: Docs logo, Title inline edit, Menubar */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Google Docs Blue Sheet Icon */}
            <Link
              href="/"
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 group"
              title="Docs home"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
            </Link>

            <div className="flex flex-col min-w-0">
              {/* Top row: Title + Star + Save Status */}
              <div className="flex items-center gap-2 min-w-0">
                {isEditingTitle && canEdit && !isReadOnly ? (
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    onBlur={() => {
                      setIsEditingTitle(false);
                      if (docTitle.trim() && docTitle !== document.title) {
                        handleTitleUpdate(docTitle);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      } else if (e.key === "Escape") {
                        setDocTitle(document.title);
                        setIsEditingTitle(false);
                      }
                    }}
                    autoFocus
                    maxLength={150}
                    className="text-base sm:text-lg font-bold px-2 py-0.5 rounded border border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-xs sm:max-w-md shadow-inner"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (canEdit && !isReadOnly) {
                        setIsEditingTitle(true);
                      } else {
                        toast.info("You need edit permissions to rename this document");
                      }
                    }}
                    className={`text-base sm:text-lg font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded text-left truncate max-w-[200px] sm:max-w-xs md:max-w-md transition flex items-center gap-1.5 group ${
                      canEdit && !isReadOnly
                        ? "hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        : "cursor-default"
                    }`}
                    title={canEdit && !isReadOnly ? "Rename (click to edit)" : "Document title (read-only)"}
                  >
                    <span className="truncate">{docTitle}</span>
                    {canEdit && !isReadOnly ? (
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    )}
                  </button>
                )}

                {/* Star toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setIsStarred(!isStarred);
                    toast.info(isStarred ? "Removed from starred" : "Added to starred docs");
                  }}
                  className={`p-1 rounded-md transition ${
                    isStarred
                      ? "text-amber-500 hover:text-amber-600"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                  title={isStarred ? "Starred" : "Star document"}
                >
                  <Star className={`w-4 h-4 ${isStarred ? "fill-amber-400" : ""}`} />
                </button>

                {/* Cloud Save Sync Status */}
                <div
                  className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 pl-1"
                  title={`Last saved ${formatDate(document.updatedAt)}`}
                >
                  {saveStatus === "saving" ? (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </span>
                  ) : saveStatus === "saved" ? (
                    <span className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-default">
                      <Cloud className="w-3.5 h-3.5 text-slate-400" />
                      <span>Saved to Drive</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Unsaved</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom row: Google Docs Menubar */}
              <div
                ref={menuBarRef}
                className="flex items-center gap-0.5 text-xs text-slate-700 dark:text-slate-300 relative select-none mt-0.5"
              >
                {/* File Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveMenu(activeMenu === "file" ? null : "file")}
                    className={`px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                      activeMenu === "file" ? "bg-slate-200 dark:bg-slate-800 font-semibold" : ""
                    }`}
                  >
                    File
                  </button>
                  {activeMenu === "file" && (
                    <div className="absolute left-0 mt-1.5 w-60 rounded-2xl bg-white/95 dark:bg-[#1a1c20]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 text-xs">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 select-none">
                        Document Actions
                      </div>
                      <div className="space-y-0.5">
                        <Link
                          href="/"
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98]"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>New document</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setIsImportModalOpen(true);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98]"
                        >
                          <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Open / Import (.md, .txt)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingTitle(true);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98]"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-400" />
                          <span>Rename</span>
                        </button>
                      </div>

                      <div className="my-1.5 border-t border-slate-100 dark:border-slate-800/80" />

                      <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 select-none">
                        Export &amp; Print
                      </div>
                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={handleExportMarkdown}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98]"
                        >
                          <FileDown className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Markdown (.md)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleExportText}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98]"
                        >
                          <FileDown className="w-3.5 h-3.5 text-slate-400" />
                          <span>Plain Text (.txt)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleExportHtml}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98]"
                        >
                          <FileDown className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Web Page (.html)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            window.print();
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98]"
                        >
                          <span className="flex items-center gap-2.5">
                            <Printer className="w-3.5 h-3.5 text-slate-400" />
                            <span>Print</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                            Ctrl+P
                          </span>
                        </button>
                      </div>

                      {isOwner && (
                        <>
                          <div className="my-1.5 border-t border-slate-100 dark:border-slate-800/80" />
                          <button
                            type="button"
                            onClick={() => {
                              setIsDeleteModalOpen(true);
                              setActiveMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 font-medium transition active:scale-[0.98]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Move to trash</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Edit Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveMenu(activeMenu === "edit" ? null : "edit")}
                    className={`px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                      activeMenu === "edit" ? "bg-slate-200 dark:bg-slate-800 font-semibold" : ""
                    }`}
                  >
                    Edit
                  </button>
                  {activeMenu === "edit" && (
                    <div className="absolute left-0 mt-1.5 w-56 rounded-2xl bg-white/95 dark:bg-[#1a1c20]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 text-xs">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 select-none">
                        Shortcuts
                      </div>
                      <div className="space-y-0.5">
                        <div className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 font-medium">
                          <span>Undo</span>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">Ctrl+Z</span>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 font-medium">
                          <span>Redo</span>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">Ctrl+Y</span>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 font-medium">
                          <span>Save</span>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">Ctrl+S</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* View Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveMenu(activeMenu === "view" ? null : "view")}
                    className={`px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                      activeMenu === "view" ? "bg-slate-200 dark:bg-slate-800 font-semibold" : ""
                    }`}
                  >
                    View
                  </button>
                  {activeMenu === "view" && (
                    <div className="absolute left-0 mt-1.5 w-56 rounded-2xl bg-white/95 dark:bg-[#1a1c20]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 text-xs">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 select-none">
                        View Settings
                      </div>
                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowRuler(!showRuler);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98]"
                        >
                          <span>Show ruler</span>
                          {showRuler && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                        </button>
                      </div>

                      <div className="my-1.5 border-t border-slate-100 dark:border-slate-800/80" />
                      <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 select-none">
                        Zoom Scale
                      </div>
                      <div className="space-y-0.5">
                        {[75, 100, 125, 150].map((z) => (
                          <button
                            key={z}
                            type="button"
                            onClick={() => {
                              setZoomLevel(z);
                              setActiveMenu(null);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-xl flex items-center justify-between font-medium transition active:scale-[0.98] ${
                              zoomLevel === z
                                ? "bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 font-bold"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            <span>{z}%</span>
                            {zoomLevel === z && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Help Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveMenu(activeMenu === "help" ? null : "help")}
                    className={`px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                      activeMenu === "help" ? "bg-slate-200 dark:bg-slate-800 font-semibold" : ""
                    }`}
                  >
                    Help
                  </button>
                  {activeMenu === "help" && (
                    <div className="absolute left-0 mt-1.5 w-56 rounded-2xl bg-white/95 dark:bg-[#1a1c20]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 text-xs">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 select-none">
                        Resources
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsShortcutsOpen(true);
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98]"
                      >
                        <Keyboard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Keyboard shortcuts</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right section: Presence pills, Mode, Share button, Theme & User */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Active Collaborators Presence Avatars */}
            <div className="hidden md:flex items-center -space-x-2 overflow-hidden pl-2">
              {collaborators.map((user) => {
                const isCurrent = Boolean(currentUser && user?.id === currentUser.id);
                const isUserOwner = user?.id === document.ownerId;
                const isUserViewer = (document.viewers || []).includes(user?.id || "");
                const roleBadge = isUserOwner ? "Owner" : isUserViewer ? "Viewer" : "Editor";

                return (
                  <div
                    key={user?.id}
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-white dark:ring-slate-900 shadow-xs cursor-pointer ${
                      user?.avatarColor || "bg-blue-600"
                    }`}
                    title={`${user?.name} (${roleBadge})${isCurrent ? " - You" : ""}`}
                  >
                    {user?.initials || "U"}
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                  </div>
                );
              })}
            </div>

            {/* Document Mode Switcher: Editing vs Viewing */}
            {canEdit ? (
              <div className="relative" ref={modeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition active:scale-95"
                  title="Switch document mode"
                >
                  {editorMode === "editing" ? (
                    <>
                      <Pencil className="w-3.5 h-3.5 text-blue-600" />
                      <span>Editing</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-amber-500" />
                      <span>Viewing</span>
                    </>
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>

                {modeDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-64 rounded-2xl bg-white/95 dark:bg-[#1a1c20]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 select-none">
                      Document Mode
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditorMode("editing");
                          setModeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl transition flex items-start gap-2.5 active:scale-[0.98] ${
                          editorMode === "editing"
                            ? "bg-blue-50/90 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500/20"
                            : "hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-100/70 dark:bg-blue-900/50 flex items-center justify-center shrink-0 mt-0.5">
                          <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold flex items-center justify-between">
                            <span>Editing</span>
                            {editorMode === "editing" && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                            Edit document directly
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditorMode("viewing");
                          setModeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl transition flex items-start gap-2.5 active:scale-[0.98] ${
                          editorMode === "viewing"
                            ? "bg-amber-50/90 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/20"
                            : "hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-100/70 dark:bg-amber-900/50 flex items-center justify-center shrink-0 mt-0.5">
                          <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold flex items-center justify-between">
                            <span>Viewing</span>
                            {editorMode === "viewing" && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                            Read or print final document
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold"
                title="You have view-only access to this document"
              >
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                <span>Viewing</span>
              </div>
            )}

            {/* Google Docs Iconic Blue Share Button */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition active:scale-95"
            >
              {document.generalAccess === "anyoneWithLink" ? (
                <Globe className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              <span>Share</span>
              {document.sharedWith && document.sharedWith.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/25 text-white font-bold">
                  {document.sharedWith.length}
                </span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" />
              )}
            </button>

            {/* User switcher */}
            <UserSwitcher />
          </div>
        </div>
      </header>

      {/* Main Document TipTap Editor */}
      <main className="flex-1 flex flex-col items-center">
        <Editor
          initialContent={document.content}
          onSave={handleSaveContent}
          saveStatus={saveStatus}
          setSaveStatus={setSaveStatus}
          readOnly={isReadOnly}
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
          showRuler={showRuler}
        />
      </main>

      {/* Share Modal Dialog */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentId={document._id}
        documentTitle={document.title}
        ownerId={document.ownerId}
        sharedWith={document.sharedWith || []}
        viewers={document.viewers || []}
        generalAccess={document.generalAccess || "restricted"}
        generalAccessRole={document.generalAccessRole || "viewer"}
        onShareUpdated={(newSharedWith, newViewers, newGeneralAccess, newGeneralAccessRole) => {
          setDocument((prev) =>
            prev
              ? {
                  ...prev,
                  sharedWith: newSharedWith,
                  viewers: newViewers || prev.viewers || [],
                  generalAccess: newGeneralAccess || prev.generalAccess || "restricted",
                  generalAccessRole: newGeneralAccessRole || prev.generalAccessRole || "viewer",
                }
              : prev
          );
        }}
      />

      {/* Import File Modal */}
      <FileUpload
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentDocumentId={document._id}
        onImportToCurrent={handleImportToCurrent}
        onSuccess={(newDocId) => {
          router.push(`/doc/${newDocId}`);
        }}
      />

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Keyboard shortcuts
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShortcutsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Save Document</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Ctrl + S</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Print</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Ctrl + P</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Undo</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Ctrl + Z</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Redo</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Ctrl + Y</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Bold</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Ctrl + B</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Italic</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Ctrl + I</kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600 dark:text-slate-400">Underline</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Ctrl + U</kbd>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsShortcutsOpen(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingDoc) setIsDeleteModalOpen(false);
        }}
        onConfirm={handleConfirmDelete}
        documentTitle={document?.title || docTitle}
        isDeleting={isDeletingDoc}
      />
    </div>
  );
}
