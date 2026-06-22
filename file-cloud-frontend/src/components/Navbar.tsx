import React, { useEffect, useState } from 'react';
import { Bell, BarChart3, CheckCircle2, Download, FileUp, FolderOpen, LogOut, Pencil, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useDashboard } from '../context/useDashboard';
import { getQueueLength, getRecentLogs, getTaskStats, LogEvent } from '../services/api';

interface NavbarProps {
  onToggleCockpit: () => void;
}

type NoticeMeta = {
  type: string;
  category: string;
  resource_type: string;
  action: string;
  severity: string;
  titleZh: string;
  titleEn: string;
  labelZh: string;
  labelEn: string;
};

export default function Navbar({ onToggleCockpit }: NavbarProps) {
  const { lang, setLang, t } = useLanguage();
  const { role } = useDashboard();
  const [queueLength, setQueueLength] = useState(0);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('culcloud_read_notifications') || '[]');
    } catch {
      return [];
    }
  });
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<LogEvent | null>(null);

  const markAllRead = () => {
    const allIds = visibleEvents.map((e) => eventId(e));
    setReadIds((prev) => {
      const next = Array.from(new Set([...prev, ...allIds])).slice(-200);
      localStorage.setItem('culcloud_read_notifications', JSON.stringify(next));
      return next;
    });
  };

  const eventMeta = (event: LogEvent): NoticeMeta => {
    let type = event.type;
    const message = event.message || '';

    // Backward compatibility for old Redis logs before folder-specific event types existed.
    if (type === 'file_uploaded' && message.startsWith('创建文件夹')) type = 'folder_created';
    if (type === 'file_uploaded' && message.startsWith('重命名文件夹')) type = 'folder_renamed';
    if (type === 'file_uploaded' && message.startsWith('移动文件')) type = 'file_moved';

    const fallback: NoticeMeta = {
      type,
      category: event.category || 'system',
      resource_type: event.resource_type || event.category || 'system',
      action: event.action || type,
      severity: event.severity || (type.endsWith('_failed') ? 'error' : 'info'),
      titleZh: event.title_zh || type,
      titleEn: event.title_en || type,
      labelZh: '系统',
      labelEn: 'System',
    };
    const table: Record<string, Partial<NoticeMeta>> = {
      file_uploaded: { category: 'file', action: 'uploaded', severity: 'success', titleZh: '文件上传成功', titleEn: 'File uploaded', labelZh: '文件', labelEn: 'File' },
      file_downloaded: { category: 'file', action: 'downloaded', severity: 'info', titleZh: '文件已下载', titleEn: 'File downloaded', labelZh: '文件', labelEn: 'File' },
      file_deleted: { category: 'file', action: 'deleted', severity: 'info', titleZh: '文件已删除', titleEn: 'File deleted', labelZh: '文件', labelEn: 'File' },
      file_renamed: { category: 'file', action: 'renamed', severity: 'info', titleZh: '文件已重命名', titleEn: 'File renamed', labelZh: '文件', labelEn: 'File' },
      file_moved: { category: 'file', action: 'moved', severity: 'info', titleZh: '文件已移动', titleEn: 'File moved', labelZh: '文件', labelEn: 'File' },
      folder_created: { category: 'folder', action: 'created', severity: 'success', titleZh: '文件夹创建成功', titleEn: 'Folder created', labelZh: '文件夹', labelEn: 'Folder' },
      folder_deleted: { category: 'folder', action: 'deleted', severity: 'info', titleZh: '文件夹已删除', titleEn: 'Folder deleted', labelZh: '文件夹', labelEn: 'Folder' },
      folder_renamed: { category: 'folder', action: 'renamed', severity: 'info', titleZh: '文件夹已重命名', titleEn: 'Folder renamed', labelZh: '文件夹', labelEn: 'Folder' },
      conversion_completed: { category: 'conversion', action: 'completed', severity: 'success', titleZh: '文件转换成功', titleEn: 'Conversion completed', labelZh: '转换', labelEn: 'Conversion' },
      conversion_failed: { category: 'conversion', action: 'failed', severity: 'error', titleZh: '文件转换失败', titleEn: 'Conversion failed', labelZh: '转换', labelEn: 'Conversion' },
      pdf_reorder_completed: { category: 'pdf', action: 'exported', severity: 'success', titleZh: 'PDF 导出成功', titleEn: 'PDF exported', labelZh: 'PDF', labelEn: 'PDF' },
      pdf_merge_completed: { category: 'pdf', action: 'merged', severity: 'success', titleZh: 'PDF 合并成功', titleEn: 'PDF merged', labelZh: 'PDF', labelEn: 'PDF' },
      pdf_split_completed: { category: 'pdf', action: 'split', severity: 'success', titleZh: 'PDF 拆分成功', titleEn: 'PDF split', labelZh: 'PDF', labelEn: 'PDF' },
    };
    const mapped = table[type] || {};
    return { ...fallback, ...mapped, type };
  };

  const eventId = (event: LogEvent) => `${event.timestamp}_${eventMeta(event).type}_${event.task_id || event.file_name || event.message}`;
  const visibleEvents = events.filter((event) => [
    'file_uploaded',
    'file_deleted',
    'file_downloaded',
    'file_renamed',
    'file_moved',
    'folder_created',
    'folder_deleted',
    'folder_renamed',
    'conversion_completed',
    'conversion_failed',
    'pdf_reorder_completed',
    'pdf_merge_completed',
    'pdf_split_completed',
  ].includes(eventMeta(event).type));
  const unreadCount = visibleEvents.filter((event) => !readIds.includes(eventId(event))).length;

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const [stats, queue, logs] = await Promise.all([
          getTaskStats().catch(() => null),
          getQueueLength().catch(() => ({ queue_length: 0, length: 0 })),
          getRecentLogs(30).catch(() => ({ events: [], count: 0 })),
        ]);
        if (!alive) return;
        setQueueLength(stats ? (stats.queued || 0) + (stats.processing || 0) : (queue.queue_length ?? queue.length ?? 0));
        setEvents(logs.events || []);
      } catch {
        if (!alive) return;
        setQueueLength(0);
        setEvents([]);
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const markRead = (event: LogEvent) => {
    const id = eventId(event);
    setReadIds((prev) => {
      const next = Array.from(new Set([...prev, id])).slice(-200);
      localStorage.setItem('culcloud_read_notifications', JSON.stringify(next));
      return next;
    });
  };

  const iconFor = (meta: NoticeMeta) => {
    if (meta.severity === 'error') return XCircle;
    if (meta.category === 'folder') return FolderOpen;
    if (meta.action === 'deleted') return Trash2;
    if (meta.action === 'renamed') return Pencil;
    if (meta.action === 'downloaded') return Download;
    if (meta.action === 'uploaded') return FileUp;
    if (meta.severity === 'success') return CheckCircle2;
    return RefreshCw;
  };

  const toneFor = (meta: NoticeMeta, isRead: boolean) => {
    if (isRead) return 'border-outline-variant bg-surface-container-low/30 opacity-70';
    if (meta.severity === 'error') return 'border-error/15 bg-error/5';
    if (meta.category === 'folder') return 'border-amber-300/70 bg-amber-50/70';
    if (meta.category === 'pdf') return 'border-violet-200 bg-violet-50/70';
    if (meta.category === 'conversion') return 'border-emerald-200 bg-emerald-50/70';
    return 'border-primary/15 bg-primary/5';
  };

  const textToneFor = (meta: NoticeMeta) => {
    if (meta.severity === 'error') return 'text-error';
    if (meta.category === 'folder') return 'text-amber-600';
    if (meta.category === 'pdf') return 'text-violet-600';
    if (meta.category === 'conversion') return 'text-emerald-600';
    return 'text-primary';
  };

  return (
    <header className="bg-surface-container-lowest border-b border-outline-variant shadow-sm fixed top-0 w-full z-50 h-16">
      <div className="flex justify-between items-center h-full px-6 w-full max-w-[1440px] mx-auto">
        <div className="flex items-center gap-8">
          <img
            src="/logos/culcloud-user-logo.png"
            alt={t.appName}
            className="h-12 w-56 object-contain object-left"
          />
        </div>

        <div className="flex items-center gap-6">
          {/* 大屏入口/退出 */}
          <button
            onClick={onToggleCockpit}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-black hover:opacity-80 transition-all shadow-md"
          >
            {role === 'admin' ? (
              <><LogOut size={14} />{lang === 'zh' ? '退出大屏' : 'EXIT'}</>
            ) : (
              <><BarChart3 size={14} />{lang === 'zh' ? '打开大屏' : 'COCKPIT'}</>
            )}
          </button>

          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${lang === 'en' ? 'bg-primary text-on-primary' : 'text-outline hover:bg-surface-container-high'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('zh')}
              className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${lang === 'zh' ? 'bg-primary text-on-primary' : 'text-outline hover:bg-surface-container-high'}`}
            >
              ZH
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-container-low border border-outline-variant shadow-inner">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-outline">{t.nav.activeTasks}: {queueLength}</span>
          </div>

          <div className="flex items-center gap-2 border-l pl-4 border-outline-variant relative">
            <button
              onClick={() => setNoticeOpen((open) => !open)}
              className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors relative"
              title={lang === 'zh' ? '用户消息通知' : 'User notifications'}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-error text-white text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center border border-white">
                  {unreadCount}
                </span>
              )}
            </button>
            {noticeOpen && (
              <div className="absolute right-10 top-12 w-96 rounded-2xl border border-outline-variant bg-white p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">
                    {lang === 'zh' ? '用户消息通知' : 'User notifications'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={markAllRead}
                      className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-lg transition-all"
                    >
                      {lang === 'zh' ? '全部标记已读' : 'Mark All Read'}
                    </button>
                    <button
                      onClick={() => setNoticeOpen(false)}
                      className="p-1 hover:bg-surface-container rounded-full transition-colors"
                      title={lang === 'zh' ? '关闭' : 'Close'}
                    >
                      <XCircle size={15} className="text-outline" />
                    </button>
                  </div>
                </div>
                {visibleEvents.length ? (
                  <div className="max-h-72 space-y-2 overflow-auto">
                    {visibleEvents.map((event) => {
                      const meta = eventMeta(event);
                      const Icon = iconFor(meta);
                      const isRead = readIds.includes(eventId(event));
                      return (
                      <button
                        key={eventId(event)}
                        onClick={() => {
                          markRead(event);
                          setDetailEvent(event);
                        }}
                        className={`w-full rounded-xl border p-3 text-left transition-all ${toneFor(meta, isRead)}`}
                      >
                        <div className={`flex items-center gap-2 ${textToneFor(meta)}`}>
                          <Icon size={14} />
                          <span className="truncate text-[11px] font-black">{lang === 'zh' ? meta.titleZh : meta.titleEn}</span>
                          <span className="ml-auto shrink-0 rounded-md bg-white/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-outline">
                            {lang === 'zh' ? meta.labelZh : meta.labelEn}
                          </span>
                          {!isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-error" />}
                        </div>
                        <p className="mt-1 line-clamp-2 text-[10px] font-bold leading-relaxed text-outline">
                          {event.message}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-widest text-outline/70">
                          <span>{meta.resource_type || meta.category}.{meta.action}</span>
                          <span className="shrink-0">{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                      </button>
                    );})}
                  </div>
                ) : (
                  <p className="rounded-xl bg-surface-container-low p-4 text-center text-[10px] font-black uppercase tracking-widest text-outline">
                    {lang === 'zh' ? '暂无用户消息' : 'No user notifications'}
                  </p>
                )}
              </div>
            )}
            <button className="ml-2 w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary overflow-hidden border border-outline-variant">
               <span className="text-xs font-black">{role === 'admin' ? 'A' : 'U'}</span>
            </button>
          </div>
        </div>
      </div>
      {detailEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div onClick={() => setDetailEvent(null)} className="absolute inset-0" />
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 space-y-6 text-left border border-outline-variant animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black tracking-tight text-on-surface">
                {lang === 'zh' ? '消息详情' : 'Message Details'}
              </h3>
              <button onClick={() => setDetailEvent(null)} className="p-1.5 hover:bg-surface-container rounded-full transition-colors">
                <XCircle size={18} className="text-outline" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                {(() => {
                  const meta = eventMeta(detailEvent);
                  return (
                    <>
                      <span className="text-[9px] font-black uppercase tracking-widest text-outline">
                        {lang === 'zh' ? '业务类型' : 'Business Type'}
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest ${textToneFor(meta)} bg-surface-container-low`}>
                          {lang === 'zh' ? meta.titleZh : meta.titleEn}
                        </span>
                        <span className="rounded-lg bg-surface-container-low px-2 py-1 text-[10px] font-black uppercase tracking-widest text-outline">
                          {meta.category}.{meta.action}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-outline">
                  {lang === 'zh' ? '发送时间' : 'Timestamp'}
                </span>
                <p className="text-xs font-bold text-on-surface mt-0.5">
                  {new Date(detailEvent.timestamp).toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-outline">
                  {lang === 'zh' ? '消息内容' : 'Message Content'}
                </span>
                <p className="text-xs font-bold leading-relaxed text-on-surface-variant mt-0.5 whitespace-pre-wrap">
                  {detailEvent.message}
                </p>
              </div>
              {detailEvent.file_size !== undefined && detailEvent.file_size !== null && (
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-outline">
                    {lang === 'zh' ? '文件大小' : 'File Size'}
                  </span>
                  <p className="text-xs font-bold text-on-surface mt-0.5">
                    {formatSize(detailEvent.file_size)}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => setDetailEvent(null)}
              className="w-full py-3 bg-[#1e1e1e] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-125 transition-all shadow-md"
            >
              {lang === 'zh' ? '确定' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function formatSize(size?: number | null) {
  if (!size) return '0 KB';
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}
