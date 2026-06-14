import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, ShoppingCart, Clock, TrendingUp, Activity,
  BarChart3, PieChart, RefreshCw, Database, AlertTriangle,
  Filter, FileText, DollarSign,
} from 'lucide-react';
import { motion } from 'motion/react';
import EChartsWrapper from '../components/EChartsWrapper';
import { cn } from '../lib/utils';

const API_BASE = import.meta.env.VITE_ANALYTICS_API || 'http://localhost:5050';

// ==================== 数据获取 Hook ====================

function useDashboard(dataset: 'ub' | 'sales' | 'pipeline') {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (dataset === 'pipeline') {
        const [dash, pipeline, quality] = await Promise.all([
          fetch(`${API_BASE}/api/analytics/dashboard?dataset=ub`).then(r => r.json()),
          fetch(`${API_BASE}/api/analytics/pipeline-info`).then(r => r.json()),
          fetch(`${API_BASE}/api/analytics/quality-report`).then(r => r.json()),
        ]);
        setData({
          dashboard: dash.ok ? dash.data : null,
          pipeline: pipeline.ok ? pipeline.pipeline : null,
          quality: quality.ok ? quality.data : null,
        });
      } else {
        const res = await fetch(`${API_BASE}/api/analytics/dashboard?dataset=${dataset}`);
        const json = await res.json();
        if (json.ok) setData(json.data);
        else setError(json.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dataset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

// ==================== 通用组件 ====================

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/60 backdrop-blur rounded-xl p-4 border border-white/20 flex items-center gap-3"
    >
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <div className="text-slate-500 text-[11px] font-semibold tracking-wide">{label}</div>
        <div className="text-xl font-bold text-slate-800">{value}</div>
        {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
      </div>
    </motion.div>
  );
}

function ChartCard({ title, chart, loading, className }: any) {
  return (
    <div className={cn("bg-white/60 backdrop-blur rounded-xl p-4 border border-white/20", className)}>
      <EChartsWrapper option={chart} loading={loading} />
    </div>
  );
}

function DataTable({ columns, rows, loading, maxRows = 20 }: any) {
  const [page, setPage] = useState(0);
  const perPage = 10;
  if (!rows && !loading) return null;
  const data = rows || [];
  const totalPages = Math.ceil(data.length / perPage);
  const pageData = data.slice(page * perPage, (page + 1) * perPage);

  return (
    <div className="bg-white/60 backdrop-blur rounded-xl p-4 border border-white/20">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-bold text-slate-700">📋 数据详情</div>
        {loading && <span className="text-[11px] text-slate-400 animate-pulse">加载中...</span>}
      </div>
      {data.length === 0 && !loading ? (
        <div className="text-center text-slate-400 py-8">暂无数据</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-slate-400 border-b">
                  {columns.map((col: any, i: number) => (
                    <th key={i} className={cn("py-1.5", col.right ? "text-right" : "text-left")}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((row: any, ri: number) => {
                  const gi = page * perPage + ri + 1;
                  return (
                    <tr key={gi} className="border-b border-slate-100 hover:bg-slate-50">
                      {columns.map((col: any, ci: number) => (
                        <td key={ci} className={cn("py-1.5 truncate max-w-[200px] text-slate-600", col.right ? "text-right font-mono" : "")}>
                          {col.render ? col.render(row, gi) : row[col.key] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30"
              >
                上一页
              </button>
              <span className="text-[11px] text-slate-400">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ==================== 数据质量报告 ====================

function DataQualityReport({ data }: any) {
  if (!data) return null;
  const datasets = Object.entries(data).filter(([k]) => k.includes('raw'));
  return (
    <div className="bg-white/60 backdrop-blur rounded-xl p-4 border border-white/20">
      <div className="text-[13px] font-bold text-slate-700 mb-3">
        <FileText className="w-4 h-4 inline mr-1" />
        数据质量报告
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {datasets.map(([name, info]: any) => (
          <div key={name} className="bg-slate-50 rounded-lg p-3">
            <div className="font-semibold text-slate-600 mb-2 text-[12px]">{name}</div>
            <div className="space-y-1 text-[11px] text-slate-500">
              <div className="flex justify-between"><span>总行数</span><span className="font-mono">{info.total_rows ?? '-'}</span></div>
              <div className="flex justify-between"><span>字段数</span><span className="font-mono">{info.columns ?? '-'}</span></div>
              <div className="flex justify-between"><span>重复行</span><span className="font-mono text-amber-600">{info.duplicate_count ?? 0}</span></div>
              <div className="flex justify-between">
                <span>空值单元格</span>
                <span className="font-mono text-red-500">{info.nulls ?? 0}</span>
              </div>
              {info.null_rate && (
                <div className="mt-2">
                  <div className="text-[10px] text-slate-400 mb-1">各字段空值率:</div>
                  {Object.entries(info.null_rate).slice(0, 6).map(([field, rate]: any) => (
                    <div key={field} className="flex justify-between text-[10px]">
                      <span className="truncate max-w-[120px]">{field}</span>
                      <span className={rate > 0 ? 'text-amber-500' : 'text-green-500'}>{rate}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== User Behavior 视图 ====================

function UserBehaviorView({ data, loading, refresh }: any) {
  const ov = data?.overview || {};

  // 总览卡片
  const cards = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <StatCard icon={Users} label="总事件数" value={ov.total_events?.toLocaleString()} color="bg-blue-500" sub={`${ov.unique_users?.toLocaleString()} 独立用户`} />
      <StatCard icon={Clock} label="平均时长" value={`${ov.avg_duration_sec ?? '-'}s`} color="bg-purple-500" sub={`标准差 ${ov.duration_stddev ?? '-'}s`} />
      <StatCard icon={TrendingUp} label="转化率" value={`${ov.overall_conversion_rate ?? '-'}%`} color="bg-emerald-500" />
      <StatCard icon={Activity} label="独立会话" value={ov.unique_sessions?.toLocaleString()} color="bg-amber-500" />
    </div>
  );

  // 事件类型分布 - 柱状图
  const eventTypes = (data?.event_types || [])
    .map((d: any) => ({ name: d.event_type, count: d.count, avg: d.avg_duration_sec }));
  const etBar = {
    title: { text: '事件类型分布', left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].name}<br/>数量: ${p[0].value}<br/>平均时长: ${eventTypes[p[0].dataIndex]?.avg ?? '-'}s` },
    xAxis: { type: 'category', data: eventTypes.map((d: any) => d.name), axisLabel: { fontSize: 10, rotate: 15 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: eventTypes.map((d: any) => d.count), itemStyle: { borderRadius: [4,4,0,0], color: '#6366f1' } }],
  };

  // 设备分布 - 饼图
  const devices = (data?.devices || []).map((d: any) => ({ name: d.device_type, value: d.count }));
  const devicePie = {
    title: { text: '设备分布', left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { fontSize: 10 } },
    series: [{ type: 'pie', radius: ['40%', '70%'], center: ['50%', '50%'], data: devices, label: { fontSize: 10 } }],
  };

  // 时段分布 - 饼图
  const periods = (data?.time_periods || []).map((d: any) => ({ name: d.time_period, value: d.count }));
  const periodPie = {
    title: { text: '时段分布', left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { fontSize: 10 } },
    series: [{ type: 'pie', radius: ['30%', '60%'], data: periods, label: { fontSize: 10 } }],
  };

  // 日趋势 - 折线图
  const trend = data?.daily_trend || [];
  const dailyLine = {
    title: { text: '每日访问趋势', left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 10 } },
    xAxis: { type: 'category', data: trend.map((d: any) => d.event_date), axisLabel: { fontSize: 9, rotate: 30 } },
    yAxis: [{ type: 'value', name: '事件数' }, { type: 'value', name: '用户数', splitLine: { show: false } }],
    series: [
      { name: '事件数', type: 'line', data: trend.map((d: any) => d.event_count), smooth: true, symbol: 'none' },
      { name: '用户数', type: 'line', yAxisIndex: 1, data: trend.map((d: any) => d.unique_users), smooth: true, symbol: 'none', lineStyle: { type: 'dashed' } },
    ],
  };

  // 时长分桶 - 柱状图
  const durBuckets = (data?.duration_buckets || []).map((d: any) => ({ name: d.duration_bucket, value: d.count }));
  const durBar = {
    title: { text: '时长分布', left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: durBuckets.map((d: any) => d.name) },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: durBuckets.map((d: any) => d.value), itemStyle: { borderRadius: [4,4,0,0], color: '#f59e0b' } }],
  };

  // 来源渠道 - 柱状图
  const refs = (data?.referrers || []).slice(0, 10).map((d: any) => ({ name: d.referrer_source, value: d.count }));
  const refBar = {
    title: { text: '来源渠道', left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: refs.map((d: any) => d.name), axisLabel: { fontSize: 10, rotate: 20 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: refs.map((d: any) => d.value), itemStyle: { borderRadius: [4,4,0,0], color: '#10b981' } }],
  };

  // 页面排名 - 表格
  const topPages = data?.top_pages || [];

  // 数据表格
  const sampleCols = [
    { label: '用户', key: 'user_id' },
    { label: '时间', key: 'event_time', render: (r: any) => r.event_time?.slice(5, 16) ?? '-' },
    { label: '类型', key: 'event_type' },
    { label: '页面', key: 'page_url' },
    { label: '时长', key: 'duration_sec', right: true, render: (r: any) => `${r.duration_sec ?? '-'}s` },
    { label: '设备', key: 'device_type' },
    { label: '来源', key: 'referrer_source' },
  ];

  return (
    <div className="space-y-4">
      {cards}

      {/* 错误/空状态 */}
      {!data && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-[12px] text-center">
          <AlertTriangle className="w-5 h-5 inline mr-1" />
          无法加载数据，请确认 PySpark 管线已运行
        </div>
      )}

      {/* Row 1: 事件类型 + 设备 */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title="事件类型" chart={etBar} loading={loading} />
        <ChartCard title="设备分布" chart={devicePie} loading={loading} />
      </div>

      {/* Row 2: 日趋势 */}
      <ChartCard title="每日趋势" chart={dailyLine} loading={loading} />

      {/* Row 3: 时段 + 时长 + 来源 */}
      <div className="grid md:grid-cols-3 gap-4">
        <ChartCard title="时段" chart={periodPie} loading={loading} />
        <ChartCard title="时长分布" chart={durBar} loading={loading} />
        <ChartCard title="来源渠道" chart={refBar} loading={loading} />
      </div>

      {/* Row 4: 页面排名 */}
      <DataTable
        columns={[
          { label: '#', render: (_: any, i: number) => i },
          { label: '页面', key: 'page_url' },
          { label: '访问量', key: 'visit_count', right: true },
          { label: '独立访客', key: 'unique_visitors', right: true },
        ]}
        rows={topPages}
        loading={loading}
      />

      {/* Row 5: 数据详情 */}
      <DataTable columns={sampleCols} rows={data?.sample || []} loading={loading} />
    </div>
  );
}

// ==================== Sales 视图 ====================

function SalesView({ data, loading }: any) {
  const ov = data?.overview || {};

  const cards = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <StatCard icon={ShoppingCart} label="总订单数" value={ov.total_orders?.toLocaleString()} color="bg-blue-500" sub={`¥${(ov.total_revenue ?? 0).toLocaleString()}`} />
      <StatCard icon={DollarSign} label="平均订单额" value={`¥${(ov.avg_order_amount ?? 0).toFixed(2)}`} color="bg-emerald-500" sub={`最高 ¥${(ov.max_order_amount ?? 0).toFixed(2)}`} />
      <StatCard icon={Users} label="客户平均年龄" value={`${ov.avg_customer_age ?? '-'}岁`} color="bg-purple-500" />
      <StatCard icon={FileText} label="商品种类" value={ov.unique_products ?? '-'} color="bg-amber-500" sub={`覆盖 ${ov.region_count ?? '-'} 个地区`} />
    </div>
  );

  // 品类销售 - 柱状图
  const cats = (data?.categories || []).map((d: any) => ({ name: d.category, sales: d.total_sales, orders: d.order_count }));
  const catBar = {
    title: { text: '品类销售额', left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].name}<br/>销售额: ¥${(cats[p[0].dataIndex]?.sales ?? 0).toLocaleString()}<br/>订单数: ${cats[p[0].dataIndex]?.orders ?? 0}` },
    xAxis: { type: 'category', data: cats.map((d: any) => d.name), axisLabel: { fontSize: 10, rotate: 15 } },
    yAxis: { type: 'value', name: '¥', axisLabel: { formatter: (v: number) => v >= 10000 ? `${(v/10000).toFixed(0)}万` : v.toFixed(0) } },
    series: [{ type: 'bar', data: cats.map((d: any) => d.sales), itemStyle: { borderRadius: [4,4,0,0], color: '#6366f1' } }],
  };

  // 月度趋势 - 折线图
  const monthly = (data?.monthly_trend || []).map((d: any) => ({
    label: `${d.order_year}-${String(d.order_month).padStart(2, '0')}`,
    sales: d.monthly_sales,
    orders: d.order_count,
  }));
  const monthlyLine = {
    title: { text: '月度销售趋势', left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 10 } },
    xAxis: { type: 'category', data: monthly.map((d: any) => d.label), axisLabel: { fontSize: 9, rotate: 30 } },
    yAxis: [{ type: 'value', name: '¥' }, { type: 'value', name: '订单数', splitLine: { show: false } }],
    series: [
      { name: '销售额', type: 'line', data: monthly.map((d: any) => d.sales), smooth: true, symbol: 'none',
        areaStyle: { opacity: 0.15 } },
      { name: '订单数', type: 'line', yAxisIndex: 1, data: monthly.map((d: any) => d.orders), smooth: true, symbol: 'none',
        lineStyle: { type: 'dashed' } },
    ],
  };

  // 支付方式 - 饼图
  const payments = (data?.payments || []).map((d: any) => ({ name: d.payment_method, value: d.total_sales }));
  const paymentPie = {
    title: { text: '支付方式销售额占比', left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}<br/>¥${Number(p.value).toLocaleString()} (${p.percent}%)` },
    legend: { bottom: 0, textStyle: { fontSize: 10 } },
    series: [{ type: 'pie', radius: ['35%', '65%'], data: payments, label: { fontSize: 10 } }],
  };

  // 地域销售 - 柱状图
  const regions = (data?.regions || []).map((d: any) => ({ name: d.customer_region, sales: d.total_sales }));
  const regionBar = {
    title: { text: '地域销售分布', left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: regions.map((d: any) => d.name), axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', name: '¥' },
    series: [{ type: 'bar', data: regions.map((d: any) => d.sales), itemStyle: { borderRadius: [4,4,0,0], color: '#10b981' } }],
  };

  // 订单状态 - 饼图
  const statusData = (data?.order_status || []).map((d: any) => ({ name: d.order_status, value: d.count }));
  const statusPie = {
    title: { text: '订单状态分布', left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} 单 ({d}%)' },
    legend: { bottom: 0, textStyle: { fontSize: 10 } },
    series: [{ type: 'pie', radius: ['35%', '65%'], data: statusData, label: { fontSize: 10 } }],
  };

  // Top 产品
  const topProducts = (data?.top_products || []).slice(0, 10);

  // 数据表格
  const sampleCols = [
    { label: '订单号', key: 'order_id' },
    { label: '商品', key: 'product_name' },
    { label: '品类', key: 'category' },
    { label: '金额', key: 'total_amount', right: true, render: (r: any) => `¥${(r.total_amount ?? 0).toFixed(2)}` },
    { label: '数量', key: 'quantity', right: true },
    { label: '地区', key: 'customer_region' },
    { label: '状态', key: 'order_status' },
  ];

  return (
    <div className="space-y-4">
      {cards}

      {!data && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-[12px] text-center">
          无法加载数据，请确认 PySpark 管线已运行
        </div>
      )}

      {/* Row 1: 品类 + 支付 */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard chart={catBar} loading={loading} />
        <ChartCard chart={paymentPie} loading={loading} />
      </div>

      {/* Row 2: 月度趋势 */}
      <ChartCard chart={monthlyLine} loading={loading} />

      {/* Row 3: 地域 + 状态 */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard chart={regionBar} loading={loading} />
        <ChartCard chart={statusPie} loading={loading} />
      </div>

      {/* Row 4: 热销商品 */}
      <DataTable
        columns={[
          { label: '#', render: (_: any, i: number) => i },
          { label: '商品', key: 'product_name' },
          { label: '品类', key: 'category' },
          { label: '销量', key: 'total_quantity', right: true },
          { label: '销售额', key: 'total_sales', right: true, render: (r: any) => `¥${(r.total_sales ?? 0).toLocaleString()}` },
        ]}
        rows={topProducts}
        loading={loading}
      />

      {/* Row 5: 数据详情 */}
      <DataTable columns={sampleCols} rows={data?.sample || []} loading={loading} />
    </div>
  );
}

// ==================== Pipeline 信息视图 ====================

function PipelineView({ data, loading }: any) {
  if (!data && loading) return <div className="text-center text-slate-400 py-8">加载中...</div>;
  if (!data && !loading) return <div className="text-center text-slate-400 py-8">暂无管线信息</div>;

  const { pipeline, quality, dashboard } = data || {};
  const ubOv = dashboard?.overview || {};

  return (
    <div className="space-y-4">
      {/* Spark 概要 */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-100">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-5 h-5 text-indigo-600" />
          <span className="font-bold text-indigo-800">PySpark 预处理管线</span>
        </div>
        <div className="text-[11px] text-slate-500 space-y-1">
          <div>引擎: <span className="font-mono">{pipeline?.framework ?? '-'}</span></div>
          <div>模式: <span className="font-mono">{pipeline?.mode ?? '-'}</span></div>
        </div>
      </div>

      {/* 处理结果 */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white/60 rounded-xl p-4 border border-white/20">
          <div className="text-[13px] font-bold text-slate-700 mb-3">👤 用户行为</div>
          <div className="space-y-1.5 text-[11px] text-slate-500">
            <div className="flex justify-between"><span>原始行数</span><span className="font-mono">{pipeline?.user_behavior?.raw_rows ?? '-'}</span></div>
            <div className="flex justify-between"><span>清洗后</span><span className="font-mono text-green-600">{pipeline?.user_behavior?.cleaned_rows ?? '-'}</span></div>
            <div className="flex justify-between"><span>重复行</span><span className="font-mono">{pipeline?.user_behavior?.duplicates_found ?? '-'}</span></div>
            <div className="flex justify-between"><span>空值单元格</span><span className="font-mono text-amber-500">{pipeline?.user_behavior?.null_cells_total ?? '-'}</span></div>
            <div className="flex justify-between"><span>独立用户</span><span className="font-mono">{pipeline?.user_behavior?.unique_users ?? ubOv.unique_users ?? '-'}</span></div>
            <div className="flex justify-between"><span>转化率</span><span className="font-mono">{pipeline?.user_behavior?.conversion_rate ?? '-'}</span></div>
          </div>
        </div>
        <div className="bg-white/60 rounded-xl p-4 border border-white/20">
          <div className="text-[13px] font-bold text-slate-700 mb-3">🛒 销售数据</div>
          <div className="space-y-1.5 text-[11px] text-slate-500">
            <div className="flex justify-between"><span>原始行数</span><span className="font-mono">{pipeline?.sales_orders?.raw_rows ?? '-'}</span></div>
            <div className="flex justify-between"><span>清洗后</span><span className="font-mono text-green-600">{pipeline?.sales_orders?.cleaned_rows ?? '-'}</span></div>
            <div className="flex justify-between"><span>重复行</span><span className="font-mono">{pipeline?.sales_orders?.duplicates_found ?? '-'}</span></div>
            <div className="flex justify-between"><span>空值单元格</span><span className="font-mono text-amber-500">{pipeline?.sales_orders?.null_cells_total ?? '-'}</span></div>
            <div className="flex justify-between"><span>总营收</span><span className="font-mono">{pipeline?.sales_orders?.total_revenue ?? '-'}</span></div>
          </div>
        </div>
      </div>

      {/* Pipeline 阶段 */}
      <div className="bg-white/60 rounded-xl p-4 border border-white/20">
        <div className="text-[13px] font-bold text-slate-700 mb-3">
          <Activity className="w-4 h-4 inline mr-1" />
          管线阶段
        </div>
        <div className="space-y-2">
          {(pipeline?.pipeline_stages || []).map((stage: string, i: number) => (
            <div key={i} className={cn(
              "flex items-center gap-3 p-2 rounded-lg text-[11px]",
              i < 3 ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
            )}>
              <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center font-bold text-[10px]">
                {i + 1}
              </span>
              <span>{stage}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 数据质量报告 */}
      {quality && <DataQualityReport data={quality} />}

      {/* 免责说明 */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-[11px] text-amber-700">
        <AlertTriangle className="w-4 h-4 inline mr-1" />
        本系统使用 Spark local[*] 模式在本地单机运行，模拟分布式计算流程。
        实际生产中可部署为 Spark Standalone / YARN / Kubernetes 集群以处理更大数据量。
      </div>
    </div>
  );
}

// ==================== 主页面 ====================

const TABS = [
  { key: 'ub', label: '👤 用户行为', icon: Users },
  { key: 'sales', label: '🛒 销售数据', icon: ShoppingCart },
  { key: 'pipeline', label: '⚙️ 处理管线', icon: Database },
];

export default function Analytics() {
  const [tab, setTab] = useState('ub');
  const ub = useDashboard('ub');
  const sales = useDashboard('sales');
  const pipeline = useDashboard('pipeline');

  const loading = tab === 'pipeline' ? pipeline.loading : tab === 'sales' ? sales.loading : ub.loading;

  const handleRefresh = () => {
    ub.refresh();
    sales.refresh();
    pipeline.refresh();
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            <BarChart3 className="w-6 h-6 inline mr-2 text-indigo-500" />
            数据分析大屏
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Spark 分布式计算 → Flask API → ECharts 可视化
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            刷新
          </button>
        </div>
      </div>

      {/* 数据集切换 */}
      <div className="flex gap-1 bg-slate-100/80 rounded-xl p-1 text-[12px]">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold transition-all",
              tab === t.key
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      {tab === 'ub' && <UserBehaviorView data={ub.data} loading={ub.loading} refresh={ub.refresh} />}
      {tab === 'sales' && <SalesView data={sales.data} loading={sales.loading} />}
      {tab === 'pipeline' && <PipelineView data={pipeline.data} loading={pipeline.loading} />}
    </div>
  );
}
