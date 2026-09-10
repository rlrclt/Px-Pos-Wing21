import { useState, useEffect } from 'react';
import type { ToastMessage, ToastOptions } from '../types/ui.ts';

type Listener = (toasts: ToastMessage[]) => void;

let globalToasts: ToastMessage[] = [];
let listeners: Listener[] = [];

function notify() {
  listeners.forEach(l => l([...globalToasts]));
}

export function showToast(options: ToastOptions, durationMs: number = 3500): string {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastMessage = { ...options, id };
  globalToasts = [...globalToasts, newToast];
  notify();

  if (options.type !== 'loading' && durationMs > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, durationMs);
  }

  return id;
}

export function dismissToast(id: string): void {
  globalToasts = globalToasts.filter(t => t.id !== id);
  notify();
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>(globalToasts);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter(l => l !== setToasts);
    };
  }, []);

  return {
    toasts,
    showToast,
    dismissToast
  };
}
