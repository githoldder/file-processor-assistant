import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  FileUp, FileType, FileText, Image, 
  Layers, CheckCircle, AlertCircle, Upload,
  Download, Trash2, RefreshCw, Settings, File, Play, Plus
} from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

interface FileItem {
  id: string;
  name: string;
  size: number;
  file: File;
  originalExt: string;
  targetFormat: string;
  status: 'uploading' | 'ready' | 'converting' | 'completed' | 'error';
  progress: number;
  resultUrl?: string;
  resultName?: string;
  taskId?: string;
  error?: string;
}

const ALL_CONVERSIONS = [
  // PDF conversions (backend supported)
  { from: 'pdf', to: 'word', toExt: 'docx', label: 'PDF → Word', icon: '📄' },
  { from: 'pdf', to: 'images', label: 'PDF → 图片', icon: '🖼️' },
  // Word conversions
  { from: 'docx', to: 'pdf', label: 'Word → PDF', icon: '📕' },
  { from: 'doc', to: 'pdf', label: 'Word → PDF', icon: '📕' },
  // Excel conversions
  { from: 'xlsx', to: 'pdf', label: 'Excel → PDF', icon: '📕' },
  { from: 'xls', to: 'pdf', label: 'Excel → PDF', icon: '📕' },
  // PPTX conversions
  { from: 'pptx', to: 'pdf', label: 'PPTX → PDF', icon: '📕' },
  { from: 'ppt', to: 'pdf', label: 'PPTX → PDF', icon: '📕' },
  // Image conversions
  { from: 'png', to: 'pdf', label: 'PNG → PDF', icon: '📕' },
  { from: 'jpg', to: 'pdf', label: 'JPG → PDF', icon: '📕' },
  { from: 'jpeg', to: 'pdf', label: 'JPG → PDF', icon: '📕' },
  // SVG conversions
  { from: 'svg', to: 'png', label: 'SVG → PNG', icon: '🖼️' },
  { from: 'svg', to: 'pdf', label: 'SVG → PDF', icon: '📕' },
  // Markdown
  { from: 'md', to: 'pdf', label: 'Markdown → PDF', icon: '📕' },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function getFileTypeLabel(ext: string): string {
  const labels: Record<string, string> = {
    'pdf': 'PDF文档',
    'docx': 'Word文档',
    'doc': 'Word文档',
    'xlsx': 'Excel表格',
    'xls': 'Excel表格',
    'pptx': 'PPT演示',
    'ppt': 'PPT演示',
    'png': 'PNG图片',
    'jpg': 'JPG图片',
    'jpeg': 'JPG图片',
    'svg': 'SVG矢量图',
    'md': 'Markdown',
  };
  return labels[ext] || ext.toUpperCase();
}

function getTargetFormatLabel(format: string): string {
  const labels: Record<string, string> = {
    'pdf': 'PDF',
    'docx': 'Word',
    'xlsx': 'Excel',
    'images': '图片',
    'png': 'PNG',
    'jpg': 'JPG',
  };
  return labels[format] || format;
}

function getConversionKey(from: string, to: string): string {
  const fromMap: Record<string, string> = {
    'docx': 'word',
    'doc': 'word',
    'xlsx': 'excel',
    'xls': 'excel',
    'pptx': 'pptx',
    'ppt': 'pptx',
    'md': 'markdown',
  };
  const toMap: Record<string, string> = {
    'word': 'word',
    'docx': 'word',
    'doc': 'word',
    'xlsx': 'excel',
    'xls': 'excel',
    'pptx': 'pptx',
    'ppt': 'pptx',
    'pdf': 'pdf',
    'images': 'images',
    'png': 'png',
    'jpg': 'jpg',
    'jpeg': 'jpg',
    'svg': 'svg',
    'md': 'markdown',
  };
  const mappedFrom = fromMap[from] || from;
  const mappedTo = toMap[to] || to;
  return `${mappedFrom}_to_${mappedTo}`;
}

function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreFileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const addFiles = (fileList: File[]) => {
    const newFiles: FileItem[] = fileList.map(file => {
      const ext = getFileExtension(file.name);
      // Find first available conversion for this file type
      const availableConversions = ALL_CONVERSIONS.filter(c => c.from === ext);
      const defaultTarget = availableConversions.length > 0 ? availableConversions[0].to : 'pdf';
      
      return {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        file: file,
        originalExt: ext,
        targetFormat: defaultTarget,
        status: 'uploading',
        progress: 0
      };
    });
    
    setFiles(prev => [...prev, ...newFiles]);
    
    newFiles.forEach(fileItem => {
      simulateUpload(fileItem.id);
    });
  };

  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'ready', progress: 100 } : f
        ));
      } else {
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress } : f
        ));
      }
    }, 150);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMoreFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
    if (moreFileInputRef.current) {
      moreFileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateTargetFormat = (fileId: string, newTarget: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, targetFormat: newTarget } : f
    ));
  };

  const getAvailableConversions = (ext: string) => {
    return ALL_CONVERSIONS.filter(c => c.from === ext);
  };

  const startConversion = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file || file.status !== 'ready') return;

    const conversionKey = getConversionKey(file.originalExt, file.targetFormat);

    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'converting', progress: 0 } : f
    ));

    try {
      const formData = new FormData();
      formData.append('file', file.file);
      
      const response = await axios.post(
        `${API_BASE}/convert?conversion_type=${conversionKey}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const taskId = response.data.task_id;
      
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, taskId, progress: 20 } : f
      ));

      pollTaskStatus(taskId, fileId);
    } catch (error: any) {
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'error', error: error.message || '上传失败' } : f
      ));
    }
  };

  const startAllConversions = () => {
    files.filter(f => f.status === 'ready').forEach(f => {
      startConversion(f.id);
    });
  };

  const pollTaskStatus = async (taskId: string, fileId: string) => {
    const poll = async () => {
      try {
        const response = await axios.get(`${API_BASE}/tasks/${taskId}`);
        const { status } = response.data;
        
        if (status === 'SUCCESS') {
          const targetFormat = files.find(f => f.id === fileId)?.targetFormat || 'pdf';
          const extMap: Record<string, string> = {
            'word': 'docx',
            'excel': 'pdf',
            'xlsx': 'xlsx',
            'pptx': 'pptx',
            'pdf': 'pdf',
            'markdown': 'pdf',
            'images': 'png',
            'svg': 'pdf',
          };
          const targetExt = extMap[targetFormat] || targetFormat;
          const originalName = files.find(f => f.id === fileId)?.name || 'file';
          const baseName = originalName.replace(/\.[^.]+$/, '');
          
          // Store the task ID for download - we'll fetch the file when clicked
          setFiles(prev => prev.map(f => 
            f.id === fileId ? { 
              ...f, 
              status: 'completed',
              progress: 100,
              taskId: taskId,
              resultName: `${baseName}_converted.${targetExt}`
            } : f
          ));
        } else if (status === 'FAILURE') {
          setFiles(prev => prev.map(f => 
            f.id === fileId ? { 
              ...f, 
              status: 'error',
              error: '转换失败'
            } : f
          ));
        } else {
          setFiles(prev => prev.map(f => 
            f.id === fileId ? { 
              ...f, 
              progress: Math.min(f.progress + 15, 90)
            } : f
          ));
          setTimeout(poll, 1500);
        }
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'error', error: '网络错误' } : f
        ));
      }
    };

    poll();
  };

  const handleDownload = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file || !file.taskId) {
      alert('没有可下载的文件');
      return;
    }

    const downloadUrl = `${API_BASE}/tasks/${file.taskId}/download`;
    console.log('Downloading from:', downloadUrl);

    try {
      const response = await fetch(downloadUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Download failed: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      console.log('Blob size:', blob.size, 'type:', blob.type);

      if (blob.size === 0) {
        throw new Error('下载的文件为空');
      }

      // Handle ZIP files (e.g., PDF to Images conversion)
      const isZip = blob.type === 'application/zip' || blob.type === 'application/x-zip-compressed';
      if (isZip) {
        console.log('Detected ZIP file, extracting...');
        
        // Extract the first image from ZIP and download it
        const extractedBlob = await extractFirstImageFromZip(blob);
        if (extractedBlob) {
          const url = window.URL.createObjectURL(extractedBlob);
          const link = document.createElement('a');
          link.href = url;
          // Use .png extension for the extracted image
          const baseName = file.name?.replace(/\.[^/.]+$/, '') || 'converted';
          link.download = `${baseName}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          return;
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.resultName || 'converted file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // Helper function to extract first image from ZIP
  const extractFirstImageFromZip = async (zipBlob: Blob): Promise<Blob | null> => {
    try {
      const buffer = await zipBlob.arrayBuffer();
      // Simple ZIP parser - find first .png or .jpg file
      const bytes = new Uint8Array(buffer);
      
      // Look for local file header signature (0x50 0x4B 0x03 0x04)
      for (let i = 0; i < bytes.length - 100; i++) {
        if (bytes[i] === 0x50 && bytes[i+1] === 0x4B && bytes[i+2] === 0x03 && bytes[i+3] === 0x04) {
          // Found a file entry - read filename length and extra length
          const filenameLength = bytes[i+28] | (bytes[i+29] << 8);
          const extraLength = bytes[i+30] | (bytes[i+31] << 8);
          const compressedSize = bytes[i+24] | (bytes[i+25] << 8) | (bytes[i+26] << 16) | (bytes[i+27] << 16);
          
          const filenameStart = i + 30 + extraLength;
          const filenameBytes = bytes.slice(filenameStart, filenameStart + filenameLength);
          const filename = new TextDecoder().decode(filenameBytes);
          
          // Check if it's an image file
          if (filename.match(/\.(png|jpg|jpeg)$/i)) {
            const dataStart = filenameStart + filenameLength;
            const imageData = bytes.slice(dataStart, dataStart + compressedSize);
            
            // Determine content type
            let contentType = 'image/png';
            if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
              contentType = 'image/jpeg';
            }
            
            return new Blob([imageData], { type: contentType });
          }
        }
      }
      console.error('No image found in ZIP');
      return null;
    } catch (error) {
      console.error('Error extracting ZIP:', error);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                <FileType className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">文件处理全能助手</h1>
                <p className="text-sm text-gray-300">分布式文档处理系统</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-300">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  系统在线
                </span>
              </div>
              <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <Settings className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer mb-6 ${
            isDragging 
              ? 'border-blue-500 bg-blue-500/20' 
              : 'border-white/20 hover:border-white/40'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            multiple
          />
          <div className="flex flex-col items-center">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full mb-4">
              <Upload className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              拖放文件到此处
            </h3>
            <p className="text-gray-400">
              或点击选择文件
            </p>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-4">
            {files.map(file => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white/10 p-2 rounded-lg">
                      <FileType className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-sm text-gray-400">
                        {formatFileSize(file.size)} • {getFileTypeLabel(file.originalExt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>
                      {file.status === 'uploading' && '读取文件中...'}
                      {file.status === 'ready' && '文件已就绪'}
                      {file.status === 'converting' && '转换中...'}
                      {file.status === 'completed' && `转换完成 → ${getTargetFormatLabel(file.targetFormat)}`}
                      {file.status === 'error' && (file.error || '处理失败')}
                    </span>
                    <span>{Math.round(file.progress)}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        file.status === 'error' ? 'bg-red-500' :
                        file.status === 'completed' ? 'bg-green-500' :
                        'bg-gradient-to-r from-blue-500 to-purple-600'
                      }`}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>

                {/* Action Area */}
                <div className="flex justify-between items-center">
                  {/* Target Format Selector (only when ready) */}
                  {file.status === 'ready' && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm">转换为:</span>
                      <select
                        value={file.targetFormat}
                        onChange={(e) => updateTargetFormat(file.id, e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm"
                      >
                        {getAvailableConversions(file.originalExt).map(conv => (
                          <option key={conv.to} value={conv.to} className="bg-slate-800">
                            {conv.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Completed - show result file type */}
                  {file.status === 'completed' && (
                    <div className="flex items-center space-x-2 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm">已将 {getFileTypeLabel(file.originalExt)} 转换为 {getTargetFormatLabel(file.targetFormat)}</span>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex space-x-3 ml-auto">
                    {file.status === 'ready' && (
                      <>
                        <button
                          onClick={() => moreFileInputRef.current?.click()}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 text-sm"
                        >
                          <Plus className="w-3 h-3" />
                          <span>添加</span>
                        </button>
                        <button
                          onClick={() => startConversion(file.id)}
                          className="flex items-center space-x-1 px-4 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 text-sm"
                        >
                          <Play className="w-3 h-3" />
                          <span>开始转换</span>
                        </button>
                      </>
                    )}
                    {file.status === 'converting' && (
                      <div className="flex items-center space-x-2 text-blue-400">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="text-sm">转换中...</span>
                      </div>
                    )}
                    {file.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(file.id)}
                        className="flex items-center space-x-1 px-4 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                      >
                        <Download className="w-3 h-3" />
                        <span>下载</span>
                      </button>
                    )}
                    {file.status === 'error' && (
                      <span className="flex items-center text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        <span>失败</span>
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Hidden input for adding more files */}
        <input
          ref={moreFileInputRef}
          type="file"
          className="hidden"
          onChange={handleMoreFilesSelect}
          multiple
        />

        {/* Start All Button */}
        {files.some(f => f.status === 'ready') && files.length > 1 && (
          <div className="flex justify-center mt-6">
            <button
              onClick={startAllConversions}
              className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90"
            >
              <Play className="w-5 h-5" />
              <span>开始全部转换</span>
            </button>
          </div>
        )}

        {/* Stats */}
        {files.length > 0 && (
          <div className="mt-6 bg-white/10 backdrop-blur rounded-2xl p-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-400">{files.length}</p>
                <p className="text-sm text-gray-400">总文件数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">
                  {files.filter(f => f.status === 'ready').length}
                </p>
                <p className="text-sm text-gray-400">待转换</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">
                  {files.filter(f => f.status === 'completed').length}
                </p>
                <p className="text-sm text-gray-400">已完成</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">
                  {files.filter(f => f.status === 'error').length}
                </p>
                <p className="text-sm text-gray-400">失败</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
