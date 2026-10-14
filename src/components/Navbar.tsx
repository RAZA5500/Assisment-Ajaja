"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Upload,
  ArrowLeft,
  Loader2,
  Pencil,
  LogIn,
  Sun,
  Moon,
} from "lucide-react";
import UserSwitcher from "./UserSwitcher";
import FileUpload from "./FileUpload";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/context/ToastContext";

interface NavbarProps {
  showBack?: boolean;
  documentTitle?: string;
  onTitleChange?: (newTitle: string) => void;
  titleReadOnly?: boolean;
  onImportClick?: () => void;
  isOwner?: boolean;
  ownerName?: string;
}

export default function Navbar({
  showBack = false,
  documentTitle,
  onTitleChange,
  titleReadOnly = false,
  onImportClick,
  isOwner,
  ownerName,
}: NavbarProps) {
  const router = useRouter();
  const { currentUser, theme, toggleTheme } = useUser();
  const toast = useToast();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(documentTitle || "Untitled Document");

  React.useEffect(() => {
    if (documentTitle) {
      setTempTitle(documentTitle);
    }
  }, [documentTitle]);

  const handleCreateDocument = async () => {
    if (!currentUser) {
      toast.info("Please sign in to create a document");
      router.push("/login");
      return;
    }

    setIsCreatingNew(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify({
          title: "Untitled Document",
          content: "<p>Start writing your new document here...</p>",
          ownerId: currentUser.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create document");
      }

      const newDoc = await response.json();
      toast.success("New document created!");
      router.push(`/doc/${newDoc._id}`);
    } catch (err) {
      console.error(err);
      toast.error("Could not create document");
    } finally {
      setIsCreatingNew(false);
    }
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (onTitleChange && tempTitle.trim() && tempTitle !== documentTitle) {
      onTitleChange(tempTitle.trim());
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setTempTitle(documentTitle || "Untitled Document");
      setIsEditingTitle(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#1f2125] border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left section: Docs Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            {showBack ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <Link
                  href="/"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                  title="Back to Docs"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>

                <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5" />

                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                    <FileText className="w-4 h-4" />
                  </div>

                  {onTitleChange && !titleReadOnly ? (
                    <div className="min-w-0 group relative flex items-center gap-1.5">
                      {isEditingTitle ? (
                        <input
                          type="text"
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          onBlur={handleTitleBlur}
                          onKeyDown={handleTitleKeyDown}
                          autoFocus
                          maxLength={120}
                          className="text-sm sm:text-base font-bold px-2 py-0.5 rounded border border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[200px] sm:max-w-xs md:max-w-md shadow-inner"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsEditingTitle(true)}
                          className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded text-left truncate max-w-[180px] sm:max-w-xs md:max-w-md transition flex items-center gap-1.5"
                          title="Click to rename document"
                        >
                          <span className="truncate">{tempTitle}</span>
                          <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs">
                      {documentTitle}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                      Docs
                    </span>
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900">
                      Collaborative Editor
                    </span>
                  </div>
                </div>
              </Link>
            )}
          </div>

          {/* Right section: Import, New Doc, Theme & Profile */}
          <div className="flex items-center gap-2.5 shrink-0">
            {!showBack && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (onImportClick) {
                      onImportClick();
                    } else {
                      setIsImportModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition border border-slate-200/60 dark:border-slate-700/60 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="hidden sm:inline">Import</span>
                </button>

                <button
                  type="button"
                  onClick={handleCreateDocument}
                  disabled={isCreatingNew}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-all disabled:opacity-50 active:scale-95"
                >
                  {isCreatingNew ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>New Doc</span>
                </button>
              </>
            )}

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

            {/* User persona dropdown */}
            <UserSwitcher />
          </div>
        </div>
      </header>

      {/* File Upload Modal */}
      {!onImportClick && (
        <FileUpload
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}
    </>
  );
}
