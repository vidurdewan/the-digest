"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border-primary bg-bg-card text-text-secondary shadow-md hover:bg-bg-hover hover:text-text-primary transition-all back-to-top ${visible ? "visible" : ""}`}
      aria-label="Back to top"
    >
      <ArrowUp size={16} />
    </button>
  );
}
