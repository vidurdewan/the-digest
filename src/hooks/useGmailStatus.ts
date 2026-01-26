"use client";

import { useState, useEffect, useCallback } from "react";

interface UseGmailStatusReturn {
  isConnected: boolean;
  isLoading: boolean;
  connect: () => void;
  disconnect: () => Promise<void>;
}

/**
 * Hook for checking and managing Gmail connection status.
 */
export function useGmailStatus(): UseGmailStatusReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/gmail/status");
      const data = await res.json();
      setIsConnected(data.connected);
    } catch {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();

    // Also check on URL params (after OAuth redirect)
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail_connected") === "true") {
      setIsConnected(true);
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("gmail_error")) {
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [checkStatus]);

  const connect = () => {
    window.location.href = "/api/auth/gmail";
  };

  const disconnect = async () => {
    try {
      await fetch("/api/auth/gmail/disconnect", { method: "POST" });
      setIsConnected(false);
    } catch {
      // Ignore disconnect errors
    }
  };

  return { isConnected, isLoading, connect, disconnect };
}
