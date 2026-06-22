import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUp,
  ArrowLeft,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  FileArchive,
  FileText,
  Folder,
  FolderPlus,
  Grid,
  Home,
  ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sheet,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import {
  createFolder,
  deleteFile,
  deleteFolder,
  FileEntry,
  FolderEntry,
  LogEvent,
  getDownloadUrl,
  getPreview,
  getPreviewContentUrl,
  PreviewMetadata,
  listFiles,
  renameFile,
  uploadFile,
} from '../services/api';

type TypeFilter = 'all' | 'pdf' | 'docx' | 'xlsx' | 'png-jpeg' | 'svg' | 'txt' | 'md' | 'zip-rar' | 'other';

const typeFilters: TypeFilter[] = ['all', 'pdf', 'docx', 'xlsx', 'png-jpeg', 'svg', 'txt', 'md', 'zip-rar', 'other'];

const typeFilterLabels: Record<TypeFilter, { zh: string; en: string }> = {
  all: { zh: '全部文件', en: 'All Files' },
  pdf: { zh: 'PDF', en: 'PDF' },
  docx: { zh: 'DOCX', en: 'DOCX' },
  xlsx: { zh: 'XLSX', en: 'XLSX' },
  'png-jpeg': { zh: 'PNG/JPEG', en: 'PNG/JPEG' },
  svg: { zh: 'SVG', en: 'SVG' },
  txt: { zh: 'TXT', en: 'TXT' },
  md: { zh: 'MD', en: 'MD' },
  'zip-rar': { zh: 'ZIP/RAR', en: 'ZIP/RAR' },
  other: { zh: '其他文件', en: 'Other' },
};

function extensionOf(name: string) {
  const clean = name.toLowerCase().split('?')[0];
  return clean.includes('.') ? clean.slice(clean.lastIndexOf('.')) : '';
}

function filterFor(file: FileEntry): TypeFilter {
  const ext = extensionOf(file.filename || file.object_name);
  if (ext === '.pdf') return 'pdf';
  if (ext === '.docx') return 'docx';
  if (ext === '.xlsx') return 'xlsx';
  if (['.png', '.jpg', '.jpeg'].includes(ext)) return 'png-jpeg';
  if (ext === '.svg') return 'svg';
  if (ext === '.txt') return 'txt';
  if (ext === '.md') return 'md';
  if (['.zip', '.rar'].includes(ext)) return 'zip-rar';
  return 'other';
}

function fileIcon(file: FileEntry) {
  const kind = filterFor(file);
  if (kind === 'png-jpeg' || kind === 'svg') return ImageIcon;
  if (kind === 'pdf') return FileArchive;
  if (kind === 'xlsx') return Sheet;
  if (kind === 'zip-rar') return FileArchive;
  return FileText;
}

function typeTone(kind: TypeFilter | 'folder') {
  const tones = {
    folder: 'bg-amber-50 text-amber-600 border-amber-200',
    pdf: 'bg-rose-50 text-rose-600 border-rose-200',
    docx: 'bg-sky-50 text-sky-600 border-sky-200',
    xlsx: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'png-jpeg': 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
    svg: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    txt: 'bg-slate-50 text-slate-600 border-slate-200',
    md: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    'zip-rar': 'bg-orange-50 text-orange-600 border-orange-200',
    other: 'bg-slate-50 text-slate-600 border-slate-200',
    all: 'bg-primary/5 text-primary border-primary/20',
  };
  return tones[kind];
}

