"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Node as TiptapNode, Extension, mergeAttributes } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Check,
  Loader2,
  Clock,
  Save,
  Printer,
  Minus,
  Table as TableIcon,
  RemoveFormatting,
  BarChart2,
  X,
  Eye,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ChevronDown,
  Download,
  FileDown,
} from "lucide-react";

export type SaveStatus = "saved" | "saving" | "unsaved";

// Custom TipTap table nodes to support real native table structures
const CustomTable = TiptapNode.create({
  name: "table",
  group: "block",
  content: "tableRow+",
  tableRole: "table",
  isolating: true,
  parseHTML() {
    return [{ tag: "table" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["table", mergeAttributes(HTMLAttributes), ["tbody", 0]];
  },
});

const CustomTableRow = TiptapNode.create({
  name: "tableRow",
  content: "(tableCell | tableHeader)*",
  tableRole: "row",
  parseHTML() {
    return [{ tag: "tr" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["tr", mergeAttributes(HTMLAttributes), 0];
  },
});

const CustomTableCell = TiptapNode.create({
  name: "tableCell",
  content: "block+",
  tableRole: "cell",
  isolating: true,
  parseHTML() {
    return [{ tag: "td" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["td", mergeAttributes(HTMLAttributes), 0];
  },
});

const CustomTableHeader = TiptapNode.create({
  name: "tableHeader",
  content: "block+",
  tableRole: "header_cell",
  isolating: true,
  parseHTML() {
    return [{ tag: "th" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["th", mergeAttributes(HTMLAttributes), 0];
  },
});

// Custom TipTap extension for text alignment
const CustomTextAlign = Extension.create({
  name: "textAlign",
  addGlobalAttributes() {
    return [
      {
        types: ["heading", "paragraph"],
        attributes: {
          textAlign: {
            default: "left",
            renderHTML: (attributes) => {
              if (!attributes.textAlign || attributes.textAlign === "left") {
                return {};
              }
              return { style: `text-align: ${attributes.textAlign}` };
            },
            parseHTML: (element) => element.style.textAlign || "left",
          },
        },
      },
    ];
  },
});

interface EditorProps {
  initialContent: string;
  onSave: (htmlContent: string) => Promise<void>;
  saveStatus: SaveStatus;
  setSaveStatus: (status: SaveStatus) => void;
  readOnly?: boolean;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
  showRuler?: boolean;
  onExport?: (type: "pdf" | "docx" | "md" | "html" | "txt") => void;
  exportingType?: "pdf" | "docx" | "md" | "html" | "txt" | null;
}

interface StatsModalData {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
  readingTime: number;
}

export default function Editor({
  initialContent,
  onSave,
  saveStatus,
  setSaveStatus,
  readOnly = false,
  zoomLevel: controlledZoom,
  onZoomChange,
  showRuler = true,
  onExport,
  exportingType,
}: EditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestContentRef = useRef<string>(initialContent);
  const [internalZoom, setInternalZoom] = useState<number>(100);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const [zoomDropdownOpen, setZoomDropdownOpen] = useState(false);
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);

  const styleDropdownRef = useRef<HTMLDivElement>(null);
  const zoomDropdownRef = useRef<HTMLDivElement>(null);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);

  const activeZoom = controlledZoom !== undefined ? controlledZoom : internalZoom;

  const handleZoomSelect = (zoom: number) => {
    if (onZoomChange) {
      onZoomChange(zoom);
    } else {
      setInternalZoom(zoom);
    }
    setZoomDropdownOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        styleDropdownRef.current &&
        !styleDropdownRef.current.contains(event.target as Node)
      ) {
        setStyleDropdownOpen(false);
      }
      if (
        zoomDropdownRef.current &&
        !zoomDropdownRef.current.contains(event.target as Node)
      ) {
        setZoomDropdownOpen(false);
      }
      if (
        downloadDropdownRef.current &&
        !downloadDropdownRef.current.contains(event.target as Node)
      ) {
        setDownloadDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [contentStats, setContentStats] = useState<StatsModalData>({
    words: 0,
    characters: 0,
    charactersNoSpaces: 0,
    paragraphs: 0,
    readingTime: 1,
  });

  const calculateDetailedStats = (html: string): StatsModalData => {
    if (!html) {
      return { words: 0, characters: 0, charactersNoSpaces: 0, paragraphs: 0, readingTime: 1 };
    }
    const plain = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (!plain) {
      return { words: 0, characters: 0, charactersNoSpaces: 0, paragraphs: 0, readingTime: 1 };
    }
    const words = plain.split(/\s+/).filter(Boolean).length;
    const characters = plain.length;
    const charactersNoSpaces = plain.replace(/\s/g, "").length;
    const paragraphs = (html.match(/<\/(p|h1|h2|h3|li|blockquote)>/gi) || []).length || 1;
    const readingTime = Math.max(1, Math.ceil(words / 200));

    return { words, characters, charactersNoSpaces, paragraphs, readingTime };
  };

  useEffect(() => {
    setIsMounted(true);
    setContentStats(calculateDetailedStats(initialContent));
  }, [initialContent]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      CustomTable,
      CustomTableRow,
      CustomTableCell,
      CustomTableHeader,
      CustomTextAlign,
    ],
    content: initialContent || "<p></p>",
    editable: !readOnly,
    editorProps: {
      attributes: {
        class:
          "prose-editor focus:outline-none min-h-[920px] w-full text-slate-800 dark:text-slate-100",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      latestContentRef.current = html;
      setSaveStatus("unsaved");
      setContentStats(calculateDetailedStats(html));

      // Auto-save debounce (1500ms)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        try {
          setSaveStatus("saving");
          await onSave(html);
          setSaveStatus("saved");
        } catch {
          setSaveStatus("unsaved");
        }
      }, 1500);
    },
  });

  // Re-sync initialContent if it changes externally
  useEffect(() => {
    if (editor && initialContent !== undefined) {
      if (initialContent !== latestContentRef.current) {
        editor.commands.setContent(initialContent || "<p></p>");
        latestContentRef.current = initialContent;
        setContentStats(calculateDetailedStats(initialContent));
      }
    }
  }, [editor, initialContent]);

  // Update editable mode when readOnly prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // Manual save trigger (keyboard shortcut or toolbar button)
  const handleExplicitSave = useCallback(async () => {
    if (!editor || saveStatus === "saving" || readOnly) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const html = editor.getHTML();
    setSaveStatus("saving");
    try {
      await onSave(html);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
    }
  }, [editor, saveStatus, onSave, setSaveStatus, readOnly]);

  // Keyboard shortcut Ctrl+S / Cmd+S and Ctrl+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleExplicitSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        window.print();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExplicitSave]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Text alignment helper
  const handleSetAlignment = (alignment: "left" | "center" | "right" | "justify") => {
    if (!editor || readOnly) return;
    if (editor.isActive("heading")) {
      editor.chain().focus().updateAttributes("heading", { textAlign: alignment }).run();
    } else {
      editor.chain().focus().updateAttributes("paragraph", { textAlign: alignment }).run();
    }
  };

  const isAlignmentActive = (alignment: string) => {
    if (!editor) return false;
    const hasAttr =
      editor.isActive("heading", { textAlign: alignment }) ||
      editor.isActive("paragraph", { textAlign: alignment });
    if (hasAttr) return true;
    if (
      alignment === "left" &&
      !editor.isActive("heading", { textAlign: "center" }) &&
      !editor.isActive("heading", { textAlign: "right" }) &&
      !editor.isActive("heading", { textAlign: "justify" }) &&
      !editor.isActive("paragraph", { textAlign: "center" }) &&
      !editor.isActive("paragraph", { textAlign: "right" }) &&
      !editor.isActive("paragraph", { textAlign: "justify" })
    ) {
      return true;
    }
    return false;
  };

  // Insert Table snippet
  const handleInsertTable = () => {
    if (!editor || readOnly) return;
    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Header 1</th>
            <th>Header 2</th>
            <th>Header 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Row 1 Data</td>
            <td>Row 1 Data</td>
            <td>Row 1 Data</td>
          </tr>
          <tr>
            <td>Row 2 Data</td>
            <td>Row 2 Data</td>
            <td>Row 2 Data</td>
          </tr>
        </tbody>
      </table>
      <p></p>
    `;
    editor.chain().focus().insertContent(tableHtml).run();
  };

  if (!isMounted || !editor) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex items-center gap-2.5 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span>Opening Google Docs document canvas...</span>
        </div>
      </div>
    );
  }

  // Active heading label
  const getCurrentStyleLabel = () => {
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    return "Normal text";
  };

  return (
    <div className="w-full flex flex-col items-center select-text">
      {/* Google Docs Primary Formatting Toolbar Ribbon */}
      <div className="sticky top-16 z-30 w-full bg-[#f0f4f9] dark:bg-[#1f2125] border-y border-slate-200 dark:border-slate-800 shadow-xs px-2 sm:px-4 py-1.5 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            {/* History: Undo, Redo, Print */}
            <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo() || readOnly}
                className="gdocs-btn"
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo() || readOnly}
                className="gdocs-btn"
                title="Redo (Ctrl+Y)"
                aria-label="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="gdocs-btn"
                title="Print (Ctrl+P)"
                aria-label="Print"
              >
                <Printer className="w-4 h-4" />
              </button>

              {/* Quick Export/Download Menu */}
              {onExport && (
                <div className="relative" ref={downloadDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadDropdownOpen(!downloadDropdownOpen);
                      setStyleDropdownOpen(false);
                      setZoomDropdownOpen(false);
                    }}
                    className={`gdocs-btn text-xs font-semibold px-2 gap-1.5 ${
                      downloadDropdownOpen ? "bg-slate-200 dark:bg-slate-800" : ""
                    }`}
                    title="Download / Export options"
                  >
                    {exportingType ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <Download className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                    )}
                    <span className="hidden sm:inline">Export</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {downloadDropdownOpen && (
                    <div className="absolute left-0 mt-1.5 w-60 rounded-2xl bg-white/95 dark:bg-[#1a1c20]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 select-none flex items-center justify-between">
                        <span>Download Format</span>
                        {exportingType && (
                          <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            Working
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            onExport("pdf");
                            setDownloadDropdownOpen(false);
                          }}
                          disabled={Boolean(exportingType)}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98] disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileDown className="w-3.5 h-3.5 text-rose-500" />
                            <span>PDF Document (.pdf)</span>
                          </div>
                          {exportingType === "pdf" && <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onExport("docx");
                            setDownloadDropdownOpen(false);
                          }}
                          disabled={Boolean(exportingType)}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98] disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileDown className="w-3.5 h-3.5 text-blue-600" />
                            <span>Microsoft Word (.docx)</span>
                          </div>
                          {exportingType === "docx" && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onExport("md");
                            setDownloadDropdownOpen(false);
                          }}
                          disabled={Boolean(exportingType)}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98] disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileDown className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Markdown (.md)</span>
                          </div>
                          {exportingType === "md" && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onExport("html");
                            setDownloadDropdownOpen(false);
                          }}
                          disabled={Boolean(exportingType)}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98] disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileDown className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Web Page (.html)</span>
                          </div>
                          {exportingType === "html" && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onExport("txt");
                            setDownloadDropdownOpen(false);
                          }}
                          disabled={Boolean(exportingType)}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 font-medium transition active:scale-[0.98] disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileDown className="w-3.5 h-3.5 text-slate-400" />
                            <span>Plain Text (.txt)</span>
                          </div>
                          {exportingType === "txt" && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Zoom Selector Dropdown */}
            <div className="relative pr-1.5 border-r border-slate-300 dark:border-slate-700" ref={zoomDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setZoomDropdownOpen(!zoomDropdownOpen);
                  setStyleDropdownOpen(false);
                }}
                className="gdocs-btn text-xs font-semibold px-2 gap-1"
                title="Zoom"
              >
                <span>{activeZoom}%</span>
              </button>
              {zoomDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-32 bg-white/95 dark:bg-[#1a1c20]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 select-none">
                    Zoom Level
                  </div>
                  <div className="space-y-0.5">
                    {[50, 75, 90, 100, 125, 150, 200].map((z) => {
                      const isSelected = activeZoom === z;
                      return (
                        <button
                          key={z}
                          type="button"
                          onClick={() => handleZoomSelect(z)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-medium transition active:scale-[0.98] ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 font-bold"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span>{z}%</span>
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

            {/* Paragraph / Heading Styles Dropdown */}
            <div className="relative pr-1.5 border-r border-slate-300 dark:border-slate-700" ref={styleDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setStyleDropdownOpen(!styleDropdownOpen);
                  setZoomDropdownOpen(false);
                }}
                disabled={readOnly}
                className="gdocs-btn text-xs font-semibold px-2.5 gap-1.5 min-w-[110px] justify-between"
                title="Styles"
              >
                <span className="truncate">{getCurrentStyleLabel()}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>
              {styleDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-52 bg-white/95 dark:bg-[#1a1c20]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 select-none">
                    Paragraph Styles
                  </div>
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().setParagraph().run();
                        setStyleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between active:scale-[0.98] ${
                        editor.isActive("paragraph")
                          ? "bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 font-bold"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                      }`}
                    >
                      <span>Normal text</span>
                      {editor.isActive("paragraph") && (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().toggleHeading({ level: 1 }).run();
                        setStyleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition text-base font-bold flex items-center justify-between active:scale-[0.98] ${
                        editor.isActive("heading", { level: 1 })
                          ? "bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white"
                      }`}
                    >
                      <span>Heading 1</span>
                      {editor.isActive("heading", { level: 1 }) && (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().toggleHeading({ level: 2 }).run();
                        setStyleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition text-sm font-semibold flex items-center justify-between active:scale-[0.98] ${
                        editor.isActive("heading", { level: 2 })
                          ? "bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      <span>Heading 2</span>
                      {editor.isActive("heading", { level: 2 }) && (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().toggleHeading({ level: 3 }).run();
                        setStyleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition text-xs font-semibold flex items-center justify-between active:scale-[0.98] ${
                        editor.isActive("heading", { level: 3 })
                          ? "bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <span>Heading 3</span>
                      {editor.isActive("heading", { level: 3 }) && (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Inline Formatting: Bold, Italic, Underline, Strikethrough, Code */}
            <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={readOnly}
                className={`gdocs-btn ${editor.isActive("bold") ? "active" : ""}`}
                title="Bold (Ctrl+B)"
                aria-label="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={readOnly}
                className={`gdocs-btn ${editor.isActive("italic") ? "active" : ""}`}
                title="Italic (Ctrl+I)"
                aria-label="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                disabled={readOnly}
                className={`gdocs-btn ${editor.isActive("underline") ? "active" : ""}`}
                title="Underline (Ctrl+U)"
                aria-label="Underline"
              >
                <UnderlineIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                disabled={readOnly}
                className={`gdocs-btn ${editor.isActive("strike") ? "active" : ""}`}
                title="Strikethrough"
                aria-label="Strikethrough"
              >
                <Strikethrough className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleCode().run()}
                disabled={readOnly}
                className={`gdocs-btn ${editor.isActive("code") ? "active" : ""}`}
                title="Inline code"
                aria-label="Inline code"
              >
                <span className="font-mono text-xs px-0.5 font-bold">`c`</span>
              </button>
            </div>

            {/* Text Alignment Ribbon: Left, Center, Right, Justify */}
            <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleSetAlignment("left")}
                disabled={readOnly}
                className={`gdocs-btn ${isAlignmentActive("left") ? "active" : ""}`}
                title="Align left"
                aria-label="Align left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleSetAlignment("center")}
                disabled={readOnly}
                className={`gdocs-btn ${isAlignmentActive("center") ? "active" : ""}`}
                title="Align center"
                aria-label="Align center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleSetAlignment("right")}
                disabled={readOnly}
                className={`gdocs-btn ${isAlignmentActive("right") ? "active" : ""}`}
                title="Align right"
                aria-label="Align right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleSetAlignment("justify")}
                disabled={readOnly}
                className={`gdocs-btn ${isAlignmentActive("justify") ? "active" : ""}`}
                title="Justify"
                aria-label="Justify"
              >
                <AlignJustify className="w-4 h-4" />
              </button>
            </div>

            {/* Lists & Structural Blocks */}
            <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                disabled={readOnly}
                className={`gdocs-btn ${editor.isActive("bulletList") ? "active" : ""}`}
                title="Bulleted list"
                aria-label="Bulleted list"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                disabled={readOnly}
                className={`gdocs-btn ${editor.isActive("orderedList") ? "active" : ""}`}
                title="Numbered list"
                aria-label="Numbered list"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                disabled={readOnly}
                className={`gdocs-btn ${editor.isActive("blockquote") ? "active" : ""}`}
                title="Quote"
                aria-label="Blockquote"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                disabled={readOnly}
                className={`gdocs-btn ${editor.isActive("codeBlock") ? "active" : ""}`}
                title="Code block"
                aria-label="Code block"
              >
                <span className="font-mono text-xs px-1 font-bold">{"{ }"}</span>
              </button>
            </div>

            {/* Insert Tools: Table, Horizontal Rule, Clear Formatting */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleInsertTable}
                disabled={readOnly}
                className="gdocs-btn"
                title="Insert table"
                aria-label="Insert table"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                disabled={readOnly}
                className="gdocs-btn"
                title="Insert horizontal line"
                aria-label="Horizontal rule"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                disabled={readOnly}
                className="gdocs-btn"
                title="Clear formatting"
                aria-label="Clear formatting"
              >
                <RemoveFormatting className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Status / Word Count Pill */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setIsStatsModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition"
              title="Click for full document statistics"
            >
              <BarChart2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{contentStats.words} words</span>
            </button>

            {/* Auto-save status chip */}
            <div className="flex items-center gap-1.5 text-xs">
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/70 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-300 dark:border-amber-800">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-800/60 px-2.5 py-1 rounded-full text-[11px] font-medium" title="All edits saved to cloud">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Saved</span>
                </span>
              )}
              {saveStatus === "unsaved" && (
                <span className="flex items-center gap-1.5 text-slate-500 bg-slate-200/60 dark:bg-slate-800/60 px-2.5 py-1 rounded-full text-[11px] font-medium">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span>Unsaved edits</span>
                </span>
              )}
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={handleExplicitSave}
                disabled={saveStatus === "saving"}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow-xs disabled:opacity-40"
                title="Save document now (Ctrl+S)"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Google Docs Canvas Workspace Backdrop */}
      <div className="w-full flex-1 flex flex-col items-center py-6 px-2 sm:px-4 bg-[#f8fafd] dark:bg-[#141517] min-h-[calc(100vh-140px)] transition-colors">
        {/* Read-Only Banner if Viewer mode active */}
        {readOnly && (
          <div className="w-full max-w-[816px] mb-3 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 shadow-xs no-print">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                <strong>Viewing mode:</strong> You have view-only access. You cannot edit content directly.
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
              Read-Only
            </span>
          </div>
        )}

        {/* Google Docs Top Ruler */}
        {showRuler && (
          <div
            className="w-full max-w-[816px] h-4 bg-white dark:bg-[#1e1f23] border border-slate-200 dark:border-slate-800 mb-2 rounded-t-sm relative flex items-end no-print overflow-hidden shadow-xs"
            style={{
              width: `${(816 * activeZoom) / 100}px`,
              maxWidth: "100%",
              transition: "width 0.15s ease",
            }}
          >
            {/* Inch / centimeter tick marks */}
            <div className="w-full flex justify-between px-6 text-[8px] font-mono text-slate-400 select-none pb-0.5">
              <span>| 1</span>
              <span>| 2</span>
              <span>| 3</span>
              <span>| 4</span>
              <span>| 5</span>
              <span>| 6</span>
              <span>| 7</span>
            </div>
            {/* Margin sliders */}
            <div className="absolute left-6 bottom-0 w-2 h-2.5 bg-blue-600 rounded-t-xs" title="Left margin" />
            <div className="absolute right-6 bottom-0 w-2 h-2.5 bg-blue-600 rounded-t-xs" title="Right margin" />
          </div>
        )}

        {/* Google Docs A4 / Letter Paper Sheet with Proportional Scaling */}
        <div
          className="gdocs-sheet print-sheet bg-white dark:bg-[#1e1f23] rounded-sm transition-all relative border border-slate-200/70 dark:border-slate-800/80"
          style={{
            width: `${(816 * activeZoom) / 100}px`,
            maxWidth: "100%",
            minHeight: `${(1056 * activeZoom) / 100}px`,
            padding: `${Math.round((72 * activeZoom) / 100)}px ${Math.round((80 * activeZoom) / 100)}px`,
            fontSize: `${(1.05 * activeZoom) / 100}rem`,
            lineHeight: 1.8,
            transformOrigin: "top center",
          }}
        >
          <EditorContent editor={editor} />

          {/* Sheet Footer Watermark / Page Status */}
          <div className="mt-16 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 no-print">
            <span>Ajaia Collaborative Docs</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>

      {/* Floating Word & Character Count Bar (Docked bottom left) */}
      <div className="fixed bottom-4 left-6 z-20 no-print hidden md:block">
        <button
          type="button"
          onClick={() => setIsStatsModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-md text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition active:scale-95"
        >
          <BarChart2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>
            {contentStats.words} words &bull; {contentStats.characters} chars
          </span>
        </button>
      </div>

      {/* Full Word Count & Document Statistics Modal */}
      {isStatsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Word count
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStatsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Pages</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">1</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Words</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{contentStats.words}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Characters</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{contentStats.characters}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Characters (no spaces)</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{contentStats.charactersNoSpaces}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Paragraphs</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{contentStats.paragraphs}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Estimated read time</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{contentStats.readingTime} min</span>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsStatsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
