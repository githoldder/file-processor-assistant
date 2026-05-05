import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  HardDrive, 
  Cpu, 
  Upload, 
  Activity, 
  CheckCircle2, 
  History,
  TrendingUp,
  Zap,
  Plus,
  Box
} from 'lucide-react';
import { motion } from 'motion/react';
import { WORKER_NODES } from '../constants';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

const PIE_DATA = [
  { name: 'PDF', value: 45, color: '#0061ff' },
  { name: 'Converted', value: 30, color: '#10b981' },
  { name: 'Archive', value: 25, color: '#f59e0b' },
];

export default function Dashboard() {
  const { t } = useLanguage();

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-on-surface font-display underline decoration-primary/20 decoration-8 underline-offset-4">{t.dashboard.title}</h1>
          <p className="text-outline mt-1 text-lg font-medium">{t.dashboard.subtitle}</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button className="bg-surface-container-lowest border border-outline-variant px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-surface-container-low transition-all shadow-sm">
             {t.dashboard.exportLogs}
          </button>
          <button className="bg-[#1e1e1e] text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-125 transition-all shadow-lg">
             {t.dashboard.refreshMetrics}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 space-y-8">
          {/* Main 4 Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t.dashboard.metrics.diskUsage, val: '1.2 PB', trend: '75%', icon: HardDrive, sub: t.dashboard.metrics.usedCapacity },
              { label: t.dashboard.metrics.clusterRam, val: '2.4 TB', trend: '42%', icon: Cpu, sub: t.dashboard.metrics.avgAllocation, color: 'bg-emerald-500' },
              { label: t.dashboard.metrics.uploadSpeed, val: '4.2 GB/s', trend: '12%', icon: Upload, sub: t.dashboard.metrics.dailyIncrease, positive: true },
              { label: t.dashboard.metrics.convBandwidth, val: '8.1 GB/s', trend: t.tasks.peak, icon: Activity, sub: t.dashboard.metrics.performance, bolt: true },
            ].map((m, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl ambient-shadow hover:scale-[1.02] transition-transform">
                <div className="flex justify-between items-center mb-5">
                   <div className="p-2.5 rounded-xl bg-surface-container-low text-primary">
                    <m.icon size={20} />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-outline opacity-60 text-right">{m.label}</span>
                </div>
                <h3 className="text-4xl font-black tracking-tighter">{m.val}</h3>
                <div className="mt-4 flex items-center gap-2">
                   {m.icon === HardDrive || m.icon === Cpu ? (
                     <div className="flex-1 space-y-2">
                        <div className="w-full bg-surface-container h-2 rounded-full shadow-inner overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-1000", m.color || "bg-primary")} style={{ width: m.trend }}></div>
                        </div>
                        <p className="text-[10px] font-bold text-outline uppercase tracking-[0.15em]">{m.trend} {m.sub}</p>
                     </div>
                   ) : (
                     <div className={cn(
                       "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em]",
                       m.positive ? "text-emerald-600" : "text-primary"
                     )}>
                       {m.bolt ? <Zap size={14} fill="currentColor" /> : <TrendingUp size={14} />}
                       {m.trend} {m.sub}
                     </div>
                   )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t.dashboard.metrics.totalUploads, val: '84.2M', sub: t.zh ? '文件' : 'Files', border: 'border-l-primary' },
              { label: t.dashboard.metrics.totalConverted, val: '62.1M', sub: t.zh ? '文件' : 'Files', border: 'border-l-emerald-500' },
              { label: t.dashboard.metrics.convRatio, val: '73.7%', sub: t.zh ? '效率' : 'Efficiency', border: 'border-l-amber-500' },
              { label: t.dashboard.metrics.activeCluster, val: '12', sub: t.zh ? '在线节点' : 'Nodes Online', border: 'border-l-on-surface' },
            ].map((s, i) => (
              <div key={i} className={cn("bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl ambient-shadow border-l-[8px]", s.border)}>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-outline opacity-60">{s.label}</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-4xl font-black tracking-tighter">{s.val}</h3>
                  <span className="text-[10px] font-black text-outline uppercase tracking-wider">{s.sub}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl ambient-shadow p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black tracking-tight">{t.dashboard.workerNodes}</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-[10px] font-black text-outline uppercase tracking-widest">MEM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black text-outline uppercase tracking-widest">DISK</span>
                  </div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={WORKER_NODES.slice(0, 6)}>
                    <XAxis 
                      dataKey="id" 
                      fontSize={10} 
                      fontWeight="900" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--color-outline)' }} 
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: 'var(--color-surface-container-low)', opacity: 0.5 }}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: '1px solid var(--color-outline-variant)',
                        backgroundColor: 'var(--color-surface-container-lowest)',
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        padding: '12px'
                       }}
                    />
                    <Bar dataKey="memory" fill="#0061ff" radius={[10, 10, 0, 0]} barSize={24} />
                    <Bar dataKey="storage" fill="#10b981" radius={[10, 10, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl ambient-shadow p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black tracking-tight">{t.dashboard.liveStream}</h3>
                <span className="text-[10px] font-black text-primary flex items-center gap-2 uppercase tracking-[0.2em] animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm shadow-primary/50"></span> {t.dashboard.live}
                </span>
              </div>
              <div className="space-y-4">
                {[
                  { name: 'annual_report_2023.pdf', status: t.dashboard.completed, sub: `${t.dashboard.optimized} 42.1MB ${t.dashboard.to} 8.4MB • 2.1s`, icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50' },
                  { name: 'customer_leads_q4.csv', status: `${t.dashboard.converting} (82%)`, sub: `${t.dashboard.to} JSON Array • Node-02 • 4.5k ${t.dashboard.rowsSec}`, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50', active: true },
                  { name: 'banner_asset_final.png', status: t.dashboard.completed, sub: `${t.dashboard.to} WebP • ${t.dashboard.lossless} • 0.8s`, icon: CheckCircle2, color: 'text-amber-500', bg: 'bg-amber-50' },
                ].map((log, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low/30 border border-outline-variant/30 hover:scale-[1.01] hover:bg-surface-container-low/50 transition-all cursor-default group">
                    <div className={cn("p-3 rounded-xl shadow-sm transition-transform group-hover:-rotate-6", log.bg)}>
                      <log.icon size={20} className={log.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-black text-on-surface truncate pr-2">{log.name}</span>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-[0.15em] shrink-0",
                          log.active ? "text-primary" : "text-emerald-600"
                        )}>{log.status}</span>
                      </div>
                      <div className="text-[10px] text-outline font-black mt-1 uppercase tracking-wider opacity-60 truncate">{log.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-4 text-center text-[10px] font-black text-primary hover:bg-surface-container-low rounded-xl transition-all uppercase tracking-[0.2em] border border-transparent hover:border-primary/20">
                {t.dashboard.viewAllLogs}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Column */}
        <div className="space-y-8">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl ambient-shadow p-8 flex flex-col items-center text-center">
             <div className="relative w-36 h-36 mb-6">
                <div className="absolute inset-0 rounded-[2rem] border-4 border-primary border-t-transparent animate-spin-slow"></div>
                <div className="absolute inset-2 rounded-[1.8rem] overflow-hidden border border-outline-variant shadow-xl">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full object-cover bg-primary/5" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-8 h-8 rounded-full border-4 border-surface flex items-center justify-center shadow-lg">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
             </div>
             <h2 className="text-2xl font-black font-display text-on-surface tracking-tight">Alex Rivera</h2>
             <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mt-1 bg-surface-container-low px-4 py-1 rounded-full">{t.dashboard.engineer}</p>

             <div className="w-full mt-10 pt-10 border-t border-outline-variant space-y-8">
                <div className="relative flex justify-center h-48">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} cornerRadius={5} startAngle={90} endAngle={450} dataKey="value">
                           {PIE_DATA.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                         </Pie>
                      </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-3xl font-black tracking-tighter">84%</span>
                     <span className="text-[10px] font-black text-outline uppercase tracking-[0.2em] opacity-60">{t.dashboard.metrics.utilized}</span>
                   </div>
                </div>

                <div className="flex justify-between items-center px-2">
                   <div className="flex flex-col text-left">
                     <span className="text-[10px] font-black uppercase text-outline tracking-[0.15em]">{t.zh ? '个人空间' : 'Personal Space'}</span>
                     <span className="text-xl font-black tracking-tighter mt-1">840 GB <span className="text-xs text-outline font-black opacity-60">/ 1 TB</span></span>
                   </div>
                   <div className="p-3 bg-surface-container-low rounded-2xl">
                     <Box size={24} className="text-primary" />
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-3 px-2">
                  {PIE_DATA.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.15em] bg-surface-container-low/30 p-3 rounded-xl border border-outline-variant/30">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]" style={{ backgroundColor: d.color }}></div>
                        <span>{d.name.includes('Converted') ? (t.zh ? '已转换' : d.name) : (t.zh ? (d.name === 'PDF' ? 'PDF文件' : '存档文件') : d.name)}</span>
                      </div>
                      <span className="text-on-surface">{d.value}%</span>
                    </div>
                  ))}
                </div>

                <div className="pt-8 border-t border-outline-variant">
                  <span className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-6 block text-center opacity-60">{t.dashboard.recentActivity}</span>
                  <div className="space-y-4">
                    {[
                      { icon: History, label: t.zh ? '上传了 ' : 'Uploaded ', bold: 'dataset_v3.zip' },
                      { icon: History, label: t.zh ? '删除了 ' : 'Deleted ', bold: 'temp_backup.old' },
                      { icon: History, label: t.zh ? '共享了 ' : 'Shared ', bold: 'Project Alpha' },
                    ].map((op, i) => (
                      <div key={i} className="flex items-center gap-4 text-[11px] font-bold text-outline-variant text-left hover:text-on-surface transition-colors cursor-default">
                         <div className="w-1.5 h-1.5 rounded-full bg-outline-variant shrink-0" />
                         <span>{op.label} <span className="font-black text-on-surface tracking-tight">{op.bold}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </div>

          <div className="bg-[#1e1e1e] text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/20 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10">
              <span className="text-primary font-black text-[10px] uppercase tracking-[0.3em]">{t.dashboard.metrics.activeCluster}</span>
              <h3 className="text-2xl font-black mt-3 tracking-tight">{t.dashboard.subscription}</h3>
              <p className="text-xs text-outline-variant/80 mt-4 leading-relaxed font-bold">{t.zh ? '高峰处理周期内分布式工作节点的优先访问权。' : 'Priority access to distributed worker-nodes during peak processing cycles.'}</p>
              <button className="mt-8 w-full bg-white text-[#1e1e1e] font-black py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:brightness-90 transition-all shadow-xl">
                 {t.zh ? '查看订阅详情' : 'View Subscription'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <motion.button 
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-10 right-10 w-16 h-16 bg-primary text-white rounded-2xl shadow-[0_20px_50px_rgba(0,97,255,0.3)] flex items-center justify-center z-50 border-t border-white/20"
      >
        <Plus size={36} strokeWidth={3} />
      </motion.button>
    </div>
  );
}
