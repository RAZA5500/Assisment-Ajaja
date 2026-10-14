"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  initials: string;
  roleTitle?: string;
  password?: string;
}

export const SEEDED_USERS: User[] = [
  {
    id: "user_alice_123",
    name: "Alice Vance",
    email: "alice@example.com",
    avatarColor: "bg-indigo-600",
    initials: "AV",
    roleTitle: "Lead Author & Owner",
    password: "password123",
  },
  {
    id: "user_bob_456",
    name: "Bob Smith",
    email: "bob@example.com",
    avatarColor: "bg-emerald-600",
    initials: "BS",
    roleTitle: "Core Collaborator",
    password: "password123",
  },
  {
    id: "user_charlie_789",
    name: "Charlie Day",
    email: "charlie@example.com",
    avatarColor: "bg-amber-600",
    initials: "CD",
    roleTitle: "Reviewer & Viewer",
    password: "password123",
  },
  {
    id: "user_test_account",
    name: "Test Account",
    email: "test@ex.com",
    avatarColor: "bg-blue-600",
    initials: "TA",
    roleTitle: "Test User",
    password: "12345678",
  },
  {
    id: "user_hraza_5701",
    name: "Hraza",
    email: "hraza5701@gmail.com",
    avatarColor: "bg-emerald-600",
    initials: "HR",
    roleTitle: "Collaborator",
    password: "12345678",
  },
];

interface UserContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  switchUser: (userId: string) => Promise<void> | void;
  login: (email: string, password?: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  loginAsDemoUser: (userId: string) => Promise<User | undefined>;
  logout: () => Promise<void>;
  allUsers: User[];
  getUserById: (userId: string) => User | undefined;
  isOwner: (ownerId: string) => boolean;
  canAccess: (ownerId: string, sharedWith?: string[]) => boolean;
  isHydrated: boolean;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const STORAGE_KEY = "ajaia_doc_active_user_id";

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    let isCancelled = false;

    // Theme initialization
    try {
      const savedTheme = localStorage.getItem("ajaia_theme") as "light" | "dark" | null;
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
      setThemeState(initialTheme);
      document.documentElement.classList.toggle("dark", initialTheme === "dark");
    } catch {
      // ignore storage error
    }

    // Verify session with /api/auth/me
    const verifySession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (isCancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setCurrentUserState(data.user);
            try {
              localStorage.setItem(STORAGE_KEY, data.user.id);
            } catch {}
            setIsHydrated(true);
            return;
          }
        }
      } catch {
        // network error during /api/auth/me check
      }

      if (isCancelled) return;

      // Fallback: check localStorage if cached from previous session
      try {
        const savedUserId = localStorage.getItem(STORAGE_KEY);
        if (savedUserId) {
          const found = SEEDED_USERS.find((u) => u.id === savedUserId);
          if (found) {
            setCurrentUserState(found);
            setIsHydrated(true);
            return;
          }
          const rawUser = localStorage.getItem("ajaia_custom_user");
          if (rawUser) {
            setCurrentUserState(JSON.parse(rawUser));
            setIsHydrated(true);
            return;
          }
        }
      } catch {
        // ignore
      }

      // No authenticated user active - leave null
      setCurrentUserState(null);
      setIsHydrated(true);
    };

    verifySession();

    return () => {
      isCancelled = true;
    };
  }, []);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("ajaia_theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
      } catch {}
      return next;
    });
  };

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, user.id);
        if (!SEEDED_USERS.some((u) => u.id === user.id)) {
          localStorage.setItem("ajaia_custom_user", JSON.stringify(user));
        }
      } else {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("ajaia_custom_user");
      }
    } catch {
      // ignore storage error
    }
  };

  const login = async (
    email: string,
    password?: string
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Login failed" };
      }

      setCurrentUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      console.error("Login request error:", err);
      // Client-side fallback if offline
      const found = SEEDED_USERS.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (found) {
        setCurrentUser(found);
        return { success: true, user: found };
      }
      return { success: false, error: "Network error during login" };
    }
  };

  const loginAsDemoUser = async (userId: string): Promise<User | undefined> => {
    const target = SEEDED_USERS.find((u) => u.id === userId);
    if (target) {
      await login(target.email, target.password);
      return target;
    }
    return undefined;
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setCurrentUser(null);
  };

  const switchUser = async (userId: string) => {
    const user = SEEDED_USERS.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      // Synchronize session cookie with server in background
      try {
        await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, password: user.password }),
        });
      } catch {
        // ignore network error
      }
    }
  };

  const getUserById = (userIdOrEmail: string): User | undefined => {
    if (!userIdOrEmail) return undefined;
    const lower = userIdOrEmail.toLowerCase().trim();

    // 1. Direct ID match
    const byId = SEEDED_USERS.find((u) => u.id === userIdOrEmail);
    if (byId) return byId;

    // 2. Email match in seeded users
    const byEmail = SEEDED_USERS.find((u) => u.email.toLowerCase() === lower);
    if (byEmail) return byEmail;

    // 3. Match active currentUser
    if (currentUser) {
      if (
        currentUser.id === userIdOrEmail ||
        (currentUser.email && currentUser.email.toLowerCase() === lower)
      ) {
        return currentUser;
      }
    }

    // 4. Format from raw email string
    if (userIdOrEmail.includes("@")) {
      const namePart = userIdOrEmail.split("@")[0];
      const cleanName =
        namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(/[._-]/g, " ");
      const initials =
        namePart.length >= 2 ? namePart.slice(0, 2).toUpperCase() : "U";
      return {
        id: userIdOrEmail,
        name: cleanName,
        email: userIdOrEmail,
        initials,
        avatarColor: "bg-emerald-600",
        roleTitle: "Collaborator",
      };
    }

    return undefined;
  };

  const isOwner = (ownerId: string): boolean => {
    if (!currentUser) return false;
    const currentEmail = (currentUser.email || "").toLowerCase().trim();
    const target = (ownerId || "").toLowerCase().trim();
    return currentUser.id === ownerId || (Boolean(currentEmail) && currentEmail === target);
  };

  const canAccess = (ownerId: string, sharedWith: string[] = []): boolean => {
    if (!currentUser) return false;
    const currentEmail = (currentUser.email || "").toLowerCase().trim();
    const currentId = currentUser.id;
    const targetOwner = (ownerId || "").toLowerCase().trim();

    if (currentId === ownerId || (Boolean(currentEmail) && currentEmail === targetOwner)) {
      return true;
    }

    return (sharedWith || []).some(
      (item) =>
        item === currentId ||
        (Boolean(currentEmail) && (item || "").toLowerCase().trim() === currentEmail)
    );
  };

  const signup = async (
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to create account" };
      }

      setCurrentUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      console.error("Signup request error:", err);
      return { success: false, error: "Network error during signup" };
    }
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchUser,
        login,
        signup,
        loginAsDemoUser,
        logout,
        allUsers: SEEDED_USERS,
        getUserById,
        isOwner,
        canAccess,
        isHydrated,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
