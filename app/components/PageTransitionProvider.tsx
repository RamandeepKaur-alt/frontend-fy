"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isFading, setIsFading] = useState(false);

  // On any route or search change, trigger a very light opacity fade.
  // We do NOT delay rendering or move the page vertically.
  useEffect(() => {
    // Start a short fade whenever the route or search params change.
    Promise.resolve().then(() => {
      setIsFading(true);
    });
    const timeout = window.setTimeout(() => {
      setIsFading(false);
    }, 220); // match or slightly exceed CSS transition duration

    return () => window.clearTimeout(timeout);
  }, [pathname, searchParams]);

  return (
    <div
      className="page-transition-wrapper"
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#FAFAFA",
        position: "relative",
        opacity: isFading ? 0.94 : 1,
        transition: "opacity 220ms ease-in-out",
        willChange: "opacity",
      }}
    >
      {children}
    </div>
  );
}
