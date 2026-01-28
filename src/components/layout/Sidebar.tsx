"use client";

import { useState } from "react";
import { useSidebarStore, useOverlayStore, navigationGroups, bottomNavSections } from "@/lib/store";
import {
  Zap,
  Mail,
  Newspaper,
  Eye,
  Bookmark,
  Search,
  Settings,
  Rss,
  PanelLeftClose,
  PanelLeft,
  UserCheck,
  Building2,
  MessageSquare,
  FileText,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Radar,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Zap: <Zap size={18} />,
  Mail: <Mail size={18} />,
  Newspaper: <Newspaper size={18} />,
  Eye: <Eye size={18} />,
  Bookmark: <Bookmark size={18} />,
  Search: <Search size={18} />,
  Rss: <Rss size={18} />,
  Settings: <Settings size={18} />,
  UserCheck: <UserCheck size={18} />,
  Building2: <Building2 size={18} />,
  MessageSquare: <MessageSquare size={18} />,
  FileText: <FileText size={18} />,
  BookOpen: <BookOpen size={18} />,
  Radar: <Radar size={18} />,
};

export function Sidebar() {
  const { isOpen, activeSection, toggle, setActiveSection, setOpen } =
    useSidebarStore();
  const { searchOverlayOpen, chatPanelOpen, openSearchOverlay, toggleChatPanel } =
    useOverlayStore();
  const [toolsCollapsed, setToolsCollapsed] = useState(false);

  const handleNavClick = (sectionId: string, closeMobile?: boolean) => {
    if (sectionId === "search") {
      openSearchOverlay();
    } else if (sectionId === "chat") {
      toggleChatPanel();
    } else {
      setActiveSection(sectionId);
    }
    if (closeMobile) setOpen(false);
  };

  const isItemActive = (sectionId: string) => {
    if (sectionId === "search") return searchOverlayOpen;
    if (sectionId === "chat") return chatPanelOpen;
    return activeSection === sectionId;
  };

  return (
    <>
      {/* Mobile bottom sheet overlay */}
      {isOpen && (
        <div
          className="mobile-sheet-overlay lg:hidden"
          onClick={toggle}
        />
      )}

      {/* Mobile bottom sheet sidebar */}
      {isOpen && (
        <div className="mobile-sheet lg:hidden">
          <div className="mobile-sheet-handle" />
          <nav className="px-3 pt-2 pb-6">
            {navigationGroups.map((group, gi) => (
              <div key={gi}>
                {group.label && (
                  <div className="sidebar-section-label">{group.label}</div>
                )}
                <ul className="space-y-0.5">
                  {group.items.map((section) => {
                    const isActive = isItemActive(section.id);
                    return (
                      <li key={section.id}>
                        <button
                          onClick={() => handleNavClick(section.id, true)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                            isActive
                              ? "bg-bg-active text-accent-primary sidebar-nav-active"
                              : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                          }`}
                        >
                          <span className="shrink-0">{iconMap[section.icon]}</span>
                          <span>{section.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <div className="mt-2 border-t border-border-secondary pt-2">
              <ul className="space-y-0.5">
                {bottomNavSections.map((section) => {
                  const isActive = isItemActive(section.id);
                  return (
                    <li key={section.id}>
                      <button
                        onClick={() => handleNavClick(section.id, true)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                          isActive
                            ? "bg-bg-active text-accent-primary sidebar-nav-active"
                            : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                        }`}
                      >
                        <span className="shrink-0">{iconMap[section.icon]}</span>
                        <span>{section.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 hidden h-full flex-col border-r border-border-secondary bg-bg-sidebar transition-all duration-300 lg:relative lg:z-auto lg:flex ${
          isOpen ? "w-60" : "w-16"
        } overflow-hidden`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border-secondary px-4">
          {isOpen && (
            <h1 className="font-heading text-base font-bold text-text-primary whitespace-nowrap tracking-tight">
              The Digest
            </h1>
          )}
          <button
            onClick={toggle}
            className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-all"
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {navigationGroups.map((group, gi) => {
            const isToolsGroup = group.label === "Tools";
            const isCollapsible = isToolsGroup && isOpen;
            const isGroupOpen = isToolsGroup ? !toolsCollapsed : true;
            // Auto-expand Tools if a tools item is active
            const hasActiveItem = group.items.some((s) => isItemActive(s.id));

            return (
              <div key={gi}>
                {isOpen && group.label && (
                  <div
                    className={`sidebar-section-label ${isCollapsible ? "cursor-pointer flex items-center gap-1 select-none hover:text-text-secondary" : ""}`}
                    onClick={isCollapsible ? () => setToolsCollapsed(!toolsCollapsed) : undefined}
                  >
                    {group.label}
                    {isCollapsible && (
                      toolsCollapsed && !hasActiveItem
                        ? <ChevronRight size={10} />
                        : <ChevronDown size={10} />
                    )}
                  </div>
                )}
                {!isOpen && gi > 0 && (
                  <div className="mx-3 my-2 border-t border-border-secondary" />
                )}
                {(isGroupOpen || hasActiveItem || !isOpen) && (
                  <ul className="space-y-0.5">
                    {group.items.map((section) => {
                      const isActive = isItemActive(section.id);
                      return (
                        <li key={section.id}>
                          <button
                            onClick={() => handleNavClick(section.id)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                              isActive
                                ? `bg-bg-active text-accent-primary${!isOpen ? " sidebar-icon-active" : " sidebar-nav-active"}`
                                : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                            } ${!isOpen ? "justify-center" : ""}`}
                            title={section.label}
                          >
                            <span className="shrink-0">
                              {iconMap[section.icon]}
                            </span>
                            {isOpen && (
                              <span className="whitespace-nowrap">{section.label}</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom-pinned items: Sources + Settings */}
        <div className="border-t border-border-secondary px-2 py-2">
          <ul className="space-y-0.5">
            {bottomNavSections.map((section) => {
              const isActive = isItemActive(section.id);
              return (
                <li key={section.id}>
                  <button
                    onClick={() => handleNavClick(section.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? `bg-bg-active text-accent-primary${!isOpen ? " sidebar-icon-active" : " sidebar-nav-active"}`
                        : "text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
                    } ${!isOpen ? "justify-center" : ""}`}
                    title={section.label}
                  >
                    <span className="shrink-0">
                      {iconMap[section.icon]}
                    </span>
                    {isOpen && (
                      <span className="whitespace-nowrap">{section.label}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </>
  );
}
