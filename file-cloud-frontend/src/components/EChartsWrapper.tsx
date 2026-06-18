import React, { useEffect, useRef, useState } from 'react';
import { echarts } from '../lib/echarts-setup';

interface EChartsProps {
  option: any;
  style?: React.CSSProperties;
  className?: string;
  loading?: boolean;
  theme?: 'dark' | 'light';
  onReady?: (chart: any) => void;
}

export default function EChartsWrapper({ option, style, className, loading, theme, onReady }: EChartsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current = echarts.init(containerRef.current, theme === 'dark' ? 'dark' : undefined);

    const handleResize = () => chartRef.current?.resize();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => chartRef.current?.resize());
    observer.observe(containerRef.current);

    try {
      if (option) {
        chartRef.current?.setOption(option);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
      console.error('[EChartsWrapper init]', e);
    }

    if (onReady) {
      onReady(chartRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [theme, onReady]);

  useEffect(() => {
    if (!chartRef.current) return;
    if (loading) {
      chartRef.current?.showLoading();
    } else {
      chartRef.current?.hideLoading();
      try {
        chartRef.current?.setOption(option, { notMerge: true });
        setError(null);
      } catch (e: any) {
        setError(e?.message || String(e));
        console.error('[EChartsWrapper setOption]', e);
      }
    }
  }, [option, loading]);

  if (error) {
    return (
      <div className={className} style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative', ...style }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', textAlign: 'center', padding: '12px' }}>
          <div style={{ maxWidth: 260 }}>
            <div style={{ color: '#f87171', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>图表暂不可用</div>
            <div style={{ color: '#64748b', fontSize: 10, lineHeight: 1.5 }}>
              当前聚合数据无法直接渲染，系统已保留页面其它指标。
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%', overflow: 'hidden', ...style }}
    />
  );
}
