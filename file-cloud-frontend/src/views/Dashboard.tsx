import React, { useState, useEffect } from 'react';
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
import { listFiles } from '../services/api';

const PIE_DATA = [
  { name: 'S3 Files', value: 100, color: '#0061ff' },
];

export default function Dashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({ count: 0, size: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await listFiles();
        const totalSize = res.files.reduce((acc: number, f: any) => acc + (f.size || 0), 0);
        setStats({ count: res.files.length, size: totalSize });
      } catch (err) {
        console.error("Dashboard stats fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-on-surface font-display underline decoration-primary/20 decoration-8 underline-offset-4">{t.dashboard.title}</h1>
          <p className="text-outline mt-1 text-lg font-medium">{t.dashboard.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 space-y-8">
          {/* Main 4 Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t.dashboard.metrics.diskUsage, val: `${(stats.size / 1024 / 1024).toFixed(2)} MB`, trend: '0.1%', icon: HardDrive, sub: t.dashboard.metrics.usedCapacity },
              { label: t.dashboard.metrics.clusterRam, val: '--', trend: '0%', icon: Cpu, sub: t.dashboard.metrics.avgAllocation, color: 'bg-emerald-500' },
              { label: t.dashboard.metrics.uploadSpeed, val: '--', trend: '0%', icon: Upload, sub: t.dashboard.metrics.dailyIncrease, positive: true },
              { label: t.dashboard.metrics.convBandwidth, val: '--', trend: t.tasks.peak, icon: Activity, sub: t.dashboard.metrics.performance, bolt: true },
            ].map((m, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl ambient-shadow">
                <div className="flex justify-between items-center mb-5">
                   <div className="p-2.5 rounded-xl bg-surface-container-low text-primary">
                    <m.icon size={20} />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-outline opacity-60 text-right">{m.label}</span>
                </div>
                <h3 className="text-3xl font-black tracking-tighter">{m.val}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t.dashboard.metrics.totalUploads, val: stats.count.toString(), sub: t.zh ? '文件' : 'Files', border: 'border-l-primary' },
              { label: t.dashboard.metrics.totalConverted, val: '0', sub: t.zh ? '文件' : 'Files', border: 'border-l-emerald-500' },
              { label: t.dashboard.metrics.convRatio, val: '--', sub: t.zh ? '效率' : 'Efficiency', border: 'border-l-amber-500' },
              { label: t.dashboard.metrics.activeCluster, val: '1', sub: t.zh ? '在线节点' : 'Nodes Online', border: 'border-l-on-surface' },
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
              </div>
              <div className="h-64 flex items-center justify-center text-outline text-[10px] font-black uppercase tracking-[0.2em]">
                 {t.zh ? '等待分布式节点数据...' : 'Awaiting worker data...'}
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl ambient-shadow p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black tracking-tight">{t.dashboard.liveStream}</h3>
                <span className="text-[10px] font-black text-primary flex items-center gap-2 uppercase tracking-[0.2em]">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary/20"></span> {t.dashboard.live}
                </span>
              </div>
              <div className="space-y-4 py-10 text-center">
                 <Activity size={48} className="mx-auto text-outline/20" />
                 <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">{t.zh ? '暂无实时任务' : 'No active tasks'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Column */}
        <div className="space-y-8">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl ambient-shadow p-8 flex flex-col items-center text-center">
             <div className="relative w-36 h-36 mb-6">
                <div className="absolute inset-0 rounded-[2rem] border-4 border-primary/20 border-t-transparent"></div>
                <div className="absolute inset-2 rounded-[1.8rem] overflow-hidden border border-outline-variant shadow-xl">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full object-cover bg-primary/5" />
                </div>
             </div>
             <h2 className="text-2xl font-black font-display text-on-surface tracking-tight">Admin User</h2>
             <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mt-1 bg-surface-container-low px-4 py-1 rounded-full">{t.dashboard.engineer}</p>

             <div className="w-full mt-10 pt-10 border-t border-outline-variant space-y-8">
                <div className="flex justify-between items-center px-2">
                   <div className="flex flex-col text-left">
                     <span className="text-[10px] font-black uppercase text-outline tracking-[0.15em]">{t.zh ? '个人空间' : 'Personal Space'}</span>
                     <span className="text-xl font-black tracking-tighter mt-1">{(stats.size / 1024 / 1024).toFixed(2)} MB <span className="text-xs text-outline font-black opacity-60">/ 1 TB</span></span>
                   </div>
                   <div className="p-3 bg-surface-container-low rounded-2xl">
                     <Box size={24} className="text-primary" />
                   </div>
                </div>

                <div className="pt-8 border-t border-outline-variant">
                  <span className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-6 block text-center opacity-60">{t.dashboard.recentActivity}</span>
                  <div className="space-y-4 py-4 text-center">
                     <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em] opacity-40">{t.zh ? '暂无近期活动' : 'No recent activity'}</p>
                  </div>
                </div>
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
