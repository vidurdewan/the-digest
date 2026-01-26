"use client";

import { useState, useEffect } from "react";
import { StickyNote, Plus, Trash2, Edit3, Check, X, Loader2 } from "lucide-react";
import { useAnnotations, type Annotation } from "@/hooks/useAnnotations";

interface AnnotationsPanelProps {
  articleId: string;
}

export function AnnotationsPanel({ articleId }: AnnotationsPanelProps) {
  const {
    annotations,
    isLoading,
    fetchAnnotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
  } = useAnnotations();
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchAnnotations(articleId);
  }, [articleId, fetchAnnotations]);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setIsAdding(true);
    await addAnnotation(articleId, newNote.trim());
    setNewNote("");
    setIsAdding(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editText.trim()) return;
    await updateAnnotation(id, articleId, editText.trim());
    setEditingId(null);
    setEditText("");
  };

  const startEdit = (annotation: Annotation) => {
    setEditingId(annotation.id);
    setEditText(annotation.note);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <StickyNote size={14} className="text-text-tertiary" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Notes ({annotations.length})
        </h4>
      </div>

      {/* Add note input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a note..."
          className="flex-1 rounded-lg border border-border-primary bg-bg-secondary px-3 py-1.5 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent-primary"
        />
        <button
          onClick={handleAdd}
          disabled={isAdding || !newNote.trim()}
          className="rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors disabled:opacity-50"
        >
          {isAdding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
        </button>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-text-tertiary">
          <Loader2 size={12} className="animate-spin" />
          <span className="text-xs">Loading notes...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              className="group rounded-lg border border-border-secondary bg-bg-secondary p-2.5"
            >
              {editingId === annotation.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleUpdate(annotation.id)
                    }
                    className="flex-1 rounded border border-border-primary bg-bg-primary px-2 py-1 text-sm text-text-primary outline-none focus:border-accent-primary"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(annotation.id)}
                    className="text-accent-success hover:text-accent-success/80"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-text-tertiary hover:text-text-primary"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-text-secondary">
                    {annotation.note}
                  </p>
                  <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(annotation)}
                      className="rounded p-0.5 text-text-tertiary hover:text-accent-primary"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => deleteAnnotation(annotation.id)}
                      className="rounded p-0.5 text-text-tertiary hover:text-accent-danger"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
              <p className="mt-1 text-xs text-text-tertiary">
                {new Date(annotation.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
