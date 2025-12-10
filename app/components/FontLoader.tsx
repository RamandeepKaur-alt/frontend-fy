"use client";

import { useEffect } from "react";

export default function FontLoader() {
  useEffect(() => {
    // Check if the link already exists
    const existingLink = document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]');
    if (!existingLink) {
      const link = document.createElement("link");
      link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  }, []);

  return null;
}




