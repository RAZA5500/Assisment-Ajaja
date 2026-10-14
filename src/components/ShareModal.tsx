"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Trash2,
  Check,
  Shield,
  X,
  Loader2,
  Lock,
  Globe,
  Link as LinkIcon,
  ChevronDown,
  Mail,
  UserPlus,
} from "lucide-react";
import { useUser, SEEDED_USERS } from "@/context/UserContext";
import { useToast } from "@/context/ToastContext";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  ownerId: string;
  sharedWith: string[];
  viewers?: string[];
  generalAccess?: "restricted" | "anyoneWithLink";
  generalAccessRole?: "viewer" | "editor";
  onShareUpdated: (
    newSharedWith: string[],
    newViewers?: string[],
    newGeneralAccess?: "restricted" | "anyoneWithLink",
    newGeneralAccessRole?: "viewer" | "editor"
  ) => void;
}

export default function ShareModal({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  ownerId,
  sharedWith,
  viewers = [],
  generalAccess = "restricted",
  generalAccessRole = "viewer",
  onShareUpdated,
}: ShareModalProps) {
  const { currentUser, getUserById } = useUser();
  const toast = useToast();

  const [localSharedWith, setLocalSharedWith] = useState<string[]>(sharedWith);
  const [localViewers, setLocalViewers] = useState<string[]>(viewers);
  const [localGeneralAccess, setLocalGeneralAccess] = useState<"restricted" | "anyoneWithLink">(generalAccess);
  const [localGeneralAccessRole, setLocalGeneralAccessRole] = useState<"viewer" | "editor">(generalAccessRole);
  const [emailInput, setEmailInput] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"Viewer" | "Editor">("Viewer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  // Custom Dropdown Open States
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [openRowRoleId, setOpenRowRoleId] = useState<string | null>(null);
  const [isGeneralAccessTypeOpen, setIsGeneralAccessTypeOpen] = useState(false);
  const [isGeneralAccessRoleOpen, setIsGeneralAccessRoleOpen] = useState(false);

  // Close custom dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-share-dropdown]")) {
        setIsAddRoleOpen(false);
        setOpenRowRoleId(null);
        setIsGeneralAccessTypeOpen(false);
        setIsGeneralAccessRoleOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync state if props change
  useEffect(() => {
    setLocalSharedWith(sharedWith);
  }, [sharedWith]);

  useEffect(() => {
    setLocalViewers(viewers || []);
  }, [viewers]);

  useEffect(() => {
    setLocalGeneralAccess(generalAccess || "restricted");
  }, [generalAccess]);

  useEffect(() => {
    setLocalGeneralAccessRole(generalAccessRole || "viewer");
  }, [generalAccessRole]);

  if (!isOpen) return null;

  const currentUserId = currentUser?.id || "";
  const ownerUser = getUserById(ownerId);
  const isOwner =
    currentUserId === ownerId ||
    (Boolean(currentUser?.email) && (ownerId || "").toLowerCase().trim() === currentUser?.email.toLowerCase().trim()) ||
    (ownerUser && ownerUser.id === currentUserId) ||
    (ownerUser && Boolean(currentUser?.email) && ownerUser.email.toLowerCase().trim() === currentUser?.email.toLowerCase().trim());


  // Helper to resolve collaborator display information by ID or email
  const resolveCollaboratorInfo = (idOrEmail: string) => {
    // 1. Try finding in known users by ID
    const byId = getUserById(idOrEmail);
    if (byId) return byId;

    // 2. Try finding in SEEDED_USERS by email
    const byEmail = SEEDED_USERS.find(
      (u) => u.email.toLowerCase() === idOrEmail.toLowerCase()
    );
    if (byEmail) return byEmail;

    // 3. Fallback for custom invited email addresses
    const isEmail = idOrEmail.includes("@");
    const namePart = isEmail ? idOrEmail.split("@")[0] : idOrEmail;
    const cleanName =
      namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(/[._-]/g, " ");
    const initials =
      namePart.length >= 2 ? namePart.slice(0, 2).toUpperCase() : "U";

    return {
      id: idOrEmail,
      name: cleanName,
      email: isEmail ? idOrEmail : `${idOrEmail}@user`,
      initials,
      avatarColor: "bg-blue-600",
    };
  };

  const saveShareList = async (
    updatedSharedWith: string[],
    updatedViewers: string[],
    successMsg: string,
    updatedGeneralAccess: "restricted" | "anyoneWithLink" = localGeneralAccess,
    updatedGeneralAccessRole: "viewer" | "editor" = localGeneralAccessRole
  ) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-email": currentUser.email || "",
        },
        body: JSON.stringify({
          userId: currentUser.id,
          userEmail: currentUser.email,
          sharedWith: updatedSharedWith,
          viewers: updatedViewers,
          generalAccess: updatedGeneralAccess,
          generalAccessRole: updatedGeneralAccessRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update sharing permissions");
      }

      const resData = await response.json();
      setLocalSharedWith(updatedSharedWith);
      setLocalViewers(updatedViewers);
      setLocalGeneralAccess(resData.generalAccess || updatedGeneralAccess);
      setLocalGeneralAccessRole(resData.generalAccessRole || updatedGeneralAccessRole);
      onShareUpdated(
        updatedSharedWith,
        updatedViewers,
        resData.generalAccess || updatedGeneralAccess,
        resData.generalAccessRole || updatedGeneralAccessRole
      );
      toast.success(successMsg);
    } catch (err) {
      console.error("Share update error:", err);
      toast.error((err as Error).message || "Failed to update sharing settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add collaborator directly by typing their email
  const handleAddUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isOwner || !currentUser) return;

    const trimmedEmail = emailInput.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.info("Please enter an email address");
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Prevent sharing with document owner
    const ownerEmail = (ownerUser?.email || "").toLowerCase();
    const currentEmail = (currentUser.email || "").toLowerCase();
    if (trimmedEmail === ownerEmail || trimmedEmail === currentEmail) {
      toast.info("You already own this document");
      return;
    }

    // Resolve to seeded user id if available, else use email string
    const seeded = SEEDED_USERS.find(
      (u) => u.email.toLowerCase() === trimmedEmail
    );
    const targetUserIdOrEmail = seeded ? seeded.id : trimmedEmail;

    // Check if user is already shared
    const isAlreadyShared =
      localSharedWith.includes(targetUserIdOrEmail) ||
      localSharedWith.some((uid) => {
        const u = getUserById(uid);
        return (
          u?.email.toLowerCase() === trimmedEmail ||
          uid.toLowerCase() === trimmedEmail
        );
      });

    if (isAlreadyShared) {
      toast.info("This user already has access to this document");
      return;
    }

    const nextShared = [...localSharedWith, targetUserIdOrEmail];
    const nextViewers =
      selectedRole === "Viewer"
        ? Array.from(new Set([...localViewers, targetUserIdOrEmail]))
        : localViewers.filter((id) => id !== targetUserIdOrEmail);

    await saveShareList(
      nextShared,
      nextViewers,
      `Shared access (${selectedRole}) granted to ${trimmedEmail}`,
      localGeneralAccess,
      localGeneralAccessRole
    );
    setEmailInput("");
  };

  const isViewerRole = (userId: string) => {
    const userObj = getUserById(userId);
    const idSet = new Set<string>([
      userId.toLowerCase(),
      ...(userObj ? [userObj.id.toLowerCase(), (userObj.email || "").toLowerCase()] : []),
    ]);
    return localViewers.some((v) => idSet.has(v.toLowerCase()));
  };

  const handleRoleChange = async (userId: string, newRole: "Editor" | "Viewer") => {
    if (!isOwner || !currentUser) return;
    setOpenRowRoleId(null);

    const userObj = getUserById(userId);
    const idSet = new Set<string>([
      userId.toLowerCase(),
      ...(userObj ? [userObj.id.toLowerCase(), (userObj.email || "").toLowerCase()] : []),
    ]);

    const nextViewers =
      newRole === "Viewer"
        ? Array.from(new Set([...localViewers.filter((id) => !idSet.has(id.toLowerCase())), userId]))
        : localViewers.filter((id) => !idSet.has(id.toLowerCase()));

    const targetUser = resolveCollaboratorInfo(userId);
    await saveShareList(
      localSharedWith,
      nextViewers,
      `Changed ${targetUser?.name || "collaborator"}'s role to ${newRole}`,
      localGeneralAccess,
      localGeneralAccessRole
    );
  };

  const handleRemoveUser = async (userIdToRemove: string) => {
    if (!isOwner || !currentUser) return;
    setOpenRowRoleId(null);

    const userObj = getUserById(userIdToRemove);
    const idSet = new Set<string>([
      userIdToRemove.toLowerCase(),
      ...(userObj ? [userObj.id.toLowerCase(), (userObj.email || "").toLowerCase()] : []),
    ]);

    const nextShared = localSharedWith.filter((id) => !idSet.has(id.toLowerCase()));
    const nextViewers = localViewers.filter((id) => !idSet.has(id.toLowerCase()));
    const removedUser = resolveCollaboratorInfo(userIdToRemove);
    await saveShareList(
      nextShared,
      nextViewers,
      `Revoked access for ${removedUser?.name || "collaborator"}`,
      localGeneralAccess,
      localGeneralAccessRole
    );
  };

  // General Access updates (Restricted vs Anyone with the link)
  const handleUpdateGeneralAccessType = async (newType: "restricted" | "anyoneWithLink") => {
    if (!isOwner || !currentUser) return;
    setIsGeneralAccessTypeOpen(false);
    setLocalGeneralAccess(newType);
    await saveShareList(
      localSharedWith,
      localViewers,
      newType === "anyoneWithLink"
        ? `Access updated: Anyone with the link can ${localGeneralAccessRole}`
        : "Access updated: Restricted to added members only",
      newType,
      localGeneralAccessRole
    );
  };

  const handleUpdateGeneralAccessRole = async (newRole: "viewer" | "editor") => {
    if (!isOwner || !currentUser) return;
    setIsGeneralAccessRoleOpen(false);
    setLocalGeneralAccessRole(newRole);
    await saveShareList(
      localSharedWith,
      localViewers,
      `Link permission updated: Anyone with the link can ${newRole}`,
      localGeneralAccess,
      newRole
    );
  };

  const handleCopyLink = async () => {
    const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "";
    const url = `${origin}/doc/${documentId}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setHasCopiedLink(true);
      toast.success(
        localGeneralAccess === "anyoneWithLink"
          ? "Document link copied (anyone with link can access)"
          : "Document link copied (restricted to added members)"
      );
      setTimeout(() => setHasCopiedLink(false), 2500);
    } catch {
      toast.info("Could not copy link to clipboard");
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1e1f23] rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 relative overflow-visible animate-in zoom-in-95 duration-150">
        {/* Google Docs Share Dialog Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Share &ldquo;{documentTitle}&rdquo;</span>
                {localGeneralAccess === "anyoneWithLink" ? (
                  <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage collaborator permissions & link access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-5">
          {/* Add People input (Google Docs style: Direct email input) */}
          {isOwner ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Add people and groups
              </label>
              <form onSubmit={handleAddUser} className="flex items-center gap-2">
                {/* Email text input */}
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter email address (e.g. colleague@example.com)..."
                    disabled={isSubmitting}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#141517] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-xs font-medium"
                  />
                </div>

                {/* Custom Role Dropdown (Default: Viewer, sleek Google Docs styled) */}
                <div className="relative shrink-0" data-share-dropdown="true">
                  <button
                    type="button"
                    onClick={() => setIsAddRoleOpen(!isAddRoleOpen)}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#141517] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs transition shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 dark:hover:border-slate-600 active:scale-98"
                    title="Choose role for invited user"
                    aria-expanded={isAddRoleOpen}
                  >
                    <span>{selectedRole}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        isAddRoleOpen ? "rotate-180 text-blue-600" : ""
                      }`}
                    />
                  </button>

                  {/* Popover Menu */}
                  {isAddRoleOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-white dark:bg-[#1a1c20] backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 select-none">
                        Default Permission
                      </div>
                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRole("Viewer");
                            setIsAddRoleOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition active:scale-[0.98] ${
                            selectedRole === "Viewer"
                              ? "bg-blue-50/90 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold leading-tight">Viewer</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                              Can view and read
                            </div>
                          </div>
                          {selectedRole === "Viewer" && (
                            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRole("Editor");
                            setIsAddRoleOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition active:scale-[0.98] ${
                            selectedRole === "Editor"
                              ? "bg-blue-50/90 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold leading-tight">Editor</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                              Can organize and edit
                            </div>
                          </div>
                          {selectedRole === "Editor" && (
                            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Share Button */}
                <button
                  type="submit"
                  disabled={!emailInput.trim() || isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shrink-0 cursor-pointer active:scale-98"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                You are viewing with collaborator permissions. Only the owner (
                {ownerUser?.name || "Owner"}) can modify sharing settings.
              </span>
            </div>
          )}

          {/* People with access section */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              People with access
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto">
              {/* Document Owner Row */}
              <div className="p-3 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs ${
                      ownerUser?.avatarColor || "bg-blue-600"
                    }`}
                  >
                    {ownerUser?.initials || "OW"}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {ownerUser?.name || "Document Owner"}
                      {ownerId === currentUserId && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          (You)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {ownerUser?.email || ownerId}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <Shield className="w-3 h-3" />
                  Owner
                </span>
              </div>

              {/* Collaborators list */}
              {localSharedWith.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No other collaborators yet. Document is private to owner.
                </div>
              ) : (
                localSharedWith.map((sharedUserId) => {
                  const collaborator = resolveCollaboratorInfo(sharedUserId);
                  const userIsViewer = isViewerRole(sharedUserId);
                  const isRowOpen = openRowRoleId === sharedUserId;

                  return (
                    <div
                      key={sharedUserId}
                      className="p-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 ${
                            collaborator?.avatarColor || "bg-blue-600"
                          }`}
                        >
                          {collaborator?.initials || "U"}
                        </span>
                        <div className="min-w-0 flex-1 truncate">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate">
                            <span className="truncate">{collaborator?.name || sharedUserId}</span>
                            {sharedUserId === currentUserId && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                            {collaborator?.email || sharedUserId}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isOwner ? (
                          <div className="relative" data-share-dropdown="true">
                            <button
                              type="button"
                              onClick={() => setOpenRowRoleId(isRowOpen ? null : sharedUserId)}
                              disabled={isSubmitting}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-98"
                              title="Change collaborator role"
                            >
                              <span>{userIsViewer ? "Viewer" : "Editor"}</span>
                              <ChevronDown
                                className={`w-3 h-3 text-slate-400 transition-transform ${
                                  isRowOpen ? "rotate-180 text-blue-600" : ""
                                }`}
                              />
                            </button>

                            {/* Collaborator Role Popover */}
                            {isRowOpen && (
                              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl bg-white dark:bg-[#1a1c20] backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleRoleChange(sharedUserId, "Viewer")}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition ${
                                    userIsViewer
                                      ? "bg-blue-50/90 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold"
                                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  }`}
                                >
                                  <span>Viewer</span>
                                  {userIsViewer && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRoleChange(sharedUserId, "Editor")}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition ${
                                    !userIsViewer
                                      ? "bg-blue-50/90 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold"
                                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  }`}
                                >
                                  <span>Editor</span>
                                  {!userIsViewer && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                </button>
                                <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveUser(sharedUserId)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove access</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                              userIsViewer
                                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                                : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400"
                            }`}
                          >
                            {userIsViewer ? "Viewer" : "Editor"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })

              )}
            </div>
          </div>

          {/* Google Docs General Access Section */}
          <div className="pt-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              General access
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#141517] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* General Access Icon */}
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-2xs ${
                    localGeneralAccess === "anyoneWithLink"
                      ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                      : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {localGeneralAccess === "anyoneWithLink" ? (
                    <Globe className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {/* General Access Type Dropdown */}
                  {isOwner ? (
                    <div className="relative inline-block" data-share-dropdown="true">
                      <button
                        type="button"
                        onClick={() => setIsGeneralAccessTypeOpen(!isGeneralAccessTypeOpen)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                        title="Click to toggle general link access"
                      >
                        <span>
                          {localGeneralAccess === "anyoneWithLink"
                            ? "Anyone with the link"
                            : "Restricted"}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                            isGeneralAccessTypeOpen ? "rotate-180 text-blue-600" : ""
                          }`}
                        />
                      </button>

                      {/* General Access Type Popover */}
                      {isGeneralAccessTypeOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-60 rounded-2xl bg-white dark:bg-[#1a1c20] backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 text-xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateGeneralAccessType("restricted")}
                            className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition ${
                              localGeneralAccess === "restricted"
                                ? "bg-blue-50/90 dark:bg-blue-950/60 text-blue-950 dark:text-blue-200 ring-1 ring-blue-500/20"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <Lock className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                            <div className="flex-1">
                              <div className="font-bold flex items-center justify-between">
                                <span>Restricted</span>
                                {localGeneralAccess === "restricted" && (
                                  <Check className="w-3.5 h-3.5 text-blue-600" />
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                Only people added can open with this link
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateGeneralAccessType("anyoneWithLink")}
                            className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition mt-1 ${
                              localGeneralAccess === "anyoneWithLink"
                                ? "bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500/20"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <Globe className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                            <div className="flex-1">
                              <div className="font-bold flex items-center justify-between">
                                <span>Anyone with the link</span>
                                {localGeneralAccess === "anyoneWithLink" && (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                Anyone on the internet with the link can access
                              </div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {localGeneralAccess === "anyoneWithLink"
                        ? "Anyone with the link"
                        : "Restricted"}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    {localGeneralAccess === "anyoneWithLink"
                      ? `Anyone on the internet with the link can ${localGeneralAccessRole}`
                      : "Only people added can open with this link"}
                  </div>
                </div>
              </div>

              {/* Role selector for 'Anyone with the link' (Viewer vs Editor) */}
              {localGeneralAccess === "anyoneWithLink" && (
                <div className="relative shrink-0" data-share-dropdown="true">
                  {isOwner ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsGeneralAccessRoleOpen(!isGeneralAccessRoleOpen)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs transition shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-98"
                      >
                        <span className="capitalize">{localGeneralAccessRole}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                            isGeneralAccessRoleOpen ? "rotate-180 text-blue-600" : ""
                          }`}
                        />
                      </button>

                      {/* General Access Role Popover */}
                      {isGeneralAccessRoleOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl bg-white dark:bg-[#1a1c20] backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 text-xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateGeneralAccessRole("viewer")}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition ${
                              localGeneralAccessRole === "viewer"
                                ? "bg-blue-50/90 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <div>
                              <div className="font-semibold">Viewer</div>
                              <div className="text-[10px] text-slate-400">Can view &amp; read</div>
                            </div>
                            {localGeneralAccessRole === "viewer" && (
                              <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateGeneralAccessRole("editor")}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition ${
                              localGeneralAccessRole === "editor"
                                ? "bg-blue-50/90 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <div>
                              <div className="font-semibold">Editor</div>
                              <div className="text-[10px] text-slate-400">Can view &amp; edit</div>
                            </div>
                            {localGeneralAccessRole === "editor" && (
                              <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                      {localGeneralAccessRole}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dialog Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-full border border-blue-200 dark:border-blue-800 transition active:scale-95 cursor-pointer shadow-xs"
              title="Copy link to document"
            >
              {hasCopiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Link copied!</span>
                </>
              ) : (
                <>
                  <LinkIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Copy link</span>
                </>
              )}
            </button>
            {localGeneralAccess === "restricted" && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Lock className="w-3 h-3" />
                <span>Restricted</span>
              </span>
            )}
          </div>


          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-full transition shadow-xs cursor-pointer active:scale-98"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
