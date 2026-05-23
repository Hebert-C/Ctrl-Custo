import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ToastVariant = "success" | "error" | "info";

interface ToastEntry {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let _counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const show = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++_counter;
    setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts }: { toasts: ToastEntry[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((toast) => (
        <ToastBubble key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastBubble({ toast }: { toast: ToastEntry }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // força reflow para a transição de entrada funcionar
    requestAnimationFrame(() => setVisible(true));

    timerRef.current = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(timerRef.current);
  }, []);

  const bg =
    toast.variant === "success"
      ? "bg-green-600"
      : toast.variant === "error"
        ? "bg-red-500"
        : "bg-blue-600";

  return (
    <div
      className={`
        ${bg} text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg
        transition-all duration-200 ease-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
      `}
    >
      {toast.message}
    </div>
  );
}
