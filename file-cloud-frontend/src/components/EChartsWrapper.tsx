import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current = echarts.init(containerRef.current, theme === 'dark' ? 'dark' : undefined);

    const handleResize = () => chartRef.current?.resize();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => chartRef.current?.resize());
    observer.observe(containerRef.current);

    if (option) {
      chartRef.current?.setOption(option);
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
      chartRef.current?.setOption(option, { notMerge: true });
    }
  }, [option, loading]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%', aspectRatio: '4 / 3', ...style }}
    />
  );
}
