import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Monitor, Server, ShieldCheck, X } from 'lucide-react';
import { motion } from 'motion/react';
import EChartsWrapper from '../../components/EChartsWrapper';
import { cn } from '../../lib/utils';
import { MetricPill, normalizeServices } from './AnalyticsSlides';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function LargeModal({ open, title, icon: Icon, onClose, children }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl w-[90vw] h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] shrink-0">
          <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-primary" />}{title}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[#1b233d] hover:bg-[#242f51] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 p-6 overflow-auto">{children}</div>
      </motion.div>
    </div>
  );
}

function EventTimeline({ logs, className }: { logs: any[]; className?: string }) {
  const displayLogs = logs.length > 0 ? logs : [];
  return (
    <div className={cn("flex min-h-0 flex-col rounded-xl border border-[#1e293b] bg-[#020617]/70 p-3", className)}>
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
          <Activity className="h-3 w-3 text-cyan-400" />
          实时记录
        </div>
        <span className="text-[8px] font-bold text-slate-600">{displayLogs.length} events</span>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 scrollbar-none">
        {displayLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-600">暂无实时日志</div>
        ) : (
          displayLogs.slice(0, 12).map((log: any, i: number) => (
            <div key={`${log.timestamp || i}-${log.type || i}`} className="grid grid-cols-[62px_112px_1fr] gap-2 rounded border border-slate-800/70 bg-[#0d1222]/65 px-2 py-1.5 text-[9px]">
              <span className="font-mono text-slate-600">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'LOG'}</span>
              <span className="truncate font-black text-cyan-300">{log.type || 'event'}</span>
              <span className="truncate text-slate-400">{log.message || log.file_name || log.task_id || '-'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function SystemMonitorModal({ health, logs }: any) {
  const svcEntries = normalizeServices(health);
  const serviceEvents = svcEntries.map((svc: any) => ({
    type: svc.status === 'healthy' || svc.status === 'ok' ? 'service_healthy' : `service_${svc.status || 'unknown'}`,
    message: `${svc.label || svc.name}: ${svc.latency_ms ? `${Number(svc.latency_ms).toFixed(1)} ms` : svc.status}`,
    timestamp: svc.checked_at || health?.checked_at || new Date().toISOString(),
  }));
  const timelineLogs = (logs && logs.length > 0) ? logs : serviceEvents;
  const healthPie = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['35%', '65%'],
      data: svcEntries.map((svc: any) => ({
        name: svc.label || svc.name,
        value: 1,
        itemStyle: { color: svc.status === 'healthy' || svc.status === 'ok' ? '#10b981' : svc.status === 'degraded' ? '#f59e0b' : '#ef4444' },
      })),
      label: { show: true, fontSize: 11, color: '#94a3b8', formatter: '{b}\n{d}%' },
    }],
  };
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="shrink-0 text-xs font-black uppercase tracking-widest text-slate-500">微服务健康</div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-none">
          {svcEntries.length === 0 ? (
            <div className="text-slate-500 text-sm">暂无数据</div>
          ) : (
            svcEntries.map((svc: any) => (
              <div key={svc.name || svc.label} className="flex items-center justify-between rounded-lg border border-[#1e293b] bg-[#12182d] p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn("h-3 w-3 shrink-0 rounded-full", svc.status === 'healthy' || svc.status === 'ok' ? 'bg-emerald-500' : svc.status === 'degraded' ? 'bg-amber-500' : 'bg-rose-500')} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-200">{svc.label || svc.name}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">{svc.category || svc.type || 'service'}</div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-black text-slate-300">{svc.latency_ms ? `${Number(svc.latency_ms).toFixed(1)} ms` : svc.uptime || svc.status}</div>
                  <div className="text-[9px] font-bold text-slate-600">{svc.status}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="grid min-h-0 grid-rows-[minmax(220px,1fr)_minmax(180px,0.85fr)] gap-4">
        <div className="rounded-xl border border-[#1e293b] bg-[#12182d] p-5">
          <EChartsWrapper option={healthPie} theme="dark" style={{ height: '100%', minHeight: 220 }} />
        </div>
        <EventTimeline logs={timelineLogs} />
      </div>
    </div>
  );
}

export function ClusterMonitorModal() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCluster = useCallback(async () => {
    setLoading(true);
    try {
      const [taskRes, logRes, recentLogRes, overviewRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/tasks?limit=20`).then(r => r.json()).catch(() => ({ items: [] })),
        fetch(`${API_BASE}/api/v1/logs/timeline?hours=24&limit=30`).then(r => r.json()).catch(() => ({ events: [] })),
        fetch(`${API_BASE}/api/v1/logs/recent?limit=30`).then(r => r.json()).catch(() => ({ events: [] })),
        fetch(`${API_BASE}/api/v1/tasks/cluster/overview`).then(r => r.json()).catch(() => null),
      ]);
      const taskItems = taskRes.items || taskRes.tasks || [];
      const eventItems = (logRes.events?.length ? logRes.events : recentLogRes.events) || [];
      setTasks(taskItems);
      setLogs(eventItems.length > 0 ? eventItems : taskItems.map((task: any) => ({
        type: `task_${task.status || 'updated'}`,
        message: `${task.kind || 'task'} ${String(task.task_id || task.id || '').slice(0, 12)}`,
        timestamp: task.updated_at || task.completed_at || task.created_at || new Date().toISOString(),
        task_id: task.task_id || task.id,
      })));
      setOverview(overviewRes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCluster();
    const timer = window.setInterval(fetchCluster, 5000);
    return () => window.clearInterval(timer);
  }, [fetchCluster]);

  const badge = (s: string) => `px-2 py-0.5 text-xs rounded-full font-medium ${
    ({ pending: 'bg-slate-800 text-slate-400', queued: 'bg-amber-900/30 text-amber-400', processing: 'bg-blue-900/30 text-blue-400', completed: 'bg-emerald-900/30 text-emerald-400', success: 'bg-emerald-900/30 text-emerald-400', failed: 'bg-rose-900/30 text-rose-400' } as Record<string, string>)[s] || 'bg-slate-800 text-slate-400'
  }`;

  if (loading) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">加载中...</div>;
  return (
    <div className="grid h-full min-h-0 grid-cols-[1.25fr_0.75fr] gap-4">
      <div className="flex min-h-0 flex-col">
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">实时任务队列</div>
          <div className="flex gap-2">
            <MetricPill label="Active" value={overview?.active_tasks ?? 0} sub="处理中" color="#38bdf8" />
            <MetricPill label="Queued" value={overview?.queued_tasks ?? 0} sub="排队" color="#f59e0b" />
            <MetricPill label="24H" value={overview?.conversions_24h ?? tasks.length} sub="任务" color="#10b981" />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[#1e293b] bg-[#020617]/60">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0b0f19]">
              <tr className="border-b border-[#1e293b] text-slate-400 text-[10px] font-bold uppercase">
                <th className="text-left py-2 pr-4 pl-3">ID</th>
                <th className="text-left py-2 pr-4">类型</th>
                <th className="text-left py-2 pr-4">更新时间</th>
                <th className="text-right py-2 pr-4">状态</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-500">暂无任务</td></tr>
              ) : (
                tasks.map((t: any) => (
                  <tr key={t.task_id || t.id} className="border-b border-[#1e293b]/50 text-slate-200">
                    <td className="py-2.5 pr-4 pl-3 font-mono text-xs">{String(t.task_id || t.id || '').slice(0, 12)}</td>
                    <td className="py-2.5 pr-4">{t.kind || t.type || '-'}</td>
                    <td className="py-2.5 pr-4 text-slate-400">{t.updated_at ? new Date(t.updated_at).toLocaleTimeString() : '-'}</td>
                    <td className="py-2.5 pr-4 text-right"><span className={badge(t.status)}>{t.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <EventTimeline logs={logs} className="h-full" />
    </div>
  );
}

export function NodeDetailModal({ node, onClose, health }: any) {
  if (!node) return null;
  return (
    <LargeModal open={!!node} title={node.name || '节点详情'} icon={ShieldCheck} onClose={onClose}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        <div className="bg-[#12182d] border border-[#1e293b] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center"><Server className="w-6 h-6" /></div>
            <div>
              <div className="text-xl font-black text-slate-100">{node.name}</div>
              <div className="text-xs text-slate-500">{node.city || 'CulCloud node'}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#0b0f19] rounded-lg p-3">
              <div className="text-slate-500 font-bold mb-1">状态</div>
              <div className="text-emerald-400 font-black">{node.status || 'healthy'}</div>
            </div>
            <div className="bg-[#0b0f19] rounded-lg p-3">
              <div className="text-slate-500 font-bold mb-1">指标</div>
              <div className="text-slate-100 font-black">{node.metric || 'online'}</div>
            </div>
          </div>
        </div>
        <div className="bg-[#12182d] border border-[#1e293b] rounded-xl p-5 flex flex-col">
          <div className="text-xs font-black tracking-widest text-slate-500 uppercase mb-4">服务列表</div>
          <div className="space-y-2 flex-1 overflow-auto">
            {normalizeServices(health).length > 0 ? normalizeServices(health).map((svc: any) => (
              <div key={svc.name || svc.label} className="flex items-center justify-between bg-[#0b0f19] rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", svc.status === 'healthy' || svc.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500')} />
                  <span className="text-slate-200 text-xs capitalize">{svc.label || svc.name}</span>
                </div>
                <span className="text-[10px] text-slate-500">{svc.status}</span>
              </div>
            )) : <div className="text-slate-500 text-xs">暂无服务数据</div>}
          </div>
        </div>
      </div>
    </LargeModal>
  );
}
