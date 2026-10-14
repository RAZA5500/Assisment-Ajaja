"use client";

import React, { createContext, useContext } from "react";
import hotToast, {
  Toaster,
  ToastBar,
  ToastOptions,
  Renderable,
  ValueOrFunction,
} from "react-hot-toast";
import { Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

// Custom wrapper to seamlessly extend react-hot-toast with toast.info and backward-compatible helper functions
export const toast = Object.assign(
  (message: ValueOrFunction<Renderable, any>, opts?: ToastOptions) =>
    hotToast(message, opts),
  {
    success: (message: ValueOrFunction<Renderable, any>, opts?: ToastOptions) =>
      hotToast.success(message, opts),
    error: (message: ValueOrFunction<Renderable, any>, opts?: ToastOptions) =>
      hotToast.error(message, opts),
    info: (message: string, opts?: ToastOptions) =>
      hotToast(message, {
        icon: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
        ...opts,
      }),
    loading: (message: ValueOrFunction<Renderable, any>, opts?: ToastOptions) =>
      hotToast.loading(message, opts),
    dismiss: (toastId?: string) => hotToast.dismiss(toastId),
    remove: (toastId?: string) => hotToast.remove(toastId),
    custom: hotToast.custom,
    promise: hotToast.promise,
  }
);

interface ToastContextType {
  toast: typeof toast;
}

const ToastContext = createContext<ToastContextType>({ toast });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toaster
        position="bottom-right"
        gutter={10}
        containerStyle={{
          bottom: 24,
          right: 24,
          zIndex: 99999,
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: "var(--toast-bg, #ffffff)",
            color: "var(--toast-color, #0f172a)",
            border: "1px solid var(--toast-border, #e2e8f0)",
            padding: "10px 14px",
            borderRadius: "16px",
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            fontSize: "13px",
            fontWeight: "500",
            maxWidth: "380px",
          },
          success: {
            duration: 3500,
            iconTheme: {
              primary: "#10b981",
              secondary: "#ffffff",
            },
          },
          error: {
            duration: 4500,
            iconTheme: {
              primary: "#ef4444",
              secondary: "#ffffff",
            },
          },
        }}
      >
        {(t) => (
          <ToastBar
            toast={t}
            style={{
              ...t.style,
              animation: t.visible
                ? "toastSlideInRight 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) forwards"
                : "toastSlideOutRight 0.28s cubic-bezier(0.06, 0.71, 0.55, 1) forwards",
            }}
          >
            {({ icon, message }) => (
              <div className="flex items-center gap-2.5 w-full">
                {icon}
                <div className="flex-1 text-xs font-semibold leading-relaxed">
                  {message}
                </div>
                {t.type !== "loading" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      hotToast.dismiss(t.id);
                    }}
                    className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    aria-label="Close notification"
                    title="Close notification"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                )}
              </div>
            )}
          </ToastBar>
        )}
      </Toaster>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  return context.toast;
}

export default toast;
