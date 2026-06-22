import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { ViewState } from "../types";
import { fetchRole, setServerRole } from "../services/api";

interface DashboardContextType {
  activeView: ViewState;
  setActiveView: (v: ViewState) => void;
  role: 'user' | 'admin';
  setRole: (r: 'user' | 'admin') => void;
  toggleCockpit: () => void;
  roleLoading: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
);

const STORAGE_KEY_ROLE = "culcloud_role";
const STORAGE_KEY_VIEW = "culcloud_view";

const USER_ALLOWED_VIEWS: ViewState[] = ['dashboard', 'files', 'convert', 'pdf'];

function loadCachedRole(): 'user' | 'admin' {
  const saved = localStorage.getItem(STORAGE_KEY_ROLE);
  return (saved === 'admin' || saved === 'user') ? saved : 'user';
}

function loadCachedView(): ViewState {
  if (loadCachedRole() === 'admin') return 'analytics';
  const view = loadAnyCachedView();
  return USER_ALLOWED_VIEWS.includes(view) ? view : 'dashboard';
}

function loadAnyCachedView(): ViewState {
  const saved = localStorage.getItem(STORAGE_KEY_VIEW);
  const allowed: Record<string, boolean> = {
    analytics: true,
    dashboard: true,
    files: true,
    convert: true,
    pdf: true,
  };
  return allowed[saved as string] ? (saved as ViewState) : 'dashboard';
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<ViewState>(() => loadCachedView());
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [roleLoading, setRoleLoading] = useState(true);

  // Fetch role from server on mount — this is the SOURCE OF TRUTH.
  // localStorage is only a cache layer for offline dev.
  useEffect(() => {
    let cancelled = false;
    fetchRole()
      .then((data) => {
        if (cancelled) return;
        const serverRole = data.role === 'admin' ? 'admin' : 'user';
        setRole(serverRole);
        localStorage.setItem(STORAGE_KEY_ROLE, serverRole);
        // Ensure view is valid for the server-returned role
        if (serverRole === 'user' && !USER_ALLOWED_VIEWS.includes(activeView)) {
          setActiveView('dashboard');
          localStorage.setItem(STORAGE_KEY_VIEW, 'dashboard');
        } else if (serverRole === 'admin') {
          setActiveView('analytics');
          localStorage.setItem(STORAGE_KEY_VIEW, 'analytics');
        }
      })
      .catch(() => {
        // Backend unreachable — fall back to cached role for dev/offline mode.
        const cachedRole = loadCachedRole();
        setRole(cachedRole);
        if (cachedRole === 'admin') {
          setActiveView('analytics');
          localStorage.setItem(STORAGE_KEY_VIEW, 'analytics');
        } else if (!USER_ALLOWED_VIEWS.includes(activeView)) {
          setActiveView('dashboard');
          localStorage.setItem(STORAGE_KEY_VIEW, 'dashboard');
        }
      })
      .finally(() => {
        if (!cancelled) setRoleLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSetView = useCallback((v: ViewState) => {
    let target = v;
    if (role === 'admin') {
      target = 'analytics';
    } else if (!USER_ALLOWED_VIEWS.includes(v)) {
      target = 'dashboard';
    }
    setActiveView(target);
    localStorage.setItem(STORAGE_KEY_VIEW, target);
  }, [role]);

  const handleSetRole = useCallback((r: 'user' | 'admin') => {
    // Optimistic update
    setRole(r);
    localStorage.setItem(STORAGE_KEY_ROLE, r);
    const optimisticView: ViewState = r === 'admin' ? 'analytics' : 'dashboard';
    setActiveView(optimisticView);
    localStorage.setItem(STORAGE_KEY_VIEW, optimisticView);
    // Persist to server
    setServerRole(r).then((data) => {
      const serverRole = data.role === 'admin' ? 'admin' : 'user';
      setRole(serverRole);
      localStorage.setItem(STORAGE_KEY_ROLE, serverRole);
      if (serverRole === 'user') {
        setActiveView('dashboard');
        localStorage.setItem(STORAGE_KEY_VIEW, 'dashboard');
      } else {
        setActiveView('analytics');
        localStorage.setItem(STORAGE_KEY_VIEW, 'analytics');
      }
    }).catch(() => {
      // Backend unreachable — the optimistic update via localStorage stands
    });
  }, []);

  const toggleCockpit = useCallback(() => {
    if (role === 'admin') {
      handleSetRole('user');
    } else {
      handleSetRole('admin');
    }
  }, [role, handleSetRole]);

  return (
    <DashboardContext.Provider value={{ activeView, setActiveView: handleSetView, role, setRole: handleSetRole, toggleCockpit, roleLoading }}>
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
