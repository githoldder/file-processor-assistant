import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Monitor, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useDashboard } from '../context/useDashboard';
import { useLanguage } from '../context/LanguageContext';
import { AnalyticsTopbar } from './analytics/AnalyticsTopbar';
import { LargeModal, SystemMonitorModal, ClusterMonitorModal, NodeDetailModal } from './analytics/AnalyticsModals';
import { SlideOverview, SlideProcessing, SlideQuality, buildTopologyGraphic, decorateTopologyNodes } from './analytics/AnalyticsSlides';

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
  const { lang } = useLanguage();

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden select-none bg-[#0b0f19]">
      <AnalyticsTopbar
        isManual={isManual}
        loading={loading}
        lang={lang}
        onShowSystem={() => setShowSystem(true)}
        onShowCluster={() => setShowCluster(true)}
        onRefresh={refresh}
        onExit={toggleCockpit}
      />

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
