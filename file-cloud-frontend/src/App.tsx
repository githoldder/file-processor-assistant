import React, { lazy, Suspense, useState, useEffect, ComponentType, LazyExoticComponent } from "react";
import { AnimatePresence, motion } from "motion/react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { LanguageProvider } from "./context/LanguageContext";
import { DashboardProvider, useDashboard } from "./context/useDashboard";
import type { ViewState } from "./types";
import { cn } from "./lib/utils";

// 用户端视图
const Dashboard = lazy(() => import("./views/Dashboard"));
const MyFiles = lazy(() => import("./views/MyFiles"));
const ConvertCenter = lazy(() => import("./views/ConvertCenter"));
const PDFStudio = lazy(() => import("./views/PDFStudio"));
// 大屏（管理端唯一入口）
const Analytics = lazy(() => import("./views/Analytics"));

const viewMap: Record<ViewState, LazyExoticComponent<ComponentType<any>>> = {
  dashboard: Dashboard,
  files: MyFiles,
  convert: ConvertCenter,
  pdf: PDFStudio,
  analytics: Analytics,
};

function ViewLoader({ activeView }: { activeView: ViewState }) {
  const View = viewMap[activeView];
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
        >
          <View />
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <DashboardProvider>
        <AppShell />
      </DashboardProvider>
    </LanguageProvider>
  );
}

function AppShell() {
  const ctx = useDashboard();
  const [activeView, setActiveView] = useState<ViewState>(() => ctx.activeView);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isImmersiveAdminCockpit = ctx.role === "admin" && ctx.activeView === "analytics";

  useEffect(() => {
    setActiveView(ctx.activeView);
  }, [ctx.activeView]);

  const changeView = (view: ViewState) => {
    setActiveView(view);
    ctx.setActiveView(view);
  };

  // 大屏进入/退出（委托给 context 统一管理 localStorage 持久化）
  const toggleCockpit = () => {
    ctx.toggleCockpit();
    setIsSidebarOpen(false);
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      isImmersiveAdminCockpit ? "theme-admin theme-admin-bg" : "bg-gray-50 text-slate-800"
    )}>
      {!isImmersiveAdminCockpit && (
        <>
          <Navbar onToggleCockpit={toggleCockpit} />
          <Sidebar
            currentView={activeView}
            onViewChange={changeView}
            isOpen={isSidebarOpen}
            onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        </>
      )}
      <main className={cn(
        "min-h-screen transition-all duration-300",
        isImmersiveAdminCockpit ? "p-0" : "pt-24 pb-8 px-6 md:px-10",
        !isImmersiveAdminCockpit && "md:ml-20"
      )}>
        <ViewLoader activeView={activeView} />
      </main>
    </div>
  );
}
