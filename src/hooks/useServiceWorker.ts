"use client";

import { useState, useEffect, useCallback } from "react";

interface UseServiceWorkerReturn {
  isSupported: boolean;
  isRegistered: boolean;
  notificationsEnabled: boolean;
  requestNotificationPermission: () => Promise<boolean>;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [isRegistered, setIsRegistered] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission === "granted"
      : false
  );
  const isSupported =
    typeof window !== "undefined" && "serviceWorker" in navigator;

  useEffect(() => {
    if (!isSupported) return;

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        setIsRegistered(true);
        console.log("[SW] Registered:", registration.scope);
      })
      .catch((err) => {
        console.error("[SW] Registration failed:", err);
      });
  }, [isSupported]);

  const requestNotificationPermission =
    useCallback(async (): Promise<boolean> => {
      if (!("Notification" in window)) return false;

      if (Notification.permission === "granted") {
        setNotificationsEnabled(true);
        return true;
      }

      if (Notification.permission === "denied") {
        return false;
      }

      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      setNotificationsEnabled(granted);
      return granted;
    }, []);

  return {
    isSupported,
    isRegistered,
    notificationsEnabled,
    requestNotificationPermission,
  };
}
