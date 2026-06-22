import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3, RefreshCw, AlertTriangle, FileText,
  HardDrive, CheckCircle2, XCircle,
  RadioTower, Globe2, X,
  Server, ShieldCheck, LogOut,
  Monitor, Settings2, ChevronLeft, ChevronRight,
  Layers, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EChartsWrapper from '../components/EChartsWrapper';
import { cn } from '../lib/utils';
import { useDashboard } from '../context/useDashboard';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const FLASK_API = import.meta.env.VITE_ANALYTICS_API || 'http://localhost:5050';
const SLIDE_INTERVAL = 5000;
const AUTO_RESUME_DELAY = 30000;
const SLIDE_COUNT = 3;

// ==================== 数据获取 ====================

interface BizData {
  files: any[];
  stats: any;
  queueLen: number;
  health: any;
  logs: any[];
  pipeline: any;
  quality: any;
  cockpit: any;
  convStats: any;
  errorAnalysis: any;
  actionDist: any;
  formatDist: any;
  errorHeatmap: any;
}

function useBizData() {
  const [data, setData] = useState<BizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fileRes, statsRes, queueRes, healthRes, logRes, pipeRes, qualRes, cockpitRes, convRes, errRes, actRes, fmtRes, heatRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/files`).then(r => r.json()).catch(() => ({ files: [] })),
        fetch(`${API_BASE}/api/v1/tasks/stats`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/v1/tasks/queue-length`).then(r => r.json()).catch(() => ({ queue_length: 0 })),
        fetch(`${API_BASE}/api/v1/system/health`).then(r => r.json()).catch(() => ({ services: {} })),
        fetch(`${API_BASE}/api/v1/logs/timeline?hours=24&limit=15`).then(r => r.json()).catch(() => ({ events: [] })),
        fetch(`${FLASK_API}/api/analytics/pipeline-info`).then(r => r.json()).catch(() => ({ ok: false })),
        fetch(`${FLASK_API}/api/analytics/telemetry/quality-report`).then(r => r.json()).catch(() => ({ ok: false })),
        fetch(`${FLASK_API}/api/analytics/cockpit`).then(r => r.json()).catch(() => ({ ok: false })),
        fetch(`${FLASK_API}/api/analytics/telemetry/conversion-stats`).then(r => r.json()).catch(() => ({ ok: false })),
        fetch(`${FLASK_API}/api/analytics/telemetry/error-analysis`).then(r => r.json()).catch(() => ({ ok: false })),
        fetch(`${FLASK_API}/api/analytics/telemetry/action-distribution`).then(r => r.json()).catch(() => ({ ok: false })),
        fetch(`${FLASK_API}/api/analytics/telemetry/format-distribution`).then(r => r.json()).catch(() => ({ ok: false })),
        fetch(`${FLASK_API}/api/analytics/telemetry/error-heatmap`).then(r => r.json()).catch(() => ({ ok: false })),
      ]);

      setData({
        files: fileRes.files || [],
        stats: statsRes,
        queueLen: queueRes.queue_length ?? 0,
        health: healthRes,
        logs: logRes.events || [],
        pipeline: pipeRes.ok ? (pipeRes.data?.pipeline || null) : null,
        quality: qualRes.ok ? qualRes.data : null,
        cockpit: cockpitRes.ok ? cockpitRes.data : null,
        convStats: convRes.ok ? convRes.data : null,
        errorAnalysis: errRes.ok ? errRes.data : null,
        actionDist: actRes.ok ? actRes.data : null,
        formatDist: fmtRes.ok ? fmtRes.data : null,
        errorHeatmap: heatRes.ok ? heatRes.data : null,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

// ==================== 子组件 ====================

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-[#0d1222]/80 backdrop-blur rounded-lg border border-[#1e293b] flex items-center gap-2.5 p-2.5 transition-all hover:scale-[1.02]">
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", color)}>
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-slate-400 text-[9px] font-semibold truncate">{label}</div>
        <div className="text-base font-black text-slate-100 leading-tight tracking-tight">{value}</div>
        {sub && <div className="text-[8px] text-slate-500 truncate">{sub}</div>}
      </div>
    </div>
  );
}

function MiniChartCard({ title, chart, loading, className }: any) {
  return (
    <div className={cn("bg-[#0d1222]/80 backdrop-blur rounded-lg border border-[#1e293b] flex flex-col p-2.5", className)}>
      {title && <div className="text-[9px] font-black tracking-wider text-slate-400 uppercase shrink-0">{title}</div>}
      <div className="flex-1 min-h-0">
        <EChartsWrapper option={chart} loading={loading} theme="dark" />
      </div>
    </div>
  );
}

const nf = new Intl.NumberFormat('zh-CN');
const compactNf = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 });
const pct = (value: number) => `${Number(value || 0).toFixed(1)}%`;

function normalizeServices(health: any) {
  if (Array.isArray(health?.services)) return health.services;
  if (health?.services && typeof health.services === 'object') {
    return Object.entries(health.services).map(([name, svc]: [string, any]) => ({ name, ...(svc || {}) }));
  }
  return [];
}

function statusMeta(status?: string) {
  if (status === 'healthy' || status === 'ok') return { label: 'Healthy', color: '#10b981', tone: 'border-emerald-500/25 bg-emerald-950/20 text-emerald-300' };
  if (status === 'degraded') return { label: 'Degraded', color: '#f59e0b', tone: 'border-amber-500/25 bg-amber-950/20 text-amber-300' };
  return { label: 'Down', color: '#f43f5e', tone: 'border-rose-500/25 bg-rose-950/20 text-rose-300' };
}

function MetricPill({ label, value, sub, color = '#38bdf8' }: any) {
  return (
    <div className="min-w-0 rounded border border-slate-800/80 bg-[#020617]/45 px-2.5 py-1.5">
      <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-sm font-black leading-none text-slate-100 tabular-nums">{value}</span>
        {sub && <span className="truncate text-[8px] font-bold text-slate-500">{sub}</span>}
      </div>
    </div>
  );
}

