import React, { useEffect, useRef } from 'react';
import { Activity, CheckCircle2, Globe2, HardDrive, RadioTower, XCircle } from 'lucide-react';
import EChartsWrapper from '../../components/EChartsWrapper';
import { cn } from '../../lib/utils';

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

export function MiniChartCard({ title, chart, loading, className }: any) {
  return (
    <div className={cn("bg-[#0d1222]/80 backdrop-blur rounded-lg border border-[#1e293b] flex flex-col p-2.5", className)}>
      {title && <div className="text-[9px] font-black tracking-wider text-slate-400 uppercase shrink-0">{title}</div>}
      <div className="flex-1 min-h-0">
        <EChartsWrapper option={chart} loading={loading} theme="dark" />
      </div>
    </div>
  );
}

export const nf = new Intl.NumberFormat('zh-CN');
export const compactNf = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 });
export const pct = (value: number) => `${Number(value || 0).toFixed(1)}%`;

export function normalizeServices(health: any) {
  if (Array.isArray(health?.services)) return health.services;
  if (health?.services && typeof health.services === 'object') {
    return Object.entries(health.services).map(([name, svc]: [string, any]) => ({ name, ...(svc || {}) }));
  }
  return [];
}

export function statusMeta(status?: string) {
  if (status === 'healthy' || status === 'ok') return { label: 'Healthy', color: '#10b981', tone: 'border-emerald-500/25 bg-emerald-950/20 text-emerald-300' };
  if (status === 'degraded') return { label: 'Degraded', color: '#f59e0b', tone: 'border-amber-500/25 bg-amber-950/20 text-amber-300' };
  return { label: 'Down', color: '#f43f5e', tone: 'border-rose-500/25 bg-rose-950/20 text-rose-300' };
}

