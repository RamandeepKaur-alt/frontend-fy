"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import ToastContainer, { Toast, ToastType } from "../components/Toast";

/**
 * Toast Context Interface
 * Provides methods to show toast notifications
 */
interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
}

// Create the context with undefined default
const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Toast Provider Component
 * Wraps the app and provides global toast functionality
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  /**
   * Remove a toast by ID
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Show a toast notification
   * @param message - The message to display
   * @param type - Type of toast (success, error, info, warning)
   * @param duration - Duration in milliseconds (default: 2500)
   */
  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration: number = 2500) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: Toast = {
        id,
        message,
        type,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  /**
   * Convenience methods for different toast types
   */
  const showSuccess = useCallback(
    (message: string) => showToast(message, "success"),
    [showToast]
  );

  const showError = useCallback(
    (message: string) => showToast(message, "error"),
    [showToast]
  );

  const showInfo = useCallback(
    (message: string) => showToast(message, "info"),
    [showToast]
  );

  const showWarning = useCallback(
    (message: string) => showToast(message, "warning"),
    [showToast]
  );

  const value: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

/**
 * useToast Hook
 * Provides access to the global toast context
 * @throws Error if used outside ToastProvider
 */
export function useToast() {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}

/**
 * Global showToast function
 * Can be called from anywhere in the app
 * Usage: showToast("Message here", "success")
 */
let globalToastContext: ToastContextType | null = null;

export function setGlobalToastContext(context: ToastContextType) {
  globalToastContext = context;
}

export function showToast(message: string, type?: ToastType, duration?: number) {
  if (globalToastContext) {
    globalToastContext.showToast(message, type, duration);
  } else {
    // Fallback to console if context not available
  }
}

















