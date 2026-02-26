import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileUp, FileDown, FileType, FileText, Image, 
  Layers, Clock, CheckCircle, AlertCircle, Upload,
  Download, Trash2, RefreshCw, Settings
} from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  resultUrl?: string;
}

const conversionTypes = [
  { from: 'PDF', to: 'Word', icon: FileText, key: 'pdf_to_word' },
  { from: 'PDF', to: 'Excel', icon: FileType, key: 'pdf_to_excel' },
  { from: 'PDF', to: 'PPTX', icon: Layers, key: 'pdf_to_pptx' },
  { from: 'PDF', to: '图片', icon: Image, key: 'pdf_to_images' },
  { from: 'Word', to: 'PDF', icon: FileText, key: 'word_to_pdf' },
  { from: 'Excel', to: 'PDF', icon: FileType, key: 'excel_to_pdf' },
  { from: 'PPTX', to: 'PDF', icon: Layers, key: 'pptx_to_pdf' },
  { from: 'Markdown', to: 'PDF', icon: FileText, key: 'markdown_to_pdf' },
  { from: 'SVG', to: 'PNG', icon: Image, key: 'svg_to_png' },
  { from: 'SVG', to: 'PDF', icon: FileText, key: 'svg_to_pdf' },
  { from: 'PNG', to: 'PDF', icon: FileText, key: 'png_to_pdf' },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedConversion, setSelectedConversion] = useState<string>('pdf_to_word');
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'convert' | 'batch' | 'pdf-tools'>('convert');

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
    handleFiles(droppedFiles);
  }, [selectedConversion]);

  const handleFiles = async (fileList: File[]) => {
    const newFiles: FileItem[] = fileList.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending' as const
    }));

    setFiles(prev => [...prev, ...newFiles]);

    for (const fileItem of newFiles) {
      const file = fileList.find(f => f.name === fileItem.name);
      if (!file) continue;

      try {
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'processing' as const } : f
        ));

        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post(
          `${API_BASE}/convert?conversion_type=${selectedConversion}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        const taskId = response.data.task_id;
        
        pollTaskStatus(taskId, fileItem.id);
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'error' as const } : f
        ));
      }
    }
  };

  const pollTaskStatus = async (taskId: string, fileId: string) => {
    const poll = async () => {
      try {
        const response = await axios.get(`${API_BASE}/tasks/${taskId}`);
        const { status, result, progress } = response.data;

        setFiles(prev => prev.map(f => 
          f.id === fileId ? { 
            ...f, 
            status: status === 'SUCCESS' ? 'completed' : 
                   status === 'FAILURE' ? 'error' : 'processing',
            progress 
          } : f
        ));

        if (status === 'SUCCESS') {
          setFiles(prev => prev.map(f => 
            f.id === fileId ? { 
              ...f, 
              resultUrl: `${API_BASE}/tasks/${taskId}/download`,
              status: 'completed' as const
            } : f
          ));
        } else if (status === 'PENDING' || status === 'STARTED' || status === 'PROGRESS') {
          setTimeout(poll, 2000);
        }
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'error' as const } : f
        ));
      }
    };

    poll();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
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

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
            {[
              { id: 'convert', label: '格式转换', icon: FileUp },
              { id: 'batch', label: '批量处理', icon: Layers },
              { id: 'pdf-tools', label: 'PDF工具', icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white/20 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'convert' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-500/20' 
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <input
                  type="file"
                  id="fileInput"
                  className="hidden"
                  onChange={handleFileInput}
                  multiple
                />
                <label htmlFor="fileInput" className="cursor-pointer">
                  <div className="flex flex-col items-center">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full mb-4">
                      <Upload className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      拖放文件到此处
                    </h3>
                    <p className="text-gray-400 mb-4">
                      或点击选择文件
                    </p>
                    <p className="text-sm text-gray-500">
                      支持 PDF, Word, Excel, PPTX, Markdown, SVG, PNG 等格式
                    </p>
                  </div>
                </label>
              </div>

              {files.length > 0 && (
                <div className="mt-6 space-y-3">
                  {files.map(file => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="bg-white/10 p-2 rounded-lg">
                          <FileType className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{file.name}</p>
                          <p className="text-sm text-gray-400">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {file.status === 'processing' && (
                          <div className="flex items-center space-x-2">
                            <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                            <span className="text-blue-400 text-sm">
                              {file.progress || 0}%
                            </span>
                          </div>
                        )}
                        {file.status === 'completed' && (
                          <a
                            href={file.resultUrl}
                            download
                            className="flex items-center space-x-1 text-green-400 hover:text-green-300"
                          >
                            <Download className="w-4 h-4" />
                            <span className="text-sm">下载</span>
                          </a>
                        )}
                        {file.status === 'error' && (
                          <span className="flex items-center text-red-400">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            <span className="text-sm">失败</span>
                          </span>
                        )}
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-1 hover:bg-white/10 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  转换类型
                </h3>
                <div className="space-y-2">
                  {conversionTypes.map(conv => (
                    <button
                      key={conv.key}
                      onClick={() => setSelectedConversion(conv.key)}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all ${
                        selectedConversion === conv.key
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <conv.icon className="w-5 h-5" />
                      <span>{conv.from} → {conv.to}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  统计信息
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">{files.length}</p>
                    <p className="text-sm text-gray-400">总文件数</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">
                      {files.filter(f => f.status === 'completed').length}
                    </p>
                    <p className="text-sm text-gray-400">已完成</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center">
            <Layers className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              批量处理
            </h3>
            <p className="text-gray-400 mb-6">
              一次性处理多个文件，支持PDF批量转图片、图片批量转PDF等
            </p>
            <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium">
              开始批量处理
            </button>
          </div>
        )}

        {activeTab === 'pdf-tools' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: '合并PDF', icon: Layers },
              { name: '分割PDF', icon: FileText },
              { name: '提取图片', icon: Image },
              { name: '提取文字', icon: FileType },
            ].map(tool => (
              <button
                key={tool.name}
                className="bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl p-6 flex flex-col items-center transition-all"
              >
                <tool.icon className="w-10 h-10 text-blue-400 mb-3" />
                <span className="text-white font-medium">{tool.name}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
