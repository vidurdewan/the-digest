"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h2 className="font-serif text-2xl font-bold text-text-primary">
          Something went wrong
        </h2>
        <p className="mt-3 text-sm text-text-secondary">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md border border-border-primary px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
