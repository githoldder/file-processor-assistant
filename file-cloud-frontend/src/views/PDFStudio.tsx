import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
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
  Split,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
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
}

export default function PDFStudio() {
  const { t } = useLanguage();
  const [pages, setPages] = useState<WorkspacePage[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  
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
        rotation: 0
      }));

      if (append) {
        setPages(prev => [...prev, ...newPages]);
      } else {
        setPages(newPages);
        setCurrentFile(objectName);
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
  };

  const rotatePage = (id: string) => {
    setPages(pages.map(p => {
      if (p.id === id) {
        return { ...p, rotation: (p.rotation + 90) % 360 };
      }
      return p;
    }));
  };

  const resetWorkspace = () => {
    setPages([]);
    setCurrentFile(null);
    setError('');
  };

  const handleExport = async () => {
    if (pages.length === 0) return;
    try {
      setError('');
      setIsExporting(true);
      setExportProgress(10);
      setExportStatus('processing');
      setExportUrl(null);

      const payload: PDFPageProcessConfig[] = pages.map(p => ({
        source_object_name: p.source_object_name,
        page_num: p.num,
        rotation: p.rotation
      }));

      const res = await processPdf(payload, currentFile ? `edited_${currentFile.split('_').pop()}` : 'processed.pdf');
      setTaskId(res.task_id);
    } catch (err) {
      console.error(err);
      setExportStatus('failed');
      setError(t.zh ? '启动导出任务失败' : 'Failed to start export task');
    }
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
          <h1 className="text-4xl font-black tracking-tight text-on-surface font-display underline decoration-primary/20 decoration-8 underline-offset-4">{t.pdf.title}</h1>
          <p className="text-outline mt-1 text-lg font-medium">{t.pdf.subtitle}</p>
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
             <button 
               onClick={handleExport}
               className="bg-primary text-on-primary px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:brightness-125 transition-all shadow-xl shadow-primary/10"
             >
               <Download size={16} />
               {t.pdf.export}
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
            {t.zh ? '在线提取PDF各页面。支持无延迟旋转页面、删除页面、鼠标拖拽调整顺序，或追加其他文件完成合并。' : 'Rotate pages instantly, delete pages, drag to reorder, or merge pages from multiple documents.'}
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
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 min-h-[60vh]">
          {/* Reordering Grid (takes 3 columns) */}
          <div className="xl:col-span-3 bg-surface-container-lowest rounded-3xl border border-outline-variant overflow-hidden flex flex-col ambient-shadow">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/20">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-primary" />
                <span className="font-black text-sm tracking-tight truncate max-w-lg">{currentFile ? currentFile.split('_').pop() : 'PDF Studio Workspace'}</span>
              </div>
              <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                {pages.length} {t.zh ? '页文件' : 'Pages'}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 bg-surface-container-low/10">
              <Reorder.Group axis="y" values={pages} onReorder={setPages} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                {pages.map((page) => (
                  <Reorder.Item 
                    key={page.id} 
                    value={page}
                    className="relative group cursor-grab active:cursor-grabbing"
                  >
                    <div className="aspect-[3/4] bg-white rounded-xl border-2 border-outline-variant shadow-sm group-hover:border-primary group-hover:shadow-xl transition-all flex flex-col overflow-hidden">
                       <div className="flex-1 p-2 flex items-center justify-center overflow-hidden bg-slate-50 relative">
                         {/* Render PDF page image preview */}
                         <img 
                           src={page.url} 
                           alt={page.title} 
                           style={{ transform: `rotate(${page.rotation}deg)` }}
                           className="max-h-full max-w-full object-contain shadow-sm rounded transition-transform duration-200"
                           draggable={false}
                         />
                       </div>
                       <div className="bg-surface-container-low h-10 flex items-center justify-between px-3 border-t border-outline-variant">
                          <span className="text-[10px] font-black text-outline">P. {page.num}</span>
                          <div className="flex items-center gap-1">
                             <button 
                               onClick={() => rotatePage(page.id)} 
                               className="p-1.5 hover:bg-primary/10 text-outline hover:text-primary rounded-lg transition-colors"
                               title="Rotate 90°"
                             >
                               <RotateCw size={12} />
                             </button>
                             <button 
                               onClick={() => removePage(page.id)} 
                               className="p-1.5 hover:bg-error/10 text-outline hover:text-error rounded-lg transition-colors"
                               title="Delete Page"
                             >
                               <Trash2 size={12} />
                             </button>
                          </div>
                       </div>
                    </div>
                    {/* Drag handle hint */}
                    <div className="absolute top-2 left-2 p-1 bg-white/95 border border-outline-variant shadow-sm rounded opacity-0 group-hover:opacity-100 transition-opacity">
                       <GripVertical size={12} className="text-outline" />
                    </div>
                  </Reorder.Item>
                ))}
                
                {/* Add Page Card */}
                <button 
                  onClick={() => { setIsCloudOpen(true); fetchCloudFiles(); }}
                  className="aspect-[3/4] rounded-xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-4 text-outline hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group"
                >
                   <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus size={24} />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest">{t.zh ? '追加合并' : 'Merge File'}</span>
                </button>
              </Reorder.Group>
            </div>
          </div>

          {/* Right Panel / Info */}
          <div className="space-y-6">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 ambient-shadow space-y-8">
              <div>
                <h3 className="text-lg font-black tracking-tight mb-6 flex items-center gap-2">
                   <Activity size={20} className="text-primary" />
                   {t.zh ? '导出参数' : 'Export Parameters'}
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
                     <span className="text-[10px] font-black text-outline uppercase tracking-wider block mb-1">{t.zh ? '当前总页数' : 'Total Pages'}</span>
                     <span className="text-2xl font-black text-on-surface">{pages.length}</span>
                  </div>
                  
                  <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
                     <span className="text-[10px] font-black text-outline uppercase tracking-wider block mb-1">{t.zh ? '输入源文件' : 'Source Files'}</span>
                     <span className="text-xs font-bold text-on-surface truncate block">
                       {Array.from(new Set(pages.map(p => p.source_object_name))).length} 个文件
                     </span>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-outline-variant">
                <button 
                  onClick={handleExport}
                  className="w-full bg-primary text-on-primary py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                   <Combine size={16} />
                   {t.zh ? '导出新 PDF 文件' : 'Export PDF'}
                </button>
              </div>
            </div>

            {/* Cloud Compute Card */}
            <div className="bg-[#1e1e1e] text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                 <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">{t.pdf.cloudCompute}</p>
                 <h3 className="text-xl font-black mt-3 tracking-tight">{t.pdf.enableDistributed}</h3>
                 <p className="text-[10px] font-bold text-outline-variant mt-4 leading-relaxed tracking-wide">{t.zh ? '通过本地 12 个 YARN / Spark 任务工作网格分流并发进行 PDF 渲染与拼接。' : 'Accelerate OCR and rendering using our cluster of 12 worker nodes.'}</p>
                 <div className="mt-8 flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-wider">
                   <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                   {t.zh ? '分布式网格就绪' : 'Grid Active'}
                 </div>
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
                    <p className="text-[10px] font-black text-outline uppercase tracking-widest">{t.zh ? '仅列出已在 HDFS/MinIO 中存储的 PDF 文档' : 'Only showing PDF documents stored on Cloud'}</p>
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
