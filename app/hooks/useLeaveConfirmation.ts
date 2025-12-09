"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface UseLeaveConfirmationOptions {
  leaveTo: string; // path to navigate to when user confirms
}

export function useLeaveConfirmation({ leaveTo }: UseLeaveConfirmationOptions) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const leavePathRef = useRef(leaveTo);
  
  useEffect(() => {
    leavePathRef.current = leaveTo;
  }, [leaveTo]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = (event: PopStateEvent) => {
      // Intercept back navigation and show confirmation instead
      setOpen(true);
      // Immediately push state back so we stay on the same URL until user confirms
      window.history.pushState(null, "", window.location.href);
    };

    // Push a state so that the first Back triggers popstate instead of leaving immediately
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const onStay = () => {
    setOpen(false);
  };

  const onLeave = () => {
    setOpen(false);
    router.push(leavePathRef.current);
  };

  return {
    leaveOpen: open,
    onStay,
    onLeave,
  };
}
