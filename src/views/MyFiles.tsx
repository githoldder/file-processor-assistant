import React, { useState } from 'react';
import { 
  Plus, 
  ChevronDown, 
  Folder, 
  Search,
  MoreVertical,
  Download,
  Upload,
  Settings,
  Clock,
  Star,
  Users,
  Grid,
  Laptop,
  FolderPlus,
  Cloud,
  ChevronRight,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { FILES } from '../constants';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export default function MyFiles() {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

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
          <button className="flex items-center gap-2 px-6 py-3 bg-[#1e1e1e] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:brightness-125 transition-all">
            <Plus className="w-4 h-4" strokeWidth={3} />
            {t.files.new}
          </button>
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
            <button className="flex items-center gap-2 px-6 py-2.5 hover:bg-surface-container text-outline rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group">
              <Users className="w-4 h-4 opacity-40 group-hover:opacity-100" />
              {t.files.shared}
            </button>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex items-center bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant shadow-inner">
                <button className="flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white shadow-sm text-primary">
                  <Upload className="w-4 h-4" />
                  {t.files.upload}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button className="flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/40 transition-all text-outline">
                  <FolderPlus className="w-4 h-4" />
                  {t.files.newFolder}
                </button>
             </div>
             <button 
                onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                className="p-3 hover:bg-surface-container-low rounded-2xl text-outline transition-all"
              >
                <Grid className="w-5 h-5" />
              </button>
          </div>
        </div>

        <div className="p-10 flex-1 overflow-y-auto">
          {/* Empty State / Dropzone area */}
          <div className="border-4 border-dashed border-outline-variant rounded-[2rem] p-16 flex flex-col items-center justify-center text-center space-y-12 bg-surface-container-low/5 group hover:border-primary/30 transition-all">
             <div className="relative scale-100 lg:scale-110">
                <div className="w-32 h-44 bg-white border border-outline-variant rounded-2xl shadow-xl -rotate-6 flex flex-col p-4 space-y-3 transition-transform group-hover:rotate-0">
                   <div className="w-full h-8 bg-error/5 rounded-lg" />
                   <div className="w-2/3 h-2 bg-outline-variant/10 rounded-full" />
                   <div className="w-full h-2 bg-outline-variant/10 rounded-full" />
                </div>
                <div className="absolute top-4 left-8 w-32 h-44 bg-white border border-outline-variant rounded-2xl shadow-xl rotate-6 flex flex-col p-4 space-y-3 transition-transform group-hover:rotate-0">
                   <div className="w-full h-20 bg-primary/5 rounded-xl flex items-center justify-center">
                      <FileText className="text-primary/40 w-8 h-8" />
                   </div>
                   <div className="w-full h-2 bg-outline-variant/10 rounded-full" />
                   <div className="w-1/2 h-2 bg-outline-variant/10 rounded-full" />
                </div>
             </div>
             
             <div className="space-y-3">
                <h3 className="text-2xl font-black tracking-tight">{t.files.dragDrop}</h3>
                <p className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center justify-center gap-2">
                   {t.files.orVia}
                   <span className="text-primary underline cursor-pointer hover:scale-105 transition-transform">{t.files.upload}</span>
                   {t.files.buttonToImport}
                </p>
             </div>

             <div className="pt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
               {[
                 { label: t.files.createFolder, icon: FolderPlus, color: 'text-primary', bg: 'bg-primary/5' },
                 { label: t.files.importDrive, icon: Cloud, color: 'text-blue-500', bg: 'bg-blue-50' },
                 { label: t.files.importOneDrive, icon: Cloud, color: 'text-sky-500', bg: 'bg-sky-50' }
               ].map((item, i) => (
                 <button key={i} className="flex flex-col items-center gap-4 p-8 bg-white border border-outline-variant rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                    <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110", item.bg)}>
                      <item.icon size={24} className={item.color} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-outline">{item.label}</span>
                 </button>
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
