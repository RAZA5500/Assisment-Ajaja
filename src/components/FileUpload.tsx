"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/context/ToastContext";
import { parseMarkdownToHtml, parsePlainTextToHtml } from "@/lib/markdown";

interface FileUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newDocId: string) => void;
  currentDocumentId?: string;
  onImportToCurrent?: (parsedHtml: string, title: string) => Promise<void> | void;
}

export default function FileUpload({
  isOpen,
  onClose,
  onSuccess,
  currentDocumentId,
  onImportToCurrent,
}: FileUploadProps) {
  const router = useRouter();
  const { currentUser } = useUser();
  const toast = useToast();

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateFile = (file: File): boolean => {
    setErrorMsg(null);
    const validExtensions = [".txt", ".md", ".markdown"];
    const fileName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!hasValidExt) {
      setErrorMsg("Invalid file format. Please upload a .txt, .md, or .markdown file.");
      return false;
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("File size exceeds 5MB limit.");
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleImportToCurrent = async () => {
    if (!selectedFile || !onImportToCurrent) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const text = await selectedFile.text();
      const lower = selectedFile.name.toLowerCase();
      const isMd = lower.endsWith(".md") || lower.endsWith(".markdown");

      const parsedHtml = isMd
        ? parseMarkdownToHtml(text)
        : parsePlainTextToHtml(text);

      const title = selectedFile.name.replace(/\.(md|markdown|txt)$/i, "");
      await onImportToCurrent(parsedHtml, title || "Imported Document");
      onClose();
    } catch (err) {
      console.error("Import error:", err);
      const msg = (err as Error).message || "An error occurred while importing file";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !currentUser) {
      if (!currentUser) toast.error("Please sign in first");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const text = await selectedFile.text();
      const lower = selectedFile.name.toLowerCase();
      const isMd = lower.endsWith(".md") || lower.endsWith(".markdown");

      // Parse text into HTML for TipTap editor
      const parsedHtml = isMd
        ? parseMarkdownToHtml(text)
        : parsePlainTextToHtml(text);

      // Clean title from filename
      const title = selectedFile.name.replace(/\.(md|markdown|txt)$/i, "");

      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify({
          title: title || "Imported Document",
          content: parsedHtml,
          ownerId: currentUser.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import document");
      }

      const newDoc = await response.json();
      toast.success(`"${title}" imported successfully!`);

      onClose();
      if (onSuccess) {
        onSuccess(newDoc._id);
      } else {
        router.push(`/doc/${newDoc._id}`);
      }
    } catch (err) {
      console.error("Import error:", err);
      const msg = (err as Error).message || "An error occurred while importing file";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1e1f23] rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Open / Import file
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload Markdown (.md) or Plain Text (.txt)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={handleFileChange}
            className="hidden"
          />

          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
                  : "border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Select a file from your device
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Drag and drop or browse <span className="font-semibold text-blue-600 dark:text-blue-400">.md</span> or{" "}
                <span className="font-semibold text-blue-600 dark:text-blue-400">.txt</span> (up to 5MB)
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB &bull;{" "}
                    {selectedFile.name.endsWith(".md") ? "Markdown document" : "Plain text file"}
                  </div>
                </div>
              </div>

              <button
                onClick={handleReset}
                disabled={isProcessing}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                title="Choose different file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* User notice */}
          {currentUser && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              Imported document will be owned by{" "}
              <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                {currentUser.name}
              </strong>
              . Headings, bullet points, numbers, code blocks, and formatting will be automatically parsed.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </button>

          {currentDocumentId && onImportToCurrent && (
            <button
              type="button"
              onClick={handleImportToCurrent}
              disabled={!selectedFile || isProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Replace active document content with this file"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              Import to Current Doc
            </button>
          )}

          <button
            type="button"
            onClick={handleImport}
            disabled={!selectedFile || isProcessing}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {currentDocumentId ? "Create as New Doc" : "Create Document"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
