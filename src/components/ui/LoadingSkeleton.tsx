"use client";

export function ArticleCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border-primary bg-bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-5 w-24 rounded-full bg-bg-tertiary" />
        <div className="ml-auto h-4 w-16 rounded bg-bg-tertiary" />
      </div>
      <div className="mb-2 h-5 w-full rounded bg-bg-tertiary" />
      <div className="mb-3 h-5 w-3/4 rounded bg-bg-tertiary" />
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-bg-tertiary" />
        <div className="h-4 w-12 rounded bg-bg-tertiary" />
      </div>
      <div className="mt-3 border-t border-border-secondary pt-3">
        <div className="h-4 w-full rounded bg-bg-tertiary" />
        <div className="mt-1 h-4 w-2/3 rounded bg-bg-tertiary" />
      </div>
    </div>
  );
}

export function ArticleListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="flex min-w-[140px] animate-pulse items-center gap-3 rounded-lg border border-border-primary bg-bg-card p-4">
      <div className="h-8 w-8 rounded bg-bg-tertiary" />
      <div>
        <div className="mb-1 h-6 w-10 rounded bg-bg-tertiary" />
        <div className="h-3 w-14 rounded bg-bg-tertiary" />
      </div>
    </div>
  );
}

export function StatsBarSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function NewsletterCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border-primary bg-bg-card p-4 sm:p-5">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-10 w-10 rounded-full bg-bg-tertiary" />
        <div>
          <div className="mb-1 h-4 w-32 rounded bg-bg-tertiary" />
          <div className="h-3 w-20 rounded bg-bg-tertiary" />
        </div>
      </div>
      <div className="mt-3 h-5 w-full rounded bg-bg-tertiary" />
      <div className="mt-2 h-4 w-3/4 rounded bg-bg-tertiary" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded bg-bg-tertiary" />
        <div className="h-7 w-48 animate-pulse rounded bg-bg-tertiary" />
      </div>
      <StatsBarSkeleton />
      <ArticleListSkeleton />
    </div>
  );
}
