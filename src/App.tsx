/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { ViewState } from './types';
import { LanguageProvider } from './context/LanguageContext';
import { Loader2 } from 'lucide-react';

const Dashboard = lazy(() => import('./views/Dashboard'));
const MyFiles = lazy(() => import('./views/MyFiles'));
const TaskMonitor = lazy(() => import('./views/TaskMonitor'));
const SystemStatus = lazy(() => import('./views/SystemStatus'));
const ConvertCenter = lazy(() => import('./views/ConvertCenter'));
const PDFStudio = lazy(() => import('./views/PDFStudio'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Loading Interface...</span>
    </div>
  </div>
);

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-surface selection:bg-primary/20 selection:text-primary">
        <Navbar currentView={currentView} />
        <div className="flex">
          <Sidebar currentView={currentView} onViewChange={setCurrentView} />
          <main className="flex-1 md:ml-20 pt-24 px-6 md:px-10 pb-20">
            <div className="max-w-[1440px] mx-auto">
              <Suspense fallback={<LoadingFallback />}>
                {currentView === 'dashboard' && <Dashboard />}
                {currentView === 'files' && <MyFiles />}
                {currentView === 'convert' && <ConvertCenter />}
                {currentView === 'pdf' && <PDFStudio />}
                {currentView === 'task-monitor' && <TaskMonitor />}
                {currentView === 'system-status' && <SystemStatus />}
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </LanguageProvider>
  );
}
