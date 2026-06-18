import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Upload, 
  Activity, 
  CheckCircle2, 
  Plus, 
  Box,
  RefreshCw,
  FolderOpen,
  FileText,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { listFiles, listTasks } from '../services/api';
import { useDashboard } from '../context/useDashboard';

export default function Dashboard() {
  const { t } = useLanguage();
  const { setActiveView } = useDashboard();
  const [stats, setStats] = useState({ count: 0, size: 0, converted: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const fileRes = await listFiles();
      const totalSize = fileRes.files.reduce((acc: number, f: any) => acc + (f.size || 0), 0);

      // Fetch task counts
      const completedRes = await listTasks({ status: 'completed', limit: 5 });
      const failedRes = await listTasks({ status: 'failed', limit: 5 });
      const allTasksRes = await listTasks({ limit: 4 });

      setStats({
        count: fileRes.files.length,
        size: totalSize,
        converted: completedRes.total || 0,
        failed: failedRes.total || 0,
      });

      setRecentActivities(allTasksRes.items || []);
    } catch (err) {
      console.error("Dashboard stats fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-on-surface font-display underline decoration-primary/20 decoration-8 underline-offset-4">{t.dashboard.title}</h1>
          <p className="text-outline mt-1 text-lg font-medium">{t.dashboard.subtitle}</p>
        </div>
        <button 
          onClick={fetchStats}
          className="p-3 bg-surface-container-lowest border border-outline-variant rounded-2xl hover:bg-surface-container-low transition-all"
        >
          <RefreshCw className={cn("w-5 h-5 text-outline", loading && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 space-y-8">
          {/* Main 4 Personal Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t.dashboard.metrics.diskUsage, val: `${(stats.size / 1024 / 1024).toFixed(2)} MB`, icon: HardDrive, color: 'text-primary' },
              { label: t.zh ? '云盘文件数' : 'Total Files', val: `${stats.count}`, icon: Box, color: 'text-sky-500' },
              { label: t.zh ? '转换成功数' : 'Converted', val: `${stats.converted}`, icon: CheckCircle2, color: 'text-emerald-500' },
              { label: t.zh ? '异常失败数' : 'Failed Tasks', val: `${stats.failed}`, icon: AlertTriangle, color: 'text-error' },
            ].map((m, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl ambient-shadow">
                <div className="flex justify-between items-center mb-5">
                   <div className={cn("p-2.5 rounded-xl bg-surface-container-low", m.color)}>
                    <m.icon size={20} />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-outline opacity-60 text-right">{m.label}</span>
                </div>
                <h3 className="text-3xl font-black tracking-tighter">{m.val}</h3>
              </div>
            ))}
          </div>

          {/* Quick Actions / Shortcut Cards */}
          <div className="space-y-4">
            <h3 className="text-xl font-black tracking-tight">{t.zh ? '快捷入口' : 'Quick Actions'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { 
                  title: t.sidebar.myFiles, 
                  desc: t.zh ? '上传、下载及管理云盘个人文件' : 'Upload and organize HDFS files', 
                  icon: FolderOpen, 
                  view: 'files', 
                  color: 'border-l-sky-500' 
                },
                { 
                  title: t.sidebar.convertCenter, 
                  desc: t.zh ? 'Office 转 PDF 及高频格式快速转换' : 'Fast Office/PDF file format conversion', 
                  icon: RefreshCw, 
                  view: 'convert', 
                  color: 'border-l-primary' 
                },
                { 
                  title: t.sidebar.pdfStudio, 
                  desc: t.zh ? '页面重排、无损旋转及多文件追加合并' : 'Rotate, delete, sort and merge PDF pages', 
                  icon: FileText, 
                  view: 'pdf', 
                  color: 'border-l-emerald-500' 
                },
              ].map((act, i) => (
                <button 
                  key={i} 
                  onClick={() => setActiveView(act.view as any)}
                  className={cn("bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl ambient-shadow text-left group hover:scale-[1.02] border-l-[6px] transition-all flex flex-col justify-between h-44", act.color)}
                >
                  <div className="space-y-3">
                    <div className="p-3 bg-surface-container-low text-on-surface rounded-xl w-fit">
                      <act.icon size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-base group-hover:text-primary transition-colors">{act.title}</h4>
                      <p className="text-xs text-outline font-semibold mt-1 leading-relaxed">{act.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-primary uppercase tracking-wider group-hover:gap-3 transition-all">
                    {t.zh ? '立即进入' : 'Go Now'} <ArrowRight size={12} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Grid section for Recent logs / Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl ambient-shadow p-8 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black tracking-tight">{t.zh ? '关于个人工作空间' : 'Workspace Information'}</h3>
              </div>
              <div className="text-xs text-outline font-semibold leading-relaxed space-y-4 flex-1">
                <p>{t.zh ? 'CulCloud 文件流引擎为您提供高密度的分布式文件存储与格式转换能力。' : 'CulCloud FileStream provides distributed storage and conversion capabilities.'}</p>
                <p>{t.zh ? '当前后端由 Gotenberg 提供底层 PDF 编排支撑，并集成 PyMuPDF 本地快速图像转译能力，为您提供流畅、高质量的文件预览及页面操作体验。' : 'PDF Studio uses Gotenberg and PyMuPDF to render pages smoothly.'}</p>
                <div className="pt-4 border-t border-outline-variant flex items-center justify-between text-[10px] font-black text-primary uppercase tracking-widest">
                  <span>{t.zh ? '个人空间限制: 1 TB' : 'Space Limit: 1 TB'}</span>
                  <span className="bg-primary/10 px-3 py-1 rounded-full">{t.zh ? '已就绪' : 'Active'}</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl ambient-shadow p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black tracking-tight">{t.zh ? '我的最近转换任务' : 'Recent Conversion Tasks'}</h3>
              </div>
              
              {recentActivities.length > 0 ? (
                <div className="space-y-3">
                  {recentActivities.map((act) => (
                    <div key={act.task_id} className="flex justify-between items-center p-3.5 bg-surface-container-low/40 border border-outline-variant/30 rounded-xl hover:bg-surface-container-low transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-primary" />
                        <span className="text-xs font-bold text-on-surface truncate w-40">{act.task_id.substring(0, 12)}...</span>
                      </div>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                        act.status === 'completed' || act.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                        act.status === 'failed' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'
                      )}>
                        {act.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 py-12 text-center flex flex-col justify-center items-center h-full">
                   <Activity size={36} className="text-outline/20" />
                   <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">{t.zh ? '暂无活跃任务' : 'No active tasks'}</p>
                </div>
              )}
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
             <h2 className="text-2xl font-black font-display text-on-surface tracking-tight">Demo User</h2>
             <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mt-1 bg-surface-container-low px-4 py-1 rounded-full">
               {t.zh ? '个人工作空间' : 'Standard Workspace'}
             </p>

             <div className="w-full mt-10 pt-10 border-t border-outline-variant space-y-8">
                <div className="flex justify-between items-center px-2">
                   <div className="flex flex-col text-left">
                     <span className="text-[10px] font-black uppercase text-outline tracking-[0.15em]">{t.zh ? '空间占用' : 'Space Used'}</span>
                     <span className="text-xl font-black tracking-tighter mt-1">
                       {(stats.size / 1024 / 1024).toFixed(2)} MB <span className="text-xs text-outline font-black opacity-60">/ 1 TB</span>
                     </span>
                   </div>
                   <div className="p-3 bg-surface-container-low rounded-2xl">
                     <HardDrive size={24} className="text-primary" />
                   </div>
                </div>

                <div className="pt-8 border-t border-outline-variant">
                  <span className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-4 block text-center opacity-60">{t.zh ? '空间使用比例' : 'Storage Ratio'}</span>
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full" 
                      style={{ width: `${Math.min(100, (stats.size / (1024 * 1024 * 1024)) * 100)}%` }} 
                    />
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* Floating Action Button - navigates to Upload disk */}
      <motion.button 
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setActiveView('files')}
        className="fixed bottom-10 right-10 w-16 h-16 bg-primary text-white rounded-2xl shadow-[0_20px_50px_rgba(0,97,255,0.3)] flex items-center justify-center z-50 border-t border-white/20"
      >
        <Plus size={36} strokeWidth={3} />
      </motion.button>
    </div>
  );
}
