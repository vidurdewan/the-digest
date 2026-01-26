"use client";

import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { create } from "zustand";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  addToast: (message, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    // Auto-remove after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-accent-success" />,
  error: <AlertCircle size={18} className="text-accent-danger" />,
  info: <Info size={18} className="text-accent-primary" />,
};

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToastStore();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-primary bg-bg-card px-4 py-3 shadow-lg transition-all animate-in slide-in-from-right">
      {icons[toast.type]}
      <p className="flex-1 text-sm text-text-primary">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="rounded-md p-1 text-text-tertiary hover:text-text-primary"
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 sm:bottom-6 sm:right-6">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
