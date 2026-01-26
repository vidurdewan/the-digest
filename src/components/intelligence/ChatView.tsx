"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  AlertCircle,
} from "lucide-react";
import type { Article, Summary } from "@/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatViewProps {
  articles: (Article & { summary?: Summary })[];
}

export function ChatView({ articles }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare size={24} className="text-accent-primary" />
        <div>
          <h2 className="text-2xl font-bold text-text-primary">AI Chat</h2>
          <p className="text-sm text-text-tertiary">
            Ask questions about your news feed
          </p>
        </div>
      </div>

      {/* Chat container */}
      <div className="rounded-xl border border-border-primary bg-bg-card overflow-hidden">
        {/* Messages */}
        <div className="h-[500px] overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot size={40} className="mb-3 text-text-tertiary" />
              <p className="text-text-secondary font-medium">
                Ask me anything about your news feed
              </p>
              <p className="mt-1 text-sm text-text-tertiary">
                I have access to {articles.length} articles in your feed
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border border-border-primary bg-bg-secondary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
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
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : ""
              }`}
            >
              {msg.role === "assistant" && (
                <div className="shrink-0 mt-0.5">
                  <div className="rounded-full bg-accent-primary/10 p-1.5">
                    <Bot size={14} className="text-accent-primary" />
                  </div>
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-accent-primary text-text-inverse"
                    : "bg-bg-secondary text-text-primary"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
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
                    <User size={14} className="text-text-secondary" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="shrink-0 mt-0.5">
                <div className="rounded-full bg-accent-primary/10 p-1.5">
                  <Bot size={14} className="text-accent-primary" />
                </div>
              </div>
              <div className="rounded-xl bg-bg-secondary px-4 py-3">
                <Loader2
                  size={16}
                  className="animate-spin text-text-tertiary"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-accent-danger/10 p-3 text-sm text-accent-danger">
              <AlertCircle size={14} />
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
              className="flex-1 rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent-primary"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Simple markdown to HTML converter for chat messages */
function formatMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="rounded bg-bg-tertiary px-1 py-0.5 text-xs">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-1">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}
