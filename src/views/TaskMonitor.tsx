import React from 'react';
import { 
  Filter, 
  Plus, 
  TrendingUp, 
  Cpu, 
  Activity, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Terminal
} from 'lucide-react';
import { motion } from 'motion/react';
import { TASKS, SYSTEM_LOGS } from '../constants';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export default function TaskMonitor() {
  const { t } = useLanguage();
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-on-surface font-display mb-2">{t.tasks.title}</h1>
          <p className="text-lg text-outline">{t.tasks.subtitle}</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs font-bold tracking-wider hover:bg-surface-container-low transition-colors flex items-center gap-2 shadow-sm">
            <Filter size={16} />
            {t.tasks.filter}
          </button>
          <button className="px-4 py-2 bg-primary-container text-on-primary rounded-lg text-xs font-bold tracking-wider hover:brightness-110 transition-all flex items-center gap-2 shadow-md shadow-primary/20">
            <Plus size={16} />
            {t.tasks.newTask}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest p-6 border border-outline-variant rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">{t.tasks.queueLength}</span>
            <Activity size={18} className="text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">1,284</span>
            <span className="text-xs text-error font-bold flex items-center">
              <TrendingUp size={12} className="mr-0.5" /> 12%
            </span>
          </div>
          <div className="mt-6 w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary w-[65%] h-full rounded-full"></div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-container-lowest p-6 border border-outline-variant rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">{t.tasks.activeWorkers}</span>
            <Cpu size={18} className="text-green-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">48</span>
            <span className="text-xs text-green-600 font-bold uppercase">{t.tasks.optimal}</span>
          </div>
          <div className="flex items-end gap-1 mt-6 h-8">
            {[4, 7, 5, 8, 4, 9, 6, 5].map((h, i) => (
              <div key={i} className="flex-1 bg-green-500 rounded-full" style={{ height: `${h * 10}%` }}></div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-container-lowest p-6 border border-outline-variant rounded-xl shadow-sm hover:shadow-md transition-all lg:col-span-2 relative overflow-hidden"
        >
          <div className="relative z-10">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">{t.tasks.throughput}</span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-3xl font-bold">4.2 GB/s</span>
              <span className="text-xs text-outline font-medium tracking-tight">{t.tasks.peak}: 5.1 GB/s</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-10 pointer-events-none">
            <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,100 L0,80 C50,70 100,90 150,60 C200,30 250,50 300,20 C350,-10 400,30 400,30 L400,100 Z" fill="#0061ff" />
            </svg>
          </div>
        </motion.div>
      </div>

      {/* Task Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low/30">
          <h2 className="text-xl font-bold text-on-surface">{t.tasks.recentTasks}</h2>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant text-[10px] font-bold uppercase tracking-widest">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            {t.tasks.liveUpdates}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-bold text-outline uppercase tracking-wider bg-surface-container-low/10 border-b border-outline-variant">
                <th className="px-6 py-4">{t.tasks.taskId}</th>
                <th className="px-6 py-4">{t.tasks.type}</th>
                <th className="px-6 py-4">{t.tasks.workerNode}</th>
                <th className="px-6 py-4">{t.tasks.processingTime}</th>
                <th className="px-6 py-4">{t.tasks.status}</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {TASKS.map((task) => (
                <tr key={task.id} className="hover:bg-surface-container-low/20 transition-colors group">
                  <td className="px-6 py-4 font-bold text-primary text-sm">{task.id}</td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant font-medium">{task.type}</td>
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-6 h-6 bg-surface-container rounded flex items-center justify-center">
                      <Cpu size={12} className="text-outline" />
                    </div>
                    <span className="text-sm text-on-surface-variant">{task.workerNode}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {task.progress ? (
                      <div className="w-24 bg-surface-container h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full animate-pulse" style={{ width: `${task.progress}%` }}></div>
                      </div>
                    ) : task.processingTime}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      task.status === 'success' && "bg-green-50 text-green-700",
                      task.status === 'processing' && "bg-blue-50 text-blue-700",
                      task.status === 'queued' && "bg-amber-50 text-amber-700",
                      task.status === 'failed' && "bg-error-container text-on-error-container"
                    )}>
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        task.status === 'success' && "bg-green-500",
                        task.status === 'processing' && "bg-blue-500 animate-pulse",
                        task.status === 'queued' && "bg-amber-500",
                        task.status === 'failed' && "bg-error"
                      )}></span>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 hover:bg-surface-container rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical size={16} className="text-outline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 ambient-shadow">
          <h3 className="text-xl font-bold mb-6">{t.tasks.distribution}</h3>
          <div className="h-64 bg-surface-container-low/30 rounded-lg border border-dashed border-outline-variant flex items-center justify-center p-4">
             <div className="w-full h-full relative overflow-hidden rounded-lg">
                <img 
                  src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop" 
                  alt="Worker node distribution" 
                  className="w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <div className="text-center p-4">
                    <CheckCircle2 size={48} className="text-primary mx-auto mb-2" />
                    <p className="text-sm font-bold text-on-surface uppercase tracking-widest">{t.tasks.distMesh}</p>
                  </div>
                </div>
             </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 ambient-shadow flex flex-col">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Terminal size={20} className="text-primary" />
            {t.tasks.systemLogs}
          </h3>
          <div className="flex-1 bg-on-background p-4 rounded-lg overflow-y-auto space-y-2 font-mono text-[11px] h-64 scrollbar-thin scrollbar-thumb-outline scrollbar-track-transparent">
            {SYSTEM_LOGS.map((log, i) => (
              <div key={i} className={cn(
                "flex gap-3",
                log.type === 'error' ? "text-error" : log.type === 'warning' ? "text-amber-400" : "text-green-400"
              )}>
                <span className="text-outline-variant/60">[{log.time}]</span>
                <span className="flex-1 leading-relaxed">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
