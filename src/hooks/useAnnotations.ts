"use client";

import { useState, useCallback } from "react";

export interface Annotation {
  id: string;
  articleId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

interface UseAnnotationsReturn {
  annotations: Annotation[];
  isLoading: boolean;
  fetchAnnotations: (articleId?: string) => Promise<void>;
  addAnnotation: (articleId: string, note: string) => Promise<Annotation | null>;
  updateAnnotation: (id: string, articleId: string, note: string) => Promise<boolean>;
  deleteAnnotation: (id: string) => Promise<boolean>;
  searchAnnotations: (query: string) => Promise<void>;
}

export function useAnnotations(): UseAnnotationsReturn {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAnnotations = useCallback(async (articleId?: string) => {
    setIsLoading(true);
    try {
      const params = articleId ? `?articleId=${articleId}` : "";
      const res = await fetch(`/api/annotations${params}`);
      const data = await res.json();
      if (data.annotations) {
        setAnnotations(data.annotations);
      }
    } catch {
      // Keep existing annotations
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addAnnotation = useCallback(
    async (articleId: string, note: string): Promise<Annotation | null> => {
      try {
        const res = await fetch("/api/annotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId, note }),
        });
        const data = await res.json();
        if (data.annotation) {
          setAnnotations((prev) => [data.annotation, ...prev]);
          return data.annotation;
        }
        return null;
      } catch {
        // Fallback: add locally
        const local: Annotation = {
          id: `local-${Date.now()}`,
          articleId,
          note,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setAnnotations((prev) => [local, ...prev]);
        return local;
      }
    },
    []
  );

  const updateAnnotation = useCallback(
    async (id: string, articleId: string, note: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/annotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, articleId, note }),
        });
        if (res.ok) {
          setAnnotations((prev) =>
            prev.map((a) =>
              a.id === id
                ? { ...a, note, updatedAt: new Date().toISOString() }
                : a
            )
          );
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    []
  );

  const deleteAnnotation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/annotations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setAnnotations((prev) => prev.filter((a) => a.id !== id));
        return true;
      }
      return false;
    } catch {
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      return true;
    }
  }, []);

  const searchAnnotations = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/annotations?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.annotations) {
        setAnnotations(data.annotations);
      }
    } catch {
      // Keep existing
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    annotations,
    isLoading,
    fetchAnnotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    searchAnnotations,
  };
}
