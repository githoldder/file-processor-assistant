import React from 'react';
import { Bell, Search, User, Globe, BarChart3, LogOut } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useDashboard } from '../context/useDashboard';

interface NavbarProps {
  onToggleCockpit: () => void;
}

export default function Navbar({ onToggleCockpit }: NavbarProps) {
  const { lang, setLang, t } = useLanguage();
  const { role } = useDashboard();

  return (
    <header className="bg-surface-container-lowest border-b border-outline-variant shadow-sm fixed top-0 w-full z-50 h-16">
      <div className="flex justify-between items-center h-full px-6 w-full max-w-[1440px] mx-auto">
        <div className="flex items-center gap-8">
          <span className="text-xl font-black tracking-tighter text-on-surface font-display">{t.appName}</span>
        </div>

        <div className="flex items-center gap-6">
          {/* 大屏入口/退出 */}
          <button
            onClick={onToggleCockpit}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-black hover:opacity-80 transition-all shadow-md"
          >
            {role === 'admin' ? (
              <><LogOut size={14} />{lang === 'zh' ? '退出大屏' : 'EXIT'}</>
            ) : (
              <><BarChart3 size={14} />{lang === 'zh' ? '打开大屏' : 'COCKPIT'}</>
            )}
          </button>

          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${lang === 'en' ? 'bg-primary text-on-primary' : 'text-outline hover:bg-surface-container-high'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('zh')}
              className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${lang === 'zh' ? 'bg-primary text-on-primary' : 'text-outline hover:bg-surface-container-high'}`}
            >
              ZH
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-container-low border border-outline-variant shadow-inner">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-outline">{t.nav.activeTasks}: 24</span>
          </div>

          <div className="flex items-center gap-2 border-l pl-4 border-outline-variant">
            <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
              <Search size={20} />
            </button>
            <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <button className="ml-2 w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary overflow-hidden border border-outline-variant">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
