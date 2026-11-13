import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let addToast: (message: string, type?: ToastType) => void = () => {};

export function toast(message: string, type: ToastType = "info") {
  addToast(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToast = (message: string, type: ToastType = "info") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md pointer-events-auto transition-all ${
              t.type === "error"
                ? "bg-neutral-900/95 border-rose-500/70 shadow-rose-950/50"
                : t.type === "success"
                ? "bg-neutral-900/95 border-emerald-500/70 shadow-emerald-950/50"
                : "bg-neutral-900/95 border-neutral-700 shadow-neutral-950/50"
            }`}
          >
            {t.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {t.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
            {t.type === "info" && <Info className="w-5 h-5 text-neutral-300 shrink-0" />}
            <span className="text-sm font-semibold text-white tracking-wide">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
