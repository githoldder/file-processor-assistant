import { useState, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "motion/react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { LanguageProvider } from "./context/LanguageContext";
import { DashboardProvider } from "./context/useDashboard";
import type { ViewState } from "./types";

// Lazy-load all views
const Dashboard = lazy(() => import("./views/Dashboard"));
const MyFiles = lazy(() => import("./views/MyFiles"));
const ConvertCenter = lazy(() => import("./views/ConvertCenter"));
const PDFStudio = lazy(() => import("./views/PDFStudio"));
const TaskMonitor = lazy(() => import("./views/TaskMonitor"));
const SystemStatus = lazy(() => import("./views/SystemStatus"));
const Analytics = lazy(() => import("./views/Analytics"));

function ViewLoader({ activeView }: { activeView: ViewState }) {
  const viewMap: Record<ViewState, React.LazyExoticComponent<React.ComponentType<any>>> = {
    dashboard: Dashboard,
    files: MyFiles,
    convert: ConvertCenter,
    "task-monitor": TaskMonitor,
    "system-status": SystemStatus,
    pdf: PDFStudio,
    analytics: Analytics,
  };

  const View = viewMap[activeView];

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-gray-400">
          加载中...
        </div>
      }
    >
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
  const [activeView, setActiveView] = useState<ViewState>("dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Sidebar
        currentView={activeView}
        onViewChange={setActiveView}
      />
      <main className="md:ml-20 pt-16 min-h-screen">
        <ViewLoader activeView={activeView} />
      </main>
    </div>
  );
}
