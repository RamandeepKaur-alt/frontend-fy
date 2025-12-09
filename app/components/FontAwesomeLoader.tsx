"use client";

import { useEffect } from "react";

export default function FontAwesomeLoader() {
  useEffect(() => {
    // Check if FontAwesome is already loaded
    if (document.querySelector('link[href*="font-awesome"]')) {
      return;
    }

    // Create and add FontAwesome stylesheet
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
    link.crossOrigin = "anonymous";
    link.referrerPolicy = "no-referrer";
    document.head.appendChild(link);

    // Cleanup function (optional, but good practice)
    return () => {
      const existingLink = document.querySelector('link[href*="font-awesome"]');
      if (existingLink) {
        existingLink.remove();
      }
    };
  }, []);

  return null;
}