function formatSize(size?: number) {
  if (!size) return '0 KB';
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function joinPath(prefix: string, name: string) {
  return [prefix, name].filter(Boolean).join('/');
}

function directoryOf(objectName: string) {
  const idx = objectName.lastIndexOf('/');
  return idx > -1 ? objectName.slice(0, idx) : '';
}

function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-primary/15 px-0.5 text-primary">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function MyFiles() {
  const { lang, t } = useLanguage();
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [folders, setFolders] = useState<FolderEntry[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'list'>('overview');
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [error, setError] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
  const [previewMeta, setPreviewMeta] = useState<PreviewMetadata | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [renamingFile, setRenamingFile] = useState<FileEntry | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderEntry | null>(null);
  const [newName, setNewName] = useState('');
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [folderContents, setFolderContents] = useState<Record<string, { folders: FolderEntry[]; files: FileEntry[] }>>({});
  const [uploadHistory, setUploadHistory] = useState<LogEvent[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'time' | 'folder_time'>('time');

  const pathParts = useMemo(() => currentPrefix ? currentPrefix.split('/').filter(Boolean) : [], [currentPrefix]);

  const fetchFiles = async (prefix = currentPrefix) => {
    try {
      setLoading(true);
      setError('');
      const normalizedPrefix = prefix.trim().replace(/^\/+|\/+$/g, '');
      if (!normalizedPrefix) {
        const [levelRes, recursiveRes] = await Promise.all([
          listFiles({ prefix: '' }),
          listFiles({ prefix: '', recursive: true, limit: 500 }),
        ]);
        setFolders(levelRes.folders || []);
        setFiles(recursiveRes.files || []);
      } else {
        const res = await listFiles({ prefix: normalizedPrefix });
        setFolders(res.folders || []);
        setFiles(res.files || []);
      }
    } catch (err) {
      console.error(err);
      setError(t.zh ? '读取云端文件失败' : 'Failed to load cloud files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(currentPrefix);
    if (currentPrefix) setViewMode('list');
    setTypeFilter('all');
  }, [currentPrefix]);

  useEffect(() => {
    import('../services/api').then(({ getRecentLogs }) => {
      getRecentLogs(50)
        .then((res) => setUploadHistory(
          (res.events || [])
            .filter((event: any) => event.type === 'file_uploaded')
        ))
        .catch(() => setUploadHistory([]));
    });
  }, [uploading]);

  const filteredFiles = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return files.filter((file) => {
      const typeOk = typeFilter === 'all' || filterFor(file) === typeFilter;
      const searchOk = !keyword || `${file.filename || ''} ${file.object_name || ''}`.toLowerCase().includes(keyword);
      return typeOk && searchOk;
    });
  }, [files, searchTerm, typeFilter]);

  const filteredFolders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword || typeFilter !== 'all') return typeFilter === 'all' ? folders : [];
    return folders.filter((folder) => `${folder.name || ''} ${folder.path || ''}`.toLowerCase().includes(keyword));
  }, [folders, searchTerm, typeFilter]);

  const sortedFiles = useMemo(() => {
    const list = [...filteredFiles];
    if (sortBy === 'name') {
      list.sort((a, b) => (a.filename || a.object_name).localeCompare(b.filename || b.object_name));
    } else if (sortBy === 'size') {
      list.sort((a, b) => (a.size || 0) - (b.size || 0));
    } else if (sortBy === 'time' || sortBy === 'folder_time') {
      list.sort((a, b) => {
        const tA = a.last_modified ? new Date(a.last_modified).getTime() : 0;
        const tB = b.last_modified ? new Date(b.last_modified).getTime() : 0;
        return tB - tA;
      });
    }
    return list;
  }, [filteredFiles, sortBy]);

  const sortedFolders = useMemo(() => {
    const list = [...filteredFolders];
    if (sortBy === 'name') {
      list.sort((a, b) => (a.name || a.path).localeCompare(b.name || b.path));
    } else if (sortBy === 'folder_time' || sortBy === 'time') {
      list.sort((a, b) => {
        const tA = a.last_modified ? new Date(a.last_modified).getTime() : 0;
        const tB = b.last_modified ? new Date(b.last_modified).getTime() : 0;
        return tB - tA;
      });
    }
    return list;
  }, [filteredFolders, sortBy]);

  const handleUploadList = async (selectedFiles: FileList | null, directoryMode = false) => {
    if (!selectedFiles?.length) return;
    try {
      setUploading(true);
      setError('');
      for (const file of Array.from(selectedFiles)) {
        const relativePath = directoryMode ? ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name) : '';
        await uploadFile(file, { prefix: currentPrefix, relativePath });
      }
      await fetchFiles();
      setExpandedFolder(null);
      setFolderContents({});
      setSortBy('time');
      setViewMode('list');
    } catch (err) {
      console.error(err);
      setError(t.zh ? '上传失败' : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDropUpload = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingUpload(false);
    await handleUploadList(event.dataTransfer.files);
  };

  const toggleFolder = async (folder: FolderEntry) => {
    if (expandedFolder === folder.path) {
      setExpandedFolder(null);
      return;
    }
    setExpandedFolder(folder.path);
    if (folderContents[folder.path]) return;
    try {
      const res = await listFiles({ prefix: folder.path });
      setFolderContents(prev => ({ ...prev, [folder.path]: { folders: res.folders || [], files: res.files || [] } }));
    } catch (err) {
      console.error(err);
      setError(t.zh ? '读取文件夹内容失败' : 'Failed to load folder contents');
    }
  };

  const handleCreateFolder = async () => {
    const cleanName = folderName.trim().replace(/^\/+|\/+$/g, '');
    if (!cleanName) return;
    try {
      setError('');
      await createFolder(joinPath(currentPrefix, cleanName));
      setCreatingFolder(false);
      setFolderName('');
      setExpandedFolder(null);
      setFolderContents({});
      await fetchFiles();
    } catch (err) {
      console.error(err);
      setError(t.zh ? '创建文件夹失败' : 'Failed to create folder');
    }
  };

  const openPreview = async (file: FileEntry) => {
    setPreviewFile(file);
    setPreviewMeta(null);
    setPreviewLoading(true);
    setError('');
    try {
      const meta = await getPreview(file.object_name);
      setPreviewMeta(meta);
    } catch (err) {
      console.error(err);
      setError(t.zh ? '该文件暂不支持预览' : 'Preview is not available for this file');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDeleteFolder = async (folder: FolderEntry) => {
    setFolderToDelete(folder);
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      await deleteFolder(folderToDelete.path);
      setFolderToDelete(null);
      setExpandedFolder(null);
      setFolderContents({});
      await fetchFiles();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : (t.zh ? '删除文件夹失败' : 'Failed to delete folder'));
    }
  };

  const handleDelete = async (file: FileEntry) => {
    if (!window.confirm(t.zh ? `删除 ${file.filename}?` : `Delete ${file.filename}?`)) return;
    try {
      await deleteFile(file.object_name);
      setExpandedFolder(null);
      setFolderContents({});
      await fetchFiles();
    } catch (err) {
      console.error(err);
      setError(t.zh ? '删除失败' : 'Delete failed');
    }
  };

  const handleDownload = async (objectName: string) => {
    try {
      const res = await getDownloadUrl(objectName);
      window.open(res.api_download_url || res.download_url, '_blank');
    } catch (err) {
      console.error(err);
      setError(t.zh ? '下载链接生成失败' : 'Failed to create download link');
    }
  };

  const handleRename = async () => {
    if (!renamingFile || !newName.trim()) return;
    try {
      await renameFile(renamingFile.object_name, newName.trim());
      setRenamingFile(null);
      setNewName('');
      setExpandedFolder(null);
      setFolderContents({});
      await fetchFiles();
    } catch (err) {
      console.error(err);
      setError(t.zh ? '重命名失败' : 'Rename failed');
    }
  };

  const goUp = () => {
    if (!pathParts.length) return;
    setCurrentPrefix(pathParts.slice(0, -1).join('/'));
  };

  if (previewFile) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <button onClick={() => setPreviewFile(null)} className="flex w-fit items-center gap-2 rounded-2xl border border-outline-variant bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-low">
            <ArrowLeft className="h-4 w-4" />
            {t.zh ? '返回云盘' : 'Back to files'}
          </button>
          <button onClick={() => handleDownload(previewFile.object_name)} className="flex w-fit items-center gap-2 rounded-2xl bg-[#1e1e1e] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:brightness-125">
            <Download className="h-4 w-4" />
            {t.zh ? '下载' : 'Download'}
          </button>
        </div>
        <div className="overflow-hidden rounded-[2rem] border border-outline-variant bg-white ambient-shadow">
          <div className="border-b border-outline-variant bg-surface-container-low/30 p-6">
            <h1 className="truncate text-2xl font-black tracking-tight">{previewFile.filename || previewFile.object_name}</h1>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-outline">
              {previewMeta?.preview_type || (previewLoading ? (t.zh ? '预览生成中' : 'Generating preview') : (t.zh ? '文件预览' : 'File preview'))} · {formatSize(previewFile.size)}
            </p>
          </div>
          <div className="min-h-[72vh] bg-surface-container-lowest p-6">
            {previewLoading ? (
              <div className="flex min-h-[65vh] flex-col items-center justify-center gap-4 text-outline">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest">{t.zh ? '正在生成预览...' : 'Generating preview...'}</p>
              </div>
            ) : previewMeta ? (
              <PreviewFrame meta={previewMeta} objectName={previewFile.object_name} />
            ) : (
              <div className="flex min-h-[65vh] items-center justify-center text-xs font-black uppercase tracking-widest text-outline">{t.zh ? '无法预览此文件' : 'Unable to preview this file'}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-on-surface font-display underline decoration-primary/20 decoration-8 underline-offset-4">{t.files.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-widest text-outline">
            <button onClick={() => setCurrentPrefix('')} className="flex items-center gap-1 rounded-xl px-2 py-1 hover:bg-primary/10 hover:text-primary">
              <Home className="h-3.5 w-3.5" />
              {t.zh ? '云盘根目录' : 'Drive Root'}
            </button>
            {pathParts.map((part, idx) => (
              <React.Fragment key={`${part}-${idx}`}>
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                <button
                  onClick={() => setCurrentPrefix(pathParts.slice(0, idx + 1).join('/'))}
                  className="rounded-xl px-2 py-1 hover:bg-primary/10 hover:text-primary"
                >
                  {part}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

      </div>

      {!currentPrefix && viewMode === 'overview' && (
        <div
          className={cn(
            'relative overflow-hidden rounded-[2rem] border-2 border-dashed p-12 transition-all cursor-copy',
            isDraggingUpload ? 'border-primary bg-primary/5 shadow-[0_0_0_8px_rgba(11,92,255,0.08)]' : 'border-outline-variant bg-surface-container-lowest hover:border-primary/40 hover:bg-primary/[0.02]',
          )}
          onDragEnter={(e) => { e.preventDefault(); setIsDraggingUpload(true); }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setIsDraggingUpload(false)}
          onDrop={handleDropUpload}
        >
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity hover:opacity-100">
            <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
          </div>
          <div className="relative flex flex-col items-center justify-center gap-8 text-center">
            <div className="flex flex-col items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-primary/20 bg-primary/5 text-primary shadow-lg transition-transform group-hover:scale-105">
                <UploadCloud className="h-12 w-12" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight">{t.zh ? '选择上传，或进入我的云盘' : 'Upload, or enter my cloud drive'}</h2>
                <p className="mt-2 text-sm font-bold text-outline">{t.zh ? '入口保持最小功能：上传文件、上传文件夹，也可以跳过上传直接查看所有云盘内容。' : 'A minimal entry: upload files, upload folders, or skip straight into all cloud files.'}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-[#1e1e1e] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:brightness-125">
                <Upload className="h-4 w-4" />
                {t.zh ? '上传文件' : 'Upload File'}
                <input type="file" multiple className="hidden" onChange={(e) => handleUploadList(e.target.files)} />
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-widest text-on-primary shadow-xl shadow-primary/20 transition-all hover:brightness-110">
                <UploadCloud className="h-4 w-4" />
                {t.zh ? '上传文件夹' : 'Folder Upload'}
                <input type="file" multiple className="hidden" {...({ webkitdirectory: '', directory: '' } as any)} onChange={(e) => handleUploadList(e.target.files, true)} />
              </label>
              <button
                onClick={() => setViewMode('list')}
                className="flex items-center gap-2 rounded-2xl border border-outline-variant bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface shadow-sm transition-all hover:bg-surface-container-low"
              >
                <Grid className="h-4 w-4" />
                {t.zh ? '进入我的云盘' : 'Enter Drive'}
              </button>
            </div>
            {uploadHistory.length > 0 && (
              <div className="w-full max-w-4xl border-t border-outline-variant pt-6 mt-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-outline text-left mb-3">{t.zh ? '上传历史记录' : 'Upload History'}</h3>
                <div className="max-h-72 overflow-auto rounded-2xl border border-outline-variant bg-white shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-surface-container-low">
                      <tr className="border-b border-outline-variant bg-surface-container-low/50 text-[9px] font-black uppercase tracking-widest text-outline">
                        <th className="px-5 py-2.5">{t.zh ? '时间戳' : 'Timestamp'}</th>
                        <th className="px-5 py-2.5">{t.zh ? '文件/文件夹名' : 'Name'}</th>
                        <th className="px-5 py-2.5">{t.zh ? '大小' : 'Size'}</th>
                        <th className="px-5 py-2.5">{t.zh ? '上传人' : 'Uploader'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30 text-xs font-bold text-on-surface">
                      {uploadHistory.map((event, idx) => (
                        <tr key={idx} className="hover:bg-surface-container-low/20">
                          <td className="px-5 py-2.5 text-[9px] font-black text-outline/80">
                            {new Date(event.timestamp).toLocaleString()}
                          </td>
                          <td className="px-5 py-2.5 truncate max-w-[200px]" title={event.file_name || event.message}>
                            {event.file_name || event.message}
                          </td>
                          <td className="px-5 py-2.5 text-[9px] font-black text-outline/80">
                            {event.file_size !== undefined && event.file_size !== null ? formatSize(event.file_size) : '--'}
                          </td>
                          <td className="px-5 py-2.5">
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black text-primary">
                              {event.user_id || 'system'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(currentPrefix || viewMode === 'list') && (
        <div className="bg-surface-container-low border border-outline-variant rounded-[1.5rem] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex flex-wrap items-center gap-3">
            {currentPrefix ? (
              <button
                onClick={goUp}
                className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant bg-white rounded-xl text-[10px] font-black uppercase tracking-widest text-outline hover:bg-surface-container-low transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t.zh ? '返回上级' : 'Back'}
              </button>
            ) : (
              <button
                onClick={() => setViewMode('overview')}
                className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant bg-white rounded-xl text-[10px] font-black uppercase tracking-widest text-outline hover:bg-surface-container-low transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t.zh ? '返回上传入口' : 'Back to Upload'}
              </button>
            )}
            <label className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:brightness-125 transition-all cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              {t.zh ? '上传文件' : 'Upload File'}
              <input type="file" multiple className="hidden" onChange={(e) => handleUploadList(e.target.files)} />
            </label>
            <button
              onClick={() => setCreatingFolder(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-container-low transition-all"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              {t.zh ? '新建文件夹' : 'New Folder'}
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-outline">{t.zh ? '排序' : 'Sort'}:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-outline-variant rounded-xl px-3 py-1 text-xs font-bold outline-none cursor-pointer focus:ring-2 focus:ring-primary/20"
              >
                <option value="time">{t.zh ? '最近更新' : 'Recent'}</option>
                <option value="name">{t.zh ? '名称' : 'Name'}</option>
                <option value="size">{t.zh ? '大小' : 'Size'}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {(currentPrefix || viewMode === 'list') && (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-[2rem] overflow-hidden ambient-shadow min-h-[60vh] flex flex-col">
        {/* Header with Search and refresh */}
        <div className="p-6 border-b border-outline-variant flex items-center justify-between gap-5 bg-surface-container-low/20">
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">
            {currentPrefix ? (t.zh ? '文件夹内容' : 'Folder Contents') : (t.zh ? '云盘内容' : 'Cloud Contents')}
          </h2>
          <div className="flex items-center gap-4">
            <button onClick={() => fetchFiles()} className="p-2.5 hover:bg-surface-container-low rounded-xl transition-all" title={t.dashboard.refreshMetrics}>
              <RefreshCw className={cn('w-4 h-4', (loading || uploading) && 'animate-spin')} />
            </button>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-3.5 h-3.5" />
              <input
                type="text"
                placeholder={t.files.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-outline-variant/50 rounded-xl pl-10 pr-4 py-2 text-xs font-bold outline-none w-full sm:w-60 focus:ring-4 focus:ring-primary/5 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="p-8 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-6 rounded-2xl border border-error/20 bg-error/5 px-5 py-3 text-xs font-black uppercase tracking-widest text-error">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-xs font-black text-outline uppercase tracking-widest">{t.zh ? '正在读取云端文件...' : 'Loading cloud files...'}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Folders Section */}
              {sortedFolders.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-outline">
                    {t.zh ? '文件夹专区' : 'Folders'}
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {sortedFolders.map((folder) => {
                      const isOpen = expandedFolder === folder.path;
                      const inner = folderContents[folder.path] || { folders: [], files: [] };
                      const innerFolders = inner.folders || [];
                      const innerFiles = inner.files || [];
                      return (
                        <div key={folder.path} className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-low/40 transition-all group">
                          <div className="flex items-center justify-between p-4 hover:bg-surface-container-low">
                            <button onClick={() => toggleFolder(folder)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border', typeTone('folder'))}>
                                <Folder className="text-amber-600 w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-black tracking-tight text-on-surface truncate">{highlight(folder.name || folder.path, searchTerm)}</h4>
                                <p className="text-[9px] font-black text-outline uppercase tracking-widest mt-0.5">
                                  {folder.last_modified ? new Date(folder.last_modified).toLocaleString() : '--'}
                                </p>
                              </div>
                              <ChevronRight className={cn('h-3.5 w-3.5 text-outline transition-transform', isOpen && 'rotate-90')} />
                            </button>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setCurrentPrefix(folder.path)} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-xl transition-all">
                                {t.zh ? '进入' : 'Open'}
                              </button>
                              <button onClick={() => handleDeleteFolder(folder)} className="p-2.5 hover:bg-error/10 text-error rounded-xl transition-all opacity-0 group-hover:opacity-100" title={t.zh ? '删除文件夹' : 'Delete folder'}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-outline-variant/40 bg-white">
                                <div className="grid gap-2 p-4">
                                  {innerFolders.map((childFolder) => (
                                    <div key={childFolder.path} className="flex items-center justify-between rounded-xl bg-amber-50/40 px-4 py-3">
                                      <button onClick={() => setCurrentPrefix(childFolder.path)} className="flex min-w-0 items-center gap-3 text-left">
                                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg border bg-white', typeTone('folder'))}>
                                          <Folder className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <span className="block truncate text-xs font-black">{childFolder.name || childFolder.path.split('/').pop()}</span>
                                          <span className="block truncate text-[8px] font-black uppercase tracking-widest text-outline">{childFolder.path}</span>
                                        </div>
                                      </button>
                                      <button onClick={() => setCurrentPrefix(childFolder.path)} className="rounded-lg px-2.5 py-1 text-[10px] font-black text-primary hover:bg-primary/10 transition-colors">
                                        {t.zh ? '进入' : 'Open'}
                                      </button>
                                    </div>
                                  ))}
                                  {innerFiles.length ? innerFiles.map((file) => {
                                    const Icon = fileIcon(file);
                                    return (
                                      <div key={file.object_name} className="flex items-center justify-between rounded-xl bg-surface-container-low/40 px-4 py-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg border bg-white', typeTone(filterFor(file)))}>
                                            <Icon className="h-4 w-4" />
                                          </div>
                                          <span className="truncate text-xs font-black">{file.filename || file.object_name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-[9px] font-black text-outline">{formatSize(file.size)}</span>
                                          <button onClick={() => openPreview(file)} className="rounded-lg px-2.5 py-1 text-[10px] font-black text-primary hover:bg-primary/10 transition-colors">
                                            {t.zh ? '预览' : 'Preview'}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }) : (
                                    innerFolders.length === 0 && (
                                    <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center text-[10px] font-black uppercase tracking-widest text-outline">
                                      {t.zh ? '文件夹为空' : 'Empty folder'}
                                    </div>
                                    )
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Files Section */}
              <div className="space-y-4">
                {/* For root folder only: show File Classification tabs */}
                {!currentPrefix && (
                  <>
                    <h3 className="text-xs font-black uppercase tracking-widest text-outline">
                      {t.zh ? '文件分类' : 'File Classification'}
                    </h3>
                    <div className="flex flex-wrap gap-2 border-b border-outline-variant pb-3">
                      {typeFilters.map((filter) => {
                        const count = filter === 'all' ? files.length : files.filter(f => filterFor(f) === filter).length;
                        return (
                          <button
                            key={filter}
                            onClick={() => setTypeFilter(filter)}
                            className={cn(
                              'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border',
                              typeFilter === filter 
                                ? 'bg-primary/10 text-primary border-primary/20' 
                                : 'bg-white text-outline border-outline-variant hover:bg-surface-container-low'
                            )}
                          >
                            <span>{t.zh ? typeFilterLabels[filter].zh : typeFilterLabels[filter].en}</span>
                            <span className="bg-surface-container-low px-1.5 py-0.5 rounded text-[8px] font-black text-outline">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* File list */}
                {sortedFiles.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {sortedFiles.map((file) => {
                      const Icon = fileIcon(file);
                      return (
                        <div key={file.object_name} className="flex items-center justify-between p-4 bg-surface-container-low/30 rounded-2xl border border-outline-variant/30 hover:bg-surface-container-low transition-all group">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border bg-white', typeTone(filterFor(file)))}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-black tracking-tight text-on-surface truncate">{highlight(file.filename || file.object_name, searchTerm)}</h4>
                              <p className="text-[9px] font-black text-outline uppercase tracking-widest mt-0.5">
                                {formatSize(file.size)} · {file.last_modified ? new Date(file.last_modified).toLocaleString() : '--'}
                              </p>
                              {!currentPrefix && directoryOf(file.object_name) && (
                                <p className="mt-1 truncate text-[9px] font-bold text-outline/70">
                                  {t.zh ? '位置：' : 'Path: '}{directoryOf(file.object_name)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openPreview(file)} className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-all" title={t.zh ? '预览' : 'Preview'}>
                              <Eye size={16} />
                            </button>
                            <button onClick={() => handleDownload(file.object_name)} className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-all" title={t.zh ? '下载' : 'Download'}>
                              <Download size={16} />
                            </button>
                            <button onClick={() => { setRenamingFile(file); setNewName(file.filename || file.object_name); }} className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-all" title={t.zh ? '重命名' : 'Rename'}>
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(file)} className="p-2 hover:bg-error/10 text-error rounded-xl transition-all" title={t.zh ? '删除' : 'Delete'}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-outline-variant p-12 text-center text-xs font-black uppercase tracking-widest text-outline">
                    {t.zh ? '该目录下暂无文件' : 'No files in this directory'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      <AnimatePresence>
        {creatingFolder && (
          <Modal onClose={() => setCreatingFolder(false)}>
            <h3 className="text-2xl font-black tracking-tight text-on-surface">{t.files.createFolder}</h3>
            <input
              autoFocus
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder={t.zh ? '例如：reports/phase-1' : 'e.g. reports/phase-1'}
              className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            />
            <div className="flex gap-4">
              <button onClick={() => setCreatingFolder(false)} className="flex-1 py-4 border border-outline-variant rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-container-low transition-all">{t.zh ? '取消' : 'Cancel'}</button>
              <button onClick={handleCreateFolder} className="flex-1 py-4 bg-primary text-on-primary rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">{t.zh ? '创建' : 'Create'}</button>
            </div>
          </Modal>
        )}

        {renamingFile && (
          <Modal onClose={() => setRenamingFile(null)}>
            <h3 className="text-2xl font-black tracking-tight text-on-surface">{t.zh ? '重命名文件' : 'Rename File'}</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            />
            <div className="flex gap-4">
              <button onClick={() => setRenamingFile(null)} className="flex-1 py-4 border border-outline-variant rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-container-low transition-all">{t.zh ? '取消' : 'Cancel'}</button>
              <button onClick={handleRename} className="flex-1 py-4 bg-primary text-on-primary rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">{t.zh ? '保存' : 'Save'}</button>
            </div>
          </Modal>
        )}

        {folderToDelete && (
          <Modal onClose={() => setFolderToDelete(null)}>
            <h3 className="text-2xl font-black tracking-tight text-on-surface">{t.zh ? '确定删除文件夹？' : 'Delete this folder?'}</h3>
            <div className="rounded-2xl border border-error/20 bg-error/5 p-5 text-sm font-bold leading-relaxed text-error">
              {t.zh ? `文件夹「${folderToDelete.path}」及其云盘内容将永远丢失。` : `Folder "${folderToDelete.path}" and all of its cloud-drive contents will be permanently lost.`}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setFolderToDelete(null)} className="flex-1 py-4 border border-outline-variant rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-container-low transition-all">{t.zh ? '取消' : 'Cancel'}</button>
              <button onClick={confirmDeleteFolder} className="flex-1 py-4 bg-error text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-error/20 hover:brightness-110 transition-all">{t.zh ? '确认删除' : 'Delete'}</button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

    </div>
  );
}

function PreviewFrame({ meta, objectName }: { meta: PreviewMetadata; objectName: string }) {
  const url = getPreviewContentUrl(objectName);
  if (meta.preview_type === 'image') {
    return <div className="flex min-h-[50vh] items-center justify-center"><img src={url} alt={meta.filename} className="max-h-[65vh] max-w-full object-contain rounded-xl border border-outline-variant bg-white" /></div>;
  }
  if (meta.preview_type === 'text') {
    return <iframe title={meta.filename} src={url} className="h-[70vh] w-full rounded-xl border border-outline-variant bg-white" sandbox="" />;
  }
  if (meta.preview_type === 'html') {
    return <iframe title={meta.filename} src={url} className="h-[70vh] w-full rounded-xl border border-outline-variant bg-white" sandbox="" />;
  }
  if (meta.preview_type === 'pdf') {
    return <iframe title={meta.filename} src={url} className="h-[74vh] w-full rounded-xl border border-outline-variant bg-white" />;
  }
  return <div className="h-[50vh] flex items-center justify-center text-xs font-black uppercase tracking-widest text-outline">Unsupported preview</div>;
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 space-y-6">
        {children}
      </motion.div>
    </div>
  );
}
