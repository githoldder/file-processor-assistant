import React, { useState, useEffect } from 'react';
import { 
  convertFile, 
  getTaskStatus, 
  listFiles, 
  convertExistingFile,
  uploadFile,
  getConversionCapabilities,
  listTasks
} from '../services/api';
import type { CapabilityGroup, CapabilityItem, ConversionOptions, TaskItem } from '../services/api';
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
  RefreshCw,
  SlidersHorizontal,
  Table2
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

interface FileAnalysis {
  extension: string;
  category: string;
  previewRows?: string[][];
  columnCount?: number;
  rowCount?: number;
}

const P0_WHITELIST = [
  'word_to_pdf', 'doc_to_pdf', 'excel_to_pdf', 'csv_to_pdf', 'pptx_to_pdf', 'markdown_to_pdf', 'markdown_to_html',
  'svg_to_png', 'svg_to_pdf', 'png_to_pdf', 'jpg_to_pdf', 'jpeg_to_pdf', 'png_to_ico',
  'pdf_to_images'
];

const getDisplayName = (filename: string): string => {
  const base = filename.split('?')[0].split('/').pop() || '';
  const nameWithoutExt = base.includes('.') ? base.substring(0, base.lastIndexOf('.')) : base;
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[_-]/;
  const cleaned = nameWithoutExt.replace(uuidRegex, '');
  return cleaned;
};

