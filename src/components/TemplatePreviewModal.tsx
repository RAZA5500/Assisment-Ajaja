"use client";

import React, { useEffect, useMemo } from "react";
import {
  X,
  FilePlus,
  Loader2,
  FileText,
  BookOpen,
  Briefcase,
  Calendar,
  Layers,
  FileCheck,
  Printer,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  ChevronDown,
} from "lucide-react";
import { TemplateItem, calculateTemplateWordCount } from "@/lib/templates";

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: TemplateItem | null;
  onUseTemplate: (title: string, content: string) => Promise<void>;
  isCreating: boolean;
}

export default function TemplatePreviewModal({
  isOpen,
  onClose,
  template,
  onUseTemplate,
  isCreating,
}: TemplatePreviewModalProps) {
  // Handle keyboard Esc key to close modal (guarded when creation is in progress)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isCreating) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isCreating]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Calculate word count & estimated read time
  const stats = useMemo(() => {
    if (!template || !template.content || template.id === "blank") {
      return { words: 0, readingTimeMinutes: 1 };
    }
    const words = calculateTemplateWordCount(template.content);
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 180));
    return { words, readingTimeMinutes };
  }, [template]);

  if (!isOpen || !template) return null;

  // Distinct icon per template type
  const renderTemplateIcon = () => {
    switch (template.id) {
      case "proposal":
        return <Briefcase className="w-5 h-5" />;
      case "meeting-notes":
        return <Calendar className="w-5 h-5" />;
      case "software-spec":
        return <Layers className="w-5 h-5" />;
      case "resume":
        return <BookOpen className="w-5 h-5" />;
      case "weekly-report":
        return <FileCheck className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-preview-title"
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200"
      onClick={() => {
        if (!isCreating) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#1e1f23] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-white dark:bg-[#1e1f23] z-10 shrink-0">
          {/* Left: Template info, category badge & word count */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 ${template.badgeColor} shadow-xs`}
            >
              {renderTemplateIcon()}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="template-preview-title"
                  className="text-base font-bold text-slate-900 dark:text-slate-100 truncate"
                >
                  {template.title}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {template.category}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-800">
                  <BookOpen className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>
                    {template.id === "blank"
                      ? "Clean Canvas"
                      : `${stats.words} words • ~${stats.readingTimeMinutes} min read`}
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {template.subtitle}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onUseTemplate(template.title, template.content)}
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-xs transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>Use this template</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isCreating) onClose();
              }}
              disabled={isCreating}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Close preview"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Authentic Google Docs Mock Ribbon & Ruler Bar */}
        <div className="bg-[#f0f4f9] dark:bg-[#1a1c1e] border-b border-slate-200 dark:border-slate-800/80 px-4 py-1.5 flex flex-col gap-1 select-none shrink-0 no-print">
          {/* Miniature Toolbar */}
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs overflow-x-auto py-0.5 scrollbar-none">
            <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-300 dark:border-slate-700">
              <span className="p-1 rounded text-slate-400 cursor-default" title="Undo">
                <Undo2 className="w-3.5 h-3.5" />
              </span>
              <span className="p-1 rounded text-slate-400 cursor-default" title="Redo">
                <Redo2 className="w-3.5 h-3.5" />
              </span>
              <span className="p-1 rounded text-slate-400 cursor-default" title="Print">
                <Printer className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="flex items-center gap-1 px-1.5 border-r border-slate-300 dark:border-slate-700 text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-white dark:bg-[#25272c] border border-slate-200 dark:border-slate-700 font-medium">
                100%
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-[#25272c] border border-slate-200 dark:border-slate-700 font-medium">
                Normal text <ChevronDown className="w-3 h-3 text-slate-400" />
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-[#25272c] border border-slate-200 dark:border-slate-700 font-medium">
                Arial
              </span>
            </div>

            <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-300 dark:border-slate-700">
              <span className="p-1 rounded text-slate-500 font-bold" title="Bold">
                <Bold className="w-3.5 h-3.5" />
              </span>
              <span className="p-1 rounded text-slate-500 italic" title="Italic">
                <Italic className="w-3.5 h-3.5" />
              </span>
              <span className="p-1 rounded text-slate-500 underline" title="Underline">
                <UnderlineIcon className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="flex items-center gap-0.5 text-slate-500">
              <span className="p-1 rounded" title="Align left">
                <AlignLeft className="w-3.5 h-3.5" />
              </span>
              <span className="p-1 rounded" title="Bullet list">
                <List className="w-3.5 h-3.5" />
              </span>
              <span className="p-1 rounded" title="Numbered list">
                <ListOrdered className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="ml-auto text-[10px] text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 rounded-md border border-blue-200 dark:border-blue-900/60 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>Full Preview Mode</span>
            </div>
          </div>

          {/* Miniature Google Docs Ruler */}
          <div className="w-full h-3 bg-white dark:bg-[#1e1f23] border border-slate-200 dark:border-slate-800 rounded-t-sm relative flex items-end overflow-hidden">
            <div className="w-full flex justify-between px-6 text-[7px] font-mono text-slate-400 select-none pb-[1px]">
              <span>| 1</span>
              <span>| 2</span>
              <span>| 3</span>
              <span>| 4</span>
              <span>| 5</span>
              <span>| 6</span>
              <span>| 7</span>
            </div>
            <div className="absolute left-6 bottom-0 w-1.5 h-2 bg-blue-600 rounded-t-sm" />
            <div className="absolute right-6 bottom-0 w-1.5 h-2 bg-blue-600 rounded-t-sm" />
          </div>
        </div>

        {/* Scrollable Document Canvas (Google Docs Canvas Backdrop) */}
        <div className="flex-1 overflow-y-auto bg-[#f8fafd] dark:bg-[#141517] p-3 sm:p-6 md:p-8 flex flex-col items-center transition-colors">
          {/* Authentic Google Docs Sheet Container */}
          <div className="gdocs-sheet bg-white dark:bg-[#1e1f23] rounded-sm border border-slate-200/80 dark:border-slate-800/90 shadow-paper w-full max-w-[760px] p-6 sm:p-12 md:p-14 my-2 transition-all relative">
            {template.id === "blank" ? (
              <div className="py-20 text-center select-none flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 shadow-xs">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Blank Document Canvas
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-5 leading-relaxed">
                  Start fresh with a clean, distraction-free document. Features real-time autosave,
                  rich formatting toolbar, markdown shortcuts, role permissions, and export capabilities.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>Ready for editing &bull; 0 words</span>
                </div>
              </div>
            ) : (
              <div
                className="prose-editor"
                dangerouslySetInnerHTML={{ __html: template.content }}
              />
            )}
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#1e1f23] z-10 shrink-0 text-xs">
          <div className="text-slate-500 dark:text-slate-400 text-[11px] text-center sm:text-left">
            Choosing this template opens a new editable copy in your workspace.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                if (!isCreating) onClose();
              }}
              disabled={isCreating}
              className="px-3.5 py-1.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onUseTemplate(template.title, template.content)}
              disabled={isCreating}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating document...</span>
                </>
              ) : (
                <>
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>Use this template</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
