"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Sun,
  Moon,
  Sparkles,
  ChevronDown,
  Check,
  User as UserIcon,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/context/ToastContext";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";

  const { currentUser, login, signup, logout, isHydrated, theme, toggleTheme } =
    useUser();
  const toast = useToast();

  const [authMode, setAuthMode] = useState<"login" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update mode if URL query changes
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup" || mode === "login") {
      setAuthMode(mode);
    }
  }, [searchParams]);

  // Google OAuth placeholder handler
  const handleGoogleAuth = () => {
    toast.info("Google authentication is an upcoming feature! Please use email & password for now.");
  };

  // Form submission handler (Login or Signup)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authMode === "signup") {
      if (!name.trim() || name.trim().length < 2) {
        toast.error("Please enter your full name (at least 2 characters)");
        return;
      }
      if (!email.trim()) {
        toast.error("Please enter a valid email address");
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters long");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await signup(name.trim(), email.trim(), password);
        if (result.success) {
          toast.success(`Account created! Welcome, ${result.user?.name || "User"}!`);
          router.push(redirectUrl);
        } else {
          toast.error(result.error || "Failed to create account");
        }
      } catch {
        toast.error("Could not complete registration");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Login mode
      if (!email.trim()) {
        toast.error("Please enter your email address");
        return;
      }
      if (!password) {
        toast.error("Please enter your password");
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await login(email.trim(), password);
        if (result.success) {
          toast.success(`Welcome back, ${result.user?.name || "User"}!`);
          router.push(redirectUrl);
        } else {
          toast.error(result.error || "Authentication failed");
        }
      } catch {
        toast.error("Could not sign in");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Select test account from dropdown & auto-fill credentials
  const handleSelectTestAccount = () => {
    setEmail("test@ex.com");
    setPassword("12345678");
    setIsDropdownOpen(false);
    toast.info("Filled demo credentials (test@ex.com)");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-10 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-96 bg-gradient-to-b from-blue-500/15 via-blue-500/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500/10 dark:bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Top right Theme Switcher */}
      <div className="absolute top-5 right-5 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs transition active:scale-95"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-blue-600" />
          )}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 p-0.5 shadow-xl shadow-blue-500/25 mb-3.5 flex items-center justify-center transform hover:scale-105 transition-transform">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
              <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Ajaia Docs
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            Fast, collaborative document editing for teams.
          </p>
        </div>

        {/* Active session banner if user is already logged in */}
        {isHydrated && currentUser && (
          <div className="mt-5 p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-blue-200/80 dark:border-blue-900/60 shadow-lg backdrop-blur-md flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs ${currentUser.avatarColor}`}
              >
                {currentUser.initials}
              </span>
              <div className="truncate">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {currentUser.name}
                </span>
                <span className="text-slate-500 dark:text-slate-400 ml-1">is signed in</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={redirectUrl}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition active:scale-95"
              >
                Open Docs
              </Link>
              <button
                type="button"
                onClick={logout}
                className="px-2.5 py-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xl rounded-3xl backdrop-blur-xl p-6 sm:p-7 space-y-4">
          {/* Sign In vs Sign Up Tab Switcher */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === "login"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("signup")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === "signup"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Header with Title and Auto Fill (in login mode) */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {authMode === "login" ? "Sign In to Workspace" : "Create your Account"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {authMode === "login"
                  ? "Access your documents & workspace"
                  : "Start editing and collaborating in seconds"}
              </p>
            </div>

            {/* Auto Fill Button (Available in Login mode for quick evaluator testing) */}
            {authMode === "login" && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/80 rounded-xl transition shadow-2xs active:scale-95 cursor-pointer"
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  title="Select a demo account to auto-fill"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>Auto Fill</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-blue-500 transition-transform duration-200 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white/95 dark:bg-[#1a1c20]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 select-none">
                      Demo Account
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={handleSelectTestAccount}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all active:scale-[0.98] ${
                          email.trim().toLowerCase() === "test@ex.com"
                            ? "bg-blue-50/90 dark:bg-blue-950/60 text-blue-950 dark:text-blue-200 ring-1 ring-blue-500/20"
                            : "hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-blue-600 shadow-xs">
                            TA
                          </span>
                          <div className="truncate">
                            <div className="text-xs font-bold leading-tight truncate flex items-center gap-1 text-slate-900 dark:text-slate-100">
                              Test Account
                              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                (Demo)
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
                              test@ex.com
                            </div>
                          </div>
                        </div>
                        {email.trim().toLowerCase() === "test@ex.com" && (
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-1.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sign In / Sign Up with Google Button */}
          <div>
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs transition active:scale-[0.99] cursor-pointer"
            >
              {/* Google G icon */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{authMode === "login" ? "Sign in with Google" : "Sign up with Google"}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500 font-medium text-[11px]">
                or continue with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name field (Only in Signup mode) */}
            {authMode === "signup" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition shadow-xs"
                  />
                </div>
              </div>
            )}

            {/* Email Address field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition shadow-xs"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Password {authMode === "signup" && <span className="text-[10px] font-normal text-slate-400">(min. 6 characters)</span>}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  minLength={6}
                  className="w-full text-xs sm:text-sm pl-9 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 absolute right-2.5 top-1/2 -translate-y-1/2 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password field (Only in Signup mode) */}
            {authMode === "signup" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    minLength={6}
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition shadow-xs"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/25 transition-all disabled:opacity-50 active:scale-[0.99] cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{authMode === "signup" ? "Creating Account..." : "Authenticating..."}</span>
                </>
              ) : (
                <>
                  <span>{authMode === "signup" ? "Create Free Account" : "Sign In to Workspace"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Bottom toggle between Login and Signup */}
          <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            {authMode === "login" ? (
              <p>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            Loading authentication...
          </div>
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
