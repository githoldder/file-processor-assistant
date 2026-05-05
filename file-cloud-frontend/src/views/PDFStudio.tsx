import React, { useState } from 'react';
import { 
  FileText, 
  Split, 
  Combine, 
  RotateCw, 
  Plus, 
  Trash2, 
  Download,
  GripVertical,
  ChevronRight,
  Maximize2,
  Activity
} from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

export default function PDFStudio() {
  const { t } = useLanguage();
  const [pages, setPages] = useState([
    { id: '1', num: 1, title: t.zh ? '封面页' : 'Title Page' },
    { id: '2', num: 2, title: t.zh ? '执行摘要' : 'Executive Summary' },
    { id: '3', num: 3, title: t.zh ? '分析图表' : 'Analysis Graph' },
    { id: '4', num: 4, title: t.zh ? '财务报表' : 'Financial Table' },
    { id: '5', num: 5, title: t.zh ? '结论' : 'Conclusion' },
  ]);

  const removePage = (id: string) => {
    setPages(pages.filter(p => p.id !== id));
  };

  const rotatePage = (id: string) => {
    // Mock rotation
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-on-surface font-display underline decoration-primary/20 decoration-8 underline-offset-4">{t.pdf.title}</h1>
          <p className="text-outline mt-1 text-lg font-medium">{t.pdf.subtitle}</p>
        </div>
        <div className="flex gap-3">
           <button className="bg-surface-container-lowest border border-outline-variant px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-surface-container-low transition-all">
             <Split size={16} />
             {t.pdf.split}
           </button>
           <button className="bg-surface-container-lowest border border-outline-variant px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-surface-container-low transition-all">
             <Combine size={16} />
             {t.pdf.merge}
           </button>
           <button className="bg-[#1e1e1e] text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:brightness-125 transition-all shadow-xl">
             <Download size={16} />
             {t.pdf.export}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 h-[calc(100vh-280px)]">
        {/* Thumbnails Sidebar */}
        <div className="xl:col-span-3 bg-surface-container-lowest rounded-3xl border border-outline-variant overflow-hidden flex flex-col ambient-shadow">
           <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/20">
              <div className="flex items-center gap-3">
                 <FileText size={20} className="text-primary" />
                 <span className="font-black text-sm tracking-tight">Active_Project_Draft_2026.pdf</span>
              </div>
              <div className="flex gap-2">
                 <button className="p-2.5 rounded-xl hover:bg-surface-container-low text-outline transition-colors"><RotateCw size={18} /></button>
                 <button className="p-2.5 rounded-xl hover:bg-surface-container-low text-outline transition-colors"><Maximize2 size={18} /></button>
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
                       <div className="flex-1 p-4 flex flex-col items-center justify-center opacity-40">
                          <FileText size={48} className="text-outline mb-2" />
                          <span className="text-[10px] font-black uppercase text-outline text-center">{page.title}</span>
                       </div>
                       <div className="bg-surface-container-low h-8 flex items-center justify-between px-3 border-t border-outline-variant">
                          <span className="text-[10px] font-black text-outline">P. {page.num}</span>
                          <div className="flex items-center gap-1">
                             <button onClick={() => rotatePage(page.id)} className="p-1 hover:text-primary transition-colors"><RotateCw size={12} /></button>
                             <button onClick={() => removePage(page.id)} className="p-1 hover:text-error transition-colors"><Trash2 size={12} /></button>
                          </div>
                       </div>
                    </div>
                    {/* Drag handle hint */}
                    <div className="absolute top-2 left-2 p-1 bg-surface-container shadow-sm rounded opacity-0 group-hover:opacity-100 transition-opacity">
                       <GripVertical size={12} className="text-outline" />
                    </div>
                  </Reorder.Item>
                ))}
                <button className="aspect-[3/4] rounded-xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-4 text-outline hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group">
                   <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus size={24} />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest">{t.pdf.addPage}</span>
                </button>
              </Reorder.Group>
           </div>
        </div>

        {/* Tools Dashboard Panel */}
        <div className="space-y-6">
           <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 ambient-shadow space-y-8">
              <div>
                <h3 className="text-lg font-black tracking-tight mb-6 flex items-center gap-2">
                   <Activity size={20} className="text-primary" />
                   {t.zh ? '高级处理工具' : 'Advanced Tools'}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                   {[
                     { label: t.pdf.ocr, active: true },
                     { label: t.pdf.compression, active: false },
                     { label: t.pdf.fonts, active: true },
                     { label: t.pdf.watermark, active: false },
                   ].map((tool, i) => (
                     <button key={i} className={cn(
                       "flex justify-between items-center p-4 rounded-xl border transition-all text-left group",
                       tool.active ? "bg-primary/5 border-primary/20 text-primary" : "bg-white border-outline-variant hover:border-outline text-outline"
                     )}>
                        <span className="text-[11px] font-black uppercase tracking-widest">{tool.label}</span>
                        <div className={cn(
                          "w-10 h-5 rounded-full relative transition-all",
                          tool.active ? "bg-primary" : "bg-outline-variant"
                        )}>
                           <div className={cn(
                             "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                             tool.active ? "right-1" : "left-1"
                           )} />
                        </div>
                     </button>
                   ))}
                </div>
              </div>

              <div className="pt-8 border-t border-outline-variant">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-outline opacity-60">{t.pdf.specs}</h3>
                 <div className="space-y-4">
                    {[
                      { label: t.pdf.totalPages, val: pages.length },
                      { label: t.pdf.lastModified, val: t.zh ? '2小时前' : '2h ago' },
                      { label: t.pdf.initialSize, val: '24.2 MB' },
                    ].map((spec, i) => (
                      <div key={i} className="flex justify-between items-center px-2">
                         <span className="text-[10px] font-black uppercase tracking-wider text-outline">{spec.label}</span>
                         <span className="text-xs font-black">{spec.val}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="bg-[#1e1e1e] text-white rounded-3xl p-8 shadow-xl relative overflow-hidden group">
              <div className="relative z-10">
                 <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">{t.pdf.cloudCompute}</p>
                 <h3 className="text-xl font-black mt-3 tracking-tight">{t.pdf.enableDistributed}</h3>
                 <p className="text-[10px] font-bold text-outline-variant mt-4 leading-relaxed tracking-wide">{t.zh ? '使用我们的 12 个工作节点集群加速 OCR 和渲染。' : 'Accelerate OCR and rendering using our cluster of 12 worker nodes.'}</p>
                 <button className="mt-8 w-full bg-white text-[#1e1e1e] font-black py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-2xl">
                    {t.pdf.connectCluster}
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
