import React, { useEffect, useRef } from 'react';
import { echarts } from '../lib/echarts-setup';

interface EChartsProps {
  option: any;
  style?: React.CSSProperties;
  className?: string;
  loading?: boolean;
}

export default function EChartsWrapper({ option, style, className, loading }: EChartsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current = echarts.init(containerRef.current);

    const handleResize = () => chartRef.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
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
      style={{ width: '100%', height: '320px', ...style }}
    />
  );
}
