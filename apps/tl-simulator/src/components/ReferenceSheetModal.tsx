import React, { useState, useRef, useEffect } from 'react';
import { X, MousePointer2, Pen, Eraser, Trash2, Sun, Moon } from 'lucide-react';
import { getTragedySetReferenceData, getAvailableTragedySets } from '../data/referenceService';

interface ReferenceSheetModalProps {
  setId: string;
  onClose: () => void;
  initialCanvasData?: string | null;
  onSaveCanvas?: (data: string | null) => void;
}

type DrawMode = 'pointer' | 'pen' | 'eraser';
type ThemeMode = 'obsidian' | 'paper';

export const ReferenceSheetModal: React.FC<ReferenceSheetModalProps> = ({ setId, onClose, initialCanvasData, onSaveCanvas }) => {
  const [selectedSetId, setSelectedSetId] = useState(setId);
  const availableSets = getAvailableTragedySets();
  const data = getTragedySetReferenceData(selectedSetId);
  
  const [mode, setMode] = useState<DrawMode>('pointer');
  const [theme, setTheme] = useState<ThemeMode>('obsidian');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{x: number, y: number} | null>(null);

  // Set canvas size to match the scrollable table container exactly
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        // Only resize if the canvas hasn't been initialized to the container's scroll size,
        // or we can just set it once to a very large size that covers the table.
        // Actually, matching the scrollWidth/scrollHeight is best.
        const width = containerRef.current.scrollWidth;
        const height = containerRef.current.scrollHeight;
        
        const canvas = canvasRef.current;
        // To avoid losing drawings on resize, we could save image data, but for simplicity
        // in a modal, we only set size if it changed.
        if (canvas.width !== width || canvas.height !== height) {
           const ctx = canvas.getContext('2d');
           let imgData: ImageData | null = null;
           if (canvas.width > 0 && canvas.height > 0 && ctx) {
             imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
           }
           
           canvas.width = width;
           canvas.height = height;
           
           if (ctx && imgData) {
             ctx.putImageData(imgData, 0, 0);
           }
        }
      }
    };

    handleResize();
    // Re-check size after a slight delay to ensure fonts/layout settled
    const timeoutId = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [data]);

  // Load initial canvas data once
  const hasLoadedInitial = useRef(false);
  useEffect(() => {
    if (initialCanvasData && canvasRef.current && !hasLoadedInitial.current && canvasRef.current.width > 0) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = initialCanvasData;
      hasLoadedInitial.current = true;
    }
  }, [initialCanvasData, canvasRef.current?.width]);

  const handleClose = () => {
    if (onSaveCanvas && canvasRef.current) {
      // Save only if it's not totally empty, or just save anyway. toDataURL is fine.
      onSaveCanvas(canvasRef.current.toDataURL());
    }
    onClose();
  };

  if (!data) return null;

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode === 'pointer') return;
    isDrawing.current = true;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Calculate position relative to the canvas itself (accounting for scroll is native to event when bound to canvas)
    lastPos.current = {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    };
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(lastPos.current.x, lastPos.current.y, mode === 'eraser' ? 15 : 2, 0, Math.PI * 2);
      ctx.fillStyle = mode === 'eraser' ? 'rgba(0,0,0,1)' : 'rgba(220, 38, 38, 0.8)'; // Red ink
      
      if (mode === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fill();
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || mode === 'pointer' || !lastPos.current) return;
    
    const currentPos = {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    };
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      if (mode === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 30; // Thicker eraser
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = 4; // Pen thickness
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.8)'; // Red ink
      }
      
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
    }
    
    lastPos.current = currentPos;
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
       const ctx = canvas.getContext('2d');
       ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Helper to convert plain count strings into the aesthetic circled numbers.
  const getCircledNumber = (str: string) => {
    if (str === '1') return '①';
    if (str === '2') return '②';
    if (str === '3') return '③';
    if (str === '4') return '④';
    if (str === '0-2') return '②';
    if (str === '0-3') return '③';
    return str;
  };



  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Background Dim */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose}></div>
      
      {/* Toolbar */}
      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[110] border p-2 rounded-2xl flex gap-2 backdrop-blur-md transition-colors ${theme === 'obsidian' ? 'bg-obsidian-900/90 border-white/10 shadow-glow-cyan' : 'bg-white/90 border-slate-300 shadow-xl'}`}>
        <ToolButton active={mode === 'pointer'} onClick={() => setMode('pointer')} icon={<MousePointer2 className="w-5 h-5"/>} label="拖拽查看" theme={theme} />
        <div className={`w-px mx-1 self-stretch ${theme === 'obsidian' ? 'bg-white/10' : 'bg-slate-300'}`}></div>
        <ToolButton active={mode === 'pen'} onClick={() => setMode('pen')} icon={<Pen className="w-5 h-5"/>} label="红笔" theme={theme} />
        <ToolButton active={mode === 'eraser'} onClick={() => setMode('eraser')} icon={<Eraser className="w-5 h-5"/>} label="橡皮" theme={theme} />
        <div className={`w-px mx-1 self-stretch ${theme === 'obsidian' ? 'bg-white/10' : 'bg-slate-300'}`}></div>
        <button onClick={clearCanvas} className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all font-bold group ${theme === 'obsidian' ? 'text-slate-400 hover:text-blood-400 hover:bg-blood-900/20' : 'text-slate-500 hover:text-red-500 hover:bg-red-50'}`}>
           <Trash2 className="w-5 h-5 mb-0.5 group-hover:scale-110 transition-transform"/>
           <span className="text-[9px] uppercase tracking-widest">清空</span>
        </button>
        <div className={`w-px mx-1 self-stretch ${theme === 'obsidian' ? 'bg-white/10' : 'bg-slate-300'}`}></div>
        <button onClick={() => setTheme(t => t === 'obsidian' ? 'paper' : 'obsidian')} className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all font-bold group ${theme === 'obsidian' ? 'text-gold-400 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-black hover:bg-slate-100'}`}>
           {theme === 'obsidian' ? <Sun className="w-5 h-5 mb-0.5 group-hover:scale-110 transition-transform"/> : <Moon className="w-5 h-5 mb-0.5 group-hover:scale-110 transition-transform" />}
           <span className="text-[9px] uppercase tracking-widest">{theme === 'obsidian' ? '亮色主题' : '深色主题'}</span>
        </button>
      </div>

      {/* Modal Container */}
      <div className={`relative w-full max-w-[1200px] font-serif flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 rounded-xl transition-colors ${
        theme === 'obsidian' 
          ? 'bg-obsidian-950/95 backdrop-blur-3xl border border-slate-700/50 text-slate-200 shadow-[0_0_50px_rgba(0,0,0,0.8)]' 
          : 'bg-white border-2 border-black text-black shadow-2xl'
      }`} style={{ maxHeight: '90vh' }}>
        
        {/* Close Button and Module Selector overlaying the corner */}
        <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
          <select
            value={selectedSetId}
            onChange={(e) => setSelectedSetId(e.target.value)}
            className={`text-[13px] font-bold tracking-wide px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              theme === 'obsidian'
                ? 'bg-obsidian-800 border-white/10 text-gold-300 focus:border-gold-500/50'
                : 'bg-white border-black/20 text-black focus:border-blue-500'
            }`}
          >
            {availableSets.map(s => (
              <option key={s.id} value={s.id} disabled={!s.available}>
                {s.label} {!s.available ? '(未接入)' : ''}
              </option>
            ))}
          </select>
          <button 
            onClick={handleClose}
            className="p-1.5 bg-white/5 hover:bg-blood-600 hover:text-white text-slate-400 transition-colors rounded-lg border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-auto bg-transparent relative hide-scrollbar" style={{ touchAction: mode === 'pointer' ? 'auto' : 'none' }}>
          
          <div ref={containerRef} className="relative min-w-[900px]">
            {/* Canvas Overlay */}
            <canvas 
              ref={canvasRef}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerOut={stopDrawing}
              onPointerCancel={stopDrawing}
              className="absolute inset-0 z-40 touch-none"
              style={{ pointerEvents: mode === 'pointer' ? 'none' : 'auto' }}
            />

            {/* Matrix Table */}
            <table className={`w-full border-collapse text-[12px] md:text-[14px] leading-snug font-medium transition-colors ${
              theme === 'obsidian' ? 'border-4 border-slate-700/80 bg-transparent' : 'border-[3px] border-black bg-white'
            }`}>
              <thead>
                <tr>
                  {/* Top Left Title */}
                  <th colSpan={2} rowSpan={2} className={`p-4 text-center transition-colors ${
                    theme === 'obsidian' ? 'border-2 border-slate-700/60 bg-obsidian-900/90 shadow-inner' : 'border-2 border-black bg-gray-200/50'
                  }`}>
                    <div className={`text-4xl md:text-5xl font-black italic tracking-tight uppercase whitespace-pre-wrap ${
                      theme === 'obsidian' ? 'text-gold-200 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]' : 'text-black'
                    }`}>{data.setNameEn}</div>
                  </th>

                  {/* Role Dictionary Matrix Headers */}
                  {data.roles.map(role => (
                     <th key={role.id} rowSpan={2} className={`px-1 py-1 text-center align-bottom max-w-[35px] transition-colors ${
                       theme === 'obsidian' ? 'border border-slate-700/60 bg-obsidian-900/60 text-slate-300' : 'border border-black bg-gray-50 text-black'
                     }`}>
                       <div style={{ writingMode: 'vertical-rl', textOrientation: 'upright', letterSpacing: '-2px', display: 'inline-block', height: '80px', paddingBottom: '4px' }}>
                         {role.name}
                       </div>
                     </th>
                  ))}
                  
                  <th rowSpan={2} className={`px-2 align-bottom pb-2 min-w-[280px] transition-colors font-bold tracking-widest text-sm ${
                    theme === 'obsidian' ? 'border border-slate-700/60 bg-obsidian-900/60 text-gold-400/80' : 'border-[2px] border-black bg-gray-50 text-black'
                  }`}>
                    规则说明
                  </th>
                </tr>

                <tr className={`transition-colors ${theme === 'obsidian' ? 'bg-obsidian-800/80 text-slate-300' : 'bg-gray-100 text-black'}`}>
                </tr>
              </thead>

              <tbody>
                
                {/* Main Plots Section */}
                {data.mainPlots.map((plot, i) => (
                  <tr key={plot.id} className={`transition-colors group ${theme === 'obsidian' ? 'hover:bg-blood-900/40 bg-obsidian-950/60' : 'hover:bg-red-50/50'}`}>
                    {i === 0 && <td rowSpan={data.mainPlots.length} className={`text-center font-serif text-3xl font-black w-10 ${theme === 'obsidian' ? 'border-2 border-slate-700/60 bg-blood-950/60 text-blood-400 shadow-[inset_0_0_20px_rgba(225,29,72,0.1)]' : 'border-2 border-black bg-gray-100 text-black'}`}>Y</td>}
                    <td className={`text-center font-bold px-2 py-2 whitespace-nowrap min-w-[100px] ${theme === 'obsidian' ? 'border border-slate-700/60 text-slate-300 group-hover:text-blood-300' : 'border-2 border-black group-hover:text-red-800'}`}>{plot.name}</td>
                    
                    {data.roles.map(role => (
                       <td key={role.id} className={`text-center font-black text-[16px] ${theme === 'obsidian' ? 'border border-slate-700/60 text-gold-200' : 'border border-black'}`}>
                         {plot.roleIdCounts[role.id] ? getCircledNumber(plot.roleIdCounts[role.id]) : ''}
                       </td>
                    ))}
                    
                    <td className={`px-3 py-1 font-bold tracking-tight ${theme === 'obsidian' ? 'border border-slate-700/60 text-slate-300' : 'border border-black'}`}>
                       {plot.rules.map(r => r.text).join(' ')}
                    </td>

                  </tr>
                ))}

                {/* Sub Plots Section */}
                {data.subplots.map((plot, i) => (
                  <tr key={plot.id} className={`transition-colors group ${theme === 'obsidian' ? 'hover:bg-loop-900/40 bg-obsidian-900/40' : 'hover:bg-blue-50/50'}`}>
                    {i === 0 && <td rowSpan={data.subplots.length} className={`text-center font-serif text-3xl font-black ${theme === 'obsidian' ? 'border-2 border-slate-700/60 bg-loop-950/60 text-loop-400 shadow-[inset_0_0_20px_rgba(56,189,248,0.1)]' : 'border-2 border-black bg-gray-100 text-black'}`}>X</td>}
                    <td className={`text-center font-bold px-2 py-2 whitespace-nowrap ${theme === 'obsidian' ? 'border border-slate-700/60 group-hover:text-loop-300 text-slate-300' : 'border-2 border-black group-hover:text-blue-800'}`}>{plot.name}</td>
                    
                    {data.roles.map(role => (
                       <td key={role.id} className={`text-center font-black text-[16px] ${theme === 'obsidian' ? 'border border-slate-700/60 text-gold-200' : 'border border-black'}`}>
                         {plot.roleIdCounts[role.id] ? getCircledNumber(plot.roleIdCounts[role.id]) : ''}
                       </td>
                    ))}
                    
                    <td className={`px-3 py-1 font-bold tracking-tight ${theme === 'obsidian' ? 'border border-slate-700/60 text-slate-300' : 'border-2 border-r-0 border-black'}`}>
                       {plot.rules.map(r => r.text).join(' ')}
                    </td>

                  </tr>
                ))}

              </tbody>
            </table>

            {/* ── Roles Table (independent column widths) ── */}
            <table className={`w-full border-collapse text-[12px] md:text-[14px] leading-snug font-medium transition-colors mt-4 ${
              theme === 'obsidian' ? 'border-4 border-slate-700/80 bg-transparent' : 'border-[3px] border-black bg-white'
            }`}>
              <thead>
                <tr className={`${theme === 'obsidian' ? 'bg-obsidian-800/90 shadow-inner' : 'bg-gray-300/80'}`}>
                  <th className={`text-center font-black py-1.5 tracking-widest w-[140px] ${theme === 'obsidian' ? 'border border-slate-700/60 text-gold-400' : 'border-2 border-black text-[#222]'}`}>身份</th>
                  <th className={`text-center font-black px-1 whitespace-nowrap tracking-widest w-[50px] ${theme === 'obsidian' ? 'border border-slate-700/60 text-gold-400' : 'border-2 border-black text-[#222]'}`}>上限</th>
                  <th className={`text-center font-black px-1 tracking-widest w-[120px] ${theme === 'obsidian' ? 'border border-slate-700/60 text-gold-400' : 'border-2 border-black text-[#222]'}`}>身份特性</th>
                  <th className={`font-black px-3 tracking-widest ${theme === 'obsidian' ? 'border border-slate-700/60 text-gold-400' : 'border-2 border-black text-[#222]'}`}>能力</th>
                </tr>
              </thead>
              <tbody>
                {data.roles.map((role, idx) => (
                  <tr key={role.id} className={`transition-colors ${
                    theme === 'obsidian' 
                      ? (idx % 2 === 0 ? 'bg-obsidian-950/80 hover:bg-slate-800/60' : 'bg-obsidian-900/60 hover:bg-slate-800/60')
                      : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-100/50')
                  }`}>
                    <td className={`text-center font-bold p-1.5 whitespace-nowrap ${theme === 'obsidian' ? 'border border-slate-700/60 text-slate-200' : 'border-2 border-black'}`}>{role.name}</td>
                    <td className={`text-center font-bold text-[16px] ${theme === 'obsidian' ? 'border border-slate-700/60 text-gold-200' : 'border-2 border-black'}`}>{role.maxCopies ? getCircledNumber(role.maxCopies) : ''}</td>
                    <td className={`text-center font-bold px-2 whitespace-nowrap ${theme === 'obsidian' ? 'border border-slate-700/60 text-slate-300' : 'border-2 border-black'}`}>{role.roleTraits.join(' ')}</td>
                    <td className={`px-3 py-1.5 font-bold tracking-tight ${theme === 'obsidian' ? 'border border-slate-700/60 text-slate-300' : 'border-2 border-black'}`}>
                       {role.rules.map((r, i) => <div key={i} className="mb-0.5">{r.text}</div>)}
                       {role.rules.length === 0 && <span className={theme === 'obsidian' ? "text-slate-600 font-medium italic" : "text-gray-400 font-medium italic"}>无</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Incidents Table (independent column widths) ── */}
            <table className={`w-full border-collapse text-[12px] md:text-[14px] leading-snug font-medium transition-colors mt-4 ${
              theme === 'obsidian' ? 'border-4 border-slate-700/80 bg-transparent' : 'border-[3px] border-black bg-white'
            }`}>
              <thead>
                <tr className={`${theme === 'obsidian' ? 'bg-obsidian-800/90 shadow-inner' : 'bg-gray-300/80'}`}>
                   <th className={`text-center font-black py-1.5 tracking-widest w-[140px] ${theme === 'obsidian' ? 'border border-slate-700/60 text-gold-400' : 'border-2 border-black text-[#222]'}`}>事件名称</th>
                   <th className={`font-black px-3 tracking-widest ${theme === 'obsidian' ? 'border border-slate-700/60 text-gold-400' : 'border-2 border-black text-[#222]'}`}>效果</th>
                </tr>
              </thead>
              <tbody>
                {data.incidents.map((inc, idx) => (
                   <tr key={inc.id} className={`transition-colors ${
                    theme === 'obsidian' 
                      ? (idx % 2 === 0 ? 'bg-obsidian-950/80 hover:bg-slate-800/60' : 'bg-obsidian-900/60 hover:bg-slate-800/60')
                      : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-100/50')
                   }`}>
                     <td className={`text-center font-bold p-1.5 whitespace-nowrap ${theme === 'obsidian' ? 'border border-slate-700/60 text-slate-200' : 'border-2 border-black'}`}>{inc.name}</td>
                     <td className={`px-3 py-1.5 font-bold tracking-tight ${theme === 'obsidian' ? 'border border-slate-700/60 text-slate-300' : 'border-2 border-black'}`}>
                        {inc.rules.map((r, i) => <div key={i} className="mb-0.5">{r.text}</div>)}
                        {inc.rules.length === 0 && <span className={theme === 'obsidian' ? "text-slate-600 font-medium italic" : "text-gray-400 font-medium italic"}>无</span>}
                     </td>
                   </tr>
                ))}
              </tbody>
            </table>

            {/* ── Special Rules Table (only if module has special rules) ── */}
            {data.specialRules.length > 0 && (
              <table className={`w-full border-collapse text-[12px] md:text-[14px] leading-snug font-medium transition-colors mt-4 ${
                theme === 'obsidian' ? 'border-4 border-slate-700/80 bg-transparent' : 'border-[3px] border-black bg-white'
              }`}>
                <thead>
                  <tr className={`${theme === 'obsidian' ? 'bg-obsidian-800/90 shadow-inner' : 'bg-gray-300/80'}`}>
                    <th colSpan={2} className={`text-center font-black py-1.5 tracking-widest ${theme === 'obsidian' ? 'border border-slate-700/60 text-gold-400' : 'border-2 border-black text-[#222]'}`}>特殊规则</th>
                  </tr>
                </thead>
                <tbody>
                  {data.specialRules.map((sr, srIdx) => (
                    <React.Fragment key={srIdx}>
                      <tr className={theme === 'obsidian' ? 'bg-blood-950/40' : 'bg-red-50'}>
                        <td colSpan={2} className={`font-black px-3 py-1.5 tracking-wide ${theme === 'obsidian' ? 'border border-slate-700/60 text-gold-300' : 'border-2 border-black text-[#222]'}`}>
                          {sr.title}
                        </td>
                      </tr>
                      {sr.rules.map((r, rIdx) => (
                        <tr key={rIdx} className={`transition-colors ${
                          theme === 'obsidian'
                            ? (rIdx % 2 === 0 ? 'bg-obsidian-950/80 hover:bg-slate-800/60' : 'bg-obsidian-900/60 hover:bg-slate-800/60')
                            : (rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-100/50')
                        }`}>
                          <td colSpan={2} className={`px-4 py-1.5 font-bold tracking-tight whitespace-pre-line ${theme === 'obsidian' ? 'border border-slate-700/60 text-slate-300' : 'border-2 border-black'}`}>
                            {r.text}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Toolbar Button Helper
function ToolButton({ active, onClick, icon, label, theme }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, theme: ThemeMode }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all font-bold group
        ${active 
          ? (theme === 'obsidian' ? 'bg-loop-500 text-white shadow-glow-cyan' : 'bg-red-500 text-white shadow-lg') 
          : (theme === 'obsidian' ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-black hover:bg-slate-100')
        }
      `}
    >
      <div className={`mb-0.5 transition-transform ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <span className="text-[9px] uppercase tracking-widest scale-90 origin-top">{label}</span>
    </button>
  );
}
