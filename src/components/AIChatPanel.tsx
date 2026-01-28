"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  AlertCircle,
  X,
} from "lucide-react";
import { useOverlayStore } from "@/lib/store";
import type { Article, Summary } from "@/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIChatPanelProps {
  articles: (Article & { summary?: Summary })[];
}

export function AIChatPanel({ articles }: AIChatPanelProps) {
  const { chatPanelOpen, closeChatPanel } = useOverlayStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (chatPanelOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [chatPanelOpen]);

  // Esc to close (when not typing in input)
  useEffect(() => {
    if (!chatPanelOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeChatPanel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [chatPanelOpen, closeChatPanel]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const articleContext = articles.slice(0, 20).map((a) => ({
        title: a.title,
        source: a.source,
        brief: a.summary?.brief || "",
        topic: a.topic,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          articles: articleContext,
          history: messages.slice(-10),
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      }
    } catch {
      setError("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const suggestedQuestions = [
    "What are the biggest VC deals today?",
    "Any executive movements I should know about?",
    "What are the key trends across these articles?",
    "Which companies are hiring aggressively?",
  ];

  if (!chatPanelOpen) return null;

  return (
    <div className="fixed right-0 top-0 z-30 flex h-full w-[420px] max-w-full flex-col border-l border-border-secondary bg-bg-elevated shadow-lg chat-panel-enter">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-secondary px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-accent-primary" />
          <h3 className="text-sm font-semibold text-text-primary">AI Chat</h3>
          <span className="text-xs text-text-tertiary">
            {articles.length} articles
          </span>
        </div>
        <button
          onClick={closeChatPanel}
          className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
          aria-label="Close chat panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot size={36} className="mb-3 text-text-tertiary" />
            <p className="text-text-secondary font-medium text-sm">
              Ask me anything about your news feed
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              I have access to {articles.length} articles
            </p>
            <div className="mt-4 flex flex-col gap-1.5 w-full px-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                  className="rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${
              msg.role === "user" ? "justify-end" : ""
            }`}
          >
            {msg.role === "assistant" && (
              <div className="shrink-0 mt-0.5">
                <div className="rounded-full bg-accent-primary/10 p-1.5">
                  <Bot size={12} className="text-accent-primary" />
                </div>
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent-primary text-text-inverse"
                  : "bg-bg-secondary text-text-primary"
              }`}
            >
              {msg.role === "assistant" ? (
                <div
                  className="prose prose-xs max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(msg.content),
                  }}
                />
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 mt-0.5">
                <div className="rounded-full bg-bg-secondary p-1.5">
                  <User size={12} className="text-text-secondary" />
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="shrink-0 mt-0.5">
              <div className="rounded-full bg-accent-primary/10 p-1.5">
                <Bot size={12} className="text-accent-primary" />
              </div>
            </div>
            <div className="rounded-xl bg-bg-secondary px-3 py-2.5">
              <Loader2 size={14} className="animate-spin text-text-tertiary" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-accent-danger/10 p-2.5 text-xs text-accent-danger">
            <AlertCircle size={12} />
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border-secondary p-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask about your articles..."
            className="flex-1 rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-xs text-text-primary placeholder-text-tertiary outline-none focus:border-accent-primary"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-accent-primary px-3 py-2 text-xs font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /`(.+?)`/g,
      '<code class="rounded bg-bg-tertiary px-1 py-0.5 text-[10px]">$1</code>'
    )
    .replace(
      /^### (.+)$/gm,
      '<h3 class="text-sm font-semibold mt-2 mb-1">$1</h3>'
    )
    .replace(
      /^## (.+)$/gm,
      '<h2 class="text-base font-semibold mt-2 mb-1">$1</h2>'
    )
    .replace(
      /^# (.+)$/gm,
      '<h1 class="text-lg font-bold mt-2 mb-1">$1</h1>'
    )
    .replace(/^- (.+)$/gm, '<li class="ml-3 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-3 list-decimal">$2</li>')
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}
