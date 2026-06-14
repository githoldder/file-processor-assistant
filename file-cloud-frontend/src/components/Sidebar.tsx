import React from 'react';
import { 
  FolderOpen, 
  RefreshCcw, 
  FileText, 
  Monitor, 
  Settings2, 
  BookOpen, 
  HelpCircle,
  LayoutDashboard,
  BarChart3
} from 'lucide-react';
import { ViewState } from '../types';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
}

import { motion } from 'motion/react';

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { t } = useLanguage();

  const menuItems = [
    { id: 'dashboard', label: t.sidebar.dashboard, icon: LayoutDashboard },
    { id: 'files', label: t.sidebar.myFiles, icon: FolderOpen },
    { id: 'convert', label: t.sidebar.convertCenter, icon: RefreshCcw },
    { id: 'pdf', label: t.sidebar.pdfStudio, icon: FileText },
    { id: 'task-monitor', label: t.sidebar.taskMonitor, icon: Monitor },
    { id: 'system-status', label: t.sidebar.systemStatus, icon: Settings2 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <aside 
      className="fixed left-0 top-16 h-[calc(100vh-64px)] w-20 border-r border-outline-variant bg-surface-container-lowest hidden md:flex flex-col py-6 z-40 bg-white overflow-y-auto"
    >
      <nav className="flex-1 px-2 space-y-6">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as ViewState)}
            className="w-full flex flex-col items-center gap-1.5 group/item transition-all relative"
          >
            <div className={cn(
              "w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300",
              currentView === item.id 
                ? "bg-primary text-on-primary shadow-xl shadow-primary/20 scale-105" 
                : "bg-surface-container-low text-outline group-hover/item:bg-primary/10 group-hover/item:text-primary group-hover/item:scale-105"
            )}>
              <item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} />
            </div>
            
            <span className={cn(
              "font-black text-[9px] uppercase tracking-wider text-center transition-colors duration-300",
              currentView === item.id ? "text-primary" : "text-outline group-hover/item:text-on-surface"
            )}>
              {item.label}
            </span>

            {currentView === item.id && (
              <motion.div 
                layoutId="indicator"
                className="absolute -right-2 top-0 bottom-6 w-1 bg-primary rounded-l-full shadow-[0_0_8px_rgba(0,97,255,0.4)]"
              />
            )}
          </button>
        ))}
      </nav>

      <div className="mt-auto px-2 pt-6 border-t border-outline-variant space-y-6">
        <button className="w-full flex flex-col items-center gap-1.5 group/item transition-all">
          <div className="w-10 h-10 flex items-center justify-center bg-surface-container-low rounded-xl text-outline group-hover/item:text-primary group-hover/item:scale-105 transition-all">
            <BookOpen size={18} />
          </div>
          <span className="font-black text-[8px] uppercase tracking-tighter text-outline group-hover/item:text-on-surface">
            {t.sidebar.docs}
          </span>
        </button>
        <button className="w-full flex flex-col items-center gap-1.5 group/item transition-all">
          <div className="w-10 h-10 flex items-center justify-center bg-surface-container-low rounded-xl text-outline group-hover/item:text-primary group-hover/item:scale-105 transition-all">
            <HelpCircle size={18} />
          </div>
          <span className="font-black text-[8px] uppercase tracking-tighter text-outline group-hover/item:text-on-surface">
            {t.sidebar.support}
          </span>
        </button>
      </div>
    </aside>
  );
}
