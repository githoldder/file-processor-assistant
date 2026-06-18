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

// ==================== Slide 1: 全局态势（重塑）====================

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
          <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.18),transparent_55%)]" />
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

  const formatMix = Array.isArray(cockpit.format_mix) && cockpit.format_mix.length > 0
    ? cockpit.format_mix.map((item: any) => [item.name, item.value])
    : formatDist.map((f: any) => [f.file_type.toUpperCase(), f.count]);

  const barOpt = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 12, bottom: 20, left: 40, right: 5 },
    xAxis: { type: 'category', data: formatMix.map(([k]: [string, number]) => k), axisLabel: { fontSize: 8, color: '#94a3b8' } },
    yAxis: { type: 'value', axisLabel: { fontSize: 8, color: '#94a3b8' } },
    series: [{ type: 'bar', data: formatMix.map(([, v]: [string, number]) => v), itemStyle: { borderRadius: [2, 2, 0, 0], color: '#38bdf8' } }],
  };

  const actions = actionDist.length > 0
    ? actionDist.map((a: any) => ({ name: a.action, value: a.count }))
    : [
      { name: 'upload', value: 30303 }, { name: 'convert', value: 24846 },
      { name: 'download', value: 20011 }, { name: 'preview', value: 14952 }, { name: 'delete', value: 9888 },
    ];
  const colors = ['#38bdf8', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
  const actionOpt = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie', radius: ['30%', '60%'],
      data: actions.map((a: any, i: number) => ({ ...a, itemStyle: { color: colors[i % 5] } })),
      label: { show: true, fontSize: 8, color: '#94a3b8', formatter: '{b}\n{d}%' },
    }],
  };

  const convData = convStats?.by_type || [];
  const sankeyOpt = convData.length > 0 ? {
    tooltip: { trigger: 'item', formatter: (p: any) => `${p.data.source || p.name} → ${p.data.target || ''}<br/>${p.value} 次` },
    series: [{
      type: 'sankey', layout: 'none',
      emphasis: { focus: 'adjacency' },
      nodeAlign: 'left',
      nodeWidth: 12, nodeGap: 8,
      data: [...new Set(convData.flatMap((c: any) => [c.source_format, c.target_format]))].map((name: any) => ({ name })),
      links: convData.slice(0, 10).map((c: any) => ({ source: c.source_format, target: c.target_format, value: c.count })),
      label: { fontSize: 8, color: '#94a3b8' },
      lineStyle: { color: 'gradient', opacity: 0.3 },
    }],
  } : {};

  const errAnalysis = data?.errorAnalysis || {};
  const errorTypes = Array.isArray(errAnalysis.by_error_type) ? errAnalysis.by_error_type : [];
  const wordCloudData = errorTypes.length > 0
    ? errorTypes.map((e: any) => ({ name: e.error_type, value: e.count }))
    : [
      { name: '文件格式不支持', value: 1259 }, { name: '文件损坏无法解析', value: 1007 },
      { name: '转换超时', value: 756 }, { name: '存储空间不足', value: 604 },
      { name: '文件大小超出限制', value: 504 }, { name: '并发限制', value: 403 },
      { name: '权限不足', value: 252 }, { name: '未知错误', value: 252 },
    ];
  const wordCloudOpt = {
    tooltip: { show: true, formatter: (p: any) => `${p.name}: ${p.value} 次` },
    series: [{
      type: 'wordCloud', shape: 'circle', rotationRange: [-30, 30], gridSize: 4,
      sizeRange: [10, 28],
      data: wordCloudData,
      textStyle: { fontFamily: 'Inter' },
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
    grid: { top: 15, bottom: 25, left: 40, right: 10 },
    xAxis: { type: 'value', name: 'Avg Size (MB)', nameTextStyle: { fontSize: 8, color: '#64748b' }, axisLabel: { fontSize: 8, color: '#94a3b8', formatter: (v: number) => (v/1024/1024).toFixed(0) } },
    yAxis: { type: 'value', name: 'Count', nameTextStyle: { fontSize: 8, color: '#64748b' }, axisLabel: { fontSize: 8, color: '#94a3b8' } },
    series: [{
      type: 'scatter',
      data: scatterData.map((d: any) => ({ value: [d[0], d[1]], itemStyle: { color: d[2] > 95 ? '#10b981' : d[2] > 94 ? '#f59e0b' : '#ef4444' } })),
      symbolSize: (val: any) => Math.max(8, Math.min(24, val[1] / 1500)),
    }],
  };

  return (
    <div className="h-full flex flex-col gap-2 p-3">
      <div className="grid grid-cols-2 gap-2 flex-[2] min-h-0">
        <MiniChartCard title="文件类型分布" chart={barOpt} loading={loading} />
        <MiniChartCard title="操作分布" chart={actionOpt} loading={loading} />
      </div>
      <div className="grid grid-cols-3 gap-2 flex-[3] min-h-0">
        <MiniChartCard title="转换桑基图" chart={sankeyOpt} loading={loading} />
        <MiniChartCard title="耗时 vs 大小" chart={scatterOpt} loading={loading} />
        <MiniChartCard title="错误词云" chart={wordCloudOpt} loading={loading} />
      </div>
    </div>
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

  const svcEntries = health?.services ? Object.entries(health.services as Record<string, any>) : [];
  const healthOpt = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['30%', '55%'],
      data: svcEntries.length > 0
        ? svcEntries.map(([name, svc]: [string, any]) => ({
            name, value: 1,
            itemStyle: { color: svc.status === 'healthy' || svc.status === 'ok' ? '#10b981' : svc.status === 'degraded' ? '#f59e0b' : '#ef4444' },
          }))
        : [{ name: 'healthy', value: 6, itemStyle: { color: '#10b981' } }],
    }],
  };

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

  // 错误热力图 — 优先使用 API 返回的 matrix，空则从 error/scale 合成
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
  } else {
    // 合成 7×24 热力数据：基于错误总数按小时+工作日权重分布
    const totalErrs = errTotal || 5037;
    // 每小时权重：08-18 高峰, 19-23 中峰, 00-07 低谷
    const hourWeight = Array.from({ length: 24 }, (_, h) => (h >= 8 && h <= 18) ? 3 : (h >= 19 || h <= 7) ? 1 : 2);
    const dayWeight = [1.0, 1.1, 1.0, 0.9, 1.2, 0.6, 0.4]; // 周五最高，周末低
    let totalWeight = 0;
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) totalWeight += dayWeight[d] * hourWeight[h];
    const errScale = totalErrs / totalWeight;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const val = Math.round(dayWeight[d] * hourWeight[h] * errScale * (0.7 + 0.6 * Math.random()));
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
      <div className="grid grid-cols-2 gap-2 flex-[3] min-h-0">
        <MiniChartCard title="服务健康" chart={healthOpt} loading={loading} />
        <MiniChartCard title="数据质量" chart={dataQualityOpt} loading={loading} />
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

