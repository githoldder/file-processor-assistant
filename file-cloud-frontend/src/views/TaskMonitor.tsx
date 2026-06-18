/**
 * TaskMonitor.tsx — Sprint-01 任务监控面板
 *
 * 从后端 /api/v1/tasks/* 实时拉取任务列表、队列状态、集群概览。
 * 支持分页、状态过滤、自动刷新。
 */

import { useState, useEffect, useCallback } from "react";
import {
  listTasks,
  getQueueLength,
  getClusterOverview,
  getRecentFailures,
  type TaskItem,
} from "../services/api";

const POLL_INTERVAL_MS = 5000;
const PAGE_SIZE = 20;

function statusBadge(s: string) {
  const map: Record<string, string> = {
    pending: "bg-slate-800 text-slate-400",
    queued: "bg-amber-900/30 text-amber-400",
    processing: "bg-blue-900/30 text-blue-400",
    success: "bg-emerald-900/30 text-emerald-400",
    failed: "bg-rose-900/30 text-rose-400",
  };
  return `px-2 py-0.5 text-xs rounded-full font-medium ${map[s] || map.pending}`;
}

export default function TaskMonitor() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [queueLen, setQueueLen] = useState<number | null>(null);
  const [cluster, setCluster] = useState<any>(null);
  const [failures, setFailures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const params: any = { offset, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      if (kindFilter) params.kind = kindFilter;
      const res = await listTasks(params);
      setTasks(res.items);
      setTotal(res.total);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [offset, statusFilter, kindFilter]);

  const fetchSidebar = useCallback(async () => {
    try {
      const [ql, co, rf] = await Promise.all([
        getQueueLength(),
        getClusterOverview(),
        getRecentFailures(5),
      ]);
      setQueueLen(ql.length);
      setCluster(co.overview || co);
      setFailures(rf.tasks || []);
    } catch {
      // sidebar data is non-critical
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchTasks().finally(() => setLoading(false));
  }, [fetchTasks]);

  useEffect(() => {
    fetchSidebar();
    const timer = setInterval(() => {
      fetchTasks();
      fetchSidebar();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchTasks, fetchSidebar]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">任务监控</h1>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="px-2 py-1 rounded bg-[#12182d] border border-[#1e293b]">
            队列: {queueLen ?? "—"}
          </span>
          <span className="px-2 py-1 rounded bg-[#12182d] border border-[#1e293b]">
            节点: {cluster?.active_workers ?? cluster?.workers ?? "—"}
          </span>
        </div>
      </div>

      {/* 过滤栏 */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
          className="bg-[#12182d] border border-[#1e293b] rounded px-3 py-1.5 text-sm text-slate-200"
        >
          <option value="">全部状态</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={kindFilter}
          onChange={(e) => { setKindFilter(e.target.value); setOffset(0); }}
          className="bg-[#12182d] border border-[#1e293b] rounded px-3 py-1.5 text-sm text-slate-200"
        >
          <option value="">全部类型</option>
          <option value="conversion">Conversion</option>
          <option value="spark">Spark Job</option>
        </select>
        <button
          onClick={() => { void fetchTasks(); void fetchSidebar(); }}
          className="ml-auto px-4 py-1.5 text-sm border border-[#1e293b] rounded hover:bg-[#12182d] text-slate-300"
        >
          刷新
        </button>
      </div>

      {/* 最近失败 */}
      {failures.length > 0 && (
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-4">
          <h3 className="font-semibold text-rose-400 mb-2">
            最近失败 ({failures.length})
          </h3>
          <ul className="text-sm text-rose-300 space-y-1">
            {failures.map((f: any, i: number) => (
              <li key={i}>
                <span className="font-mono">{f.task_id?.slice(0, 8)}</span>
                {" — "}{f.error || f.status}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 加载/错误/空状态 */}
      {loading && (
        <div className="text-center py-20 text-slate-500">加载中...</div>
      )}
      {error && !loading && (
        <div className="text-center py-20 text-rose-500">
          加载失败: {error}
          <br />
          <button
            onClick={() => { void fetchTasks(); }}
            className="mt-2 underline text-primary"
          >
            重试
          </button>
        </div>
      )}
      {!loading && !error && tasks.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          暂无任务记录
        </div>
      )}

      {/* 任务列表 */}
      {!loading && !error && tasks.length > 0 && (
        <>
          <div className="overflow-x-auto bg-[#0d1222]/80 border border-[#1e293b] rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-[#12182d] text-left">
                <tr>
                  <th className="p-3 font-medium text-slate-400">Task ID</th>
                  <th className="p-3 font-medium text-slate-400">类型</th>
                  <th className="p-3 font-medium text-slate-400">状态</th>
                  <th className="p-3 font-medium text-slate-400">创建时间</th>
                  <th className="p-3 font-medium text-slate-400">耗时</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {tasks.map((t) => {
                  const duration =
                    t.started_at && t.completed_at
                      ? (
                          (new Date(t.completed_at).getTime() -
                            new Date(t.started_at).getTime()) /
                          1000
                        ).toFixed(1) + "s"
                      : "—";
                  return (
                    <tr key={t.task_id} className="hover:bg-[#12182d]/50">
                      <td className="p-3 font-mono text-xs text-slate-300">{t.task_id.slice(0, 12)}</td>
                      <td className="p-3 text-slate-300">{t.kind || "—"}</td>
                      <td className="p-3">
                        <span className={statusBadge(t.status)}>{t.status}</span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {t.created_at
                          ? new Date(t.created_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="p-3 text-slate-300">{duration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              共 {total} 条，第 {offset / PAGE_SIZE + 1}/{totalPages} 页
            </span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="px-3 py-1 border border-[#1e293b] rounded disabled:opacity-30 hover:bg-[#12182d] text-slate-300"
              >
                上一页
              </button>
              <button
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="px-3 py-1 border border-[#1e293b] rounded disabled:opacity-30 hover:bg-[#12182d] text-slate-300"
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