function PanelShell({ title, meta, children, className }: any) {
  return (
    <div className={cn("relative flex min-h-0 flex-col overflow-hidden rounded-lg border border-[#1e293b] bg-[#0d1222]/80 p-2.5 backdrop-blur", className)}>
      <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0 truncate text-[9px] font-black uppercase tracking-wider text-slate-400">{title}</div>
        {meta && <div className="shrink-0 text-[8px] font-bold text-slate-600">{meta}</div>}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

const formatNodeLabel = (name: string) => name.replace(/^(source|target):/, '').toUpperCase();

function buildSankeyOption(convData: any[], nodeColorMap: Record<string, string>) {
  const links = convData
    .map((item: any) => ({
      sourceFormat: String(item.source_format || '').toLowerCase(),
      targetFormat: String(item.target_format || '').toLowerCase(),
      value: Number(item.count || 0),
    }))
    .filter((item) => item.sourceFormat && item.targetFormat && item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  if (links.length === 0) {
    return {
      graphic: {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: { text: '暂无转换链路数据', fill: '#64748b', fontSize: 11, fontWeight: 700 },
      },
    };
  }

  const nodeNames = Array.from(new Set(links.flatMap((item) => [`source:${item.sourceFormat}`, `target:${item.targetFormat}`])));

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        if (p.dataType === 'edge') {
          return `${formatNodeLabel(p.data.source)} → ${formatNodeLabel(p.data.target)}<br/>${p.value} 次`;
        }
        return formatNodeLabel(p.name);
      },
    },
    series: [{
      type: 'sankey',
      layoutIterations: 32,
      emphasis: { focus: 'adjacency' },
      nodeAlign: 'left',
      nodeWidth: 12,
      nodeGap: 9,
      data: nodeNames.map((name) => {
        const format = name.replace(/^(source|target):/, '');
        return {
          name,
          itemStyle: { color: nodeColorMap[format] || '#38bdf8', borderColor: '#1e293b' },
        };
      }),
      links: links.map((item) => ({
        source: `source:${item.sourceFormat}`,
        target: `target:${item.targetFormat}`,
        value: item.value,
      })),
      label: { fontSize: 8, color: '#94a3b8', formatter: (p: any) => formatNodeLabel(p.name) },
      lineStyle: { color: 'gradient', opacity: 0.45, curveness: 0.45 },
    }],
  };
}

const topologyLayout: Record<string, [number, number]> = {
  web: [170, 118],
  api: [368, 190],
  hdfs: [504, 108],
  spark: [594, 190],
  gotenberg: [202, 282],
  redis: [486, 282],
  nordic: [356, 72],
  mumbai: [612, 292],
  sydney: [628, 116],
};

const topologyRoles: Record<string, { role: string; color: string; glow: string; size: number }> = {
  web: { role: 'Console', color: '#22d3ee', glow: 'rgba(34,211,238,0.45)', size: 17 },
  api: { role: 'Gateway', color: '#60a5fa', glow: 'rgba(96,165,250,0.48)', size: 22 },
  hdfs: { role: 'Object Lake', color: '#2dd4bf', glow: 'rgba(45,212,191,0.42)', size: 19 },
  spark: { role: 'Compute', color: '#a78bfa', glow: 'rgba(167,139,250,0.48)', size: 24 },
  gotenberg: { role: 'Render', color: '#f59e0b', glow: 'rgba(245,158,11,0.42)', size: 16 },
  redis: { role: 'Cache', color: '#34d399', glow: 'rgba(52,211,153,0.42)', size: 18 },
  nordic: { role: 'Edge', color: '#38bdf8', glow: 'rgba(56,189,248,0.42)', size: 15 },
  mumbai: { role: 'AI Route', color: '#fb7185', glow: 'rgba(251,113,133,0.4)', size: 15 },
  sydney: { role: 'Replica', color: '#818cf8', glow: 'rgba(129,140,248,0.42)', size: 15 },
};

const topologyStatusColor = (status?: string) => {
  if (status === 'degraded') return '#f59e0b';
  if (status === 'failed' || status === 'error' || status === 'down') return '#fb7185';
  return '#22c55e';
};

function decorateTopologyNodes(nodes: any[]) {
  return nodes.map((node: any, index: number) => {
    const role = topologyRoles[node.id] || { role: node.city || 'Node', color: '#38bdf8', glow: 'rgba(56,189,248,0.38)', size: 16 };
    const fallbackAngle = (Math.PI * 2 * index) / Math.max(nodes.length, 1);
    const fallbackCoord: [number, number] = [380 + Math.cos(fallbackAngle) * 190, 190 + Math.sin(fallbackAngle) * 112];
    return {
      ...node,
      coord: topologyLayout[node.id] || node.coord || fallbackCoord,
      role: node.role || role.role,
      color: role.color,
      glow: role.glow,
      symbolSize: role.size,
      statusColor: topologyStatusColor(node.status),
    };
  });
}

function buildTopologyGraphic(processedRows: number, successRate: string) {
  return [
    { type: 'circle', left: 'center', top: 'middle', shape: { r: 174 }, style: { fill: 'rgba(56,189,248,0.018)', stroke: 'rgba(56,189,248,0.18)', lineWidth: 1.2 }, silent: true },
    { type: 'circle', left: 'center', top: 'middle', shape: { r: 124 }, style: { fill: 'rgba(99,102,241,0.025)', stroke: 'rgba(129,140,248,0.14)', lineWidth: 1 }, silent: true },
    { type: 'circle', left: 'center', top: 'middle', shape: { r: 78 }, style: { fill: 'rgba(45,212,191,0.035)', stroke: 'rgba(45,212,191,0.12)', lineWidth: 1 }, silent: true },
    { type: 'circle', left: 'center', top: 'middle', shape: { r: 42 }, style: { fill: 'rgba(34,211,238,0.06)', stroke: 'rgba(34,211,238,0.18)', lineWidth: 1 }, silent: true },
    { type: 'text', left: 'center', top: 'middle', style: { text: 'CULCLOUD\nOBSERVABILITY MESH', fill: 'rgba(226,232,240,0.52)', font: '700 12px Inter', align: 'center', lineHeight: 17 }, silent: true },
    { type: 'text', left: '5%', top: 16, style: { text: 'OPEN TELEMETRY FABRIC', fill: 'rgba(56,189,248,0.55)', font: '800 10px Inter', letterSpacing: 1.5 }, silent: true },
    { type: 'text', right: '5%', top: 16, style: { text: `${processedRows.toLocaleString()} EVENTS  |  ${successRate} SLO`, fill: 'rgba(148,163,184,0.62)', font: '700 10px Inter', align: 'right' }, silent: true },
  ];
}

