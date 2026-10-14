"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Upload,
  Search,
  Shield,
  Users,
  Clock,
  Trash2,
  FolderOpen,
  FilePlus,
  Loader2,
  Share2,
  LayoutGrid,
  List as ListIcon,
  ArrowRight,
  LogIn,
  CheckCircle2,
  X,
  MoreVertical,
  Pencil,
  FileDown,
  ChevronDown,
  ChevronRight,
  Download,
  ArrowUpDown,
  Eye,
  Check,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import FileUpload from "@/components/FileUpload";
import ShareModal from "@/components/ShareModal";
import TemplateCardVisual from "@/components/TemplateCardVisual";
import TemplatePreviewModal from "@/components/TemplatePreviewModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/context/ToastContext";
import { formatDate } from "@/lib/utils";
import { exportHtmlToMarkdown } from "@/lib/markdown";

interface DocumentItem {
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

type TabType = "all" | "owned" | "shared";
type ViewMode = "grid" | "list";
type SortOption = "updated-desc" | "updated-asc" | "title-asc" | "title-desc";

import {
  TemplateItem,
  BLANK_TEMPLATE,
  TEMPLATES,
} from "@/lib/templates";

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, switchUser, getUserById, isHydrated } = useUser();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("updated-desc");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(true);

  // Modals state
  const [shareDocTarget, setShareDocTarget] = useState<DocumentItem | null>(null);
  const [renameTarget, setRenameTarget] = useState<DocumentItem | null>(null);
  const [newTitleValue, setNewTitleValue] = useState("");
  const [activeMenuDocId, setActiveMenuDocId] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<TemplateItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<"pdf" | "docx" | "md" | "html" | "txt" | null>(null);
  const [downloadSubmenuDocId, setDownloadSubmenuDocId] = useState<string | null>(null);

  // If hydrated and not logged in, redirect to login
  useEffect(() => {
    if (isHydrated && !currentUser) {
      router.push("/login");
    }
  }, [isHydrated, currentUser, router]);

  const currentUserId = currentUser?.id || "";

  // Close card menus and sort dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element | null;
      if (!target?.closest("[data-doc-menu]")) {
        setActiveMenuDocId(null);
        setDownloadSubmenuDocId(null);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
    }
    window.document.addEventListener("click", handleClickOutside);
    return () => window.document.removeEventListener("click", handleClickOutside);
  }, []);

  // Fetch documents (all user documents to support instant tab filtering & accurate stats)
  const fetchDocuments = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const queryParams = new URLSearchParams({
        userId: currentUserId,
        filter: "all",
      });
      if (currentUser?.email) {
        queryParams.set("userEmail", currentUser.email);
      }

      const res = await fetch(`/api/documents?${queryParams.toString()}`, {
        headers: {
          "x-user-id": currentUserId,
          "x-user-email": currentUser?.email || "",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load documents");
      }

      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not fetch documents");
    }
  }, [currentUserId, currentUser?.email, toast]);

  // Fetch with cancellation and hydration safety
  useEffect(() => {
    let isCancelled = false;
    if (!isHydrated || !currentUserId) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({
          userId: currentUserId,
          filter: "all",
        });
        if (currentUser?.email) {
          queryParams.set("userEmail", currentUser.email);
        }

        const res = await fetch(`/api/documents?${queryParams.toString()}`, {
          headers: {
            "x-user-id": currentUserId,
            "x-user-email": currentUser?.email || "",
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load documents");
        }

        const data = await res.json();
        if (!isCancelled) {
          setDocuments(data);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error(err);
          toast.error("Could not fetch documents");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, [currentUserId, currentUser?.email, isHydrated, toast]);

  // Create document (blank or from template)
  const handleCreateDocument = async (
    title = "Untitled Document",
    content = "<p>Start writing your new document here...</p>"
  ) => {
    if (!currentUser || isCreating) return;
    setIsCreating(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-email": currentUser.email || "",
        },
        body: JSON.stringify({
          title,
          content,
          ownerId: currentUser.id,
          userEmail: currentUser.email || "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create document");
      }

      const newDoc = await response.json();
      toast.success(`Created "${newDoc.title}"`);
      router.push(`/doc/${newDoc._id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create document");
    } finally {
      setIsCreating(false);
    }
  };

  // Open Template Full Google Docs Preview
  const handleOpenPreview = (e: React.MouseEvent, tmpl: TemplateItem) => {
    e.stopPropagation();
    e.preventDefault();
    setPreviewTarget(tmpl);
  };

  // Create document directly from preview modal
  const handleUsePreviewTemplate = async (title: string, content: string) => {
    try {
      await handleCreateDocument(title, content);
      setPreviewTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Rename handler
  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !currentUser) return;

    const trimmed = newTitleValue.trim().slice(0, 200) || "Untitled Document";

    try {
      const res = await fetch(`/api/documents/${renameTarget._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-email": currentUser.email || "",
        },
        body: JSON.stringify({
          title: trimmed,
          userId: currentUser.id,
          userEmail: currentUser.email || "",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to rename document");
      }

      setDocuments((prev) =>
        prev.map((d) => (d._id === renameTarget._id ? { ...d, title: trimmed } : d))
      );
      toast.success("Document renamed");
      setRenameTarget(null);
    } catch (err) {
      console.error(err);
      toast.error("Could not rename document");
    }
  };

  // Delete document handler (triggers confirmation modal)
  const handleRequestDelete = (e: React.MouseEvent, doc: DocumentItem) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteTarget(doc);
    setActiveMenuDocId(null);
  };

  const handleConfirmDelete = async () => {
    if (!currentUser || !deleteTarget) return;

    setIsDeletingDoc(true);
    try {
      const queryParams = new URLSearchParams({
        userId: currentUser.id,
      });
      if (currentUser.email) {
        queryParams.set("userEmail", currentUser.email);
      }

      const res = await fetch(`/api/documents/${deleteTarget._id}?${queryParams.toString()}`, {
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
      setDocuments((prev) => prev.filter((d) => d._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Could not delete document");
    } finally {
      setIsDeletingDoc(false);
    }
  };

  const handleDownloadDocument = async (
    doc: DocumentItem,
    format: "pdf" | "docx" | "md" | "html" | "txt"
  ) => {
    setDownloadingDocId(doc._id);
    setDownloadingFormat(format);
    const toastId = toast.loading(`Preparing ${format.toUpperCase()} download...`);

    try {
      if (format === "pdf" || format === "docx") {
        const res = await fetch(`/api/documents/${doc._id}/export/${format}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(currentUser?.id ? { "x-user-id": currentUser.id } : {}),
            ...(currentUser?.email ? { "x-user-email": currentUser.email } : {}),
          },
          body: JSON.stringify({
            html: doc.content || "",
            title: doc.title,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || `Download failed with status ${res.status}`);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement("a");
        link.href = url;
        link.download = `${doc.title || "document"}.${format}`;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.dismiss(toastId);
        toast.success(`Downloaded ${doc.title}.${format}`);
      } else if (format === "md") {
        const md = exportHtmlToMarkdown(doc.content || "");
        const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement("a");
        link.href = url;
        link.download = `${doc.title || "document"}.md`;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.dismiss(toastId);
        toast.success(`Downloaded ${doc.title}.md`);
      } else if (format === "html") {
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.title || "Document"}</title></head><body>${doc.content || "<p></p>"}</body></html>`;
        const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement("a");
        link.href = url;
        link.download = `${doc.title || "document"}.html`;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.dismiss(toastId);
        toast.success(`Downloaded ${doc.title}.html`);
      } else if (format === "txt") {
        const plain = (doc.content || "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/gi, " ")
          .replace(/&amp;/gi, "&")
          .replace(/&lt;/gi, "<")
          .replace(/&gt;/gi, ">")
          .replace(/&quot;/gi, '"')
          .trim();
        const blob = new Blob([plain], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement("a");
        link.href = url;
        link.download = `${doc.title || "document"}.txt`;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.dismiss(toastId);
        toast.success(`Downloaded ${doc.title}.txt`);
      }
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error((err as Error).message || "Download failed");
    } finally {
      setDownloadingDocId(null);
      setDownloadingFormat(null);
      setActiveMenuDocId(null);
      setDownloadSubmenuDocId(null);
    }
  };

  const handleOpenShare = (e: React.MouseEvent, doc: DocumentItem) => {
    e.stopPropagation();
    e.preventDefault();
    setShareDocTarget(doc);
  };

  // Helper to extract clean text snippet from TipTap HTML
  const getExcerpt = (html: string) => {
    if (!html) return "Blank document. Click to start editing...";
    const plain = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return plain.length > 120 ? plain.substring(0, 120) + "..." : plain || "Blank document...";
  };

  const currentUserEmail = (currentUser?.email || "").toLowerCase().trim();

  const isDocOwner = useCallback(
    (doc: DocumentItem) => {
      if (!currentUserId) return false;
      const docOwner = (doc.ownerId || "").toLowerCase().trim();
      const ownerUser = getUserById(doc.ownerId);
      return (
        doc.ownerId === currentUserId ||
        (Boolean(currentUserEmail) && docOwner === currentUserEmail) ||
        (ownerUser && ownerUser.id === currentUserId) ||
        (ownerUser && Boolean(currentUserEmail) && ownerUser.email.toLowerCase().trim() === currentUserEmail)
      );
    },
    [currentUserId, currentUserEmail, getUserById]
  );


  // Quick stats: accurate total, owned, and shared counts across entire workspace
  const stats = useMemo(() => {
    const ownedCount = documents.filter((d) => isDocOwner(d)).length;
    const sharedCount = documents.filter((d) => !isDocOwner(d)).length;
    return {
      total: documents.length,
      owned: ownedCount,
      shared: sharedCount,
    };
  }, [documents, isDocOwner]);

  // Filter and sort documents based on active tab, search query, and sort option
  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    // Tab filter
    if (activeTab === "owned") {
      result = result.filter((d) => isDocOwner(d));
    } else if (activeTab === "shared") {
      result = result.filter((d) => !isDocOwner(d));
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (d) =>
          (d.title || "").toLowerCase().includes(q) ||
          (d.content || "").toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortOption === "updated-desc") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortOption === "updated-asc") {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      if (sortOption === "title-asc") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortOption === "title-desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      return 0;
    });

    return result;
  }, [documents, activeTab, searchQuery, sortOption, currentUserId]);

  if (!isHydrated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-2.5 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span>Opening Docs workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafd] dark:bg-[#141517] text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar onImportClick={() => setIsImportOpen(true)} />

      <main className="flex-1 w-full mx-auto">
        {/* Google Docs Iconic "Start a new document" Template Gallery Launcher */}
        <section className="bg-[#f0f4f9] dark:bg-[#1a1c1e] border-b border-slate-200 dark:border-slate-800/80 py-8 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Start a new document
              </span>
              <button
                type="button"
                onClick={() => setShowTemplateGallery(!showTemplateGallery)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>{showTemplateGallery ? "Hide gallery" : "Template gallery"}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    showTemplateGallery ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {showTemplateGallery && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {/* 1. Blank Document Card */}
                <div
                  onClick={() => !isCreating && handleCreateDocument()}
                  className="group cursor-pointer flex flex-col relative"
                >
                  <div className="aspect-[3/4] bg-white dark:bg-[#1e1f23] rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-blue-500 shadow-xs hover:shadow-lg transition-all relative overflow-hidden group-hover:-translate-y-1">
                    {/* Realistic Miniature Google Docs Visual */}
                    <TemplateCardVisual templateId="blank" />

                    {/* Quick Preview Eye Button (Always accessible for touch & mouse) */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenPreview(e, BLANK_TEMPLATE)}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-white/95 dark:bg-[#1a1c1e]/95 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 shadow-xs backdrop-blur-sm opacity-90 sm:opacity-0 group-hover:opacity-100 transition-all z-10"
                      title="Preview Blank Document"
                      aria-label="Preview Blank Document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Desktop Hover Overlay with Preview & Create actions */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3 z-10 pointer-events-none group-hover:pointer-events-auto"
                    >
                      <button
                        type="button"
                        onClick={(e) => handleOpenPreview(e, BLANK_TEMPLATE)}
                        className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 shadow-md flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateDocument();
                        }}
                        disabled={isCreating}
                        className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create</span>
                      </button>
                    </div>

                    {/* Loading indicator */}
                    {isCreating && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-20">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Blank document
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Empty canvas</span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenPreview(e, BLANK_TEMPLATE)}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 sm:hidden font-medium"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>

                {/* 2-6. Realistic Pre-designed Google Docs Templates */}
                {TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => !isCreating && handleCreateDocument(tmpl.title, tmpl.content)}
                    className="group cursor-pointer flex flex-col relative"
                  >
                    <div className="aspect-[3/4] bg-white dark:bg-[#1e1f23] rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-blue-500 shadow-xs hover:shadow-lg transition-all relative overflow-hidden group-hover:-translate-y-1">
                      {/* Realistic Miniature Document Visual */}
                      <TemplateCardVisual templateId={tmpl.id} />

                      {/* Quick Preview Eye Button (Always accessible for touch & mouse) */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenPreview(e, tmpl)}
                        className="absolute top-2 right-2 p-2 rounded-lg bg-white/95 dark:bg-[#1a1c1e]/95 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 shadow-xs backdrop-blur-sm opacity-90 sm:opacity-0 group-hover:opacity-100 transition-all z-10"
                        title={`Preview ${tmpl.title}`}
                        aria-label={`Preview ${tmpl.title}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Desktop Hover Overlay with Preview & Use buttons */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3 z-10 pointer-events-none group-hover:pointer-events-auto"
                      >
                        <button
                          type="button"
                          onClick={(e) => handleOpenPreview(e, tmpl)}
                          className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 shadow-md flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Preview</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateDocument(tmpl.title, tmpl.content);
                          }}
                          disabled={isCreating}
                          className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          <FilePlus className="w-3.5 h-3.5" />
                          <span>Use Template</span>
                        </button>
                      </div>

                      {/* Loading indicator */}
                      {isCreating && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-20">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {tmpl.title}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span className="truncate">{tmpl.category}</span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenPreview(e, tmpl)}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 sm:hidden font-medium shrink-0"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Preview</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Documents Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Controls Bar: Filter Tabs, Search, Sort & View Mode */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            {/* Filter Tabs: All, Owned by me, Shared with me */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-[#1e1f23] rounded-2xl max-w-fit">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                  activeTab === "all"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>Owned by anyone</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 font-bold">
                  {stats.total}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("owned")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                  activeTab === "owned"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>Owned by me</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 font-bold">
                  {stats.owned}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("shared")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                  activeTab === "shared"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>Not owned by me</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 font-bold">
                  {stats.shared}
                </span>
              </button>
            </div>

            {/* Search, Sort Dropdown & View Mode Switcher */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search in Docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e1f23] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Selector Dropdown */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSortDropdownOpen(!sortDropdownOpen);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e1f23] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-xs transition active:scale-[0.98] cursor-pointer"
                  title="Sort documents"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {sortOption === "updated-desc" && "Last modified"}
                    {sortOption === "updated-asc" && "Oldest modified"}
                    {sortOption === "title-asc" && "Title (A-Z)"}
                    {sortOption === "title-desc" && "Title (Z-A)"}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      sortDropdownOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>

                {sortDropdownOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 sm:left-0 sm:right-auto mt-1.5 w-44 rounded-2xl bg-white/95 dark:bg-[#1a1c20]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-40 p-1.5 animate-in fade-in zoom-in-95 duration-150 text-xs"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 select-none">
                      Sort Documents
                    </div>
                    <div className="space-y-0.5">
                      {[
                        { value: "updated-desc", label: "Last modified" },
                        { value: "updated-asc", label: "Oldest modified" },
                        { value: "title-asc", label: "Title (A-Z)" },
                        { value: "title-desc", label: "Title (Z-A)" },
                      ].map((item) => {
                        const isSelected = sortOption === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                              setSortOption(item.value as SortOption);
                              setSortDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between font-medium active:scale-[0.98] ${
                              isSelected
                                ? "bg-blue-50/90 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold"
                                : "hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            <span>{item.label}</span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* View Mode Toggle: Grid vs List */}
              <div className="flex items-center p-1 bg-slate-200/60 dark:bg-[#1e1f23] rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "grid"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "list"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title="List view"
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Document Content View */}
          <div className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-white dark:bg-[#1e1f23] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 h-64 flex flex-col justify-between"
                  >
                    <div className="h-36 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3" />
                    <div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-[#1e1f23]/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-4">
                  <FolderOpen className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {searchQuery
                    ? "No matching documents found"
                    : activeTab === "shared"
                    ? "No documents shared with you"
                    : activeTab === "owned"
                    ? "You haven't created any documents yet"
                    : "No documents in workspace"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                  {searchQuery
                    ? `No documents matching "${searchQuery}". Clear your search query or try different keywords.`
                    : activeTab === "shared"
                    ? "Switch to another profile (e.g. Alice) to create and share a document with this user."
                    : "Start writing by choosing a template above or creating a blank document."}
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear search
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCreateDocument()}
                    disabled={isCreating}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Blank Document
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsImportOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    Import File
                  </button>
                </div>
              </div>
            ) : viewMode === "grid" ? (
              /* GRID VIEW: Google Docs Document Cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {filteredDocuments.map((doc) => {
                  const isDocumentOwner = isDocOwner(doc);
                  const owner = getUserById(doc.ownerId);

                  return (
                    <div
                      key={doc._id}
                      className={`group bg-white dark:bg-[#1e1f23] border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl shadow-xs hover:shadow-lg transition-all flex flex-col ${
                        activeMenuDocId === doc._id ? "z-30 relative" : "relative"
                      }`}
                    >
                      {/* Top Sheet Preview Canvas */}
                      <Link
                        href={`/doc/${doc._id}`}
                        className="p-4 bg-slate-50 dark:bg-[#141517] border-b border-slate-100 dark:border-slate-800/80 h-44 flex flex-col justify-start overflow-hidden relative group/canvas rounded-t-2xl"
                      >
                        <div className="bg-white dark:bg-[#1e1f23] p-3.5 rounded-lg shadow-xs border border-slate-200/80 dark:border-slate-800 flex-1 overflow-hidden pointer-events-none">
                          <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1.5 truncate">
                            {doc.title || "Untitled Document"}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-4">
                            {getExcerpt(doc.content)}
                          </div>
                        </div>

                        {/* Hover Overlay Button */}
                        <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-[1px] opacity-0 group-hover/canvas:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 text-xs font-bold shadow-md border border-slate-200 dark:border-slate-700">
                            Open in Docs
                          </span>
                        </div>
                      </Link>

                      {/* Bottom Metadata & Quick Actions */}
                      <div className="p-3.5 flex flex-col justify-between flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/doc/${doc._id}`}
                            className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1 flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate">{doc.title || "Untitled Document"}</span>
                          </Link>

                          {/* 3-Dots Action Popover */}
                          <div className="relative" data-doc-menu="true">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuDocId((prev) => (prev === doc._id ? null : doc._id));
                              }}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                activeMenuDocId === doc._id
                                  ? "text-blue-600 bg-blue-50 dark:bg-blue-950/60"
                                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                              title="More options"
                              aria-expanded={activeMenuDocId === doc._id}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeMenuDocId === doc._id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-white dark:bg-[#1a1c20] backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 text-xs"
                              >
                                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 select-none">
                                  Document Options
                                </div>
                                <div className="space-y-0.5">
                                  <Link
                                    href={`/doc/${doc._id}`}
                                    onClick={() => setActiveMenuDocId(null)}
                                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2.5 font-medium transition active:scale-[0.98]"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    <span>Open Document</span>
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRenameTarget(doc);
                                      setNewTitleValue(doc.title);
                                      setActiveMenuDocId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2.5 font-medium transition active:scale-[0.98]"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Rename</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      handleOpenShare(e, doc);
                                      setActiveMenuDocId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2.5 font-medium transition active:scale-[0.98]"
                                  >
                                    <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    <span>Share Access</span>
                                  </button>

                                  {/* Download Submenu with all 5 formats */}
                                  <div className="relative group/dl">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDownloadSubmenuDocId(
                                          downloadSubmenuDocId === doc._id ? null : doc._id
                                        )
                                      }
                                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between font-medium transition active:scale-[0.98]"
                                    >
                                      <span className="flex items-center gap-2.5">
                                        <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                        <span>Download as</span>
                                      </span>
                                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                    </button>

                                    {downloadSubmenuDocId === doc._id && (
                                      <div className="sm:absolute sm:right-full sm:top-0 sm:mr-1 w-56 rounded-2xl bg-white dark:bg-[#1a1c20] backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 text-xs">
                                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 select-none">
                                          Download Format
                                        </div>
                                        <div className="space-y-0.5">
                                          {[
                                            { type: "pdf", label: "PDF Document (.pdf)", color: "text-rose-500" },
                                            { type: "docx", label: "Microsoft Word (.docx)", color: "text-blue-600" },
                                            { type: "md", label: "Markdown (.md)", color: "text-indigo-500" },
                                            { type: "html", label: "Web Page (.html)", color: "text-emerald-500" },
                                            { type: "txt", label: "Plain Text (.txt)", color: "text-slate-400" },
                                          ].map((fmt) => (
                                            <button
                                              key={fmt.type}
                                              type="button"
                                              disabled={Boolean(downloadingDocId)}
                                              onClick={() =>
                                                handleDownloadDocument(
                                                  doc,
                                                  fmt.type as "pdf" | "docx" | "md" | "html" | "txt"
                                                )
                                              }
                                              className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98] disabled:opacity-50"
                                            >
                                              <div className="flex items-center gap-2">
                                                <FileDown className={`w-3.5 h-3.5 ${fmt.color}`} />
                                                <span>{fmt.label}</span>
                                              </div>
                                              {downloadingDocId === doc._id && downloadingFormat === fmt.type && (
                                                <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {isDocumentOwner && (
                                    <>
                                      <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />
                                      <button
                                        type="button"
                                        onClick={(e) => handleRequestDelete(e, doc)}
                                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 font-medium transition active:scale-[0.98]"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete Document</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer details: Role badge & Last modified */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            {isDocumentOwner ? (
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                Owned by me
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[100px]">
                                {owner?.name?.split(" ")[0] || "Shared"}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(doc.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* LIST VIEW: Google Docs Table */
              <div className="bg-white dark:bg-[#1e1f23] border border-slate-200/80 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 shadow-sm overflow-hidden">
                {filteredDocuments.map((doc) => {
                  const isDocumentOwner = isDocOwner(doc);
                  const owner = getUserById(doc.ownerId);

                  return (
                    <div
                      key={doc._id}
                      className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
                    >
                      <Link
                        href={`/doc/${doc._id}`}
                        className="flex items-center gap-3.5 min-w-0 flex-1"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {doc.title || "Untitled Document"}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-md">
                            {getExcerpt(doc.content)}
                          </div>
                        </div>
                      </Link>

                      {/* Right info & actions */}
                      <div className="flex items-center gap-4 shrink-0">
                        {isDocumentOwner ? (
                          <span className="hidden sm:inline-block text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            me
                          </span>
                        ) : (
                          <span className="hidden sm:inline-block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {owner?.name?.split(" ")[0] || "Shared"}
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(doc.updatedAt)}
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Download Button in List View */}
                          <div className="relative" data-doc-menu="true">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDownloadSubmenuDocId(
                                  downloadSubmenuDocId === `list-${doc._id}` ? null : `list-${doc._id}`
                                );
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition"
                              title="Download document"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            {downloadSubmenuDocId === `list-${doc._id}` && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl bg-white dark:bg-[#1a1c20] backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 text-xs"
                              >
                                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 select-none">
                                  Download Format
                                </div>
                                <div className="space-y-0.5">
                                  {[
                                    { type: "pdf", label: "PDF Document (.pdf)", color: "text-rose-500" },
                                    { type: "docx", label: "Microsoft Word (.docx)", color: "text-blue-600" },
                                    { type: "md", label: "Markdown (.md)", color: "text-indigo-500" },
                                    { type: "html", label: "Web Page (.html)", color: "text-emerald-500" },
                                    { type: "txt", label: "Plain Text (.txt)", color: "text-slate-400" },
                                  ].map((fmt) => (
                                    <button
                                      key={fmt.type}
                                      type="button"
                                      disabled={Boolean(downloadingDocId)}
                                      onClick={() =>
                                        handleDownloadDocument(
                                          doc,
                                          fmt.type as "pdf" | "docx" | "md" | "html" | "txt"
                                        )
                                      }
                                      className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98] disabled:opacity-50"
                                    >
                                      <div className="flex items-center gap-2">
                                        <FileDown className={`w-3.5 h-3.5 ${fmt.color}`} />
                                        <span>{fmt.label}</span>
                                      </div>
                                      {downloadingDocId === doc._id && downloadingFormat === fmt.type && (
                                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleOpenShare(e, doc)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition"
                            title="Share"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRenameTarget(doc);
                              setNewTitleValue(doc.title);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition"
                            title="Rename"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {isDocumentOwner && (
                            <button
                              type="button"
                              onClick={(e) => handleRequestDelete(e, doc)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Quick Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleConfirmRename}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Rename document
              </h3>
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Please enter a new name for the item:
              </label>
              <input
                type="text"
                value={newTitleValue}
                onChange={(e) => setNewTitleValue(e.target.value)}
                autoFocus
                maxLength={150}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition"
              >
                OK
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Share Modal Dialog */}
      {shareDocTarget && (
        <ShareModal
          isOpen={!!shareDocTarget}
          onClose={() => setShareDocTarget(null)}
          documentId={shareDocTarget._id}
          documentTitle={shareDocTarget.title}
          ownerId={shareDocTarget.ownerId}
          sharedWith={shareDocTarget.sharedWith || []}
          viewers={shareDocTarget.viewers || []}
          generalAccess={shareDocTarget.generalAccess || "restricted"}
          generalAccessRole={shareDocTarget.generalAccessRole || "viewer"}
          onShareUpdated={(newSharedWith, newViewers, newGeneralAccess, newGeneralAccessRole) => {
            setDocuments((prev) =>
              prev.map((d) =>
                d._id === shareDocTarget._id
                  ? {
                      ...d,
                      sharedWith: newSharedWith,
                      viewers: newViewers || d.viewers || [],
                      generalAccess: newGeneralAccess || d.generalAccess || "restricted",
                      generalAccessRole: newGeneralAccessRole || d.generalAccessRole || "viewer",
                    }
                  : d
              )
            );
            setShareDocTarget((prev) =>
              prev
                ? {
                    ...prev,
                    sharedWith: newSharedWith,
                    viewers: newViewers || prev.viewers || [],
                    generalAccess: newGeneralAccess || prev.generalAccess || "restricted",
                    generalAccessRole: newGeneralAccessRole || prev.generalAccessRole || "viewer",
                  }
                : null
            );
          }}
        />
      )}

      {/* File Upload Modal */}
      <FileUpload
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={(docId) => {
          fetchDocuments();
          router.push(`/doc/${docId}`);
        }}
      />

      {/* Template Full Preview Modal */}
      <TemplatePreviewModal
        isOpen={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        template={previewTarget}
        onUseTemplate={handleUsePreviewTemplate}
        isCreating={isCreating}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeletingDoc) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        documentTitle={deleteTarget?.title}
        isDeleting={isDeletingDoc}
      />
    </div>
  );
}
