"use client";

import { createContext, useContext, useState } from "react";

interface SidebarContextValue {
  isCollapsed: boolean;
  isOpen: boolean; // mobile overlay
  setIsCollapsed: (v: boolean) => void;
  setIsOpen: (v: boolean) => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  isCollapsed: false,
  isOpen: false,
  setIsCollapsed: () => {},
  setIsOpen: () => {},
  toggle: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsedState] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [isOpen, setIsOpen] = useState(false);

  function setIsCollapsed(v: boolean) {
    setIsCollapsedState(v);
    localStorage.setItem("sidebar-collapsed", String(v));
  }

  function toggle() {
    setIsCollapsed(!isCollapsed);
  }

  return (
    <SidebarContext.Provider value={{ isCollapsed, isOpen, setIsCollapsed, setIsOpen, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
