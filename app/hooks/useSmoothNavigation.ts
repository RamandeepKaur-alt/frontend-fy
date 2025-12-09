"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Custom hook for smooth page navigation with fade-out/fade-in transitions
 * Usage: const navigate = useSmoothNavigation(); navigate('/dashboard');
 * 
 * This hook wraps router.push with a fade-out animation before navigation
 * and relies on PageTransitionProvider for the fade-in on the new page.
 */
export function useSmoothNavigation() {
  const router = useRouter();

  const navigate = useCallback((url: string) => {
    // Delegate all visual transitions to PageTransitionProvider.
    // This avoids double animations and layout jumps.
    router.push(url);
  }, [router]);

  return navigate;
}

