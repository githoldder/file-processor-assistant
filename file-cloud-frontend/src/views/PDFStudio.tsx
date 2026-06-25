import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Download, 
  RotateCw, 
  Trash2, 
  GripVertical, 
  Activity, 
  FileText, 
  Cloud, 
  Upload, 
  X, 
  Loader2, 
  CheckCircle2,
  Combine,
  MousePointer2,
  PenLine,
  Square,
  ArrowUpRight,
  Type,
  Eraser,
  Printer,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { 
  listFiles, 
  uploadFile, 
  extractPdfPages, 
  processPdf, 
  getTaskStatus,
  PDFPageProcessConfig
} from '../services/api';

interface WorkspacePage {
  id: string; // unique key: "previewid_pagenum" or generated
  num: number;
  title: string;
  url: string;
  source_object_name: string;
  rotation: number; // 0, 90, 180, 270
  width: number;
  height: number;
}

type StudioTool = 'select' | 'pen' | 'rect' | 'arrow' | 'line' | 'text' | 'eraser';

interface Annotation {
  id: string;
  pageId: string;
  tool: Exclude<StudioTool, 'select' | 'eraser'>;
  points?: Array<{ x: number; y: number }>;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  size: number;
}

export default function PDFStudio() {
  const { t } = useLanguage();
  const [pages, setPages] = useState<WorkspacePage[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [exportFilename, setExportFilename] = useState('processed_edited.pdf');
  
  // Custom drag and drop states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [insertPosition, setInsertPosition] = useState<'left' | 'right' | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [tool, setTool] = useState<StudioTool>('pen');
  const [inkColor, setInkColor] = useState('#0b5cff');
  const [strokeSize, setStrokeSize] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [draftAnnotation, setDraftAnnotation] = useState<Annotation | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ id: string; x: number; y: number; original: Annotation } | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    id: string;
    x: number;
    y: number;
    original: Annotation;
    bounds: { x: number; y: number; width: number; height: number };
  } | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modals / Selectors
  const [isCloudOpen, setIsCloudOpen] = useState(false);
  const [cloudFiles, setCloudFiles] = useState<any[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [error, setError] = useState('');

  // Processing state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  const allImagesLoaded = pages.length > 0 && pages.every(p => loadedImages[p.id]);
  const selectedPage = pages[selectedPageIndex] || pages[0];
  const selectedAnnotations = selectedPage ? annotations.filter((item) => item.pageId === selectedPage.id) : [];
  const selectedAspectRatio = selectedPage ? `${selectedPage.width} / ${selectedPage.height}` : '3 / 4';
  const selectedCanvasWidth = selectedPage ? Math.min(760, Math.max(360, selectedPage.width * zoom)) : 620;

  const getDefaultExportFilename = (objectName: string) => {
    const base = objectName.split('?')[0].split('/').pop() || 'processed.pdf';
    const cleaned = base.replace(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[_-]/, '');
    const stem = cleaned.toLowerCase().endsWith('.pdf') ? cleaned.slice(0, -4) : cleaned;
    return `${stem || 'processed'}_edited.pdf`;
  };

  const fetchCloudFiles = async () => {
    try {
      setLoadingCloud(true);
      setError('');
      const res = await listFiles();
      // Filter only PDFs
      const pdfs = res.files.filter(f => f.object_name.toLowerCase().endsWith('.pdf'));
      setCloudFiles(pdfs);
    } catch (err) {
      console.error(err);
      setError(t.zh ? '读取云端文件失败' : 'Failed to fetch cloud files');
    } finally {
      setLoadingCloud(false);
    }
  };

  const handleSelectCloudFile = async (objectName: string) => {
    setIsCloudOpen(false);
    await loadPdfPages(objectName, false); // false = override workspace
  };

  const handleMergeCloudFile = async (objectName: string) => {
    setIsCloudOpen(false);
    await loadPdfPages(objectName, true); // true = append to workspace
  };

  const handleUploadLocal = async (e: React.ChangeEvent<HTMLInputElement>, mergeMode: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setUploading(true);
        setError('');
        const res = await uploadFile(file);
        const objectName = res.object_name || res.filename || file.name;
        await loadPdfPages(objectName, mergeMode);
      } catch (err) {
        console.error(err);
        setError(t.zh ? '本地文件上传失败' : 'Failed to upload local file');
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    }
  };

  const loadPdfPages = async (objectName: string, append: boolean) => {
    try {
      setLoadingPages(true);
      setError('');
      const res = await extractPdfPages(objectName);
      
      const newPages = res.pages.map((p, i) => ({
        id: `${res.preview_id}_${p.page_num}_${Date.now()}_${i}`, // unique React key
        num: p.page_num,
        title: `Page ${p.page_num}`,
        url: p.url,
        source_object_name: res.source_object_name,
        rotation: 0,
        width: p.width || 595,
        height: p.height || 842,
      }));

      if (append) {
        setPages(prev => [...prev, ...newPages]);
      } else {
        setPages(newPages);
        setCurrentFile(objectName);
        setExportFilename(getDefaultExportFilename(objectName));
        setLoadedImages({});
        setCurrentPage(1);
        setSelectedPageIndex(0);
        setAnnotations([]);
        setSelectedAnnotationId(null);
      }
    } catch (err) {
      console.error(err);
      setError(t.zh ? '提取PDF页面失败，请确保格式正确' : 'Failed to extract PDF pages');
    } finally {
      setLoadingPages(false);
    }
  };

  const removePage = (id: string) => {
    setPages(pages.filter(p => p.id !== id));
    setAnnotations(prev => prev.filter(item => item.pageId !== id));
    setSelectedPageIndex(prev => Math.max(0, Math.min(prev, pages.length - 2)));
    setLoadedImages(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const rotatePage = (id: string) => {
    setPages(pages.map(p => {
      if (p.id === id) {
        return { ...p, rotation: (p.rotation + 90) % 360 };
      }
      return p;
    }));
  };

  const movePage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= pages.length) return;
    setPages(prev => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
    setSelectedPageIndex(nextIndex);
    setCurrentPage(Math.floor(nextIndex / itemsPerPage) + 1);
  };

  const resetWorkspace = () => {
    setPages([]);
    setCurrentFile(null);
    setExportFilename('processed_edited.pdf');
    setError('');
    setLoadedImages({});
    setCurrentPage(1);
    setSelectedPageIndex(0);
    setAnnotations([]);
    setSelectedAnnotationId(null);
  };

  const svgPoint = (event: React.PointerEvent<SVGElement>) => {
    const svg = event.currentTarget.closest('svg');
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * (selectedPage?.width || 1000),
      y: ((event.clientY - rect.top) / rect.height) * (selectedPage?.height || 1400),
    };
  };

  const hitAnnotation = (point: { x: number; y: number }) => {
    const hitPadding = 18;
    return [...selectedAnnotations].reverse().find((annotation) => {
      const bounds = annotationBounds(annotation, hitPadding);
      return point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
    });
  };

  const beginAnnotation = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!selectedPage) return;
    const point = svgPoint(event);
    const target = (event.target as SVGElement).closest('[data-annotation-id]');
    const targetId = target?.getAttribute('data-annotation-id') || hitAnnotation(point)?.id || null;
    if (targetId) {
      setSelectedAnnotationId(targetId);
      if (tool === 'select') {
        const original = annotations.find(item => item.id === targetId);
        if (original) {
          setDragStart({ id: targetId, x: point.x, y: point.y, original });
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }
      if (tool === 'eraser') {
        setAnnotations(prev => prev.filter(item => item.id !== targetId));
        setSelectedAnnotationId(null);
      }
      return;
    }
    if (tool === 'select') {
      setSelectedAnnotationId(null);
      return;
    }
    if (tool === 'eraser') {
      return;
    }
    if (tool === 'text') {
      const id = `ann_${Date.now()}`;
      setAnnotations(prev => [...prev, {
        id,
        pageId: selectedPage.id,
        tool: 'text',
        x: point.x,
        y: point.y,
        width: 260,
        height: 54,
        text: '',
        color: inkColor,
        size: Math.max(18, strokeSize * 7),
      }]);
      setSelectedAnnotationId(id);
      return;
    }
    const draft: Annotation = {
      id: `ann_${Date.now()}`,
      pageId: selectedPage.id,
      tool,
      points: tool === 'pen' || tool === 'line' || tool === 'arrow' ? [point] : undefined,
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
      color: inkColor,
      size: strokeSize,
    };
    setDraftAnnotation(draft);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveAnnotation = (annotation: Annotation, dx: number, dy: number): Annotation => ({
    ...annotation,
    x: annotation.x !== undefined ? annotation.x + dx : annotation.x,
    y: annotation.y !== undefined ? annotation.y + dy : annotation.y,
    points: annotation.points?.map(point => ({ x: point.x + dx, y: point.y + dy })),
  });

  const scaleAnnotation = (
    annotation: Annotation,
    s: number,
    bounds: { x: number; y: number }
  ): Annotation => {
    return {
      ...annotation,
      points: annotation.points?.map(p => ({
        x: bounds.x + (p.x - bounds.x) * s,
        y: bounds.y + (p.y - bounds.y) * s,
      })),
      x: annotation.x !== undefined ? bounds.x + (annotation.x - bounds.x) * s : annotation.x,
      y: annotation.y !== undefined ? bounds.y + (annotation.y - bounds.y) * s : annotation.y,
      width: annotation.width !== undefined ? annotation.width * s : annotation.width,
      height: annotation.height !== undefined ? annotation.height * s : annotation.height,
      size: annotation.tool === 'text' ? Math.max(12, Math.round(annotation.size * s)) : annotation.size,
    };
  };

  const updateAnnotationText = (id: string, text: string) => {
    setAnnotations(prev => prev.map(item => item.id === id ? { ...item, text } : item));
  };

  const updateAnnotation = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = svgPoint(event);
    if (resizeStart) {
      const dx = point.x - resizeStart.x;
      const dy = point.y - resizeStart.y;
      const w = resizeStart.bounds.width;
      const h = resizeStart.bounds.height;
      const denominator = w * w + h * h;
      if (denominator > 0.01) {
        const s = Math.max(0.15, ((w + dx) * w + (h + dy) * h) / denominator);
        setAnnotations(prev => prev.map(item => item.id === resizeStart.id ? scaleAnnotation(resizeStart.original, s, resizeStart.bounds) : item));
      }
      return;
    }
    if (dragStart) {
      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;
      setAnnotations(prev => prev.map(item => item.id === dragStart.id ? moveAnnotation(dragStart.original, dx, dy) : item));
      return;
    }
    if (!draftAnnotation) return;
    setDraftAnnotation(prev => {
      if (!prev) return prev;
      if (prev.tool === 'pen') {
        return { ...prev, points: [...(prev.points || []), point] };
      }
      if (prev.tool === 'line' || prev.tool === 'arrow') {
        return {
          ...prev,
          width: point.x - (prev.x || 0),
          height: point.y - (prev.y || 0),
          points: [prev.points?.[0] || point, point],
        };
      }
      return {
        ...prev,
        width: point.x - (prev.x || 0),
        height: point.y - (prev.y || 0),
      };
    });
  };

  const commitAnnotation = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (resizeStart) {
      setResizeStart(null);
      return;
    }
    if (dragStart) {
      setDragStart(null);
      return;
    }
    if (!draftAnnotation) return;
    setAnnotations(prev => [...prev, draftAnnotation]);
    setSelectedAnnotationId(draftAnnotation.id);
    setDraftAnnotation(null);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedAnnotationId) {
        event.preventDefault();
        setAnnotations(prev => prev.filter(item => item.id !== selectedAnnotationId));
        setSelectedAnnotationId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationId]);

  const buildProcessPayload = (includeAnnotations: boolean): PDFPageProcessConfig[] => {
    return pages.map(p => ({
      source_object_name: p.source_object_name,
      page_num: p.num,
      rotation: p.rotation,
      canvas_width: p.width,
      canvas_height: p.height,
      annotations: includeAnnotations
        ? annotations
            .filter(item => item.pageId === p.id)
            .map(({ pageId: _pageId, id: _id, ...annotation }) => annotation)
        : [],
    }));
  };

  const startPdfExport = async (includeAnnotations: boolean) => {
    if (pages.length === 0) return;
    try {
      setError('');
      setIsExporting(true);
      setExportProgress(10);
      setExportStatus('processing');
      setExportUrl(null);

      const filename = exportFilename.trim().toLowerCase().endsWith('.pdf')
        ? exportFilename.trim()
        : `${exportFilename.trim() || 'processed_edited'}.pdf`;
      const res = await processPdf(buildProcessPayload(includeAnnotations), filename);
      setTaskId(res.task_id);
    } catch (err) {
      console.error(err);
      setIsExporting(false);
      setExportStatus('failed');
      setError(t.zh ? '启动导出任务失败' : 'Failed to start export task');
    }
  };

  const handleLayeredExport = () => {
    startPdfExport(true);
  };

  const handleExport = async () => {
    startPdfExport(false);
  };

  // Monitor export progress
  useEffect(() => {
    if (isExporting && taskId) {
      const interval = setInterval(async () => {
        try {
          const res = await getTaskStatus(taskId);
          if (res.status === 'success') {
            clearInterval(interval);
            setExportUrl(res.result_url);
            setExportStatus('success');
            setExportProgress(100);
          } else if (res.status === 'failed') {
            clearInterval(interval);
            setExportStatus('failed');
            setError(res.error || (t.zh ? '导出重组失败，请检查操作' : 'PDF processing failed'));
          } else {
            setExportProgress(prev => Math.min(prev + (Math.random() * 12), 95));
          }
        } catch (err) {
          console.error(err);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isExporting, taskId]);

  const handleDownload = () => {
    if (exportUrl) {
      const link = document.createElement('a');
      link.href = exportUrl;
      link.rel = 'noopener noreferrer';
      link.download = '';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-on-surface font-display underline decoration-primary/20 decoration-8 underline-offset-4">{t.zh ? 'PDF 编辑室' : 'PDF Studio'}</h1>
          <p className="text-outline mt-1 text-lg font-medium">{t.zh ? 'PDF 预览、canvas 批注、页面整理、打印导出' : 'PDF preview, canvas annotations, page organization, and print export'}</p>
        </div>
        {pages.length > 0 && (
          <div className="flex gap-3">
             <button 
               onClick={() => { setIsCloudOpen(true); fetchCloudFiles(); }}
               className="bg-surface-container-lowest border border-outline-variant px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-surface-container-low transition-all"
             >
               <Plus size={16} />
               {t.zh ? '添加/合并文件' : 'Add / Merge PDF'}
             </button>
             <button 
               onClick={resetWorkspace}
               className="bg-surface-container-lowest border border-error/20 text-error px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-error/5 transition-all"
             >
               <Trash2 size={16} />
               {t.zh ? '重置' : 'Reset'}
             </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-error/20 bg-error/5 px-6 py-4 text-xs font-black uppercase tracking-widest text-error">
          {error}
        </div>
      )}

      {/* Main Workspace */}
      {loadingPages || uploading ? (
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant p-24 flex flex-col justify-center items-center text-center space-y-4 min-h-[50vh] ambient-shadow">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-sm font-black text-outline uppercase tracking-widest">
            {uploading ? (t.zh ? '正在上传文件...' : 'Uploading File...') : (t.zh ? '正在提取PDF页面图...' : 'Extracting PDF pages...')}
          </p>
        </div>
      ) : pages.length === 0 ? (
        <div 
          className="bg-surface-container-lowest rounded-3xl border-2 border-dashed border-outline-variant p-20 flex flex-col justify-center items-center text-center relative group transition-all hover:border-primary/50 hover:bg-surface-container-low/20 min-h-[50vh] ambient-shadow"
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.name.toLowerCase().endsWith('.pdf')) {
              try {
                setUploading(true);
                const res = await uploadFile(file);
                await loadPdfPages(res.object_name || res.filename || file.name, false);
              } catch (err) {
                console.error(err);
                setError(t.zh ? '上传失败' : 'Upload failed');
              } finally {
                setUploading(false);
              }
            }
          }}
        >
          <div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center mb-8 border border-primary/10 shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
            <FileText size={48} className="text-primary" />
          </div>
          <h3 className="text-3xl font-black text-on-surface mb-3 font-display">{t.zh ? '将PDF拖放到此处开始编辑' : 'Drop PDF here to edit'}</h3>
          <p className="text-outline mb-12 max-w-lg leading-relaxed font-medium">
            {t.zh ? '默认进入 PDF 编辑室。支持页面预览、画笔、图形、箭头、文本、橡皮擦、页面整理和导出。' : 'Open the PDF editor by default. Preview pages, draw, add shapes/arrows/text, erase annotations, organize pages, and export.'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md relative z-10">
            <label className="flex-1 bg-[#1e1e1e] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] shadow-xl transition-all text-center cursor-pointer">
              {t.zh ? '浏览本地 PDF' : 'Browse Local PDF'}
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleUploadLocal(e, false)} />
            </label>
            <button 
              onClick={() => { setIsCloudOpen(true); fetchCloudFiles(); }}
              className="flex-1 bg-white border border-outline-variant px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-outline hover:bg-surface-container-low transition-all flex items-center justify-center gap-3"
            >
              <Cloud size={18} />
              {t.zh ? '从云端盘选择' : 'Choose Cloud PDF'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 min-h-[60vh] print:block">
          <div className="xl:col-span-4 bg-surface-container-lowest rounded-3xl border border-outline-variant overflow-hidden flex flex-col ambient-shadow print:hidden">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/20">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-primary" />
                <span className="font-black text-sm tracking-tight truncate max-w-lg">{currentFile ? currentFile.split('_').pop() : (t.zh ? 'PDF 编辑工作区' : 'PDF Editing Workspace')}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setZoom(prev => Math.max(0.6, Number((prev - 0.1).toFixed(1))))} className="rounded-xl border border-outline-variant bg-white p-2 hover:bg-surface-container-low" title={t.zh ? '缩小' : 'Zoom out'}><ZoomOut size={16} /></button>
                <span className="w-14 text-center text-[10px] font-black text-outline">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(prev => Math.min(1.8, Number((prev + 0.1).toFixed(1))))} className="rounded-xl border border-outline-variant bg-white p-2 hover:bg-surface-container-low" title={t.zh ? '放大' : 'Zoom in'}><ZoomIn size={16} /></button>
              </div>
            </div>

            <div className="border-b border-outline-variant bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'select' as StudioTool, icon: MousePointer2, label: t.zh ? '选择' : 'Select' },
                  { id: 'pen' as StudioTool, icon: PenLine, label: t.zh ? '画笔' : 'Pen' },
                  { id: 'rect' as StudioTool, icon: Square, label: t.zh ? '图形' : 'Shape' },
                  { id: 'arrow' as StudioTool, icon: ArrowUpRight, label: t.zh ? '箭头' : 'Arrow' },
                  { id: 'line' as StudioTool, icon: Minus, label: t.zh ? '横线' : 'Line' },
                  { id: 'text' as StudioTool, icon: Type, label: t.zh ? '文本' : 'Text' },
                  { id: 'eraser' as StudioTool, icon: Eraser, label: t.zh ? '橡皮擦' : 'Eraser' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTool(item.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all',
                      tool === item.id ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-outline hover:text-primary',
                    )}
                    title={item.label}
                  >
                    <item.icon size={15} />
                    {item.label}
                  </button>
                ))}
                <input type="color" value={inkColor} onChange={(e) => setInkColor(e.target.value)} className="h-9 w-12 rounded-xl border border-outline-variant bg-white p-1" title={t.zh ? '颜色' : 'Color'} />
                <input type="range" min={1} max={8} value={strokeSize} onChange={(e) => setStrokeSize(Number(e.target.value))} className="w-28" title={t.zh ? '笔触大小' : 'Stroke size'} />
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-surface-container-low/10 p-8">
              {selectedPage && (
                <div className="mx-auto flex w-fit flex-col items-center gap-4">
                  <div
                    className="relative bg-white shadow-2xl"
                    style={{ width: `${Math.round(selectedCanvasWidth)}px`, aspectRatio: selectedAspectRatio }}
                  >
                    <img
                      src={selectedPage.url}
                      alt={selectedPage.title}
                      onLoad={() => setLoadedImages(prev => ({ ...prev, [selectedPage.id]: true }))}
                      style={{ transform: `rotate(${selectedPage.rotation}deg)` }}
                      className="absolute inset-0 h-full w-full object-contain"
                      draggable={false}
                    />
                    <svg
                      className={cn('absolute inset-0 h-full w-full touch-none', tool === 'select' ? 'cursor-move' : tool === 'eraser' ? 'cursor-crosshair' : tool === 'text' ? 'cursor-text' : 'cursor-crosshair')}
                      viewBox={`0 0 ${selectedPage.width} ${selectedPage.height}`}
                      onPointerDown={beginAnnotation}
                      onPointerMove={updateAnnotation}
                      onPointerUp={commitAnnotation}
                    >
                      <defs>
                        <marker id="arrow-head" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                          <path d="M0,0 L0,6 L9,3 z" fill={inkColor} />
                        </marker>
                      </defs>
                      {[...selectedAnnotations, ...(draftAnnotation ? [draftAnnotation] : [])].map((annotation) => (
                        <AnnotationShape
                          key={annotation.id}
                          annotation={annotation}
                          selected={annotation.id === selectedAnnotationId}
                          onTextChange={updateAnnotationText}
                          onResizeStart={(e, id) => {
                            e.stopPropagation();
                            const point = svgPoint(e as React.PointerEvent<SVGSVGElement>);
                            const original = annotations.find(item => item.id === id);
                            if (original) {
                              setResizeStart({
                                id,
                                x: point.x,
                                y: point.y,
                                original,
                                bounds: annotationBounds(original, 0),
                              });
                              const svg = e.currentTarget.closest('svg');
                              if (svg) {
                                svg.setPointerCapture(e.pointerId);
                              }
                            }
                          }}
                        />
                      ))}
                    </svg>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-white px-3 py-2">
                    <button onClick={() => setSelectedPageIndex(prev => Math.max(0, prev - 1))} className="rounded-xl p-2 hover:bg-surface-container-low" title={t.zh ? '上一页' : 'Previous page'}><ChevronLeft size={16} /></button>
                    <span className="min-w-16 text-center text-xs font-black">{selectedPageIndex + 1} / {pages.length}</span>
                    <button onClick={() => setSelectedPageIndex(prev => Math.min(pages.length - 1, prev + 1))} className="rounded-xl p-2 hover:bg-surface-container-low" title={t.zh ? '下一页' : 'Next page'}><ChevronRight size={16} /></button>
                    <div className="mx-1 h-5 w-px bg-outline-variant" />
                    <button onClick={() => movePage(selectedPageIndex, -1)} disabled={selectedPageIndex === 0} className="rounded-xl px-3 py-2 text-xs font-black text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:text-outline-variant" title={t.zh ? '页面前移' : 'Move page left'}>{'<'}</button>
                    <button onClick={() => movePage(selectedPageIndex, 1)} disabled={selectedPageIndex === pages.length - 1} className="rounded-xl px-3 py-2 text-xs font-black text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:text-outline-variant" title={t.zh ? '页面后移' : 'Move page right'}>{'>'}</button>
                    <button onClick={() => rotatePage(selectedPage.id)} className="rounded-xl p-2 text-primary hover:bg-primary/10" title={t.zh ? '旋转页面' : 'Rotate page'}><RotateCw size={16} /></button>
                    <button onClick={() => removePage(selectedPage.id)} className="rounded-xl p-2 text-error hover:bg-error/10" title={t.zh ? '删除页面' : 'Delete page'}><Trash2 size={16} /></button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-outline-variant bg-white p-4">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {pages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((page, localIndex) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + localIndex;
                  const isDragged = draggedIndex === globalIndex;
                  const isHovered = hoveredIndex === globalIndex;
                  
                  return (
                    <div
                      key={page.id}
                      onPointerMove={(e) => {
                        if (draggedIndex === null) return;
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const relativeX = e.clientX - rect.left;
                        const isLeftHalf = relativeX < rect.width / 2;
                        setHoveredIndex(globalIndex);
                        setInsertPosition(isLeftHalf ? 'left' : 'right');
                      }}
                      className={cn(
                        "relative group transition-opacity duration-200 select-none w-24 shrink-0",
                        isDragged && "opacity-40"
                      )}
                    >
                      {/* Visual Placeholder line */}
                      {isHovered && draggedIndex !== null && draggedIndex !== globalIndex && insertPosition === 'left' && (
                        <div className="absolute left-[-16px] top-0 bottom-0 w-1.5 bg-[#0b5cff] rounded-full z-30 animate-pulse shadow-[0_0_8px_rgba(11,92,255,0.8)]" />
                      )}
                      {isHovered && draggedIndex !== null && draggedIndex !== globalIndex && insertPosition === 'right' && (
                        <div className="absolute right-[-16px] top-0 bottom-0 w-1.5 bg-[#0b5cff] rounded-full z-30 animate-pulse shadow-[0_0_8px_rgba(11,92,255,0.8)]" />
                      )}

                      <button onClick={() => setSelectedPageIndex(globalIndex)} className={cn("bg-white rounded-xl border-2 shadow-sm group-hover:border-primary group-hover:shadow-xl transition-all flex flex-col overflow-hidden w-full", selectedPageIndex === globalIndex ? 'border-primary' : 'border-outline-variant')}>
                         <div className="flex h-24 items-center justify-center overflow-hidden bg-slate-50 p-1">
                           {/* Render PDF page image preview */}
                           <img 
                             src={page.url} 
                             alt={page.title} 
                             onLoad={() => {
                               setLoadedImages(prev => ({ ...prev, [page.id]: true }));
                             }}
                             style={{ transform: `rotate(${page.rotation}deg)` }}
                             className="max-h-full max-w-full object-contain shadow-sm rounded transition-transform duration-200 pointer-events-none"
                             draggable={false}
                           />
                           {!loadedImages[page.id] && (
                             <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                               <Loader2 className="w-5 h-5 text-outline animate-spin" />
                             </div>
                           )}
                         </div>
                         <div className="flex h-16 flex-col justify-between gap-1 border-t border-outline-variant bg-surface-container-low px-2 py-1.5 select-none">
                            <span className="text-[10px] font-black text-outline">P. {page.num}</span>
                            <div className="grid grid-cols-4 gap-1">
                               <button 
                                 onClick={(event) => { event.stopPropagation(); movePage(globalIndex, -1); }} 
                                 disabled={globalIndex === 0}
                                 className="rounded-md px-1 py-1 text-[10px] font-black text-outline hover:bg-primary/10 hover:text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                                 title={t.zh ? '前移页面' : 'Move left'}
                               >
                                 {'<'}
                               </button>
                               <button 
                                 onClick={(event) => { event.stopPropagation(); movePage(globalIndex, 1); }} 
                                 disabled={globalIndex === pages.length - 1}
                                 className="rounded-md px-1 py-1 text-[10px] font-black text-outline hover:bg-primary/10 hover:text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                                 title={t.zh ? '后移页面' : 'Move right'}
                               >
                                 {'>'}
                               </button>
                               <button 
                                 onClick={(event) => { event.stopPropagation(); rotatePage(page.id); }} 
                                 className="p-1.5 hover:bg-primary/10 text-outline hover:text-primary rounded-lg transition-colors"
                                 title="Rotate 90°"
                               >
                                 <RotateCw size={12} />
                               </button>
                               <button 
                                 onClick={(event) => { event.stopPropagation(); removePage(page.id); }} 
                                 className="p-1.5 hover:bg-error/10 text-outline hover:text-error rounded-lg transition-colors"
                                 title="Delete Page"
                               >
                                 <Trash2 size={12} />
                               </button>
                            </div>
                         </div>
                      </button>
                      
                      {/* Drag handle hint */}
                      <div 
                        onPointerDown={(e) => {
                          if (!allImagesLoaded) return;
                          e.preventDefault();
                          setDraggedIndex(globalIndex);
                          setHoveredIndex(globalIndex);
                          setInsertPosition(null);
                          const target = e.currentTarget as HTMLElement;
                          target.setPointerCapture(e.pointerId);
                        }}
                        onPointerUp={(e) => {
                          if (draggedIndex === null) return;
                          const target = e.currentTarget as HTMLElement;
                          target.releasePointerCapture(e.pointerId);
                          
                          if (hoveredIndex !== null && hoveredIndex !== draggedIndex) {
                            setPages(prev => {
                              const next = [...prev];
                              const item = next[draggedIndex];
                              next.splice(draggedIndex, 1);
                              
                              let insertAt = hoveredIndex;
                              if (insertPosition === 'right') {
                                insertAt = draggedIndex < hoveredIndex ? hoveredIndex : hoveredIndex + 1;
                              } else {
                                insertAt = draggedIndex < hoveredIndex ? hoveredIndex - 1 : hoveredIndex;
                              }
                              
                              next.splice(Math.max(0, insertAt), 0, item);
                              return next;
                            });
                          }
                          setDraggedIndex(null);
                          setHoveredIndex(null);
                          setInsertPosition(null);
                        }}
                        className={cn(
                          "absolute top-2 left-2 p-1 bg-white/95 border border-outline-variant shadow-sm rounded transition-opacity cursor-grab active:cursor-grabbing",
                          allImagesLoaded ? "opacity-0 group-hover:opacity-100" : "opacity-40 cursor-not-allowed"
                        )}
                        title={allImagesLoaded ? "Drag to reorder" : "Wait for preview loading..."}
                      >
                         <GripVertical size={12} className="text-outline" />
                      </div>
                    </div>
                  );
                })}
                
                {/* Add Page Card */}
                {currentPage === Math.ceil(pages.length / itemsPerPage) && (
                  <button 
                    onClick={() => { setIsCloudOpen(true); fetchCloudFiles(); }}
                    className="flex h-40 w-24 shrink-0 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-outline-variant text-outline transition-all hover:border-primary hover:bg-primary/5 hover:text-primary group"
                  >
                     <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus size={24} />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest">{t.zh ? '追加合并' : 'Merge File'}</span>
                  </button>
                )}
              </div>

              {/* Pagination controls */}
              {Math.ceil(pages.length / itemsPerPage) > 1 && (
                <div className="col-span-full mt-8 flex justify-center items-center gap-4 bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/30 max-w-md mx-auto select-none">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      "px-4 py-2 text-xs font-black rounded-xl transition-all border border-outline-variant",
                      currentPage === 1 ? "text-outline-variant cursor-not-allowed" : "text-primary hover:bg-white bg-surface-container-low"
                    )}
                  >
                    {t.zh ? '上一页' : 'Prev'}
                  </button>
                  <span className="text-xs font-black text-on-surface">
                    {currentPage} / {Math.ceil(pages.length / itemsPerPage)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(pages.length / itemsPerPage), prev + 1))}
                    disabled={currentPage === Math.ceil(pages.length / itemsPerPage)}
                    className={cn(
                      "px-4 py-2 text-xs font-black rounded-xl transition-all border border-outline-variant",
                      currentPage === Math.ceil(pages.length / itemsPerPage) ? "text-outline-variant cursor-not-allowed" : "text-primary hover:bg-white bg-surface-container-low"
                    )}
                  >
                    {t.zh ? '下一页' : 'Next'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel / Info */}
          <div className="space-y-6 print:hidden">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 ambient-shadow space-y-8">
              <div>
                <h3 className="text-lg font-black tracking-tight mb-6 flex items-center gap-2">
                   <Activity size={20} className="text-primary" />
                   {t.zh ? '编辑与导出' : 'Edit & Export'}
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
                     <span className="text-[10px] font-black text-outline uppercase tracking-wider block mb-1">{t.zh ? '当前总页数' : 'Total Pages'}</span>
                     <span className="text-2xl font-black text-on-surface">{pages.length}</span>
                  </div>
                  
	                  <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
	                     <span className="text-[10px] font-black text-outline uppercase tracking-wider block mb-1">{t.zh ? '批注数量' : 'Annotations'}</span>
	                     <span className="text-xs font-bold text-on-surface truncate block">
	                       {annotations.length} {t.zh ? '个批注对象' : 'annotation object(s)'}
	                     </span>
	                  </div>

	                  <label className="block p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
	                     <span className="text-[10px] font-black text-outline uppercase tracking-wider block mb-2">{t.zh ? '导出文件名' : 'Export Filename'}</span>
	                     <input
	                       value={exportFilename}
	                       onChange={(e) => setExportFilename(e.target.value)}
	                       className="w-full bg-white border border-outline-variant rounded-xl px-3 py-2 text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
	                     />
	                  </label>
	                </div>
	              </div>

              <div className="pt-8 border-t border-outline-variant">
                <button 
                  onClick={handleExport}
                  className="w-full bg-primary text-on-primary py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                   <Combine size={16} />
                   {t.zh ? '导出 PDF' : 'Export PDF'}
                </button>
                <button 
                  onClick={handleLayeredExport}
                  className="mt-3 w-full bg-[#1e1e1e] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:brightness-125 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <Printer size={16} />
                   {t.zh ? '导出批注版' : 'Export Annotated'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Selector Modal */}
      <AnimatePresence>
        {isCloudOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-20">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCloudOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-full"
            >
              <div className="p-8 border-b border-outline-variant flex items-center justify-between bg-surface-container-low/30">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Cloud className="text-primary w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl tracking-tight">{t.zh ? '选择云盘 PDF' : 'Select Cloud PDF'}</h3>
                    <p className="text-[10px] font-black text-outline uppercase tracking-widest">{t.zh ? '仅显示云盘中的 PDF 文档' : 'Only showing PDF files in Drive'}</p>
                  </div>
                </div>
                <button onClick={() => setIsCloudOpen(false)} className="p-3 hover:bg-surface-container-low rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 flex-1 overflow-y-auto bg-surface-container-lowest">
                 {loadingCloud ? (
                   <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-[10px] font-black text-outline uppercase tracking-widest">{t.zh ? '扫描云盘...' : 'Scanning Cloud...'}</p>
                   </div>
                 ) : cloudFiles.length > 0 ? (
                   <div className="grid grid-cols-1 gap-3">
                      {cloudFiles.map((file, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-2xl border border-outline-variant/30 hover:bg-primary/5 hover:border-primary/30 transition-all text-left group"
                        >
                           <div className="flex items-center gap-4">
                              <FileText className="text-outline group-hover:text-primary transition-colors" size={20} />
                              <span className="text-sm font-bold text-on-surface tracking-tight">{file.filename || file.object_name}</span>
                           </div>
                           <div className="flex items-center gap-2">
                             {pages.length > 0 ? (
                               <button 
                                 onClick={() => handleMergeCloudFile(file.object_name)}
                                 className="px-4 py-2 bg-surface-container-low text-primary border border-primary/20 rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-primary hover:text-white transition-all"
                               >
                                 {t.zh ? '追加合并' : 'Append Page(s)'}
                               </button>
                             ) : (
                               <button 
                                 onClick={() => handleSelectCloudFile(file.object_name)}
                                 className="px-4 py-2 bg-primary text-on-primary rounded-xl font-black text-[9px] uppercase tracking-wider hover:brightness-110 transition-all"
                               >
                                 {t.zh ? '加载编辑' : 'Load Document'}
                               </button>
                             )}
                           </div>
                        </div>
                      ))}
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center py-12 text-outline space-y-4">
                      <FileText size={48} className="opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">{t.zh ? '云盘中暂无 PDF 格式文件' : 'No PDF files found in Cloud drive'}</p>
                      <label className="px-5 py-2.5 bg-[#1e1e1e] text-white rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:scale-105 transition-transform">
                        {t.zh ? '上传本地 PDF' : 'Upload Local PDF'}
                        <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleUploadLocal(e, pages.length > 0)} />
                      </label>
                   </div>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Progress Modal */}
      <AnimatePresence>
        {isExporting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-12 text-center space-y-8"
            >
              <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto border border-primary/10 shadow-lg">
                {exportStatus === 'success' ? (
                  <CheckCircle2 size={40} className="text-[#0b5cff]" />
                ) : exportStatus === 'failed' ? (
                  <X size={40} className="text-error" />
                ) : (
                  <Loader2 size={40} className="text-primary animate-spin" />
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight text-on-surface">
                  {exportStatus === 'success' ? (t.zh ? 'PDF 导出成功' : 'PDF Exported Successfully') : 
                   exportStatus === 'failed' ? (t.zh ? 'PDF 导出失败' : 'Export Failed') : 
                   (t.zh ? '正在执行云端分布式重组...' : 'Processing Distributed PDF...')}
                </h3>
                <p className="text-xs font-bold text-outline uppercase tracking-widest">
                  {exportStatus === 'success' ? (t.zh ? '您可以下载新生成的文档' : 'Your new PDF is ready') :
                   exportStatus === 'failed' ? (t.zh ? '导出遇到了未知错误' : 'Something went wrong') :
                   (t.zh ? '调用工作节点并同步状态中' : 'Spinning up worker nodes')}
                </p>
              </div>

              <div className="w-full bg-surface-container h-3 rounded-full overflow-hidden shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${exportProgress}%` }}
                  className={cn(
                    "h-full rounded-full transition-colors duration-500",
                    exportStatus === 'success' ? "bg-[#0b5cff]" : exportStatus === 'failed' ? "bg-error" : "bg-primary animate-pulse"
                  )}
                />
              </div>

              <div className="flex gap-4 pt-4">
                {exportStatus === 'success' ? (
                  <>
                    <button 
                      onClick={() => setIsExporting(false)}
                      className="flex-1 py-4 border border-outline-variant rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-container-low transition-all"
                    >
                      {t.zh ? '关闭' : 'Close'}
                    </button>
                    <button 
                      onClick={handleDownload}
                      className="flex-1 py-4 bg-[#1e1e1e] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:brightness-125 transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={14} />
                      {t.zh ? '立即下载' : 'Download Now'}
                    </button>
                  </>
                ) : exportStatus === 'failed' ? (
                  <button 
                    onClick={() => setIsExporting(false)}
                    className="w-full py-4 bg-error text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all"
                  >
                    {t.zh ? '返回重试' : 'Close & Retry'}
                  </button>
                ) : (
                  <button 
                    disabled 
                    className="w-full py-4 bg-surface-container text-outline rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-wait flex items-center justify-center gap-2"
                  >
                    <Loader2 size={14} className="animate-spin" />
                    {t.zh ? `已完成: ${Math.floor(exportProgress)}%` : `Progress: ${Math.floor(exportProgress)}%`}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function pointsToPath(points: Array<{ x: number; y: number }> = []) {
  if (!points.length) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function annotationBounds(annotation: Annotation, padding = 10) {
  if (annotation.tool === 'pen' || annotation.tool === 'line' || annotation.tool === 'arrow') {
    const points = annotation.points || [];
    if (points.length) {
      const xs = points.map(point => point.x);
      const ys = points.map(point => point.y);
      return {
        x: Math.min(...xs) - padding,
        y: Math.min(...ys) - padding,
        width: Math.max(...xs) - Math.min(...xs) + padding * 2,
        height: Math.max(...ys) - Math.min(...ys) + padding * 2,
      };
    }
  }

  const x = annotation.x || 0;
  const y = annotation.y || 0;
  const width = annotation.width || 0;
  const height = annotation.height || 0;

  if (annotation.tool === 'text') {
    const size = annotation.size || 16;
    const w = Math.abs(width || 260);
    const h = Math.abs(height || 56);
    return {
      x: x - padding,
      y: y - size - padding,
      width: w + padding * 2,
      height: h + padding * 2,
    };
  }

  // For 'rect'
  const x1 = Math.min(x, x + width);
  const y1 = Math.min(y, y + height);
  const w = Math.abs(width);
  const h = Math.abs(height);
  return {
    x: x1 - padding,
    y: y1 - padding,
    width: w + padding * 2,
    height: h + padding * 2,
  };
}

const AnnotationShape: React.FC<{
  annotation: Annotation;
  selected: boolean;
  onTextChange: (id: string, text: string) => void;
  onResizeStart?: (event: React.PointerEvent<SVGElement>, id: string) => void;
}> = ({ annotation, selected, onTextChange, onResizeStart }) => {
  const x = annotation.x || 0;
  const y = annotation.y || 0;
  const width = annotation.width || 0;
  const height = annotation.height || 0;
  const x1 = Math.min(x, x + width);
  const y1 = Math.min(y, y + height);
  const w = Math.abs(width);
  const h = Math.abs(height);
  const end = annotation.points?.[annotation.points.length - 1];
  const start = annotation.points?.[0];

  const bounds = annotationBounds(annotation, 0);

  const selection = selected ? (
    <g>
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="none"
        stroke="#0b5cff"
        strokeWidth={2}
        strokeDasharray="8 6"
        pointerEvents="none"
      />
      <circle
        cx={bounds.x + bounds.width}
        cy={bounds.y + bounds.height}
        r={6}
        fill="#ffffff"
        stroke="#0b5cff"
        strokeWidth={2.5}
        style={{ cursor: 'se-resize' }}
        onPointerDown={(e) => {
          if (onResizeStart) {
            onResizeStart(e, annotation.id);
          }
        }}
      />
    </g>
  ) : null;

  if (annotation.tool === 'pen') {
    return (
      <g data-annotation-id={annotation.id}>
        <path
          data-annotation-id={annotation.id}
          d={pointsToPath(annotation.points)}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(annotation.size + 18, 24)}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="stroke"
        />
        <path
          data-annotation-id={annotation.id}
          d={pointsToPath(annotation.points)}
          fill="none"
          stroke={annotation.color}
          strokeWidth={annotation.size}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {selection}
      </g>
    );
  }

  if (annotation.tool === 'rect') {
    return (
      <g data-annotation-id={annotation.id}>
        <rect
          data-annotation-id={annotation.id}
          x={x1}
          y={y1}
          width={w}
          height={h}
          fill="transparent"
          stroke={annotation.color}
          strokeWidth={annotation.size}
          rx={10}
          pointerEvents="all"
        />
        {selection}
      </g>
    );
  }

  if ((annotation.tool === 'arrow' || annotation.tool === 'line') && start && end) {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const head = 22 + annotation.size * 2;
    const left = {
      x: end.x - head * Math.cos(angle - Math.PI / 7),
      y: end.y - head * Math.sin(angle - Math.PI / 7),
    };
    const right = {
      x: end.x - head * Math.cos(angle + Math.PI / 7),
      y: end.y - head * Math.sin(angle + Math.PI / 7),
    };
    return (
      <g data-annotation-id={annotation.id}>
        <line data-annotation-id={annotation.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="transparent" strokeWidth={Math.max(annotation.size + 22, 26)} strokeLinecap="round" pointerEvents="stroke" />
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={annotation.color} strokeWidth={annotation.size} strokeLinecap="round" />
        {annotation.tool === 'arrow' && <path d={`M ${end.x} ${end.y} L ${left.x} ${left.y} M ${end.x} ${end.y} L ${right.x} ${right.y}`} stroke={annotation.color} strokeWidth={annotation.size} strokeLinecap="round" fill="none" />}
        {selection}
      </g>
    );
  }

  if (annotation.tool === 'text') {
    if (selected) {
      return (
        <g data-annotation-id={annotation.id}>
          <foreignObject
            data-annotation-id={annotation.id}
            x={x}
            y={y - annotation.size}
            width={Math.max(annotation.width || 260, 120)}
            height={Math.max(annotation.height || 56, 40)}
          >
            <input
              xmlns="http://www.w3.org/1999/xhtml"
              value={annotation.text || ''}
              onChange={(event) => onTextChange(annotation.id, event.currentTarget.value)}
              onPointerDown={(event) => event.stopPropagation()}
              autoFocus
              style={{
                width: '100%',
                height: '100%',
                border: '2px solid #0b5cff',
                borderRadius: 8,
                color: annotation.color,
                fontSize: annotation.size,
                fontWeight: 700,
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.72)',
                outline: 'none',
              }}
            />
          </foreignObject>
          {selection}
        </g>
      );
    }
    return (
      <g data-annotation-id={annotation.id}>
        <rect
          data-annotation-id={annotation.id}
          x={annotationBounds(annotation).x}
          y={annotationBounds(annotation).y}
          width={annotationBounds(annotation).width}
          height={annotationBounds(annotation).height}
          fill="transparent"
          pointerEvents="all"
        />
        <text
          data-annotation-id={annotation.id}
          x={x}
          y={y}
          fill={annotation.color}
          fontSize={annotation.size}
          fontWeight={700}
          fontFamily="Arial, sans-serif"
        >
          {annotation.text || 'Text'}
        </text>
        {selection}
      </g>
    );
  }

  return null;
};
