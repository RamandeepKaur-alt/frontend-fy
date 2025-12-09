"use client";

import { useEffect, useState } from "react";
import { ClipboardProvider } from "../contexts/ClipboardContext";
import { ToastProvider, setGlobalToastContext } from "../contexts/ToastContext";
import { useToast } from "../contexts/ToastContext";

/**
 * ToastContextInitializer Component
 * Initializes the global toast context for use outside React components
 */
function ToastContextInitializer() {
  const toast = useToast();

  useEffect(() => {
    setGlobalToastContext(toast);
  }, [toast]);

  return null;
}

/**
 * ClipboardProviderWrapper Component
 * Client-side wrapper that provides the token to ClipboardProvider
 * This is needed because layout.tsx is a server component
 */
export default function ClipboardProviderWrapper({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from localStorage on client side
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);
  }, []);

  return (
    <ToastProvider>
      <ToastContextInitializer />
      <ClipboardProvider token={token}>
        {children}
      </ClipboardProvider>
    </ToastProvider>
  );
}