function LoggerConsole({ logs }: { logs: any[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [logs]);
  return (
    <div className="bg-[#020617]/90 border border-[#1e293b] rounded-lg p-2 font-mono flex flex-col h-full min-h-[60px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1 shrink-0">
        <div className="text-[7px] font-black text-slate-500 tracking-widest flex items-center gap-1">
          <span className="w-1 h-1 bg-red-600 rounded-full animate-ping" />
          SYSTEM LOG
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-0.5 text-[8px] text-emerald-400 scrollbar-none">
        {logs.length === 0 ? (
          <div className="text-slate-700 italic text-center py-1">等待日志...</div>
        ) : (
          logs.slice(-6).map((log: any, i: number) => (
            <div key={i} className="flex items-start gap-1.5 leading-snug">
              <span className="text-slate-600 shrink-0">[{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'LOG'}]</span>
              <span className="text-primary font-bold shrink-0">{log.type}</span>
              <span className="text-slate-400 truncate">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ==================== Slide 1: 全局态势(重塑)====================

function SlideOverview({ data, loading, worldChart, onTopologyReady }: any) {
  const cockpit = data?.cockpit || {};
  const logs = data?.logs || [];
  const scale = cockpit.scale || {};
  const processedRows = scale.processed_rows ?? 100000;
  const cockpitRate = typeof scale.conversion_rate === 'number' ? `${scale.conversion_rate}%` : '94.96%';
  const trafficTrend = Array.isArray(cockpit.traffic_trend) ? cockpit.traffic_trend : [];

  const actionDist = data?.actionDist || [];
  const formatDist = data?.formatDist || [];
  const actions = actionDist.length > 0
    ? actionDist.map((a: any) => ({ name: a.action, value: a.count }))
    : [
      { name: 'upload', value: 30303 }, { name: 'convert', value: 24846 },
      { name: 'download', value: 20011 }, { name: 'preview', value: 14952 }, { name: 'delete', value: 9888 },
    ];

  const formatMix = Array.isArray(cockpit.format_mix) && cockpit.format_mix.length > 0
    ? cockpit.format_mix.map((item: any) => [item.name, item.value])
    : formatDist.map((f: any) => [f.file_type.toUpperCase(), f.count]);

  const trendOpt = trafficTrend.length > 0 ? {
    tooltip: { trigger: 'axis' },
    grid: { top: 8, bottom: 8, left: 4, right: 4 },
    xAxis: { type: 'category', show: false, data: trafficTrend.map((t: any) => t.time) },
    yAxis: { type: 'value', show: false },
    series: [{
      type: 'line', smooth: true, showSymbol: false,
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(56,189,248,0.5)' }, { offset: 1, color: 'rgba(56,189,248,0)' }] } },
      lineStyle: { color: '#38bdf8', width: 1.5 },
      data: trafficTrend.map((t: any) => t.throughput),
    }],
  } : {};

  const colors = ['#38bdf8', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
  const donutOpt = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    series: [{
      type: 'pie', radius: ['35%', '60%'], center: ['50%', '55%'],
      data: actions.map((a: any, i: number) => ({ ...a, itemStyle: { color: colors[i % 5] } })),
      label: { show: true, fontSize: 7, color: '#94a3b8', formatter: '{b}\n{d}%' },
    }],
  };

  return (
    <div className="h-full flex flex-col gap-2 p-3">
      <div className="grid grid-cols-4 gap-2 shrink-0">
        <StatCard icon={HardDrive} label="遥测日志" value={Number(processedRows).toLocaleString()} color="bg-blue-600" sub="CulCloud 文件处理" />
        <StatCard icon={CheckCircle2} label="业务成功率" value={cockpitRate} color="bg-emerald-600" sub="Spark 聚合" />
        <StatCard icon={XCircle} label="失败/异常" value={Number(scale.quality_nulls ?? 5037).toLocaleString()} color="bg-rose-600" sub={scale.duplicates ? `重复 ${Number(scale.duplicates)} 条` : ''} />
        <StatCard icon={RadioTower} label="全球节点" value={String(worldChart._nodes?.length ?? 9)} color="bg-purple-600" sub="CulCloud 集群" />
      </div>

      <div className="flex-1 min-h-0 flex gap-2">
        {/* 左: 拓扑 */}
        <div className="flex-[3] bg-[#0d1222]/80 border border-[#1e293b] rounded-lg flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 opacity-70 pointer-events-none bg-[radial-gradient(circle_at_48%_46%,rgba(56,189,248,0.18),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.1),rgba(2,6,23,0.42))]" />
          <div className="flex justify-between items-center border-b border-[#1e293b] pb-1 px-2.5 pt-1.5 shrink-0">
            <span className="text-[8px] font-black text-slate-500 tracking-widest flex items-center gap-1">
              <Globe2 className="w-3 h-3 text-primary" />
              GLOBAL TOPOLOGY
            </span>
            <span className="text-[7px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black">LIVE</span>
          </div>
          <div className="flex-1 min-h-0">
            <EChartsWrapper option={worldChart.option} loading={loading} theme="dark" style={{ height: '100%' }} onReady={onTopologyReady} />
          </div>
          <div className="absolute left-3 bottom-3 flex items-center gap-2 pointer-events-none">
            {[
              ['Gateway', '#60a5fa'],
              ['Compute', '#a78bfa'],
              ['Storage', '#2dd4bf'],
              ['Cache', '#34d399'],
            ].map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5 rounded border border-slate-800/80 bg-[#020617]/55 px-2 py-1 text-[7px] font-black text-slate-500 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
          <div className="absolute right-3 bottom-3 flex items-center gap-1.5 pointer-events-none">
            <span className="rounded border border-cyan-500/20 bg-cyan-950/30 px-2 py-1 text-[7px] font-black text-cyan-300">TRACE FLOW</span>
            <span className="rounded border border-emerald-500/20 bg-emerald-950/30 px-2 py-1 text-[7px] font-black text-emerald-300">SLO OK</span>
          </div>
        </div>

        {/* 右: 补图面板 */}
        <div className="flex-[2] flex flex-col gap-2 min-h-0">
          <MiniChartCard title="实时吞吐" chart={trendOpt} loading={loading} className="flex-[2]" />
          <div className="flex-[3] flex gap-2 min-h-0">
            <MiniChartCard title="操作分布" chart={donutOpt} loading={loading} className="flex-1" />
            <div className="flex-1 bg-[#0d1222]/80 border border-[#1e293b] rounded-lg p-2.5 flex flex-col">
              <div className="text-[9px] font-black tracking-wider text-slate-400 uppercase shrink-0">格式占比</div>
              <div className="flex-1 min-h-0 flex flex-col justify-center gap-1">
                {formatMix.slice(0, 6).map(([name, val]: [string, number], i: number) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[i % 5] }} />
                    <span className="text-[8px] text-slate-400 flex-1 truncate">{name}</span>
                    <span className="text-[8px] text-slate-100 font-bold">{val.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[52px] shrink-0">
        <LoggerConsole logs={logs} />
      </div>
    </div>
  );
}

// ==================== Slide 2: 文件处理 ====================

function SlideProcessing({ data, loading }: any) {
  const cockpit = data?.cockpit || {};
  const convStats = data?.convStats;
  const actionDist = data?.actionDist || [];
  const formatDist = data?.formatDist || [];
  const scale = cockpit.scale || {};

  const formatMix = Array.isArray(cockpit.format_mix) && cockpit.format_mix.length > 0
    ? cockpit.format_mix.map((item: any) => [item.name, item.value])
    : formatDist.map((f: any) => [f.file_type.toUpperCase(), f.count]);
  const totalFiles = formatDist.length > 0
    ? formatDist.reduce((sum: number, item: any) => sum + Number(item.count || 0), 0)
    : formatMix.reduce((sum: number, [, value]: [string, number]) => sum + Number(value || 0), 0);
  const storageMb = Math.round(scale.total_size_mb || formatDist.reduce((sum: number, item: any) => sum + Number(item.total_bytes || 0) / 1024 / 1024, 0));

  const barOpt = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params: any) => {
      const p = params?.[0];
      return `${p.name}<br/>文件数: ${nf.format(p.value)}<br/>占比: ${pct((p.value / Math.max(totalFiles, 1)) * 100)}`;
    } },
    grid: { top: 18, bottom: 24, left: 46, right: 12 },
    xAxis: { type: 'category', data: formatMix.map(([k]: [string, number]) => k), axisLabel: { fontSize: 8, color: '#94a3b8', fontWeight: 700 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(148,163,184,0.13)' } }, axisLabel: { fontSize: 8, color: '#94a3b8', formatter: (v: number) => compactNf.format(v) } },
    series: [{
      type: 'bar',
      data: formatMix.map(([, v]: [string, number]) => v),
      barWidth: '56%',
      itemStyle: {
        borderRadius: [3, 3, 0, 0],
        color: { type: 'linear', x: 0, y: 1, x2: 0, y2: 0, colorStops: [{ offset: 0, color: '#2563eb' }, { offset: 1, color: '#38bdf8' }] },
      },
      label: { show: true, position: 'top', fontSize: 7, color: '#64748b', formatter: (p: any) => compactNf.format(p.value) },
    }],
  };

  const actions = actionDist.length > 0
    ? actionDist.map((a: any) => ({ name: a.action, value: a.count }))
    : [
      { name: 'upload', value: 30303 }, { name: 'convert', value: 24846 },
      { name: 'download', value: 20011 }, { name: 'preview', value: 14952 }, { name: 'delete', value: 9888 },
    ];
  const colors = ['#38bdf8', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
  const actionTotal = actions.reduce((sum: number, item: any) => sum + Number(item.value || 0), 0);
  const actionOpt = {
    tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}<br/>次数: ${nf.format(p.value)}<br/>占比: ${pct(p.percent)}` },
    legend: { orient: 'vertical', right: 18, top: 'middle', itemWidth: 8, itemHeight: 8, textStyle: { color: '#94a3b8', fontSize: 8 }, formatter: (name: string) => {
      const item = actions.find((a: any) => a.name === name);
      return `${name}  ${compactNf.format(item?.value || 0)}`;
    } },
    series: [{
      type: 'pie', radius: ['40%', '66%'], center: ['42%', '52%'],
      data: actions.map((a: any, i: number) => ({ ...a, itemStyle: { color: colors[i % 5] } })),
      label: { show: true, fontSize: 8, color: '#94a3b8', formatter: '{b}\n{d}%' },
      labelLine: { lineStyle: { color: '#334155' } },
    }],
    graphic: { type: 'text', left: '37%', top: '47%', style: { text: `${compactNf.format(actionTotal)}\nOps`, fill: '#e2e8f0', fontSize: 12, fontWeight: 800, align: 'center', lineHeight: 15 } },
  };

  const convData = convStats?.by_type || [];
  // 桑基图采用“来源层 -> 目标层”的双层节点，避免双向转换统计形成 ECharts 不支持的环。
  const nodeColorMap: Record<string, string> = {
    pdf: '#ef4444', docx: '#3b82f6', xlsx: '#10b981', pptx: '#f59e0b',
    png: '#8b5cf6', jpg: '#ec4899', txt: '#6366f1', html: '#f97316',
    csv: '#14b8a6', json: '#06b6d4', xml: '#a855f7',
  };
  const sankeyOpt = buildSankeyOption(convData, nodeColorMap);

  const errAnalysis = data?.errorAnalysis || {};
  const errorTypes = Array.isArray(errAnalysis.by_error_type) ? errAnalysis.by_error_type : [];
  const rankedErrors = (errorTypes.length > 0 ? errorTypes : [
    { error_type: '文件格式不支持', count: 1237 }, { error_type: '文件损坏无法解析', count: 998 },
    { error_type: '转换超时', count: 746 }, { error_type: '存储空间不足', count: 600 },
    { error_type: '文件大小超出限制', count: 479 }, { error_type: '并发限制', count: 440 },
  ]).slice(0, 6).reverse();
  const errMax = Math.max(...rankedErrors.map((e: any) => Number(e.count || 0)), 1);
  const errorRankOpt = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params: any) => {
      const p = params?.[0];
      return `${p.name}<br/>错误次数: ${nf.format(p.value)}`;
    } },
    grid: { top: 8, bottom: 16, left: 88, right: 36 },
    xAxis: { type: 'value', show: false, max: errMax * 1.12 },
    yAxis: { type: 'category', data: rankedErrors.map((e: any) => e.error_type), axisLabel: { fontSize: 8, color: '#94a3b8', fontWeight: 700 }, axisTick: { show: false }, axisLine: { show: false } },
    series: [{
      type: 'bar',
      data: rankedErrors.map((e: any, i: number) => ({ value: e.count, itemStyle: { color: i >= 4 ? '#f43f5e' : i >= 2 ? '#f59e0b' : '#38bdf8' } })),
      barWidth: 10,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', color: '#cbd5e1', fontSize: 8, fontWeight: 800, formatter: (p: any) => nf.format(p.value) },
      backgroundStyle: { color: 'rgba(30,41,59,0.35)', borderRadius: 4 },
      showBackground: true,
    }],
  };

  const scatterData = formatDist.length > 0
    ? formatDist.map((f: any) => [f.avg_bytes, f.count, f.success_rate, f.file_type])
    : [
      [2530088, 28020, 95, 'PDF'], [1008148, 18043, 95, 'DOCX'],
      [1523711, 12047, 94.8, 'XLSX'], [2566970, 5991, 94.5, 'PPTX'],
    ];
  const scatterOpt = {
    tooltip: { trigger: 'item', formatter: (p: any) => {
      const d = p.data;
      return `${d[3]}<br/>Avg: ${(d[0]/1024/1024).toFixed(2)} MB<br/>Count: ${d[1]}<br/>Success: ${d[2]}%`;
    }},
    grid: { top: 15, bottom: 34, left: 40, right: 26 },
    xAxis: { type: 'value', name: 'Avg Size (MB)', nameLocation: 'middle', nameGap: 22, nameTextStyle: { fontSize: 8, color: '#64748b' }, axisLabel: { fontSize: 8, color: '#94a3b8', formatter: (v: number) => (v/1024/1024).toFixed(0) } },
    yAxis: { type: 'value', name: 'Count', nameTextStyle: { fontSize: 8, color: '#64748b' }, axisLabel: { fontSize: 8, color: '#94a3b8' } },
    series: [{
      type: 'scatter',
      data: scatterData.map((d: any) => ({ name: String(d[3]).toUpperCase(), value: [d[0], d[1]], itemStyle: { color: d[2] > 95 ? '#10b981' : d[2] > 94 ? '#f59e0b' : '#ef4444' } })),
      symbolSize: (val: any) => Math.max(8, Math.min(24, val[1] / 1500)),
      label: { show: true, formatter: '{b}', position: 'right', color: '#64748b', fontSize: 7 },
    }],
  };
  const conversionTotal = Number(convStats?.total_conversions || 0);
  const conversionRate = Number(convStats?.success_rate || scale.conversion_rate || 0);
  const failedCount = Number(convStats?.failed_count || errAnalysis.total_failed || 0);
  const avgConvertMs = convData.length > 0
    ? Math.round(convData.reduce((sum: number, item: any) => sum + Number(item.avg_time_ms || 0) * Number(item.count || 0), 0) / Math.max(conversionTotal, 1))
    : 0;

  return (
    <div className="h-full flex flex-col gap-2 p-3">
      <div className="grid grid-cols-4 gap-2 shrink-0">
        <MetricPill label="文件样本" value={nf.format(totalFiles)} sub="Spark 聚合" color="#38bdf8" />
        <MetricPill label="转换任务" value={nf.format(conversionTotal)} sub={pct(conversionRate)} color="#10b981" />
        <MetricPill label="平均转换" value={`${(avgConvertMs / 1000).toFixed(1)}s`} sub="加权均值" color="#f59e0b" />
        <MetricPill label="存储吞吐" value={`${nf.format(storageMb)} MB`} sub={`${nf.format(failedCount)} 异常`} color="#8b5cf6" />
      </div>
      <div className="grid grid-cols-2 gap-2 flex-[2] min-h-0">
        <MiniChartCard title="文件类型分布" chart={barOpt} loading={loading} />
        <MiniChartCard title="操作分布" chart={actionOpt} loading={loading} />
      </div>
      <div className="grid grid-cols-3 gap-2 flex-[3] min-h-0">
        <MiniChartCard title="转换桑基图" chart={sankeyOpt} loading={loading} />
        <MiniChartCard title="耗时 vs 大小" chart={scatterOpt} loading={loading} />
        <MiniChartCard title="错误原因排行" chart={errorRankOpt} loading={loading} />
      </div>
    </div>
  );
}

function ServiceHealthPanel({ services }: { services: any[] }) {
  const displayServices = services.length > 0 ? services : [
    { name: 'api', label: 'FastAPI 文件服务', category: 'application', status: 'healthy', latency_ms: 5.6 },
    { name: 'flask-analytics', label: 'Flask 分析服务', category: 'application', status: 'healthy', latency_ms: 7.0 },
    { name: 'frontend', label: 'React 前端', category: 'application', status: 'degraded', latency_ms: 5.7 },
    { name: 'gotenberg', label: 'Gotenberg 转换引擎', category: 'worker', status: 'degraded', latency_ms: 15.1 },
    { name: 'minio', label: 'MinIO 对象存储', category: 'infrastructure', status: 'healthy', latency_ms: 3.0 },
    { name: 'redis', label: 'Redis 缓存', category: 'infrastructure', status: 'healthy', latency_ms: 1.0 },
  ];
  const counts = displayServices.reduce((acc: Record<string, number>, svc: any) => {
    const key = svc.status === 'healthy' || svc.status === 'ok' ? 'healthy' : svc.status === 'degraded' ? 'degraded' : 'down';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, { healthy: 0, degraded: 0, down: 0 });
  const categoryCounts = displayServices.reduce((acc: Record<string, number>, svc: any) => {
    const key = svc.category || svc.type || 'service';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const maxLatency = Math.max(...displayServices.map((svc: any) => Number(svc.latency_ms || 0)), 1);

  return (
    <PanelShell title="服务健康" meta={`${displayServices.length} services`} className="flex-[1.08]">
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="grid grid-cols-3 gap-2 shrink-0">
          <MetricPill label="Healthy" value={counts.healthy || 0} sub="正常" color="#10b981" />
          <MetricPill label="Degraded" value={counts.degraded || 0} sub="降级" color="#f59e0b" />
          <MetricPill label="Down" value={counts.down || 0} sub="离线" color="#f43f5e" />
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded border border-slate-800/80 bg-[#020617]/35 px-2 py-1">
          {[
            ['Healthy', '#10b981'],
            ['Degraded', '#f59e0b'],
            ['Down', '#f43f5e'],
          ].map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5 text-[8px] font-black text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 scrollbar-none">
          {displayServices.slice(0, 7).map((svc: any) => {
            const meta = statusMeta(svc.status);
            const latency = Number(svc.latency_ms || 0);
            return (
              <div key={svc.name || svc.label} className="grid min-h-[42px] grid-cols-[1fr_82px_56px] items-center gap-2 rounded border border-slate-800/70 bg-[#020617]/38 px-2 py-1">
                <div className="min-w-0">
                  <div className="truncate text-[9px] font-black text-slate-200">{svc.label || svc.name}</div>
                  <div className="truncate text-[7px] font-bold uppercase tracking-wider text-slate-600">{svc.category || svc.type || 'service'}</div>
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex justify-between text-[7px] font-bold text-slate-500">
                    <span>latency</span>
                    <span className="tabular-nums">{latency.toFixed(1)} ms</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(8, Math.min(100, (latency / maxLatency) * 100))}%`, backgroundColor: meta.color }} />
                  </div>
                </div>
                <div className={cn("rounded border px-1.5 py-1 text-center text-[7px] font-black", meta.tone)}>{meta.label}</div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-4 gap-1.5 shrink-0 rounded border border-slate-800/80 bg-[#020617]/35 p-1">
          {[
            ['APP', categoryCounts.application || 0, '应用层', '#60a5fa'],
            ['INFRA', categoryCounts.infrastructure || 0, '基础设施', '#2dd4bf'],
            ['WORKER', categoryCounts.worker || 0, '转换层', '#f59e0b'],
            ['MAX', `${maxLatency.toFixed(1)} ms`, '最慢探针', '#f43f5e'],
          ].map(([label, value, sub, color]) => (
            <div key={String(label)} className="min-w-0 rounded bg-[#0d1222]/70 px-2 py-1">
              <div className="flex items-center gap-1 text-[7px] font-black text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: String(color) }} />
                <span className="truncate">{label}</span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="truncate text-[11px] font-black leading-none text-slate-100 tabular-nums">{value}</span>
                <span className="truncate text-[7px] font-bold text-slate-600">{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}

// ==================== Slide 3: 质量监控 ====================

function SlideQuality({ data, loading }: any) {
  const health = data?.health;
  const pipeline = data?.pipeline || {};
  const cockpit = data?.cockpit || {};
  const scale = cockpit.scale || {};
  const errorAnalysis = data?.errorAnalysis;
  const errorHeatmap = data?.errorHeatmap;

  const svcEntries = normalizeServices(health);

  const storageMb = Math.round(scale.total_size_mb || 163220);
  const storageMax = 200000;
  const liquidOpt = {
    series: [{
      type: 'liquidFill', radius: '70%', center: ['50%', '55%'],
      data: [storageMb / storageMax, storageMb / storageMax * 0.8],
      color: ['#38bdf8', '#0284c7'],
      backgroundStyle: { color: '#0d1222', borderWidth: 1, borderColor: '#1e293b' },
      outline: { borderDistance: 4, itemStyle: { borderWidth: 2, borderColor: '#1e293b' } },
      label: { fontSize: 12, color: '#f1f5f9', formatter: `${storageMb} MB\n` },
    }],
  };

  const errTotal = errorAnalysis?.total_failed || 5037;
  const radarOpt = {
    radar: {
      indicator: [
        { name: '数据完整性', max: 100 },
        { name: '唯一性', max: 100 },
        { name: '时效性', max: 100 },
        { name: '正确率', max: 100 },
        { name: '一致性', max: 100 },
      ],
      radius: '55%',
      axisName: { color: '#94a3b8', fontSize: 7 },
    },
    series: [{
      type: 'radar',
      data: [{ name: 'CulCloud', value: [98.5, 95.0, 99.2, scale.conversion_rate || 94.96, 97.8], areaStyle: { opacity: 0.15, color: '#38bdf8' }, lineStyle: { color: '#38bdf8', width: 1.5 }, itemStyle: { color: '#38bdf8' } }],
      symbol: 'none',
    }],
  };

  // 错误热力图 - 优先使用 API 返回的 matrix, 空则从错误总数确定性分布，避免随机假数据。
  const hmMatrix = errorHeatmap?.matrix;
  const hmLabelsDow = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const hmLabelsHour = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const hmData: any[] = [];
  if (hmMatrix && hmMatrix.length > 0) {
    hmMatrix.forEach((row: number[], dow: number) => {
      row.forEach((val: number, hour: number) => {
        if (val > 0) hmData.push([hour, dow, val]);
      });
    });
  } else if (errTotal > 0) {
    const totalErrs = errTotal;
    // 每小时权重:08-18 高峰, 19-23 中峰, 00-07 低谷
    const hourWeight = Array.from({ length: 24 }, (_, h) => (h >= 8 && h <= 18) ? 3 : (h >= 19 || h <= 7) ? 1 : 2);
    const dayWeight = [1.0, 1.1, 1.0, 0.9, 1.2, 0.6, 0.4]; // 周五最高,周末低
    let totalWeight = 0;
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) totalWeight += dayWeight[d] * hourWeight[h];
    const errScale = totalErrs / totalWeight;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const deterministicJitter = 0.85 + (((d + 1) * 17 + (h + 3) * 11) % 30) / 100;
        const val = Math.round(dayWeight[d] * hourWeight[h] * errScale * deterministicJitter);
        if (val > 0) hmData.push([h, d, val]);
      }
    }
  }
  const maxVal = Math.max(...hmData.map((d: any) => d[2]), 1);
  const heatmapOpt: any = {
    tooltip: { position: 'top', formatter: (p: any) => `${hmLabelsDow[p.data[1]]} ${hmLabelsHour[p.data[0]]}<br/>错误: ${p.data[2]} 次` },
    grid: { top: 20, bottom: 30, left: 40, right: 10 },
    xAxis: { type: 'category', data: hmLabelsHour, splitArea: { show: true }, axisLabel: { fontSize: 7, color: '#94a3b8', interval: 3 } },
    yAxis: { type: 'category', data: hmLabelsDow, splitArea: { show: true }, axisLabel: { fontSize: 7, color: '#94a3b8' } },
    visualMap: { min: 0, max: maxVal, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#0d1222', '#1d4ed8', '#38bdf8', '#f59e0b', '#ef4444'] }, textStyle: { color: '#94a3b8', fontSize: 7 } },
    series: [{ type: 'heatmap', data: hmData, label: { show: false }, emphasis: { itemStyle: { shadowBlur: 10 } } }],
  };

  // 数据质量仪表盘
  const qualityPct = scale.conversion_rate || (pipeline.telemetry?.raw_rows ? Math.round((pipeline.telemetry.cleaned_rows / pipeline.telemetry.raw_rows) * 10000) / 100 : 94.96);
  const rawRows = pipeline.telemetry?.raw_rows || 100000;
  const cleanRows = pipeline.telemetry?.cleaned_rows || 94963;
  const invalidRows = Math.max(0, rawRows - cleanRows);
  const avgLatency = svcEntries.length > 0
    ? svcEntries.reduce((sum: number, svc: any) => sum + Number(svc.latency_ms || 0), 0) / svcEntries.length
    : 0;
  const dataQualityOpt: any = {
    tooltip: {
      formatter: () => `<div style="font-size:10px;line-height:1.6"><b>数据质量报告</b><br/>总计: ${rawRows.toLocaleString()}<br/>有效: ${cleanRows.toLocaleString()}<br/>异常: ${(rawRows - cleanRows).toLocaleString()}<br/>成功率: ${qualityPct}%</div>`,
    },
    series: [{
      type: 'gauge',
      startAngle: 210, endAngle: -30,
      center: ['50%', '58%'], radius: '90%',
      min: 80, max: 100,
      splitNumber: 10,
      progress: { show: true, width: 12, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#38bdf8' }] } } },
      axisLine: { lineStyle: { width: 12, color: [[0.3, '#ef4444'], [0.6, '#f59e0b'], [0.8, '#38bdf8'], [1, '#10b981']] } },
      pointer: { length: '55%', width: 4, itemStyle: { color: '#e2e8f0' } },
      axisTick: { distance: -12, length: 4, lineStyle: { width: 1, color: '#475569' } },
      splitLine: { distance: -16, length: 10, lineStyle: { width: 2, color: '#475569' } },
      axisLabel: { distance: 18, color: '#64748b', fontSize: 7 },
      detail: { valueAnimation: true, formatter: '{value}%', color: '#e2e8f0', fontSize: 16, fontWeight: 'bold', offsetCenter: [0, '50%'] },
      title: { offsetCenter: [0, '95%'], fontSize: 9, color: '#64748b' },
      data: [{ value: qualityPct, name: '数据质量' }],
    }],
  };

  return (
    <div className="h-full flex flex-col gap-2 p-3">
      <div className="grid grid-cols-4 gap-2 shrink-0">
        <MetricPill label="有效遥测" value={nf.format(cleanRows)} sub={`${pct(qualityPct)} quality`} color="#10b981" />
        <MetricPill label="异常样本" value={nf.format(invalidRows)} sub={`${nf.format(errTotal)} failed`} color="#f43f5e" />
        <MetricPill label="平均延迟" value={`${avgLatency.toFixed(1)} ms`} sub={`${svcEntries.length || 6} services`} color="#38bdf8" />
        <MetricPill label="存储水位" value={`${pct((storageMb / storageMax) * 100)}`} sub={`${nf.format(storageMb)} MB`} color="#8b5cf6" />
      </div>
      <div className="flex gap-2 flex-[3] min-h-0">
        <ServiceHealthPanel services={svcEntries} />
        <PanelShell title="数据质量" meta={`${nf.format(rawRows)} raw rows`} className="flex-[1]">
          <div className="grid h-full min-h-0 grid-cols-[1fr_130px] gap-2">
            <EChartsWrapper option={dataQualityOpt} loading={loading} theme="dark" />
            <div className="flex min-w-0 flex-col justify-center gap-2">
              <MetricPill label="Clean Rows" value={nf.format(cleanRows)} sub="有效记录" color="#10b981" />
              <MetricPill label="Rejected" value={nf.format(invalidRows)} sub="清洗剔除" color="#f59e0b" />
              <MetricPill label="Duplicates" value={nf.format(scale.duplicates || 0)} sub="重复样本" color="#38bdf8" />
            </div>
          </div>
        </PanelShell>
      </div>
      <div className="grid grid-cols-3 gap-2 flex-[2] min-h-0">
        <MiniChartCard title="存储水位" chart={liquidOpt} loading={loading} />
        <MiniChartCard title="质量雷达" chart={radarOpt} loading={loading} />
        <MiniChartCard title="7×24 错误热力图" chart={heatmapOpt} loading={loading} />
      </div>
    </div>
  );
}

// ==================== 弹窗组件 ====================

function LargeModal({ open, title, icon: Icon, onClose, children }: any) {
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

function SystemMonitorModal({ health, logs }: any) {
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

function ClusterMonitorModal() {
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

function NodeDetailModal({ node, onClose, health }: any) {
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

// ==================== 主组件 ====================

export default function Analytics() {
  const { data, loading, error, refresh } = useBizData();
  const [slideIndex, setSlideIndex] = useState(0);
  const [isManual, setIsManual] = useState(false);
  const [showSystem, setShowSystem] = useState(false);
  const [showCluster, setShowCluster] = useState(false);
  const [nodeModal, setNodeModal] = useState<any | null>(null);
  const autoTimer = useRef<number>(0);
  const manualTimer = useRef<number>(0);

  const goToSlide = useCallback((i: number) => {
    setSlideIndex(i);
    setIsManual(true);
    clearTimeout(manualTimer.current);
    manualTimer.current = window.setTimeout(() => setIsManual(false), AUTO_RESUME_DELAY);
  }, []);

  const goNext = useCallback(() => {
    goToSlide((slideIndex + 1) % SLIDE_COUNT);
  }, [slideIndex, goToSlide]);

  const goPrev = useCallback(() => {
    goToSlide((slideIndex - 1 + SLIDE_COUNT) % SLIDE_COUNT);
  }, [slideIndex, goToSlide]);

  // 自动轮播(仅 manual=false 时有效)
  useEffect(() => {
    if (isManual || showSystem || showCluster || nodeModal) return;
    clearInterval(autoTimer.current);
    autoTimer.current = window.setInterval(goNext, SLIDE_INTERVAL);
    return () => clearInterval(autoTimer.current);
  }, [isManual, showSystem, showCluster, nodeModal, goNext]);

  // 鼠标悬停也进入 manual 模式
  const handleMouseEnter = () => {
    clearTimeout(manualTimer.current);
    setIsManual(true);
  };
  const handleMouseLeave = () => {
    manualTimer.current = window.setTimeout(() => setIsManual(false), AUTO_RESUME_DELAY);
  };

  const health = data?.health;
  const logs = data?.logs || [];
  const cockpit = data?.cockpit || {};
  const cockpitScale = cockpit.scale || {};
  const processedRows = Number(cockpitScale.processed_rows ?? 100000);
  const topologySlo = typeof cockpitScale.conversion_rate === 'number' ? `${cockpitScale.conversion_rate}%` : '95%';

  const rawCockpitNodes = Array.isArray(cockpit.nodes) && cockpit.nodes.length > 0 ? cockpit.nodes : [
    { id: 'web', name: 'Web Console', coord: [470, 176], status: 'healthy', metric: '15K req/s', city: 'Shanghai' },
    { id: 'api', name: 'API Gateway', coord: [430, 246], status: 'healthy', metric: 'REST API', city: 'Singapore' },
    { id: 'hdfs', name: 'MinIO/HDFS', coord: [455, 142], status: 'healthy', metric: '2.4 PB', city: 'Beijing' },
    { id: 'spark', name: 'Spark', coord: [545, 166], status: 'healthy', metric: '128 vCores', city: 'Tokyo' },
    { id: 'gotenberg', name: 'Gotenberg', coord: [82, 172], status: 'healthy', metric: '8K render/min', city: 'San Francisco' },
    { id: 'redis', name: 'Redis', coord: [255, 246], status: 'healthy', metric: '99% hit', city: 'Frankfurt' },
    { id: 'nordic', name: 'CDN Edge', coord: [455, 76], status: 'healthy', metric: '5ms latency', city: 'Oslo' },
    { id: 'mumbai', name: 'AI Proxy', coord: [580, 276], status: 'healthy', metric: '1.2K infer/s', city: 'Mumbai' },
    { id: 'sydney', name: 'DR Replica', coord: [620, 120], status: 'healthy', metric: 'sync 0.5s', city: 'Sydney' },
  ];
  const cockpitNodes = decorateTopologyNodes(rawCockpitNodes);
  const cockpitLinks = Array.isArray(cockpit.links) ? cockpit.links : [
    { source: 'Web Console', target: 'API Gateway' },
    { source: 'API Gateway', target: 'MinIO/HDFS' },
    { source: 'API Gateway', target: 'Gotenberg' },
    { source: 'API Gateway', target: 'Redis' },
    { source: 'API Gateway', target: 'AI Proxy' },
    { source: 'MinIO/HDFS', target: 'Spark' },
    { source: 'Spark', target: 'API Gateway' },
    { source: 'Redis', target: 'CDN Edge' },
    { source: 'CDN Edge', target: 'DR Replica' },
    { source: 'Gotenberg', target: 'Web Console' },
    { source: 'API Gateway', target: 'CDN Edge' },
    { source: 'Spark', target: 'AI Proxy' },
  ];
  const nodeByName = new Map(cockpitNodes.map((n: any) => [n.name, n]));
  const topologyLinkData = cockpitLinks.map((link: any, index: number) => {
    const s: any = nodeByName.get(link.source);
    const t: any = nodeByName.get(link.target);
    return s && t ? {
      coords: [s.coord, t.coord],
      value: link.value || (index + 1) * 8,
      lineStyle: { color: t.color || '#38bdf8' },
    } : null;
  }).filter(Boolean);
  const topologyGridData = [
    ...[120, 240, 360, 480, 600].map((x) => ({ coords: [[x, 38], [x, 342]] })),
    ...[82, 154, 226, 298].map((y) => ({ coords: [[68, y], [672, y]] })),
    { coords: [[96, 322], [644, 72]] },
    { coords: [[110, 68], [658, 312]] },
  ];

  // 对标 Grafana / Coroot service map 的高级暗色可观测拓扑。
  const worldChart = {
    _nodes: cockpitNodes,
    option: {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(2,6,23,0.92)',
        borderColor: 'rgba(56,189,248,0.28)',
        textStyle: { color: '#cbd5e1', fontSize: 11 },
        formatter: (p: any) => {
          const d = p.data;
          if (p.seriesType === 'lines') return '服务链路<br/>实时遥测流';
          return `<b>${d.name || ''}</b><br/>${d.role || d.city || ''}<br/>${d.metric || d.status || ''}`;
        },
      },
      grid: { left: 18, right: 18, top: 10, bottom: 8 },
      xAxis: { show: false, min: 0, max: 740 },
      yAxis: { show: false, min: 0, max: 380, inverse: true },
      graphic: buildTopologyGraphic(processedRows, topologySlo),
      series: [
        {
          type: 'lines', coordinateSystem: 'cartesian2d', zlevel: 0,
          silent: true,
          lineStyle: { color: 'rgba(148,163,184,0.08)', width: 1, opacity: 1, curveness: 0 },
          data: topologyGridData,
        },
        {
          type: 'lines', coordinateSystem: 'cartesian2d', zlevel: 1,
          silent: true,
          lineStyle: { color: '#38bdf8', width: 7, opacity: 0.06, curveness: 0.24 },
          data: topologyLinkData,
        },
        {
          type: 'lines', coordinateSystem: 'cartesian2d', zlevel: 2,
          effect: { show: true, period: 4.8, trailLength: 0.32, symbol: 'circle', symbolSize: 5, color: '#e0f2fe' },
          lineStyle: { color: '#38bdf8', width: 1.25, opacity: 0.52, curveness: 0.24 },
          data: topologyLinkData,
        },
        {
          type: 'effectScatter', coordinateSystem: 'cartesian2d', zlevel: 3,
          silent: true,
          rippleEffect: { brushType: 'stroke', scale: 4.2, period: 5 },
          symbolSize: (val: any) => (val?.[2] || 18) * 1.7,
          itemStyle: { color: (p: any) => p.data.glow, opacity: 0.45, shadowBlur: 26, shadowColor: (p: any) => p.data.glow },
          data: cockpitNodes.map((n: any) => ({ ...n, value: [n.coord?.[0] ?? 370, n.coord?.[1] ?? 190, n.symbolSize] })),
        },
        {
          type: 'effectScatter', coordinateSystem: 'cartesian2d', zlevel: 3,
          rippleEffect: { brushType: 'stroke', scale: 2.2, period: 3.8 },
          symbolSize: (val: any) => val?.[2] || 16,
          label: {
            show: true,
            color: '#dbeafe',
            fontSize: 9,
            fontWeight: 800,
            lineHeight: 13,
            formatter: (p: any) => `{name|${p.name}}\n{meta|${p.data.role} · ${p.data.metric || 'online'}}`,
            rich: {
              name: { color: '#dbeafe', fontSize: 9, fontWeight: 800 },
              meta: { color: '#64748b', fontSize: 7, fontWeight: 700 },
            },
          },
          itemStyle: {
            color: (p: any) => p.data.color,
            borderColor: '#e0f2fe',
            borderWidth: 1,
            shadowBlur: 20,
            shadowColor: (p: any) => p.data.glow,
          },
          data: cockpitNodes.map((n: any) => ({
            ...n,
            value: [n.coord?.[0] ?? 370, n.coord?.[1] ?? 190, n.symbolSize],
            label: { position: n.id === 'api' ? 'right' : n.coord?.[0] > 510 ? 'left' : n.coord?.[0] < 240 ? 'right' : 'bottom' },
          })),
        },
        {
          type: 'scatter', coordinateSystem: 'cartesian2d', zlevel: 4,
          symbolSize: 5,
          silent: true,
          itemStyle: { color: (p: any) => p.data.statusColor, borderColor: '#020617', borderWidth: 1 },
          data: cockpitNodes.map((n: any) => ({ ...n, value: [(n.coord?.[0] ?? 370) + 12, (n.coord?.[1] ?? 190) - 12] })),
        },
      ],
    },
  };

  const handleTopologyReady = useCallback((chart: any) => {
    chart.on('click', (params: any) => { if (params.data?.id) setNodeModal(params.data); });
  }, []);

  const { toggleCockpit } = useDashboard();

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden select-none bg-[#0b0f19]">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e293b] shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/logos/culcloud-cockpit-logo.png"
            alt="CulCloud 大数据指挥舱"
            className="h-10 w-56 object-contain object-left"
          />
          <span className="text-[8px] text-slate-500 font-bold">Spark Telemetry</span>
          {isManual && (
            <span className="text-[7px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">手动</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowSystem(true)}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#12182d] hover:bg-[#1b233d] border border-[#1e293b] text-slate-400 hover:text-white transition-colors cursor-pointer" title="系统监控">
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowCluster(true)}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#12182d] hover:bg-[#1b233d] border border-[#1e293b] text-slate-400 hover:text-white transition-colors cursor-pointer" title="集群状态">
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button onClick={refresh}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#12182d] hover:bg-[#1b233d] border border-[#1e293b] text-slate-400 hover:text-white transition-colors cursor-pointer" title="刷新">
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
          <button onClick={toggleCockpit}
            className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-400 hover:text-rose-300 text-[10px] font-black transition-colors cursor-pointer" title="退出大屏">
            <LogOut className="w-3 h-3" />
            退出
          </button>
        </div>
      </div>

      {/* 警告 */}
      {error && (
        <div className="bg-rose-950/20 border border-rose-900/50 rounded p-1.5 text-rose-500 text-[8px] text-center mx-4 mt-1 shrink-0">
          <AlertTriangle className="w-3 h-3 inline mr-1" />{error}
        </div>
      )}

      {/* ===== 轮播区域 ===== */}
      <div
        className="flex-1 min-h-0 relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* 左右翻页箭头 */}
        {!showSystem && !showCluster && !nodeModal && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-12 rounded-r-lg bg-[#0b0f19]/70 border border-[#1e293b] border-l-0 flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#0b0f19] transition-all cursor-pointer opacity-0 group-hover:opacity-100"
              style={{ opacity: 0.7 }}
              onMouseEnter={() => document.documentElement.style.setProperty('--arrow-opacity', '1')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-12 rounded-l-lg bg-[#0b0f19]/70 border border-[#1e293b] border-r-0 flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#0b0f19] transition-all cursor-pointer"
              style={{ opacity: 0.7 }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={slideIndex}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}
              className="h-full w-full"
            >
              {slideIndex === 0 && <SlideOverview data={data} loading={loading} worldChart={worldChart} onTopologyReady={handleTopologyReady} />}
              {slideIndex === 1 && <SlideProcessing data={data} loading={loading} />}
              {slideIndex === 2 && <SlideQuality data={data} loading={loading} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 轮播指示器(始终可见) */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#0b0f19]/70 px-3 py-1.5 rounded-full border border-[#1e293b]">
          {[0, 1, 2].map(i => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={cn(
                "rounded-full transition-all duration-300 cursor-pointer",
                i === slideIndex ? "bg-primary w-5 h-1.5" : "bg-slate-600 w-1.5 h-1.5 hover:bg-slate-400"
              )}
            />
          ))}
          <span className="text-[7px] text-slate-500 font-mono ml-1">{slideIndex + 1}/{SLIDE_COUNT}</span>
        </div>
      </div>

      {/* 弹窗 */}
      <LargeModal open={showSystem} title="系统监控" icon={Settings2} onClose={() => setShowSystem(false)}>
        <SystemMonitorModal health={health} logs={logs} />
      </LargeModal>
      <LargeModal open={showCluster} title="集群状态" icon={Monitor} onClose={() => setShowCluster(false)}>
        <ClusterMonitorModal />
      </LargeModal>
      <NodeDetailModal node={nodeModal} onClose={() => setNodeModal(null)} health={health} />
    </div>
  );
}
