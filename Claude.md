# THE DIGEST — Editorial Redesign Context

## Project Overview
The Digest is an AI-powered news intelligence app built with Next.js App Router, Tailwind CSS, Zustand for state, and Supabase for backend. We are doing a MAJOR layout and visual redesign — transitioning from a sidebar-based dashboard UI to a newspaper-style editorial layout. This is a structural transformation, not a minor polish pass.

## Current Tech Stack
- **Framework**: Next.js 14+ App Router (all pages under /app)
- **Styling**: Tailwind CSS + CSS custom properties (variables)
- **State**: Zustand (persisted to localStorage)
- **Backend**: Supabase (PostgreSQL)
- **API Routes**: /api/articles, /api/engagement, /api/ingest/news
- **Fonts**: Inter (sans), Libre Baskerville (serif), Geist Mono (monospace)
- **Themes**: data-theme attribute on <html> — values: "light", "dark", "newspaper"
- **Navigation**: 100% client-side state via Zustand (URL stays at /)
- **Deployment**: Vercel

## Current Layout Structure (DOM)
```
body
  div.flex.h-screen.overflow-hidden.bg-bg-primary.transition-theme
    div.mobile-sheet-overlay.lg:hidden
    div.mobile-sheet.lg:hidden
    aside (sidebar — 240px, hidden on mobile, visible lg+)
      heading "The Digest"
      nav (Feed: Priority Feed, Newsletters, News by Topic)
      nav (Intelligence)
      nav (Tools: Search, AI Chat, Brief Me, Weekly Synthesis, Saved)
      footer (Sources, Settings)
    div.flex.flex-1.flex-col.overflow-hidden
      header (sticky top bar — logo, theme toggle, notification bell)
      main.flex-1.overflow-y-auto.px-4.py-6.md:px-6.lg:px-8
```

## Target Layout Structure (DOM)
```
body
  div.editorial-layout (no flex h-screen, natural document flow)
    header.editorial-header (sticky top — logo left, nav links right)
      "The Digest" (logo, serif, underlined)
      nav: Your Feed | Newsletters (count) | Saved | Settings
    div.editorial-content (two-column: main + aside)
      main.editorial-main (~65% width)
        section.hero-story (top story with massive headline + image)
        nav.topic-tabs (All | Tech | Design | Economics | Politics)
        section.feed-list (flat article list, ruled dividers)
      aside.newsletter-rail (~35% width, sticky)
        section.inbox-intelligence (daily digest summary)
        section.newsletter-cards (individual newsletter summaries)
```

## CSS Custom Properties (MUST use these, never hardcode colors)
### Paper/Newspaper Theme (primary target):
- --bg-primary: #fff8f0
- --bg-secondary: #fef3e2
- --bg-card: #fffbf5
- --text-primary: #1a1a1a
- --text-secondary: #5c4a3a
- --border-primary: #e8d5c0
- --accent-primary: #c0392b

### The design uses these existing CSS variables. All new styles MUST reference them via Tailwind's bg-bg-primary, text-text-primary, border-border-primary classes or var(--property) in custom CSS.

## Existing Tailwind Custom Classes
- transition-theme (theme transition)
- card-interactive (hover effects)
- sidebar-section-label
- page-enter, section-enter (animations)

## Key Design Principles for the Redesign
1. **Typography-first**: No cards, no shadows, no rounded corners. Headlines do all the work.
2. **Ruled lines only**: Horizontal rules (1px border-bottom) separate content sections. No card containers.
3. **Generous whitespace**: Let content breathe. More padding than you think.
4. **Serif headlines**: Libre Baskerville for all headlines. Large sizes (32-72px for hero, 20-28px for feed).
5. **Sans-serif body**: Inter for body text, metadata, navigation.
6. **Warm beige palette**: The newspaper theme's existing warm colors are the base.
7. **No sidebar**: Navigation lives in the top bar as plain text links.
8. **Two-column editorial**: Main content left (~65%), newsletter rail right (~35%).
9. **Flat feed**: Vertical list with topic dots, timestamps, headlines, sources — no image cards in the feed.
10. **Persistent newsletter rail**: Right column shows newsletter digests without navigating away.

## Critical Rules
- DO NOT delete existing components. Restructure and restyle them.
- DO NOT change Zustand store shapes or API routes.
- DO NOT break mobile layout — mobile should stack to single column.
- DO NOT install new dependencies.
- DO NOT hardcode hex colors — use CSS variables.
- ALL new components in TypeScript with Tailwind classes.
- Preserve all existing functionality (command palette, AI chat, keyboard shortcuts, article reader).
- The article reader panel (slide-over from right) should continue to work as-is.
- Existing views (Intelligence, Sources, Settings) render in the main column when navigated to.

## Git
All work for this redesign happens on the `ui-redesign` branch. Before making any changes, verify you are on the `ui-redesign` branch. If not, switch to it with `git checkout ui-redesign`.
```

---

