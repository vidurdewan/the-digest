"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold text-neutral-900">
            Something went wrong
          </h2>
          <p className="mt-3 text-sm text-neutral-600">
            {error.message || "A critical error occurred."}
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
