"use client";
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: string; title?: string; message: string; type: ToastType };

interface ToastContextValue {
  showToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, ...t };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3000);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-md px-4 py-2 shadow text-sm text-white ${
              t.type === "success" ? "bg-green-600" : t.type === "error" ? "bg-red-600" : "bg-gray-800"
            }`}
          >
            {t.title && <div className="font-semibold">{t.title}</div>}
            <div>{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}


