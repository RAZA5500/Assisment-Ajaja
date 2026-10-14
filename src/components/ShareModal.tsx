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
  onShareUpdated: (newSharedWith: string[], newViewers?: string[]) => void;
}

export default function ShareModal({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  ownerId,
  sharedWith,
  viewers = [],
  onShareUpdated,
}: ShareModalProps) {
  const { currentUser, getUserById } = useUser();
  const toast = useToast();

  const [localSharedWith, setLocalSharedWith] = useState<string[]>(sharedWith);
  const [localViewers, setLocalViewers] = useState<string[]>(viewers);
  const [emailInput, setEmailInput] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"Editor" | "Viewer">("Editor");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  // Sync state if props change
  useEffect(() => {
    setLocalSharedWith(sharedWith);
  }, [sharedWith]);

  useEffect(() => {
    setLocalViewers(viewers || []);
  }, [viewers]);

  if (!isOpen) return null;

  const currentUserId = currentUser?.id || "";
  const isOwner = currentUserId === ownerId;
  const ownerUser = getUserById(ownerId);

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
    successMsg: string
  ) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify({
          userId: currentUser.id,
          sharedWith: updatedSharedWith,
          viewers: updatedViewers,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update sharing permissions");
      }

      setLocalSharedWith(updatedSharedWith);
      setLocalViewers(updatedViewers);
      onShareUpdated(updatedSharedWith, updatedViewers);
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
      `Shared access (${selectedRole}) granted to ${trimmedEmail}`
    );
    setEmailInput("");
  };

  const handleRoleChange = async (userId: string, newRole: "Editor" | "Viewer") => {
    if (!isOwner || !currentUser) return;

    const nextViewers =
      newRole === "Viewer"
        ? Array.from(new Set([...localViewers, userId]))
        : localViewers.filter((id) => id !== userId);

    const targetUser = resolveCollaboratorInfo(userId);
    await saveShareList(
      localSharedWith,
      nextViewers,
      `Changed ${targetUser?.name || "collaborator"}'s role to ${newRole}`
    );
  };

  const handleRemoveUser = async (userIdToRemove: string) => {
    if (!isOwner || !currentUser) return;

    const nextShared = localSharedWith.filter((id) => id !== userIdToRemove);
    const nextViewers = localViewers.filter((id) => id !== userIdToRemove);
    const removedUser = resolveCollaboratorInfo(userIdToRemove);
    await saveShareList(
      nextShared,
      nextViewers,
      `Revoked access for ${removedUser?.name || "collaborator"}`
    );
  };

  const handleCopyLink = async () => {
    try {
      const url = window.location.origin + `/doc/${documentId}`;
      await navigator.clipboard.writeText(url);
      setHasCopiedLink(true);
      toast.success("Document link copied to clipboard");
      setTimeout(() => setHasCopiedLink(false), 2500);
    } catch {
      toast.info("Could not copy link to clipboard");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1e1f23] rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 relative overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Google Docs Share Dialog Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Share &ldquo;{documentTitle}&rdquo;</span>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
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

                {/* Role dropdown */}
                <div className="relative shrink-0">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as "Editor" | "Viewer")}
                    disabled={isSubmitting}
                    className="text-xs appearance-none pl-3 pr-7 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#141517] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-xs cursor-pointer font-bold hover:border-slate-300 dark:hover:border-slate-600"
                    title="Select access role"
                  >
                    <option value="Editor">Editor</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
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
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
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
                  const isViewerRole = localViewers.includes(sharedUserId);

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
                          <div className="flex items-center gap-1.5">
                            <div className="relative">
                              <select
                                value={isViewerRole ? "Viewer" : "Editor"}
                                onChange={(e) =>
                                  handleRoleChange(
                                    sharedUserId,
                                    e.target.value as "Editor" | "Viewer"
                                  )
                                }
                                disabled={isSubmitting}
                                className="text-xs appearance-none pl-2.5 pr-6 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold cursor-pointer transition shadow-2xs hover:border-slate-300 dark:hover:border-slate-600"
                                title="Change collaborator role"
                              >
                                <option value="Editor">Editor</option>
                                <option value="Viewer">Viewer</option>
                              </select>
                              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveUser(sharedUserId)}
                              disabled={isSubmitting}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Remove collaborator"
                              aria-label={`Revoke access for ${
                                collaborator?.name || sharedUserId
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                              isViewerRole
                                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                                : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400"
                            }`}
                          >
                            {isViewerRole ? "Viewer" : "Editor"}
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
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#141517] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Restricted
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Only people added can open with this link
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full border border-slate-300 dark:border-slate-700 transition cursor-pointer"
          >
            {hasCopiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Link copied!</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Copy link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-full transition shadow-xs cursor-pointer active:scale-98"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
