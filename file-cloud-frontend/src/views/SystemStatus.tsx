/**
 * SystemStatus.tsx — Sprint-01 系统健康面板
 *
 * 实时展示后端服务健康状态、集群节点负载、事件日志流。
 * 轮询 /api/v1/system/health + /api/v1/logs/recent + /api/v1/logs/stats。
 */

import { useState, useEffect, useCallback } from "react";
import { useDashboard } from "../context/useDashboard";
import {
  getSystemHealth,
  getLogTimeline,
  getLogStats,
  type HealthStatus,
  type LogEvent,
} from "../services/api";

const POLL_INTERVAL_MS = 5000;

function healthDot(status: string) {
  switch (status) {
    case "healthy":
    case "ok":
      return "🟢";
    case "degraded":
      return "🟡";
    case "down":
    case "unhealthy":
      return "🔴";
    default:
      return "⚪";
  }
}

function relativeTime(ts: string) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return `${Math.round(d)}s ago`;
  if (d < 3600) return `${Math.round(d / 60)}m ago`;
  return `${Math.round(d / 3600)}h ago`;
}

export default function SystemStatus() {
  useDashboard("system-status");

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [logStats, setLogStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchAll = useCallback(async () => {
    try {
      const [h, lt, ls] = await Promise.all([
        getSystemHealth(),
        getLogTimeline(24, undefined, 20),
        getLogStats(24),
      ]);
      setHealth(h);
      setLogs(lt?.events || lt?.items || []);
      setLogStats(ls?.stats || ls);
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  useEffect(() => {
    const timer = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchAll]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">系统状态</h1>
        <span className="text-xs text-gray-400">
          {lastUpdated ? `更新于 ${lastUpdated}` : ""}
        </span>
      </div>

      {/* 加载/错误状态 */}
      {loading && (
        <div className="text-center py-20 text-gray-400">
          正在获取系统状态...
        </div>
      )}
      {error && !loading && (
        <div className="text-center py-20 text-red-500">
          无法连接后端: {error}
          <br />
          <button
            onClick={() => { void fetchAll(); }}
            className="mt-2 underline text-blue-600"
          >
            重试
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* 健康状态网格 */}
          {health && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(health.services || {}).map(([name, svc]: [string, any]) => (
                <div
                  key={name}
                  className="border rounded-lg p-4 flex flex-col gap-1"
                >
                  <div className="flex items-center gap-2">
                    <span>{healthDot(svc.status)}</span>
                    <span className="font-medium text-sm capitalize">
                      {name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{svc.status}</span>
                  <span className="text-xs text-gray-400">
                    {svc.latency_ms != null ? `${svc.latency_ms}ms` : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 事件统计 */}
          {logStats && (
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(logStats).map(([k, v]: [string, any]) => (
                <div
                  key={k}
                  className="border rounded-lg p-4 text-center"
                >
                  <div className="text-2xl font-bold">{v ?? "—"}</div>
                  <div className="text-xs text-gray-500 mt-1 capitalize">
                    {k}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 最近日志事件 */}
          <div>
            <h3 className="font-semibold mb-3">最近事件</h3>
            {logs.length === 0 ? (
              <div className="text-gray-400 text-sm py-8 text-center">
                暂无最近事件
              </div>
            ) : (
              <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                {logs.map((evt, i) => (
                  <div
                    key={i}
                    className="px-4 py-2.5 flex items-start gap-3 text-sm"
                  >
                    <span className="text-xs font-mono text-gray-400 shrink-0 w-16">
                      {evt.timestamp
                        ? new Date(evt.timestamp).toLocaleTimeString()
                        : "—"}
                    </span>
                    <span className="font-medium text-xs shrink-0 w-16">
                      {evt.type}
                    </span>
                    <span className="flex-1">{evt.message}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {evt.timestamp ? relativeTime(evt.timestamp) : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
