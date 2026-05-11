import React, { useState, useEffect } from 'react';
import { 
  convertFile, 
  getTaskStatus, 
  listFiles, 
  convertExistingFile,
  uploadFile
} from '../services/api';
import { 
  FileUp, 
  Cloud, 
  FileText, 
  ImageIcon, 
  Database,
  Trash2,
  ChevronDown,
  Download,
  CheckCircle2,
  X,
  Loader2,
  FileIcon as FilePdf,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

type ConversionStatus = 'idle' | 'detected' | 'processing' | 'success' | 'failed';

interface SelectedFile {
  name: string;
  size: string;
  type: string;
  isCloud?: boolean;
}

export default function ConvertCenter() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [actualFile, setActualFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [targetFormat, setTargetFormat] = useState('word_to_pdf');
  const [fidelity, setFidelity] = useState('Auto');
  
  // Cloud Selector State
  const [isCloudSelectorOpen, setIsCloudSelectorOpen] = useState(false);
  const [cloudFiles, setCloudFiles] = useState<any[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);

  const fetchCloudFiles = async () => {
    try {
      setLoadingCloud(true);
      const res = await listFiles();
      setCloudFiles(res.files);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCloud(false);
    }
  };

  const handleFileSelect = (name: string, size: string, type: string, isCloud = false) => {
    setSelectedFile({ name, size, type, isCloud });
    setStatus('detected');
    // Simple auto-detection logic
    if (name.endsWith('.docx') || name.endsWith('.doc')) setTargetFormat('word_to_pdf');
    else if (name.endsWith('.pdf')) setTargetFormat('pdf_to_word');
    else if (name.endsWith('.xlsx')) setTargetFormat('excel_to_pdf');
    else if (name.endsWith('.pptx')) setTargetFormat('pptx_to_pdf');
    else setTargetFormat('word_to_pdf');
  };

  const handleStartConversion = async () => {
    setStatus('processing');
    setProgress(5);
    try {
      let res;
      if (selectedFile?.isCloud) {
        res = await convertExistingFile(selectedFile.name, targetFormat);
      } else if (actualFile) {
        // Upload the file to S3 API first so it appears in "My Files"
        const uploadRes = await uploadFile(actualFile);
        // Assuming uploadRes has an object_name property based on standard response
        res = await convertExistingFile(uploadRes.object_name || uploadRes.filename || actualFile.name, targetFormat);
      } else {
        return;
      }

      if (res.task_id) {
        setTaskId(res.task_id);
      }
    } catch (e) {
      console.error(e);
      setStatus('failed');
    }
  };

  useEffect(() => {
    if (status === 'processing' && taskId) {
      const interval = setInterval(async () => {
        try {
          const res = await getTaskStatus(taskId);
          if (res.status === 'success') {
            clearInterval(interval);
            setDownloadUrl(res.result_url);
            setStatus('success');
            setProgress(100);
          } else if (res.status === 'failed') {
            clearInterval(interval);
            setStatus('failed');
          } else {
            setProgress(prev => Math.min(prev + (Math.random() * 10), 95));
          }
        } catch (e) {
          console.error(e);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [status, taskId]);

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setActualFile(null);
    setTaskId(null);
    setDownloadUrl(null);
    setStatus('idle');
    setProgress(0);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-on-surface font-display underline decoration-primary/20 decoration-8 underline-offset-4">{t.convert.title}</h1>
        <p className="text-outline mt-1 text-lg font-medium">{t.convert.subtitle}</p>
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {status === 'idle' ? (
            <motion.div 
              key="dropzone"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-surface-container-lowest rounded-3xl border-2 border-dashed border-outline-variant p-20 flex flex-col justify-center items-center text-center relative group transition-all hover:border-primary/50 hover:bg-surface-container-low/20"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  setActualFile(file);
                  handleFileSelect(file.name, `${(file.size / (1024 * 1024)).toFixed(2)} MB`, file.type);
                }
              }}
            >
              <div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center mb-8 border border-primary/10 shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <FileUp size={48} className="text-primary" />
              </div>
              <h3 className="text-3xl font-black text-on-surface mb-3 font-display">{t.convert.dropPrompt}</h3>
              <p className="text-outline mb-12 max-w-lg leading-relaxed font-medium">{t.zh ? '从本地存储或云端全量加速处理文件。引擎将自动检测文件类型并建议处理流程。' : 'Bulk process files from local or cloud storage. Engine will automatically detect file types and suggest pipelines.'}</p>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md relative z-10">
                <label className="flex-1 bg-[#1e1e1e] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] shadow-xl transition-all text-center cursor-pointer">
                  {t.convert.local}
                  <input type="file" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setActualFile(file);
                      handleFileSelect(file.name, `${(file.size / (1024 * 1024)).toFixed(2)} MB`, file.type);
                    }
                  }} />
                </label>
                <button 
                  onClick={() => { setIsCloudSelectorOpen(true); fetchCloudFiles(); }}
                  className="flex-1 bg-white border border-outline-variant px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-outline hover:bg-surface-container-low transition-all flex items-center justify-center gap-3"
                >
                  <Cloud size={18} />
                  {t.convert.cloud}
                </button>
              </div>

              <div className="mt-16 flex items-center gap-12 text-outline/40">
                <div className="flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] group hover:text-primary transition-colors cursor-default"><FilePdf size={18} /> {t.convert.docs}</div>
                <div className="flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] group hover:text-emerald-500 transition-colors cursor-default"><ImageIcon size={18} /> {t.convert.images}</div>
                <div className="flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] group hover:text-sky-500 transition-colors cursor-default"><Database size={18} /> {t.convert.datasets}</div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="config"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface-container-lowest rounded-3xl border border-outline-variant shadow-2xl overflow-hidden"
            >
              <div className="bg-surface-container-low px-8 py-6 border-b border-outline-variant flex justify-between items-center bg-gradient-to-r from-surface-container-low to-surface-container-lowest">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <FileText size={24} className="text-primary" />
                  </div>
                  <div>
                    <span className="font-black text-xl text-on-surface block tracking-tight">{selectedFile?.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-black text-outline uppercase tracking-wider">{selectedFile?.size}</span>
                      <div className="w-1 h-1 rounded-full bg-outline-variant" />
                      <span className="text-[10px] font-black text-primary uppercase tracking-wider">
                         {selectedFile?.isCloud ? 'Cloud File' : (selectedFile?.type?.split('/')[1] || 'DOC')}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={reset}
                  className="text-error hover:bg-error/5 p-3 rounded-2xl transition-colors"
                >
                  <Trash2 size={24} />
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em] block">{t.convert.targetFormat}</label>
                  <div className="relative">
                    <select 
                      value={targetFormat}
                      onChange={(e) => setTargetFormat(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer outline-none shadow-sm"
                    >
                      <option value="word_to_pdf">{t.zh ? '便携式文档格式 (.pdf)' : 'Portable Document Format (.pdf)'}</option>
                      <option value="pdf_to_word">{t.zh ? '微软 Word (.docx)' : 'Microsoft Word (.docx)'}</option>
                      <option value="excel_to_pdf">{t.zh ? 'Excel 转 PDF (.pdf)' : 'Excel to PDF (.pdf)'}</option>
                      <option value="pptx_to_pdf">{t.zh ? 'PPTX 转 PDF (.pdf)' : 'PPTX to PDF (.pdf)'}</option>
                      <option value="pdf_to_html">{t.zh ? 'PDF 转 HTML (.html)' : 'PDF to HTML (.html)'}</option>
                    </select>
                    <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em] block">{t.convert.dpi}</label>
                  <div className="flex p-1.5 bg-surface-container-low rounded-2xl gap-1 border border-outline-variant/30 shadow-inner">
                    {['300', '600', 'Auto'].map((d) => (
                      <button 
                        key={d}
                        onClick={() => setFidelity(d)}
                        className={cn(
                          "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                          fidelity === d ? "bg-white shadow-sm text-primary" : "text-outline hover:bg-white/50"
                        )}
                      >
                        {d} {d !== 'Auto' && 'DPI'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em] block">{t.convert.processing}</label>
                  <div className="flex items-center gap-6 py-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" defaultChecked className="w-5 h-5 rounded-lg border-outline-variant text-primary focus:ring-primary/20 transition-all" />
                      <span className="text-xs font-black text-outline group-hover:text-on-surface uppercase tracking-wider">OCR</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded-lg border-outline-variant text-primary focus:ring-primary/20 transition-all" />
                      <span className="text-xs font-black text-outline group-hover:text-on-surface uppercase tracking-wider">LZO</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="px-8 pb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex-1 w-full max-w-lg">
                  {status === 'processing' || status === 'success' || status === 'failed' ? (
                    <div className="space-y-3">
                       <div className="w-full bg-surface-container h-3 rounded-full overflow-hidden shadow-inner">
                         <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className={cn(
                            "h-full rounded-full transition-colors duration-500",
                            status === 'success' ? "bg-[#0b5cff]" : status === 'failed' ? "bg-error" : "bg-primary animate-pulse"
                          )}
                         />
                       </div>
                       <div className="flex justify-between items-center">
                         <span className={cn("text-[10px] font-black uppercase tracking-widest", 
                           status === 'success' ? "text-[#0b5cff]" : status === 'failed' ? "text-error" : "text-primary"
                         )}>
                            {status === 'success' ? (t.zh ? '转换完成' : 'Conversion Complete') : 
                             status === 'failed' ? (t.zh ? '转换失败' : 'Conversion Failed') :
                             (t.zh ? `${t.dashboard.converting}: ${Math.floor(progress)}%` : `Processing: ${Math.floor(progress)}%`)}
                         </span>
                         {status === 'success' && <CheckCircle2 className="w-4 h-4 text-[#0b5cff]" />}
                         {status === 'failed' && <X className="w-4 h-4 text-error" />}
                       </div>
                    </div>
                  ) : (
                    <div className="text-[10px] font-black text-outline-variant uppercase tracking-widest flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                       {t.convert.ready}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {status === 'detected' && (
                    <button 
                      onClick={handleStartConversion}
                      className="bg-primary text-on-primary px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {t.convert.initialize}
                    </button>
                  )}
                  {status === 'processing' && (
                    <button disabled className="bg-surface-container text-outline px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] cursor-wait flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.convert.inQueue}
                    </button>
                  )}
                  {status === 'success' && (
                    <button 
                      onClick={handleDownload}
                      className="bg-[#1e1e1e] text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:brightness-125 transition-all flex items-center gap-3"
                    >
                      <Download className="w-4 h-4" />
                      {t.convert.download}
                    </button>
                  )}
                   {status === 'failed' && (
                    <button 
                      onClick={reset}
                      className="bg-error text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all"
                    >
                      {t.zh ? '重试' : 'Retry'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cloud File Selector Modal */}
      <AnimatePresence>
        {isCloudSelectorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-20">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCloudSelectorOpen(false)}
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
                    <h3 className="font-black text-xl tracking-tight">{t.convert.cloud}</h3>
                    <p className="text-[10px] font-black text-outline uppercase tracking-widest">{t.zh ? '从云端存储选择文件' : 'Select from cloud storage'}</p>
                  </div>
                </div>
                <button onClick={() => setIsCloudSelectorOpen(false)} className="p-3 hover:bg-surface-container-low rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 flex-1 overflow-y-auto bg-surface-container-lowest">
                 {loadingCloud ? (
                   <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-[10px] font-black text-outline uppercase tracking-widest">{t.zh ? '云端扫描中...' : 'Scanning Cloud...'}</p>
                   </div>
                 ) : cloudFiles.length > 0 ? (
                   <div className="grid grid-cols-1 gap-3">
                      {cloudFiles.map((file, idx) => (
                        <button 
                          key={idx}
                          onClick={() => {
                            handleFileSelect(file.object_name, `${(file.size / 1024).toFixed(2)} KB`, 'application/octet-stream', true);
                            setIsCloudSelectorOpen(false);
                          }}
                          className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-2xl border border-outline-variant/30 hover:bg-primary/5 hover:border-primary/30 transition-all text-left group"
                        >
                           <div className="flex items-center gap-4">
                              <FilePdf className="text-outline group-hover:text-primary transition-colors" size={20} />
                              <span className="text-sm font-bold text-on-surface tracking-tight">{file.object_name}</span>
                           </div>
                           <span className="text-[10px] font-black text-outline uppercase tracking-widest">{(file.size / 1024).toFixed(0)} KB</span>
                        </button>
                      ))}
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center py-12 text-outline space-y-4">
                      <RefreshCw size={48} className="opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">{t.zh ? '云端空空如也' : 'Cloud is empty'}</p>
                   </div>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Simplified History/Queue info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 opacity-60">
         <div className="p-8 border-2 border-dashed border-outline-variant rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center">
               <FilePdf className="w-6 h-6 text-outline" />
            </div>
            <p className="text-xs font-bold text-outline uppercase tracking-widest">{t.convert.noActive}</p>
         </div>
         <div className="p-8 border-2 border-dashed border-outline-variant rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center">
               <ImageIcon className="w-6 h-6 text-outline" />
            </div>
            <p className="text-xs font-bold text-outline uppercase tracking-widest">{t.convert.historyEmpty}</p>
         </div>
      </div>
    </div>
  );
}