function SystemMonitorModal({ health }: any) {
  const svcEntries = health?.services ? Object.entries(health.services as Record<string, any>) : [];
  const healthPie = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['35%', '65%'],
      data: svcEntries.map(([name, svc]: [string, any]) => ({
        name, value: 1,
        itemStyle: { color: svc.status === 'healthy' || svc.status === 'ok' ? '#10b981' : svc.status === 'degraded' ? '#f59e0b' : '#ef4444' },
      })),
      label: { show: true, fontSize: 11, color: '#94a3b8', formatter: '{b}\n{d}%' },
    }],
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="space-y-4">
        <div className="text-xs font-black tracking-widest text-slate-500 uppercase">微服务健康</div>
        {svcEntries.length === 0 ? (
          <div className="text-slate-500 text-sm">暂无数据</div>
        ) : (
          svcEntries.map(([name, svc]: [string, any]) => (
            <div key={name} className="bg-[#12182d] border border-[#1e293b] rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={cn("w-3 h-3 rounded-full", svc.status === 'healthy' || svc.status === 'ok' ? 'bg-emerald-500' : svc.status === 'degraded' ? 'bg-amber-500' : 'bg-rose-500')} />
                <span className="text-slate-200 font-bold capitalize">{name}</span>
              </div>
              <div className="text-xs text-slate-400">{svc.uptime || svc.status}</div>
            </div>
          ))
        )}
      </div>
      <div className="bg-[#12182d] border border-[#1e293b] rounded-xl p-5">
        <EChartsWrapper option={healthPie} theme="dark" style={{ height: '100%', minHeight: 300 }} />
      </div>
    </div>
  );
}

