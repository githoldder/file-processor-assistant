import React from 'react';
import { 
  Database, 
  Cpu, 
  Settings2, 
  Activity, 
  ShieldCheck, 
  Zap, 
  Clock, 
  TrendingDown,
  Monitor,
  Layout,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export default function SystemStatus() {
  const { t } = useLanguage();
  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[10px] font-black text-outline uppercase tracking-[0.25em]">{t.status.subtitle}</span>
          <h1 className="text-4xl font-bold text-on-surface font-display mt-2">{t.status.title}</h1>
        </div>
        <div className="flex gap-3">
          <div className="bg-surface-container-lowest px-4 py-2 border border-outline-variant rounded-lg flex items-center gap-3 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t.status.hdfsLive}</span>
          </div>
          <div className="bg-surface-container-lowest px-4 py-2 border border-outline-variant rounded-lg flex items-center gap-3 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t.status.yarnStable}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* HDFS Explorer Card */}
        <section className="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
            <div className="flex items-center gap-3">
              <Database size={20} className="text-primary" />
              <h3 className="font-bold text-on-surface">{t.status.hdfsUI}</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-32 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary w-3/4"></div>
              </div>
              <span className="text-[9px] font-black text-outline uppercase tracking-widest">75% {t.status.capacity}</span>
            </div>
          </div>
          <div className="aspect-video relative group overflow-hidden bg-surface-dim">
             <img 
               src="https://images.unsplash.com/photo-1551288049-bbbda536339a?q=80&w=2070&auto=format&fit=crop" 
               alt="HDFS UI Interface" 
               className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
             />
             <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
               <button className="bg-surface-container-lowest text-primary px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 hover:brightness-105">
                 <ExternalLink size={16} />
                 {t.status.launchUI}
               </button>
             </div>
          </div>
          <div className="p-6 grid grid-cols-3 gap-8 border-t border-outline-variant bg-white">
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-2">{t.status.dataNodes}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">12 / 12</p>
                <span className="text-[10px] font-black text-green-600 uppercase">{t.status.online}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-2">{t.status.totalSpace}</p>
              <p className="text-2xl font-bold">1.2 PB</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-2">{t.status.replication}</p>
              <p className="text-2xl font-bold">3x Factor</p>
            </div>
          </div>
        </section>

        {/* Heartbeat & Sync Section */}
        <section className="col-span-12 lg:col-span-4 flex flex-col gap-8">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 ambient-shadow flex-grow">
            <h3 className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-6">{t.status.heartbeat}</h3>
            <div className="space-y-5 font-medium text-sm">
              {[
                { time: '10:45:01', label: 'INFO', msg: 'BlockReport: 192.168.1.10', color: 'text-primary' },
                { time: '10:44:58', label: 'SUCCESS', msg: 'Replica recovery: blk_1002', color: 'text-green-600' },
                { time: '10:44:52', label: 'WARN', msg: 'Node-04 high latency (14ms)', color: 'text-amber-600' },
                { time: '10:44:45', label: 'INFO', msg: 'Checkpoint created by NN', color: 'text-primary' },
                { time: '10:44:39', label: 'INFO', msg: 'HDFS federation synchronized', color: 'text-primary' },
              ].map((log, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <span className="text-[10px] font-bold text-outline-variant mt-1">{log.time}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className={cn("text-[10px] font-black uppercase tracking-[0.1em]", log.color)}>[{log.label}]</span>
                    <span className="text-on-surface-variant text-xs leading-relaxed">{log.msg}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-10 w-full py-3 border border-outline-variant text-[10px] font-black uppercase tracking-widest hover:bg-surface-container transition-all rounded-lg text-on-surface-variant">
              {t.status.viewAllLogs}
            </button>
          </div>

          <div className="bg-primary-container text-on-primary rounded-2xl p-6 shadow-xl shadow-primary/20 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <Zap size={24} className="opacity-80" fill="white" />
              <span className="text-[9px] bg-white/20 px-2 py-1 rounded-full uppercase font-black tracking-widest">Priority 1</span>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-2">{t.status.activeSync}</h4>
              <p className="text-on-primary/70 text-xs font-medium leading-relaxed mb-6">Cross-regional replication for Cluster-Beta is currently at <span className="text-white font-bold">89%</span> completion across 4 availability zones.</p>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '89%' }} className="h-full bg-white rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* YARN Card */}
        <section className="col-span-12 bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-white">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-amber-50 rounded-lg">
                <Activity size={20} className="text-amber-600" />
              </div>
              <h3 className="font-bold text-on-surface">{t.status.yarnManager}</h3>
            </div>
            <div className="flex gap-6">
              <span className="text-xs font-medium text-outline">{t.status.queue}: <strong className="text-on-surface">default</strong></span>
              <span className="text-xs font-medium text-outline">{t.status.scheduler}: <strong className="text-on-surface">Fair</strong></span>
            </div>
          </div>
          <div className="p-8 flex flex-col lg:flex-row gap-12">
            <div className="w-full lg:w-1/3 space-y-8">
              <div className="bg-surface-container-low/40 p-5 rounded-2xl border border-outline-variant">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-outline uppercase tracking-widest">{t.status.memUsage}</span>
                  <span className="text-xs font-black">4.2 TB / 6 TB</span>
                </div>
                <div className="h-2.5 bg-surface-container rounded-full overflow-hidden border border-outline-variant/30">
                  <div className="h-full bg-amber-500 w-[70%] rounded-full shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div>
                </div>
              </div>
              <div className="bg-surface-container-low/40 p-5 rounded-2xl border border-outline-variant">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-outline uppercase tracking-widest">{t.status.vcoreUsage}</span>
                  <span className="text-xs font-black">128 / 256</span>
                </div>
                <div className="h-2.5 bg-surface-container rounded-full overflow-hidden border border-outline-variant/30">
                  <div className="h-full bg-primary w-[50%] rounded-full shadow-[0_0_8px_rgba(0,97,255,0.4)]"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-6 border border-outline-variant rounded-2xl bg-surface-container-low/20">
                  <p className="text-3xl font-black text-primary leading-none">14</p>
                  <p className="text-[10px] font-black text-outline uppercase tracking-wider mt-3">{t.status.runningApps}</p>
                </div>
                <div className="text-center p-6 border border-outline-variant rounded-2xl bg-surface-container-low/20">
                  <p className="text-3xl font-black text-outline leading-none">2</p>
                  <p className="text-[10px] font-black text-outline uppercase tracking-wider mt-3">{t.status.pendingApps}</p>
                </div>
              </div>
            </div>
            <div className="flex-grow bg-surface-container-dim/20 rounded-2xl p-8 border border-outline-variant border-dashed flex flex-col items-center justify-center relative overflow-hidden group">
               <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity" style={{ backgroundImage: 'radial-gradient(#004bca 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
               <img 
                 src="https://images.unsplash.com/photo-1558486012-817176f84c6d?q=80&w=2070&auto=format&fit=crop" 
                 alt="Cluster visualization" 
                 className="w-full h-56 object-cover rounded-xl shadow-2xl border-4 border-white mb-10 transform group-hover:scale-[1.02] transition-transform duration-700" 
               />
               <div className="flex gap-16 z-10">
                  {[
                    { label: 'Manager-01', active: true },
                    { label: 'Worker-08', icon: Activity },
                    { label: 'Worker-09', icon: Activity },
                  ].map((n, i) => (
                    <div key={i} className="flex flex-col items-center gap-3 relative">
                      {i > 0 && <div className="absolute top-6 -left-12 w-12 h-px border-t border-dashed border-outline-variant"></div>}
                      <div className={cn(
                        "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                        n.active ? "bg-green-50 border-green-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-white border-outline-variant"
                      )}>
                        {n.active ? <ShieldCheck size={24} className="text-green-600" /> : <Database size={24} className="text-primary opacity-60" />}
                      </div>
                      <span className="text-[10px] font-black text-on-surface uppercase tracking-widest">{n.label}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </section>

        {/* Summary Footer Grid */}
        {[
          { label: t.status.latency, val: '12ms', sub: `-2ms ${t.status.prevHour}`, down: true },
          { label: t.status.throughput, val: '8.4 GB/s', sub: t.status.stable, sync: true },
          { label: t.status.errorRate, val: '0.02%', sub: t.status.healthy, verified: true },
          { label: t.status.uptime, val: '214d', sub: t.status.sincePatch },
        ].map((s, i) => (
          <section key={i} className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 border border-outline-variant rounded-2xl hover:shadow-lg transition-all cursor-default">
            <h4 className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-3">{s.label}</h4>
            <p className="text-3xl font-black text-on-surface mb-2 leading-none font-display">{s.val}</p>
            <div className={cn(
              "text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5",
              s.down || s.verified ? "text-green-600" : "text-outline"
            )}>
              {s.down && <TrendingDown size={14} />}
              {s.sync && <Activity size={12} className="text-primary" />}
              {s.verified && <ShieldCheck size={14} />}
              {s.sub}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
