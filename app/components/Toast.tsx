"use client";

import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

/**
 * Individual Toast Item Component
 * Displays a single toast notification with animations
 */
function ToastItem({ toast, onClose }: ToastItemProps) {
  const { id, message, type = "info", duration = 2500 } = toast;

  useEffect(() => {
    // Auto-close after duration
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  // Get icon and colors based on type
  const getToastConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          textColor: "text-green-800",
          iconColor: "text-green-500",
        };
      case "error":
        return {
          icon: <XCircle className="w-5 h-5" />,
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          textColor: "text-red-800",
          iconColor: "text-red-500",
        };
      case "warning":
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          textColor: "text-yellow-800",
          iconColor: "text-yellow-500",
        };
      default: // info
        return {
          icon: <Info className="w-5 h-5" />,
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          textColor: "text-blue-800",
          iconColor: "text-blue-500",
        };
    }
  };

  const config = getToastConfig();

  return (
    <div
      className={`
        toast-item
        ${config.bgColor}
        ${config.borderColor}
        ${config.textColor}
        backdrop-blur-sm
        border
        rounded-lg
        shadow-lg
        px-4
        py-3
        mb-3
        min-w-[300px]
        max-w-[400px]
        flex
        items-start
        gap-3
        animate-slide-up
      `}
      role="alert"
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${config.iconColor} mt-0.5`}>
        {config.icon}
      </div>

      {/* Message */}
      <div className="flex-1 text-sm font-medium leading-relaxed">
        {message}
      </div>

      {/* Close Button */}
      <button
        onClick={() => onClose(id)}
        className={`
          flex-shrink-0
          ${config.textColor}
          hover:opacity-70
          transition-opacity
          p-0.5
          rounded
        `}
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Toast Container Component
 * Manages and displays all active toast notifications
 */
export default function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}
























