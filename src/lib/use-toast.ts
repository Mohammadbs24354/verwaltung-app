"use client";

import { useState, useCallback } from "react";

type ToastVariant = "default" | "destructive" | "success";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

let listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function dispatch(toast: Toast) {
  toasts = [...toasts, toast];
  listeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== toast.id);
    listeners.forEach((l) => l(toasts));
  }, 4000);
}

export function toast(opts: Omit<Toast, "id">) {
  dispatch({ id: Math.random().toString(36).slice(2), ...opts });
}

export function useToast() {
  const [localToasts, setLocalToasts] = useState<Toast[]>(toasts);

  useCallback(() => {
    const listener = (t: Toast[]) => setLocalToasts([...t]);
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  }, [])();

  return { toasts: localToasts, toast };
}
