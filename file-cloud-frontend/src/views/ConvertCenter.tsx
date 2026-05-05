import React, { useState, useEffect } from 'react';
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
  FileIcon as FilePdf
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

type ConversionStatus = 'idle' | 'detected' | 'processing' | 'success';

interface SelectedFile {
  name: string;
  size: string;
  type: string;
}

export default function ConvertCenter() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [progress, setProgress] = useState(0);
  const [targetFormat, setTargetFormat] = useState('');

  const handleFileSelect = (name: string, size: string, type: string) => {
    setSelectedFile({ name, size, type });
    setStatus('detected');
    // Simple auto-detection logic
    if (name.endsWith('.docx') || name.endsWith('.doc')) setTargetFormat('.pdf');
    else if (name.endsWith('.jpg') || name.endsWith('.png')) setTargetFormat('.webp');
    else setTargetFormat('.pdf');
  };

  const handleStartConversion = () => {
    setStatus('processing');
    setProgress(0);
  };

  useEffect(() => {
    if (status === 'processing') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setStatus('success');
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [status]);

  const handleDownload = () => {
    if (!selectedFile) return;
    const blob = new Blob(['Mock data'], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted_${selectedFile.name.split('.')[0]}${targetFormat}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const reset = () => {
    setSelectedFile(null);
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
                if (file) handleFileSelect(file.name, `${(file.size / (1024 * 1024)).toFixed(2)} MB`, file.type);
              }}
            >
              <div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center mb-8 border border-primary/10 shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <FileUp size={48} className="text-primary" />
              </div>
              <h3 className="text-3xl font-black text-on-surface mb-3 font-display">{t.convert.dropPrompt}</h3>
              <p className="text-outline mb-12 max-w-lg leading-relaxed font-medium">{t.zh ? '从本地存储、S3 存储桶或 Google 云端硬盘批量处理文件。引擎将自动检测文件类型并建议处理流程。' : 'Bulk process files from local storage, S3 buckets, or Google Drive. Engine will automatically detect file types and suggest pipelines.'}</p>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md relative z-10">
                <button 
                  onClick={() => handleFileSelect('Report_2026.docx', '4.2 MB', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
                  className="flex-1 bg-[#1e1e1e] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] shadow-xl transition-all"
                >
                  {t.convert.local}
                </button>
                <button className="flex-1 bg-white border border-outline-variant px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-outline hover:bg-surface-container-low transition-all flex items-center justify-center gap-3">
                  <Cloud size={18} />
                  {t.convert.cloud}
                </button>
              </div>

              <div className="mt-16 flex items-center gap-12 text-outline/40">
                <div className="flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] group hover:text-primary transition-colors cursor-default"><FileText size={18} /> {t.convert.docs}</div>
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
                      <span className="text-[10px] font-black text-primary uppercase tracking-wider">{selectedFile?.type.split('/')[1]}</span>
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
                      <option value=".pdf">{t.zh ? '便携式文档格式 (.pdf)' : 'Portable Document Format (.pdf)'}</option>
                      <option value=".docx">{t.zh ? '微软 Word (.docx)' : 'Microsoft Word (.docx)'}</option>
                      <option value=".webp">{t.zh ? 'Web 图像格式 (.webp)' : 'Web Image Format (.webp)'}</option>
                      <option value=".md">{t.zh ? 'Markdown (.md)' : 'Markdown (.md)'}</option>
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
                        className={cn(
                          "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                          d === 'Auto' ? "bg-white shadow-sm text-primary" : "text-outline hover:bg-white/50"
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
                  {status === 'processing' || status === 'success' ? (
                    <div className="space-y-3">
                       <div className="w-full bg-surface-container h-3 rounded-full overflow-hidden shadow-inner">
                         <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className={cn(
                            "h-full rounded-full transition-colors duration-500",
                            status === 'success' ? "bg-[#0b5cff]" : "bg-primary animate-pulse"
                          )}
                         />
                       </div>
                       <div className="flex justify-between items-center">
                         <span className={cn("text-[10px] font-black uppercase tracking-widest", status === 'success' ? "text-[#0b5cff]" : "text-primary")}>
                            {status === 'success' ? (t.zh ? '转换完成' : 'Conversion Complete') : (t.zh ? `${t.dashboard.converting}: ${progress}%` : `Processing: ${progress}%`)}
                         </span>
                         {status === 'success' && <CheckCircle2 className="w-4 h-4 text-[#0b5cff]" />}
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Simplified Queue if needed or extra info */}
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