export default function ConvertCenter() {
  const { lang, t } = useLanguage();
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [actualFile, setActualFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [targetFormat, setTargetFormat] = useState('word_to_pdf');
  const [displayName, setDisplayName] = useState('');
  const [excelPreset, setExcelPreset] = useState<'fit' | 'wide' | 'print'>('fit');
  const [showAdvancedExcel, setShowAdvancedExcel] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilityItem[]>([]);
  const [capabilityGroups, setCapabilityGroups] = useState<CapabilityGroup[]>([]);
  const [loadingCapabilities, setLoadingCapabilities] = useState(false);
  const [excelLayout, setExcelLayout] = useState<ConversionOptions['excel_layout']>({
    page_size: 'A4',
    orientation: 'landscape',
    max_columns: 8,
    font_size: 8,
    include_all_sheets: false,
    repeat_header: true,
  });
  
  const [activeTasks, setActiveTasks] = useState<TaskItem[]>([]);
  const [historyTasks, setHistoryTasks] = useState<TaskItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  // Cloud Selector State
  const [isCloudSelectorOpen, setIsCloudSelectorOpen] = useState(false);
  const [cloudFiles, setCloudFiles] = useState<any[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);

  useEffect(() => {
    const loadCapabilities = async () => {
      try {
        setLoadingCapabilities(true);
        const res = await getConversionCapabilities();
        setCapabilities(res.capabilities || []);
        setCapabilityGroups(res.groups || []);
      } catch (err) {
        console.error(err);
        setErrorMessage(t.zh ? '转换能力矩阵加载失败' : 'Failed to load conversion capabilities');
      } finally {
        setLoadingCapabilities(false);
      }
    };
    loadCapabilities();
  }, []);

  const fetchTasksData = async () => {
    try {
      setLoadingTasks(true);
      const res = await listTasks({ limit: 100 });
      const items = res.items || [];
      const active = items.filter((t) => ['queued', 'pending', 'processing'].includes(t.status));
      const history = items.filter((t) => ['completed', 'success', 'failed'].includes(t.status));
      setActiveTasks(active);
      setHistoryTasks(history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTasksData();
  }, [status, taskId]);

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

  const getExtension = (name: string) => {
    const clean = name.split('?')[0].toLowerCase();
    return clean.includes('.') ? clean.split('.').pop() || '' : '';
  };

  const isExcelConversion = () => targetFormat === 'excel_to_pdf' || targetFormat === 'excel_to_csv';

  const selectedExtension = selectedFile ? `.${getExtension(selectedFile.name)}` : '';

  const availableCapabilities = selectedExtension
    ? capabilities.filter((cap) => cap.from_ext.toLowerCase() === selectedExtension.toLowerCase() && P0_WHITELIST.includes(cap.key))
    : capabilities.filter(cap => P0_WHITELIST.includes(cap.key));

  const groupedAvailableCapabilities = capabilityGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((cap) => availableCapabilities.some((candidate) => candidate.key === cap.key)),
    }))
    .filter((group) => group.items.length > 0);

  const buildConversionOptions = (): ConversionOptions | undefined => {
    if (!isExcelConversion()) return undefined;
    return { excel_layout: excelLayout };
  };

  const analyzeLocalFile = async (file: File) => {
    const extension = getExtension(file.name);
    const category = ['xlsx', 'xls', 'csv'].includes(extension)
      ? 'Spreadsheet'
      : ['pdf', 'docx', 'pptx', 'md', 'txt'].includes(extension)
        ? 'Document'
        : ['png', 'jpg', 'jpeg', 'svg'].includes(extension)
          ? 'Image'
          : 'File';

    if (extension === 'csv' || extension === 'txt') {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 6);
      const previewRows = lines.map((line) => line.split(',').slice(0, 12));
      setFileAnalysis({
        extension,
        category,
        previewRows,
        rowCount: text.split(/\r?\n/).filter(Boolean).length,
        columnCount: Math.max(0, ...previewRows.map((row) => row.length)),
      });
      return;
    }

    setFileAnalysis({ extension, category });
  };

  const handleFileSelect = (name: string, size: string, type: string, isCloud = false, fileObj?: File) => {
    setSelectedFile({ name, size, type, isCloud });
    setStatus('detected');
    setErrorMessage('');
    const lowerName = name.toLowerCase();
    
    if (lowerName.endsWith('.docx')) setTargetFormat('word_to_pdf');
    else if (lowerName.endsWith('.doc')) setTargetFormat('doc_to_pdf');
    else if (lowerName.endsWith('.pdf')) setTargetFormat('pdf_to_images');
    else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) setTargetFormat('excel_to_pdf');
    else if (lowerName.endsWith('.csv')) setTargetFormat('csv_to_pdf');
    else if (lowerName.endsWith('.pptx')) setTargetFormat('pptx_to_pdf');
    else if (lowerName.endsWith('.md')) setTargetFormat('markdown_to_pdf');
    else if (lowerName.endsWith('.svg')) setTargetFormat('svg_to_png');
    else if (lowerName.endsWith('.png')) setTargetFormat('png_to_pdf');
    else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) setTargetFormat('jpg_to_pdf');
    else setTargetFormat('word_to_pdf');

    const defaultName = getDisplayName(name);
    const fileKey = isCloud ? `cloud:${name}` : (fileObj ? `local:${fileObj.name}:${fileObj.size}:${fileObj.lastModified}` : `local:${name}`);
    try {
      const mapJson = localStorage.getItem('culcloud_conversion_names');
      const map = mapJson ? JSON.parse(mapJson) : {};
      if (map[fileKey]) {
        setDisplayName(map[fileKey]);
      } else {
        setDisplayName(defaultName);
      }
    } catch (err) {
      setDisplayName(defaultName);
    }
  };

  useEffect(() => {
    if (!selectedFile || availableCapabilities.length === 0) return;
    if (!availableCapabilities.some((cap) => cap.key === targetFormat)) {
      setTargetFormat(availableCapabilities[0].key);
    }
  }, [selectedFile?.name, capabilities.length]);

  const handleStartConversion = async () => {
    if (!selectedFile) return;
    setStatus('processing');
    setProgress(5);
    try {
      const fileKey = selectedFile.isCloud 
        ? `cloud:${selectedFile.name}`
        : (actualFile ? `local:${actualFile.name}:${actualFile.size}:${actualFile.lastModified}` : `local:${selectedFile.name}`);
      try {
        const mapJson = localStorage.getItem('culcloud_conversion_names');
        const map = mapJson ? JSON.parse(mapJson) : {};
        map[fileKey] = displayName;
        localStorage.setItem('culcloud_conversion_names', JSON.stringify(map));
      } catch (err) {
        console.error(err);
      }

      let res;
      const options = buildConversionOptions() || {};
      const apiOptions = { ...options, displayName };
      if (selectedFile?.isCloud) {
        res = await convertExistingFile(selectedFile.name, targetFormat, apiOptions);
      } else if (actualFile) {
        const uploadRes = await uploadFile(actualFile);
        res = await convertExistingFile(uploadRes.object_name || uploadRes.filename || actualFile.name, targetFormat, apiOptions);
      } else {
        return;
      }

      if (res.task_id) {
        setTaskId(res.task_id);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : (t.zh ? '转换启动失败' : 'Failed to start conversion'));
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
            setErrorMessage(res.error || (t.zh ? '转换失败，请检查文件格式和导出设置。' : 'Conversion failed. Check the file type and export settings.'));
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
      if (downloadUrl.includes(':9000/')) {
        setErrorMessage(t.zh ? '已阻止不安全的 MinIO 直连下载链接，请重新转换。' : 'Blocked unsafe MinIO direct download URL. Please retry.');
        setStatus('failed');
        return;
      }
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.rel = 'noopener noreferrer';
      link.download = '';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setActualFile(null);
    setTaskId(null);
    setDownloadUrl(null);
    setErrorMessage('');
    setFileAnalysis(null);
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
                  analyzeLocalFile(file);
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
                      analyzeLocalFile(file);
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
                      disabled={loadingCapabilities || availableCapabilities.length === 0}
                    >
                      {groupedAvailableCapabilities.map((group) => (
                        <optgroup key={group.group} label={group.name}>
                          {group.items.map((cap) => (
                            <option key={cap.key} value={cap.key}>
                              {cap.name} ({cap.to_ext})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-4 lg:col-span-2">
                  <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em] block">
                    {t.zh ? '自定义输出文件名（不含扩展名）' : 'Custom Output Filename (No extension)'}
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none shadow-sm text-on-surface"
                    placeholder={t.zh ? '输入输出文件名...' : 'Enter output filename...'}
                  />
                </div>
              </div>

              {selectedFile && (
                <div className="px-8 pb-6 space-y-4">
                  <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/35 p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">
                          {t.zh ? '当前支持的高保真转换' : 'Supported High-Fidelity Formats'}
                        </p>
                        <p className="mt-1 text-sm font-black text-on-surface">
                          {availableCapabilities.length > 0
                            ? (t.zh ? `支持 ${availableCapabilities.length} 种高保真输出格式` : `Supports ${availableCapabilities.length} high-fidelity output format(s)`)
                            : (t.zh ? '该格式暂不支持高保真转换。如需其他实验性能力，请至‘实验转换能力’中查看。' : 'High-fidelity conversion is not supported for this extension. Check "Experimental Capabilities" for beta options.')}
                        </p>
                      </div>
                      {selectedExtension === '.pdf' && (
                        <a href="#" onClick={(e) => { e.preventDefault(); }} className="text-[10px] font-black uppercase tracking-widest text-primary">
                          {t.zh ? 'PDF 拆分/合并请使用 PDF 工作台' : 'Use PDF Workspace for split / merge'}
                        </a>
                      )}
                    </div>
                    {availableCapabilities.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {availableCapabilities.map((cap) => (
                          <button
                            key={cap.key}
                            onClick={() => setTargetFormat(cap.key)}
                            className={cn(
                              'rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all',
                              targetFormat === cap.key ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant bg-white text-outline hover:border-primary/40',
                            )}
                          >
                            {cap.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {isExcelConversion() && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em] block">
                        {t.zh ? '页面适配模式' : 'Page Fit Mode'}
                      </label>
                      <div className="flex p-1.5 bg-surface-container-low rounded-2xl gap-1 border border-outline-variant/30 max-w-lg shadow-inner">
                        {[
                          { id: 'fit', label: t.zh ? '自动适配' : 'Auto Fit' },
                          { id: 'wide', label: t.zh ? '宽表格' : 'Wide Sheet' },
                          { id: 'print', label: t.zh ? '打印友好' : 'Print Friendly' }
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => {
                              setExcelPreset(preset.id as any);
                              if (preset.id === 'fit') {
                                setExcelLayout({
                                  page_size: 'A4',
                                  orientation: 'landscape',
                                  max_columns: 8,
                                  font_size: 8,
                                  repeat_header: true,
                                  include_all_sheets: false
                                });
                              } else if (preset.id === 'wide') {
                                setExcelLayout({
                                  page_size: 'A3',
                                  orientation: 'landscape',
                                  max_columns: 16,
                                  font_size: 7,
                                  repeat_header: true,
                                  include_all_sheets: false
                                });
                              } else {
                                setExcelLayout({
                                  page_size: 'A4',
                                  orientation: 'portrait',
                                  max_columns: 6,
                                  font_size: 9,
                                  repeat_header: true,
                                  include_all_sheets: false
                                });
                              }
                            }}
                            className={cn(
                              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                              excelPreset === preset.id ? "bg-white shadow-sm text-primary" : "text-outline hover:bg-white/50"
                            )}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(fileAnalysis || isExcelConversion()) && (
                    <div>
                      <button
                        onClick={() => setShowAdvancedExcel(!showAdvancedExcel)}
                        className="text-xs font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-2"
                      >
                        {showAdvancedExcel ? (t.zh ? '收起高级布局设置' : 'Hide Advanced Layout Settings') : (t.zh ? '展开高级布局设置...' : 'Expand Advanced Layout Settings...')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {showAdvancedExcel && (fileAnalysis || isExcelConversion()) && (
                <div className="px-8 pb-8 grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-6 animate-fadeIn">
                  <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low/40 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <Table2 className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black tracking-tight">{t.zh ? '文件解析' : 'File Analysis'}</h3>
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">
                          {fileAnalysis?.category || (t.zh ? '表格文件' : 'Spreadsheet')} · {fileAnalysis?.extension || 'xlsx'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white/70 border border-outline-variant/30 p-4">
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">{t.zh ? '估计列数' : 'Columns'}</p>
                        <p className="text-xl font-black text-on-surface">{fileAnalysis?.columnCount ?? excelLayout.max_columns}</p>
                      </div>
                      <div className="rounded-xl bg-white/70 border border-outline-variant/30 p-4">
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">{t.zh ? '导出上限' : 'Export Cap'}</p>
                        <p className="text-xl font-black text-on-surface">{excelLayout.max_columns}</p>
                      </div>
                    </div>

                    {fileAnalysis?.previewRows && fileAnalysis.previewRows.length > 0 && (
                      <div className="max-h-40 overflow-auto rounded-xl border border-outline-variant/40 bg-white">
                        <table className="w-full text-left text-[11px]">
                          <tbody>
                            {fileAnalysis.previewRows.map((row, rowIndex) => (
                              <tr key={rowIndex} className="border-b border-outline-variant/20 last:border-0">
                                {row.map((cell, cellIndex) => (
                                  <td key={cellIndex} className="px-3 py-2 font-semibold text-on-surface/80 whitespace-nowrap">
                                    {cell || '--'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {isExcelConversion() && (
                    <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low/40 p-6 space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <SlidersHorizontal className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black tracking-tight">{t.zh ? 'Excel 导出布局' : 'Excel Export Layout'}</h3>
                          <p className="text-[10px] font-black text-outline uppercase tracking-widest">
                            {t.zh ? '控制页面、列数 and 字体，减少错位与溢出' : 'Control page, columns and font to avoid overflow'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <label className="space-y-2">
                          <span className="text-[10px] font-black text-outline uppercase tracking-widest">{t.zh ? '页面' : 'Page'}</span>
                          <select
                            value={excelLayout.page_size}
                            onChange={(e) => setExcelLayout((prev) => ({ ...prev, page_size: e.target.value as 'A4' | 'A3' }))}
                            className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-xs font-black outline-none"
                          >
                            <option value="A4">A4</option>
                            <option value="A3">A3</option>
                          </select>
                        </label>
                        <label className="space-y-2">
                          <span className="text-[10px] font-black text-outline uppercase tracking-widest">{t.zh ? '方向' : 'Orientation'}</span>
                          <select
                            value={excelLayout.orientation}
                            onChange={(e) => setExcelLayout((prev) => ({ ...prev, orientation: e.target.value as 'portrait' | 'landscape' }))}
                            className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-xs font-black outline-none"
                          >
                            <option value="landscape">{t.zh ? '横向' : 'Landscape'}</option>
                            <option value="portrait">{t.zh ? '纵向' : 'Portrait'}</option>
                          </select>
                        </label>
                        <label className="space-y-2">
                          <span className="text-[10px] font-black text-outline uppercase tracking-widest">{t.zh ? '字号' : 'Font'}</span>
                          <input
                            type="number"
                            min={6}
                            max={12}
                            value={excelLayout.font_size}
                            onChange={(e) => setExcelLayout((prev) => ({ ...prev, font_size: Number(e.target.value) }))}
                            className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-xs font-black outline-none"
                          />
                        </label>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-outline uppercase tracking-widest">{t.zh ? '导出列数' : 'Export Columns'}</span>
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">{excelLayout.max_columns}</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={24}
                          value={excelLayout.max_columns}
                          onChange={(e) => setExcelLayout((prev) => ({ ...prev, max_columns: Number(e.target.value) }))}
                          className="w-full accent-primary"
                        />
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-3 text-xs font-black text-outline uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={excelLayout.repeat_header}
                            onChange={(e) => setExcelLayout((prev) => ({ ...prev, repeat_header: e.target.checked }))}
                            className="w-5 h-5 rounded-lg border-outline-variant text-primary focus:ring-primary/20"
                          />
                          {t.zh ? '重复表头' : 'Repeat Header'}
                        </label>
                        <label className="flex items-center gap-3 text-xs font-black text-outline uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={excelLayout.include_all_sheets}
                            onChange={(e) => setExcelLayout((prev) => ({ ...prev, include_all_sheets: e.target.checked }))}
                            className="w-5 h-5 rounded-lg border-outline-variant text-primary focus:ring-primary/20"
                          />
                          {t.zh ? '全部工作表' : 'All Sheets'}
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                       {errorMessage && (
                         <p className="text-xs font-bold text-error leading-relaxed">
                           {errorMessage}
                         </p>
                       )}
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
                      disabled={availableCapabilities.length === 0}
                      className={cn(
                        "px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all",
                        availableCapabilities.length === 0
                          ? "bg-surface-container text-outline-variant cursor-not-allowed shadow-none"
                          : "bg-primary text-on-primary shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
                      )}
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
                            const extension = getExtension(file.object_name);
                            setFileAnalysis({
                              extension,
                              category: ['xlsx', 'xls', 'csv'].includes(extension) ? 'Spreadsheet' : 'Cloud File',
                            });
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

      {/* Dynamic Task Monitor lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Active Batch Processes */}
        {activeTasks.length > 0 ? (
          <div className="border border-outline-variant rounded-3xl bg-white p-6 min-h-[200px] flex flex-col shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-on-surface mb-4 flex items-center justify-between">
              <span>{lang === 'zh' ? '活跃批量任务' : 'Active Batch Tasks'}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">{activeTasks.length}</span>
            </h3>
            <div className="flex-1 overflow-auto max-h-60 space-y-3">
              {activeTasks.map((t) => (
                <div key={t.task_id} className="flex items-center justify-between p-3.5 bg-surface-container-low/40 rounded-2xl border border-outline-variant/30">
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-black text-on-surface truncate">{t.task_id.slice(0, 12)}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-surface-container-high text-outline">{t.kind}</span>
                    </div>
                    <p className="text-[10px] font-bold text-outline mt-1">{t.created_at ? new Date(t.created_at).toLocaleString() : '--'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed border-outline-variant rounded-3xl flex flex-col items-center justify-center gap-4 text-center min-h-[200px] bg-surface-container-low/5">
            <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center">
              <FilePdf className="w-6 h-6 text-outline" />
            </div>
            <p className="text-xs font-black text-outline uppercase tracking-widest">{t.convert.noActive}</p>
          </div>
        )}

        {/* Pipeline History */}
        {historyTasks.length > 0 ? (
          <div className="border border-outline-variant rounded-3xl bg-white p-6 min-h-[200px] flex flex-col shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-on-surface mb-4 flex items-center justify-between">
              <span>{lang === 'zh' ? '历史处理记录' : 'Pipeline History'}</span>
              <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-black text-outline">{historyTasks.length}</span>
            </h3>
            <div className="flex-1 overflow-auto max-h-60 space-y-3">
              {historyTasks.map((t) => (
                <div key={t.task_id} className="flex items-center justify-between p-3.5 bg-surface-container-low/20 rounded-2xl border border-outline-variant/30 hover:bg-surface-container-low/40 transition-colors">
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-black text-on-surface truncate">{t.task_id.slice(0, 12)}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-surface-container-high text-outline">{t.kind}</span>
                    </div>
                    <p className="text-[10px] font-bold text-outline mt-1">
                      {t.created_at ? new Date(t.created_at).toLocaleString() : '--'}
                      {t.started_at && t.completed_at && ` · ${((new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()) / 1000).toFixed(1)}s`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.status === 'success' || t.status === 'completed' ? (
                      <>
                        {t.result_url && (
                          <a href={t.result_url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-all" title={lang === 'zh' ? '下载结果' : 'Download Result'}>
                            <Download size={14} />
                          </a>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">{lang === 'zh' ? '成功' : 'Success'}</span>
                      </>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider text-error bg-error/5 px-2 py-0.5 rounded-lg border border-error/15" title={t.error}>{lang === 'zh' ? '失败' : 'Failed'}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed border-outline-variant rounded-3xl flex flex-col items-center justify-center gap-4 text-center min-h-[200px] bg-surface-container-low/5">
            <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-outline" />
            </div>
            <p className="text-xs font-black text-outline uppercase tracking-widest">{t.convert.historyEmpty}</p>
          </div>
        )}
      </div>
    </div>
  );
}
