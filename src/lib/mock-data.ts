import type { TopicCategory } from "@/types";

export const topicLabels: Record<TopicCategory, string> = {
  "vc-startups": "VC & Startups",
  "fundraising-acquisitions": "Fundraising & Acquisitions",
  "executive-movements": "Executive Movements",
  "financial-markets": "Financial Markets",
  "geopolitics": "Geopolitics",
  "automotive": "Automotive",
  "science-tech": "Science & Tech",
  "local-news": "Local News",
  "politics": "Politics",
};

export const topicColors: Record<TopicCategory, string> = {
  "vc-startups": "bg-blue-100 text-blue-800",
  "fundraising-acquisitions": "bg-emerald-100 text-emerald-800",
  "executive-movements": "bg-purple-100 text-purple-800",
  "financial-markets": "bg-amber-100 text-amber-800",
  "geopolitics": "bg-red-100 text-red-800",
  "automotive": "bg-cyan-100 text-cyan-800",
  "science-tech": "bg-indigo-100 text-indigo-800",
  "local-news": "bg-orange-100 text-orange-800",
  "politics": "bg-rose-100 text-rose-800",
};

export function getRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}
