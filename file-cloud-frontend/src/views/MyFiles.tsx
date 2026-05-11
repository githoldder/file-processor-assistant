import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search,
  Download,
  Upload,
  Grid,
  FileText,
  Trash2,
  RefreshCw,
  Eye,
  Edit2,
  X,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { uploadFile, listFiles, deleteFile, getDownloadUrl, convertFile } from '../services/api';

export default function MyFiles() {
  const { t } = useLanguage();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [renamingFile, setRenamingFile] = useState<any | null>(null);
  const [newName, setNewName] = useState('');

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await listFiles();
      setFiles(res.files);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadFile(file);
        fetchFiles();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDelete = async (name: string) => {
    if (window.confirm(`Delete ${name}?`)) {
      try {
        await deleteFile(name);
        fetchFiles();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDownload = async (name: string) => {
    try {
      const res = await getDownloadUrl(name);
      window.open(res.download_url, '_blank');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRename = async () => {
    if (!renamingFile || !newName) return;
    // In MVP-v2, we don't have a rename API yet, but we'll mock it or just alert
    alert('Rename API not implemented in backend yet. Placeholder for future use.');
    setRenamingFile(null);
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-on-surface font-display underline decoration-primary/20 decoration-8 underline-offset-4">{t.files.title}</h1>
          <p className="text-outline mt-1 text-lg font-medium tracking-tight">
            {t.files.root} <span className="opacity-40">/</span> {t.files.users} <span className="opacity-40">/</span> AR
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 px-6 py-3 bg-[#1e1e1e] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:brightness-125 transition-all cursor-pointer">
            <Plus className="w-4 h-4" strokeWidth={3} />
            {t.files.new}
            <input type="file" className="hidden" onChange={handleUpload} />
          </label>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-outline w-3 h-3" />
            <input 
              type="text" 
              placeholder={t.files.search}
              className="bg-surface-container-low border border-outline-variant/30 rounded-2xl pl-12 pr-6 py-3 text-xs font-bold outline-none w-64 focus:ring-4 focus:ring-primary/5 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-[2.5rem] overflow-hidden ambient-shadow min-h-[60vh] flex flex-col">
        <div className="p-8 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-surface-container-low/20">
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-6 py-2.5 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
              <Grid className="w-4 h-4" />
              {t.files.allFiles}
            </button>
            <button onClick={fetchFiles} className="p-2.5 hover:bg-surface-container-low rounded-xl transition-all">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex items-center bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant shadow-inner">
                <label className="flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white shadow-sm text-primary cursor-pointer">
                  <Upload className="w-4 h-4" />
                  {t.files.upload}
                  <input type="file" className="hidden" onChange={handleUpload} />
                </label>
             </div>
          </div>
        </div>

        <div className="p-10 flex-1 overflow-y-auto">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-xs font-black text-outline uppercase tracking-widest">{t.zh ? '正在读取云端文件...' : 'Loading cloud files...'}</p>
             </div>
          ) : files && files.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-6 bg-surface-container-low/50 rounded-[1.5rem] border border-outline-variant/30 hover:bg-surface-container-low transition-all group">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <FileText className="text-primary w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black tracking-tight text-on-surface">{file.filename || file.object_name}</h4>
                      <p className="text-[10px] font-black text-outline uppercase tracking-widest mt-1">
                        {file.size ? (file.size / 1024 / 1024).toFixed(2) : "0.00"} MB • {file.last_modified ? new Date(file.last_modified).toLocaleDateString() : "--"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setPreviewFile(file)} className="p-3 hover:bg-primary/10 text-primary rounded-xl transition-all" title="Preview">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => handleDownload(file.object_name)} className="p-3 hover:bg-primary/10 text-primary rounded-xl transition-all" title="Download">
                      <Download size={18} />
                    </button>
                    <button onClick={() => handleDelete(file.object_name)} className="p-3 hover:bg-error/10 text-error rounded-xl transition-all" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-4 border-dashed border-outline-variant rounded-[2rem] p-16 flex flex-col items-center justify-center text-center space-y-12 bg-surface-container-low/5 group hover:border-primary/30 transition-all">
               <div className="relative scale-100 lg:scale-110">
                  <div className="w-32 h-44 bg-white border border-outline-variant rounded-2xl shadow-xl -rotate-6 flex flex-col p-4 space-y-3 transition-transform group-hover:rotate-0">
                     <div className="w-full h-8 bg-error/5 rounded-lg" />
                     <div className="w-2/3 h-2 bg-outline-variant/10 rounded-full" />
                     <div className="w-full h-2 bg-outline-variant/10 rounded-full" />
                  </div>
               </div>
               
               <div className="space-y-3">
                  <h3 className="text-2xl font-black tracking-tight">{t.files.dragDrop}</h3>
                  <p className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center justify-center gap-2">
                     {t.files.orVia}
                     <label className="text-primary underline cursor-pointer hover:scale-105 transition-transform">
                       {t.files.upload}
                       <input type="file" className="hidden" onChange={handleUpload} />
                     </label>
                  </p>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-20">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewFile(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-full"
            >
              <div className="p-8 border-b border-outline-variant flex items-center justify-between bg-surface-container-low/30">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <FileText className="text-primary w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl tracking-tight">{previewFile.object_name}</h3>
                    <p className="text-[10px] font-black text-outline uppercase tracking-widest">Cloud Preview Mode</p>
                  </div>
                </div>
                <button onClick={() => setPreviewFile(null)} className="p-3 hover:bg-surface-container-low rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="p-12 flex-1 overflow-y-auto bg-surface-container-lowest">
                 <div className="aspect-video w-full bg-surface-container-low rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-outline-variant text-outline space-y-4">
                    <Eye size={48} className="opacity-20" />
                    <p className="text-sm font-bold uppercase tracking-widest">{t.zh ? '文件预览准备中...' : 'Preview generating...'}</p>
                 </div>
                 <div className="mt-10 space-y-6">
                    <h4 className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">File Metadata</h4>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                          <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Size</p>
                          <p className="font-black text-on-surface">{(previewFile.size / 1024).toFixed(2)} KB</p>
                       </div>
                       <div className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                          <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Last Modified</p>
                          <p className="font-black text-on-surface">{new Date(previewFile.last_modified).toLocaleString()}</p>
                       </div>
                    </div>
                 </div>
              </div>
              <div className="p-8 border-t border-outline-variant bg-surface-container-low/30 flex justify-end gap-4">
                 <button onClick={() => handleDownload(previewFile.object_name)} className="px-8 py-4 bg-[#1e1e1e] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-xl hover:brightness-125 transition-all">
                    <Download size={16} />
                    {t.files.download}
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rename Modal */}
      <AnimatePresence>
        {renamingFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRenamingFile(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-8"
            >
              <h3 className="text-2xl font-black tracking-tight text-on-surface">Rename File</h3>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-outline uppercase tracking-widest block">New Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setRenamingFile(null)} className="flex-1 py-4 border border-outline-variant rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-container-low transition-all">Cancel</button>
                <button onClick={handleRename} className="flex-1 py-4 bg-primary text-on-primary rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">Save Changes</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
