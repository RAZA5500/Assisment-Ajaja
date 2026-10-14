import React from "react";
import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-md w-full text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-4">
          <FileQuestion className="w-8 h-8" />
        </div>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 mb-3">
          404 • Page Not Found
        </span>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Document or page not found
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          The page or document you are looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documents
          </Link>
        </div>
      </div>
    </div>
  );
}