function ClusterMonitorModal() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/tasks?limit=20`).then(r => r.json())
      .then(d => setTasks(d.tasks || [])).catch(() => setTasks([])).finally(() => setLoading(false));
  }, []);
  const badge = (s: string) => `px-2 py-0.5 text-xs rounded-full font-medium ${
    ({ pending: 'bg-slate-800 text-slate-400', queued: 'bg-amber-900/30 text-amber-400', processing: 'bg-blue-900/30 text-blue-400', success: 'bg-emerald-900/30 text-emerald-400', failed: 'bg-rose-900/30 text-rose-400' } as Record<string, string>)[s] || 'bg-slate-800 text-slate-400'
  }`;

  if (loading) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">加载中...</div>;
  return (
    <div className="h-full flex flex-col">
      <div className="text-xs font-black tracking-widest text-slate-500 uppercase mb-4 shrink-0">实时任务队列</div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#0b0f19]">
            <tr className="border-b border-[#1e293b] text-slate-400 text-[10px] font-bold uppercase">
              <th className="text-left py-2 pr-4">ID</th>
              <th className="text-left py-2 pr-4">类型</th>
              <th className="text-left py-2 pr-4">工作节点</th>
              <th className="text-right py-2 pr-4">状态</th>
              <th className="text-right py-2">耗时</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-500">暂无任务</td></tr>
            ) : (
              tasks.map((t: any) => (
                <tr key={t.id} className="border-b border-[#1e293b]/50 text-slate-200">
                  <td className="py-2.5 pr-4 font-mono text-xs">{t.id?.slice(0, 12)}</td>
                  <td className="py-2.5 pr-4">{t.type}</td>
                  <td className="py-2.5 pr-4 text-slate-400">{t.worker_node || '-'}</td>
                  <td className="py-2.5 pr-4 text-right"><span className={badge(t.status)}>{t.status}</span></td>
                  <td className="py-2.5 text-right text-slate-400">{t.processing_time || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
            {health?.services ? Object.entries(health.services as Record<string, any>).map(([name, svc]: [string, any]) => (
              <div key={name} className="flex items-center justify-between bg-[#0b0f19] rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", svc.status === 'healthy' || svc.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500')} />
                  <span className="text-slate-200 text-xs capitalize">{name}</span>
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

  // 自动轮播（仅 manual=false 时有效）
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

  // 扩充到9个全球节点，更丰富
  const cockpitNodes = Array.isArray(cockpit.nodes) && cockpit.nodes.length > 0 ? cockpit.nodes : [
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

  // 增强拓扑图：更丰富的视觉效果
  const worldChart = {
    _nodes: cockpitNodes,
    option: {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: (p: any) => { const d = p.data; return `<b>${d.name || ''}</b><br/>${d.metric || d.status || ''}<br/>${d.city || ''}`; } },
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: { show: false, min: 0, max: 740 },
      yAxis: { show: false, min: 0, max: 380, inverse: true },
      graphic: [
        { type: 'circle', left: 'center', top: 'middle', shape: { r: 155 }, style: { fill: 'rgba(14, 165, 233, 0.04)', stroke: 'rgba(56, 189, 248, 0.25)', lineWidth: 1.5 } },
        { type: 'circle', left: 'center', top: 'middle', shape: { r: 110 }, style: { fill: 'transparent', stroke: 'rgba(99, 102, 241, 0.15)', lineWidth: 1 } },
        { type: 'circle', left: 'center', top: 'middle', shape: { r: 60 }, style: { fill: 'rgba(99, 102, 241, 0.05)', stroke: 'rgba(99, 102, 241, 0.1)', lineWidth: 0.5 } },
        { type: 'text', left: 'center', top: 'middle', style: { text: 'CulCloud\nGlobal', fill: 'rgba(226,232,240,0.4)', font: '700 13px Inter', align: 'center' } },
      ],
      series: [
        {
          type: 'lines', coordinateSystem: 'cartesian2d', zlevel: 2,
          effect: { show: true, period: 4, trailLength: 0.4, symbol: 'arrow', symbolSize: 4, color: '#38bdf8' },
          lineStyle: { color: '#38bdf8', width: 0.6, opacity: 0.3, curveness: 0.3 },
          data: cockpitLinks.map((link: any) => {
            const s: any = nodeByName.get(link.source);
            const t: any = nodeByName.get(link.target);
            return s && t ? { coords: [s.coord, t.coord] } : null;
          }).filter(Boolean),
        },
        {
          type: 'effectScatter', coordinateSystem: 'cartesian2d', zlevel: 3,
          rippleEffect: { brushType: 'stroke', scale: 2.5 },
          symbolSize: (val: any) => val?.[2] || 12,
          label: { show: true, position: 'bottom', color: '#cbd5e1', fontSize: 7, fontWeight: 'bold', formatter: '{b}' },
          itemStyle: { color: '#38bdf8', shadowBlur: 15, shadowColor: '#38bdf8' },
          data: cockpitNodes.map((n: any) => ({ ...n, value: [n.coord?.[0] ?? 370, n.coord?.[1] ?? 190, n.id === 'spark' ? 18 : 10] })),
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
          <h1 className="text-base font-black text-slate-100 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-primary" />
            CulCloud 大数据指挥舱
          </h1>
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

        {/* 轮播指示器（始终可见） */}
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
        <SystemMonitorModal health={health} />
      </LargeModal>
      <LargeModal open={showCluster} title="集群状态" icon={Monitor} onClose={() => setShowCluster(false)}>
        <ClusterMonitorModal />
      </LargeModal>
      <NodeDetailModal node={nodeModal} onClose={() => setNodeModal(null)} health={health} />
    </div>
  );
}
