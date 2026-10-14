export interface SeededUserProfile {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  initials: string;
  roleTitle: string;
  password?: string;
}

export const SEEDED_PROFILES: SeededUserProfile[] = [
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

declare global {
  // eslint-disable-next-line no-var
  var registeredUsersStore: SeededUserProfile[] | undefined;
}

export const REGISTERED_USERS: SeededUserProfile[] =
  globalThis.registeredUsersStore || [];

if (!globalThis.registeredUsersStore) {
  globalThis.registeredUsersStore = REGISTERED_USERS;
}

export const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-purple-600",
  "bg-indigo-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-teal-600",
];

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "US";
}

export function findUserByEmail(email: string): SeededUserProfile | undefined {
  const normalized = email.trim().toLowerCase();
  return (
    SEEDED_PROFILES.find((u) => u.email.toLowerCase() === normalized) ||
    REGISTERED_USERS.find((u) => u.email.toLowerCase() === normalized)
  );
}

export function registerUser(profile: SeededUserProfile): SeededUserProfile {
  const existing = findUserByEmail(profile.email);
  if (existing) {
    throw new Error("A user with this email address already exists");
  }
  REGISTERED_USERS.push(profile);
  return profile;
}

/**
 * Extract authenticated user from Request cookies (ajaia_session_user) or x-user-id / x-user-email headers
 */
export function getAuthenticatedUserFromRequest(request: {
  cookies: { get: (name: string) => { value: string } | undefined };
  headers: { get: (name: string) => string | null };
}): SeededUserProfile | { id: string; name?: string; email?: string } | null {
  // 1. Check session cookie
  const sessionCookie = request.cookies.get("ajaia_session_user");
  if (sessionCookie?.value) {
    try {
      const user = JSON.parse(sessionCookie.value);
      if (user?.id) return user;
    } catch {
      // ignore JSON parse error
    }
  }

  // 2. Check x-user-id and x-user-email headers
  const userIdHeader = request.headers.get("x-user-id");
  const userEmailHeader = request.headers.get("x-user-email");

  if (userIdHeader) {
    const seeded =
      SEEDED_PROFILES.find((u) => u.id === userIdHeader) ||
      REGISTERED_USERS.find((u) => u.id === userIdHeader) ||
      (userEmailHeader ? findUserByEmail(userEmailHeader) : undefined) ||
      (userIdHeader.includes("@") ? findUserByEmail(userIdHeader) : undefined);
    if (seeded) return seeded;
    return {
      id: userIdHeader,
      email: userEmailHeader || (userIdHeader.includes("@") ? userIdHeader : undefined),
    };
  }

  if (userEmailHeader) {
    const seeded = findUserByEmail(userEmailHeader);
    if (seeded) return seeded;
    return { id: userEmailHeader, email: userEmailHeader };
  }

  return null;
}

/**
 * Get effective user ID from explicit fallback, query, header, or session cookie
 */
export function getEffectiveUserId(
  request: {
    cookies: { get: (name: string) => { value: string } | undefined };
    headers: { get: (name: string) => string | null };
  },
  explicitUserId?: string | null
): string | null {
  if (explicitUserId && explicitUserId.trim()) {
    return explicitUserId.trim();
  }
  const user = getAuthenticatedUserFromRequest(request);
  return user?.id || null;
}

export interface EffectiveUser {
  id: string;
  email?: string;
  identifiers: string[];
}

/**
 * Resolves all identifiers (IDs, emails, case-variants) for a user to allow seamless RBAC lookups
 */
export function getEffectiveUser(
  request: {
    cookies: { get: (name: string) => { value: string } | undefined };
    headers: { get: (name: string) => string | null };
  },
  explicitUserId?: string | null,
  explicitUserEmail?: string | null
): EffectiveUser | null {
  const authUser = getAuthenticatedUserFromRequest(request);

  const rawId = (explicitUserId && explicitUserId.trim()) || authUser?.id || null;
  const rawEmail =
    (explicitUserEmail && explicitUserEmail.trim()) ||
    request.headers.get("x-user-email") ||
    authUser?.email ||
    (rawId && rawId.includes("@") ? rawId : undefined);

  if (!rawId && !rawEmail) return null;

  let resolvedId = rawId;
  let resolvedEmail = rawEmail;

  if (rawEmail) {
    const knownUser = findUserByEmail(rawEmail);
    if (knownUser) {
      if (!resolvedId || resolvedId.includes("@")) {
        resolvedId = knownUser.id;
      }
      resolvedEmail = knownUser.email;
    }
  } else if (rawId) {
    const knownUser =
      SEEDED_PROFILES.find((u) => u.id === rawId) ||
      REGISTERED_USERS.find((u) => u.id === rawId);
    if (knownUser) {
      resolvedEmail = knownUser.email;
    }
  }

  const id = resolvedId || resolvedEmail!;
  const email = resolvedEmail;

  const set = new Set<string>();
  if (id) {
    set.add(id);
    set.add(id.toLowerCase());
  }
  if (email) {
    set.add(email);
    set.add(email.toLowerCase());
  }
  if (rawId) {
    set.add(rawId);
    set.add(rawId.toLowerCase());
  }

  return {
    id,
    email,
    identifiers: Array.from(set),
  };
}
