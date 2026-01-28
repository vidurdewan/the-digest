"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { create } from "zustand";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  addToast: (message, type = "info", duration = 2000) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-accent-success" />,
  error: <AlertCircle size={16} className="text-accent-danger" />,
  info: <Info size={16} className="text-accent-primary" />,
};

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToastStore();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const dismissDelay = toast.duration ?? 2000;
    const exitTimer = setTimeout(() => setExiting(true), dismissDelay);
    const removeTimer = setTimeout(() => removeToast(toast.id), dismissDelay + 200);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, toast.duration, removeToast]);

  return (
    <div className={`flex items-center gap-2.5 rounded-lg border border-border-primary bg-bg-card px-4 py-2.5 shadow-lg ${exiting ? "toast-exit" : "toast-enter"}`}>
      {icons[toast.type]}
      <p className="flex-1 text-sm text-text-primary">{toast.message}</p>
      <button
        onClick={() => {
          setExiting(true);
          setTimeout(() => removeToast(toast.id), 200);
        }}
        className="rounded-md p-1 text-text-tertiary hover:text-text-primary transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
