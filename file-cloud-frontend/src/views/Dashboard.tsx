import React, { useEffect, useMemo, useState } from 'react';
import {
  HardDrive,
  Activity,
  CheckCircle2,
  Box,
  RefreshCw,
  FolderOpen,
  FileText,
  AlertTriangle,
  ArrowRight,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { listFiles, listTasks, getTaskStats } from '../services/api';
import { useDashboard } from '../context/useDashboard';

interface UserProfile {
  id: string;
  tag: string;
  avatar: string;
  bio: string;
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { setActiveView, role } = useDashboard();
  const defaultName = role === 'admin' ? (t.zh ? '管理员' : 'Admin') : (t.zh ? '演示用户' : 'Demo User');
  const defaultTag = role === 'admin' ? (t.zh ? '管理工作空间' : 'Admin Workspace') : (t.zh ? '个人工作空间' : 'Personal Workspace');
  const defaultProfile = useMemo<UserProfile>(() => ({
    id: defaultName,
    tag: defaultTag,
    avatar: role === 'admin' ? 'A' : 'U',
    bio: t.zh ? '专注文件存储、转换与 PDF 编辑。' : 'Focused on storage, conversion and PDF editing.',
  }), [defaultName, defaultTag, role, t.zh]);

  const [stats, setStats] = useState({ count: 0, size: 0, converted: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const stored = localStorage.getItem('culcloud_user_profile');
      return stored ? { ...defaultProfile, ...JSON.parse(stored) } : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });
  const [draftProfile, setDraftProfile] = useState<UserProfile>(profile);

  useEffect(() => {
    if (!localStorage.getItem('culcloud_user_profile')) {
      setProfile(defaultProfile);
      setDraftProfile(defaultProfile);
    }
  }, [defaultProfile]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const [fileRes, taskStats, allTasksRes] = await Promise.all([
        listFiles({ recursive: true }),
        getTaskStats(),
        listTasks({ limit: 6 }),
      ]);
      const totalSize = fileRes.files.reduce((acc: number, f: any) => acc + (f.size || 0), 0);

      setStats({
        count: fileRes.files.length,
        size: totalSize,
        converted: taskStats.completed || 0,
        failed: taskStats.failed || 0,
      });
      setRecentActivities(allTasksRes.items || []);
    } catch (err) {
      console.error('Dashboard stats fetch failed', err);
      setLoadError(t.zh ? '未能连接真实后端数据，当前指标不可用。请启动 API 后重试。' : 'Unable to reach live backend data. Start the API and retry.');
      setRecentActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const saveProfile = () => {
    const normalized = {
      id: draftProfile.id.trim() || defaultProfile.id,
      tag: draftProfile.tag.trim() || defaultProfile.tag,
      avatar: draftProfile.avatar.trim().slice(0, 2) || defaultProfile.avatar,
      bio: draftProfile.bio.trim(),
    };
    setProfile(normalized);
    setDraftProfile(normalized);
    localStorage.setItem('culcloud_user_profile', JSON.stringify(normalized));
    setEditingProfile(false);
  };

  const cancelProfileEdit = () => {
    setDraftProfile(profile);
    setEditingProfile(false);
  };

  const storageRatio = Math.min(100, (stats.size / (1024 * 1024 * 1024 * 1024)) * 100);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-black tracking-tight text-on-surface font-display underline decoration-primary/20 decoration-8 underline-offset-4 sm:text-4xl">
            {t.dashboard.title}
          </h1>
          <p className="mt-1 text-sm font-medium text-outline sm:text-lg">{t.dashboard.subtitle}</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          title={t.zh ? '刷新真实数据' : 'Refresh live data'}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-lowest transition-all hover:bg-surface-container-low disabled:cursor-wait disabled:opacity-70"
        >
          <RefreshCw className={cn('h-5 w-5 text-outline', loading && 'animate-spin')} />
        </button>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-error/20 bg-error/5 px-6 py-4 text-xs font-black uppercase tracking-widest text-error">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: t.dashboard.metrics.diskUsage, val: loadError ? '--' : `${(stats.size / 1024 / 1024).toFixed(2)} MB`, icon: HardDrive, color: 'text-primary' },
              { label: t.zh ? '云盘文件数' : 'Total Files', val: loadError ? '--' : `${stats.count}`, icon: Box, color: 'text-sky-500' },
              { label: t.zh ? '转换成功数' : 'Converted', val: loadError ? '--' : `${stats.converted}`, icon: CheckCircle2, color: 'text-emerald-500' },
              { label: t.zh ? '异常失败数' : 'Failed Tasks', val: loadError ? '--' : `${stats.failed}`, icon: AlertTriangle, color: 'text-error' },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 ambient-shadow">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className={cn('rounded-xl bg-surface-container-low p-2.5', m.color)}>
                    <m.icon size={20} />
                  </div>
                  <span className="min-w-0 text-right text-[10px] font-black uppercase tracking-[0.16em] text-outline opacity-70">{m.label}</span>
                </div>
                <h3 className="truncate text-2xl font-black tracking-tighter sm:text-3xl">{m.val}</h3>
              </div>
            ))}
          </div>

          <section className="space-y-4">
            <h3 className="text-xl font-black tracking-tight">{t.zh ? '快捷入口' : 'Quick Actions'}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                {
                  title: t.sidebar.myFiles,
                  desc: t.zh ? '管理云盘文件' : 'Manage cloud files',
                  icon: FolderOpen,
                  view: 'files',
                  color: 'border-l-sky-500',
                },
                {
                  title: t.sidebar.convertCenter,
                  desc: t.zh ? '格式转换任务' : 'Format conversion',
                  icon: RefreshCw,
                  view: 'convert',
                  color: 'border-l-primary',
                },
                {
                  title: t.sidebar.pdfStudio,
                  desc: t.zh ? 'PDF 编辑与导出' : 'PDF editing and export',
                  icon: FileText,
                  view: 'pdf',
                  color: 'border-l-emerald-500',
                },
              ].map((act) => (
                <button
                  key={act.view}
                  onClick={() => setActiveView(act.view as any)}
                  className={cn('flex h-36 flex-col justify-between rounded-2xl border border-l-[6px] border-outline-variant bg-surface-container-lowest p-5 text-left transition-all hover:scale-[1.01] ambient-shadow', act.color)}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 rounded-xl bg-surface-container-low p-3 text-on-surface">
                      <act.icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-black transition-colors group-hover:text-primary">{act.title}</h4>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-outline">{act.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary">
                    {t.zh ? '进入' : 'Open'} <ArrowRight size={12} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 ambient-shadow sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black tracking-tight">{t.zh ? '最近任务' : 'Recent Tasks'}</h3>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-outline">{t.zh ? '实时数据' : 'Live'}</span>
            </div>

            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((act) => (
                  <div key={act.task_id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-low/35 p-3.5">
                    <FileText size={17} className="text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-on-surface">{act.input_filename || act.task_id}</p>
                      <p className="truncate text-[10px] font-bold uppercase tracking-widest text-outline">{act.kind || act.task_id}</p>
                    </div>
                    <span className={cn(
                      'shrink-0 rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-wider',
                      act.status === 'completed' || act.status === 'success' ? 'bg-emerald-500/10 text-emerald-600' :
                        act.status === 'failed' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary',
                    )}
                    >
                      {act.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-xl bg-surface-container-low/40 text-center">
                <Activity size={36} className="text-outline/25" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">{t.zh ? '暂无任务' : 'No tasks yet'}</p>
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 ambient-shadow">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black tracking-tight">{t.zh ? '个人资料' : 'Profile'}</h3>
              {editingProfile ? (
                <div className="flex items-center gap-2">
                  <button onClick={saveProfile} className="rounded-xl bg-primary p-2 text-white transition-all hover:opacity-85" title={t.zh ? '保存' : 'Save'}>
                    <Save size={16} />
                  </button>
                  <button onClick={cancelProfileEdit} className="rounded-xl bg-surface-container-low p-2 text-outline transition-all hover:bg-surface-container" title={t.zh ? '取消' : 'Cancel'}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditingProfile(true)} className="rounded-xl bg-surface-container-low p-2 text-outline transition-all hover:bg-surface-container" title={t.zh ? '编辑资料' : 'Edit profile'}>
                  <Edit3 size={16} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-outline-variant bg-primary text-2xl font-black text-white shadow-lg">
                {(profile.avatar || profile.id || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-black tracking-tight text-on-surface">{profile.id}</h2>
                <p className="mt-1 w-fit max-w-full truncate rounded-full bg-surface-container-low px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-outline">
                  {profile.tag}
                </p>
              </div>
            </div>

            {editingProfile ? (
              <div className="mt-6 space-y-3">
                {[
                  { key: 'id', label: t.zh ? 'ID' : 'ID', value: draftProfile.id },
                  { key: 'tag', label: t.zh ? '个性标签' : 'Tag', value: draftProfile.tag },
                  { key: 'avatar', label: t.zh ? '头像标识' : 'Avatar', value: draftProfile.avatar },
                ].map((field) => (
                  <label key={field.key} className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-outline">{field.label}</span>
                    <input
                      value={field.value}
                      onChange={(event) => setDraftProfile((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm font-bold outline-none focus:border-primary"
                    />
                  </label>
                ))}
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-outline">{t.zh ? '个人简介' : 'Bio'}</span>
                  <textarea
                    value={draftProfile.bio}
                    onChange={(event) => setDraftProfile((prev) => ({ ...prev, bio: event.target.value }))}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm font-bold leading-relaxed outline-none focus:border-primary"
                  />
                </label>
              </div>
            ) : (
              <p className="mt-5 text-sm font-semibold leading-relaxed text-outline">{profile.bio || (t.zh ? '暂无简介。' : 'No bio yet.')}</p>
            )}
          </section>

          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 ambient-shadow">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-outline">{t.zh ? '空间占用' : 'Space Used'}</span>
                <p className="mt-1 text-xl font-black tracking-tighter">
                  {(stats.size / 1024 / 1024).toFixed(2)} MB <span className="text-xs font-black text-outline/60">/ 1 TB</span>
                </p>
              </div>
              <HardDrive size={24} className="shrink-0 text-primary" />
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${storageRatio}%` }} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
