import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { ViewState } from "../types";

interface DashboardContextType {
  activeView: ViewState;
  setActiveView: (v: ViewState) => void;
  role: 'user' | 'admin';
  setRole: (r: 'user' | 'admin') => void;
  toggleCockpit: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
);

const STORAGE_KEY_ROLE = "culcloud_role";
const STORAGE_KEY_VIEW = "culcloud_view";

function loadInitialRole(): 'user' | 'admin' {
  const saved = localStorage.getItem(STORAGE_KEY_ROLE);
  return (saved === 'admin' || saved === 'user') ? saved : 'user';
}

function loadInitialView(): ViewState {
  const saved = localStorage.getItem(STORAGE_KEY_VIEW);
  if (saved === 'analytics' || saved === 'dashboard' || saved === 'files' || saved === 'convert' || saved === 'pdf') {
    return saved;
  }
  // 如果 role 是 admin 但 view 没存，默认回到大屏
  const role = localStorage.getItem(STORAGE_KEY_ROLE);
  return (role === 'admin') ? 'analytics' : 'dashboard';
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<ViewState>(() => loadInitialView());
  const [role, setRole] = useState<'user' | 'admin'>(() => loadInitialRole());

  const handleSetRole = useCallback((r: 'user' | 'admin') => {
    setRole(r);
    localStorage.setItem(STORAGE_KEY_ROLE, r);
  }, []);

  const handleSetView = useCallback((v: ViewState) => {
    setActiveView(v);
    localStorage.setItem(STORAGE_KEY_VIEW, v);
  }, []);

  const toggleCockpit = useCallback(() => {
    if (role === 'admin') {
      // 退出大屏回到用户端
      setRole('user');
      localStorage.setItem(STORAGE_KEY_ROLE, 'user');
      setActiveView('dashboard');
      localStorage.setItem(STORAGE_KEY_VIEW, 'dashboard');
    } else {
      // 进入大屏
      setRole('admin');
      localStorage.setItem(STORAGE_KEY_ROLE, 'admin');
      setActiveView('analytics');
      localStorage.setItem(STORAGE_KEY_VIEW, 'analytics');
    }
  }, [role]);

  return (
    <DashboardContext.Provider value={{ activeView, setActiveView: handleSetView, role, setRole: handleSetRole, toggleCockpit }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(view?: ViewState) {
  const ctx = useContext(DashboardContext);
  if (ctx === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  useEffect(() => {
    if (view && ctx.activeView !== view) {
      ctx.setActiveView(view);
    }
  }, [view, ctx.activeView]);
  return ctx;
}
