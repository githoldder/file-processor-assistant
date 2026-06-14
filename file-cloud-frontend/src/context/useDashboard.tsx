import React, { createContext, useContext, useState, ReactNode } from "react";
import type { ViewState } from "../types";

interface DashboardContextType {
  activeView: ViewState;
  setActiveView: (v: ViewState) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<ViewState>("dashboard");

  return (
    <DashboardContext.Provider value={{ activeView, setActiveView }}>
      {children}
    </DashboardContext.Provider>
  );
}

/**
 * Each view component calls useDashboard(viewName) in its render phase
 * to sync the global activeView state (for sidebar highlighting etc).
 */
export function useDashboard(view?: ViewState) {
  const ctx = useContext(DashboardContext);
  if (ctx === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  if (view) {
    // Sync on each render — React will batch state updates
    if (ctx.activeView !== view) {
      ctx.setActiveView(view);
    }
  }
  return ctx;
}
