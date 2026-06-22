import { LogOut, Monitor, RefreshCw, Settings2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AnalyticsTopbarProps {
  isManual: boolean;
  loading: boolean;
  lang: string;
  onShowSystem: () => void;
  onShowCluster: () => void;
  onRefresh: () => void;
  onExit: () => void;
}

export function AnalyticsTopbar({ isManual, loading, lang, onShowSystem, onShowCluster, onRefresh, onExit }: AnalyticsTopbarProps) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/5 bg-[#080b13]/80 backdrop-blur-md shrink-0 z-50">
      <div className="flex min-w-0 items-center gap-2.5">
        <img
          src="/logos/culcloud-cockpit-logo.png"
          alt="CulCloud 大数据指挥舱"
          className="h-8 w-36 object-contain object-left transition-all hover:brightness-110 sm:w-40"
        />
        <div className="h-4 w-px bg-white/10" />
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[10px] text-slate-400 font-bold tracking-wider uppercase">Spark Telemetry</span>
          {isManual ? (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-black tracking-wider text-amber-400 transition-all animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {lang === 'zh' ? '手动模式' : 'MANUAL'}
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-black tracking-wider text-emerald-400 transition-all">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" style={{ animationDuration: '2s' }} />
              {lang === 'zh' ? '实时轮播' : 'AUTO'}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button onClick={onShowSystem} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-all duration-200 hover:scale-[1.04] hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer" title={lang === 'zh' ? '系统监控' : 'System Metrics'}>
          <Settings2 className="h-4 w-4" />
        </button>
        <button onClick={onShowCluster} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-all duration-200 hover:scale-[1.04] hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer" title={lang === 'zh' ? '集群状态' : 'Cluster Health'}>
          <Monitor className="h-4 w-4" />
        </button>
        <button onClick={onRefresh} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-all duration-200 hover:scale-[1.04] hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer" title={lang === 'zh' ? '刷新' : 'Refresh'}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
        <div className="mx-1 h-5 w-px bg-white/10" />
        <button onClick={onExit} className="flex h-8 items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 text-xs font-black text-rose-400 transition-all duration-200 hover:scale-[1.03] hover:bg-rose-500/20 hover:text-rose-300 active:scale-95 cursor-pointer" title={lang === 'zh' ? '退出大屏' : 'Exit Cockpit'}>
          <LogOut className="h-3.5 w-3.5" />
          <span>{lang === 'zh' ? '退出' : 'Exit'}</span>
        </button>
      </div>
    </div>
  );
}