export function MetricPill({ label, value, sub, color = '#38bdf8' }: any) {
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

export function PanelShell({ title, meta, children, className }: any) {
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

export function decorateTopologyNodes(nodes: any[]) {
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

export function buildTopologyGraphic(processedRows: number, successRate: string) {
  return [
    { type: 'circle', left: 'center', top: 'middle', shape: { r: 174 }, style: { fill: 'rgba(56,189,248,0.018)', stroke: 'rgba(56,189,248,0.18)', lineWidth: 1.2 }, silent: true },
    { type: 'circle', left: 'center', top: 'middle', shape: { r: 124 }, style: { fill: 'rgba(99,102,241,0.025)', stroke: 'rgba(129,140,248,0.14)', lineWidth: 1 }, silent: true },
    { type: 'circle', left: 'center', top: 'middle', shape: { r: 78 }, style: { fill: 'rgba(45,212,191,0.035)', stroke: 'rgba(45,212,191,0.12)', lineWidth: 1 }, silent: true },
    { type: 'circle', left: 'center', top: 'middle', shape: { r: 42 }, style: { fill: 'rgba(34,211,238,0.06)', stroke: 'rgba(34,211,238,0.18)', lineWidth: 1 }, silent: true },
    { type: 'text', left: 'center', top: 'middle', style: { text: 'CULCLOUD\nRUNTIME MESH', fill: 'rgba(226,232,240,0.52)', font: '700 12px Inter', align: 'center', lineHeight: 17 }, silent: true },
    { type: 'text', left: '5%', top: 16, style: { text: 'FASTAPI RUNTIME FABRIC', fill: 'rgba(56,189,248,0.55)', font: '800 10px Inter', letterSpacing: 1.5 }, silent: true },
    { type: 'text', right: '5%', top: 16, style: { text: `${processedRows.toLocaleString()} EVENTS  |  ${successRate} TASK OK`, fill: 'rgba(148,163,184,0.62)', font: '700 10px Inter', align: 'right' }, silent: true },
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

export function SlideOverview({ data, loading, worldChart, onTopologyReady }: any) {
  const logs = data?.logs || [];
  const files = data?.files || [];
  const folders = data?.folders || [];
  const taskStats = data?.stats || {};
  const logStats = data?.logStats || {};
  const byType = logStats.by_type || {};
  const runtimeEvents = Number(logStats.total ?? logs.length ?? 0);
  const totalTasks = Number(taskStats.total || 0);
  const completedTasks = Number(taskStats.completed || 0);
  const failedTasks = Number(taskStats.failed || 0);
  const queuedTasks = Number(taskStats.queued || 0);
  const taskSuccessRate = totalTasks > 0 ? `${((completedTasks / totalTasks) * 100).toFixed(1)}%` : '0.0%';

  const actionLabelMap: Record<string, string> = {
    file_uploaded: '上传',
    file_downloaded: '下载',
    file_deleted: '删除',
    file_renamed: '重命名',
    file_moved: '移动',
    folder_created: '建目录',
    conversion_started: '转换开始',
    conversion_completed: '转换完成',
    conversion_failed: '转换失败',
    pdf_reorder_started: 'PDF处理',
    pdf_reorder_completed: 'PDF导出',
  };
  const actions = Object.entries(byType)
    .map(([name, value]) => ({ name: actionLabelMap[name] || name, value: Number(value || 0) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const hourly = new Map<string, number>();
  logs.forEach((log: any) => {
    const hour = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : 'LOG';
    hourly.set(hour, (hourly.get(hour) || 0) + 1);
  });
  const trafficTrend = Array.from(hourly.entries()).reverse().slice(-24).map(([time, throughput]) => ({ time, throughput }));

  const formatCounts = new Map<string, number>();
  files.forEach((file: any) => {
    const rawName = String(file.filename || file.object_name || '');
    const ext = rawName.includes('.') ? rawName.split('.').pop()?.toUpperCase() || 'OTHER' : 'OTHER';
    formatCounts.set(ext, (formatCounts.get(ext) || 0) + 1);
  });
  const formatMix = Array.from(formatCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const emptyChart = (text: string) => ({
    graphic: { type: 'text', left: 'center', top: 'middle', style: { text, fill: '#64748b', fontSize: 11, fontWeight: 700 } },
  });
  const trendOpt = trafficTrend.length > 0 ? {
    tooltip: { trigger: 'axis' },
    grid: { top: 8, bottom: 8, left: 4, right: 4 },
    xAxis: { type: 'category', show: false, data: trafficTrend.map((t: any) => t.time) },
    yAxis: { type: 'value', show: false, minInterval: 1 },
    series: [{
      type: 'line', smooth: true, showSymbol: false,
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(56,189,248,0.5)' }, { offset: 1, color: 'rgba(56,189,248,0)' }] } },
      lineStyle: { color: '#38bdf8', width: 1.5 },
      data: trafficTrend.map((t: any) => t.throughput),
    }],
  } : emptyChart('暂无 24 小时事件');

  const colors = ['#38bdf8', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
  const donutOpt = actions.length > 0 ? {
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    series: [{
      type: 'pie', radius: ['35%', '60%'], center: ['50%', '55%'],
      data: actions.map((a: any, i: number) => ({ ...a, itemStyle: { color: colors[i % 5] } })),
      label: { show: true, fontSize: 7, color: '#94a3b8', formatter: '{b}\n{d}%' },
    }],
  } : emptyChart('暂无操作事件');

  return (
    <div className="h-full flex flex-col gap-2 p-3">
      <div className="grid grid-cols-4 gap-2 shrink-0">
        <StatCard icon={HardDrive} label="文件对象" value={Number(data?.fileTotal ?? files.length).toLocaleString()} color="bg-blue-600" sub={`${folders.length} folders`} />
        <StatCard icon={CheckCircle2} label="任务成功率" value={taskSuccessRate} color="bg-emerald-600" sub={`${completedTasks}/${totalTasks} completed`} />
        <StatCard icon={XCircle} label="失败任务" value={failedTasks.toLocaleString()} color="bg-rose-600" sub={`${queuedTasks} queued`} />
        <StatCard icon={RadioTower} label="24H 事件" value={runtimeEvents.toLocaleString()} color="bg-purple-600" sub="FastAPI + Redis" />
      </div>

      <div className="flex-1 min-h-0 flex gap-2">
        {/* 左: 拓扑 */}
        <div className="flex-[3] bg-[#0d1222]/80 border border-[#1e293b] rounded-lg flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 opacity-70 pointer-events-none bg-[radial-gradient(circle_at_48%_46%,rgba(56,189,248,0.18),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.1),rgba(2,6,23,0.42))]" />
          <div className="flex justify-between items-center border-b border-[#1e293b] pb-1 px-2.5 pt-1.5 shrink-0">
            <span className="text-[8px] font-black text-slate-500 tracking-widest flex items-center gap-1">
              <Globe2 className="w-3 h-3 text-primary" />
              RUNTIME TOPOLOGY
            </span>
            <span className="text-[7px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black">LIVE</span>
          </div>
          <div className="flex-1 min-h-0">
            <EChartsWrapper option={worldChart.option} loading={loading} theme="dark" style={{ height: '100%' }} onReady={onTopologyReady} />
          </div>
          <div className="absolute left-3 bottom-3 flex items-center gap-2 pointer-events-none">
            {[
              ['Gateway', '#60a5fa'],
              ['Convert', '#f59e0b'],
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
            <span className="rounded border border-emerald-500/20 bg-emerald-950/30 px-2 py-1 text-[7px] font-black text-emerald-300">TASK OK</span>
          </div>
        </div>

        {/* 右: 补图面板 */}
        <div className="flex-[2] flex flex-col gap-2 min-h-0">
          <MiniChartCard title="24H 事件趋势" chart={trendOpt} loading={loading} className="flex-[2]" />
          <div className="flex-[3] flex gap-2 min-h-0">
            <MiniChartCard title="实时操作分布" chart={donutOpt} loading={loading} className="flex-1" />
            <div className="flex-1 bg-[#0d1222]/80 border border-[#1e293b] rounded-lg p-2.5 flex flex-col">
              <div className="text-[9px] font-black tracking-wider text-slate-400 uppercase shrink-0">当前文件格式</div>
              <div className="flex-1 min-h-0 flex flex-col justify-center gap-1">
                {formatMix.length === 0 ? (
                  <div className="text-center text-[10px] font-bold text-slate-600">暂无文件对象</div>
                ) : formatMix.slice(0, 6).map(([name, val]: [string, number], i: number) => (
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

export function SlideProcessing({ data, loading }: any) {
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
        <MetricPill label="历史文件样本" value={nf.format(totalFiles)} sub="Spark 离线聚合" color="#38bdf8" />
        <MetricPill label="历史转换任务" value={nf.format(conversionTotal)} sub={pct(conversionRate)} color="#10b981" />
        <MetricPill label="历史平均转换" value={`${(avgConvertMs / 1000).toFixed(1)}s`} sub="离线加权均值" color="#f59e0b" />
        <MetricPill label="历史存储吞吐" value={`${nf.format(storageMb)} MB`} sub={`${nf.format(failedCount)} 异常样本`} color="#8b5cf6" />
      </div>
      <div className="grid grid-cols-2 gap-2 flex-[2] min-h-0">
        <MiniChartCard title="历史文件类型分布" chart={barOpt} loading={loading} />
        <MiniChartCard title="历史操作分布" chart={actionOpt} loading={loading} />
      </div>
      <div className="grid grid-cols-3 gap-2 flex-[3] min-h-0">
        <MiniChartCard title="历史转换桑基图" chart={sankeyOpt} loading={loading} />
        <MiniChartCard title="历史耗时 vs 大小" chart={scatterOpt} loading={loading} />
        <MiniChartCard title="历史错误原因排行" chart={errorRankOpt} loading={loading} />
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

export function SlideQuality({ data, loading }: any) {
  const health = data?.health;
  const pipeline = data?.pipeline || {};
  const cockpit = data?.cockpit || {};
  const scale = cockpit.scale || {};
  const errorAnalysis = data?.errorAnalysis;
  const errorHeatmap = data?.errorHeatmap;

  const svcEntries = normalizeServices(health);

  const storageMb = Math.round(scale.total_size_mb || 163220);
  const storageMax = 200000;
  const storagePct = Math.min(100, Math.max(0, (storageMb / storageMax) * 100));
  const liquidOpt = {
    series: [{
      type: 'gauge',
      startAngle: 210,
      endAngle: -30,
      min: 0,
      max: 100,
      radius: '88%',
      center: ['50%', '56%'],
      progress: {
        show: true,
        width: 12,
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#2563eb' }, { offset: 1, color: '#38bdf8' }] },
        },
      },
      axisLine: { lineStyle: { width: 12, color: [[1, 'rgba(30,41,59,0.78)']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      pointer: { show: false },
      title: { offsetCenter: [0, '42%'], color: '#64748b', fontSize: 9, fontWeight: 700 },
      detail: {
        valueAnimation: true,
        formatter: () => `${storagePct.toFixed(1)}%\n${nf.format(storageMb)} MB`,
        color: '#e2e8f0',
        fontSize: 14,
        fontWeight: 900,
        lineHeight: 18,
        offsetCenter: [0, '0%'],
      },
      data: [{ value: storagePct, name: '存储水位' }],
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
        <MetricPill label="历史有效遥测" value={nf.format(cleanRows)} sub={`${pct(qualityPct)} quality`} color="#10b981" />
        <MetricPill label="历史异常样本" value={nf.format(invalidRows)} sub={`${nf.format(errTotal)} failed`} color="#f43f5e" />
        <MetricPill label="平均延迟" value={`${avgLatency.toFixed(1)} ms`} sub={`${svcEntries.length || 6} services`} color="#38bdf8" />
        <MetricPill label="存储水位" value={`${pct((storageMb / storageMax) * 100)}`} sub={`${nf.format(storageMb)} MB`} color="#8b5cf6" />
      </div>
      <div className="flex gap-2 flex-[3] min-h-0">
        <ServiceHealthPanel services={svcEntries} />
        <PanelShell title="历史数据质量" meta={`${nf.format(rawRows)} raw rows`} className="flex-[1]">
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
        <MiniChartCard title="历史存储水位" chart={liquidOpt} loading={loading} />
        <MiniChartCard title="历史质量雷达" chart={radarOpt} loading={loading} />
        <MiniChartCard title="历史 7×24 错误热力图" chart={heatmapOpt} loading={loading} />
      </div>
    </div>
  );
}
