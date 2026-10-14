"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { ChevronDown, LogOut, LogIn } from "lucide-react";

export default function UserSwitcher() {
  const router = useRouter();
  const { currentUser, logout } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!currentUser) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Sign In</span>
      </Link>
    );
  }

  const handleSignOut = async () => {
    setIsOpen(false);
    await logout();
    router.push("/login");
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Active User Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-98 cursor-pointer"
        aria-label="Account menu"
        title="Account details and session"
      >
        <span
          className={`flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-bold text-white shadow-xs ${currentUser.avatarColor}`}
        >
          {currentUser.initials}
        </span>
        <div className="flex flex-col text-left">
          <span className="text-xs font-semibold leading-tight truncate max-w-[120px]">
            {currentUser.name}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white/95 dark:bg-[#1a1c20]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 select-none">
            Current Account
          </div>

          {/* Active Profile Card */}
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 mb-1.5">
            <div className="flex items-center gap-3">
              <span
                className={`flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold text-white shadow-xs shrink-0 ring-2 ring-white/20 ${currentUser.avatarColor}`}
              >
                {currentUser.initials}
              </span>
              <div className="overflow-hidden min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                  {currentUser.email}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Signed in</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

          {/* Sign Out Button */}
          <div>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-[0.98] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
