
import React, { useRef, useState } from 'react';
import { Upload, FileArchive, FileText, Loader2, FileSpreadsheet } from 'lucide-react';

const DropZone = ({ onDrop, isProcessing }) => {
  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = (e) => { e.preventDefault(); setIsOver(true); };
  const handleDragLeave = () => setIsOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) onDrop(e.dataTransfer.files);
  };
  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) onDrop(e.target.files);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full min-h-[200px] rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer p-6 ${isOver ? 'border-[#9500cb] bg-[#9500cb]/10' : 'border-[#333] hover:border-[#555] hover:bg-[#222]'} ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" className="hidden" accept=".zip,.csv,.xlsx,.xls" onChange={handleChange} />
      {isProcessing ? (
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <Loader2 className="w-12 h-12 animate-spin text-[#9500cb]" />
          <p className="text-sm font-medium text-center">Procesando archivo...</p>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 bg-[#222] rounded-2xl flex items-center justify-center mb-4"><Upload className="w-8 h-8 text-gray-500" /></div>
          <p className="text-sm font-semibold text-gray-200 text-center mb-1">Suelta tu archivo aquí</p>
          <div className="flex gap-2 flex-wrap justify-center mt-4">
            <div className="flex items-center gap-1 px-2 py-1 bg-[#1a1a1a] border border-[#333] rounded-lg text-[10px] text-gray-400"><FileArchive className="w-3 h-3 text-orange-400" /> ZIP</div>
            <div className="flex items-center gap-1 px-2 py-1 bg-[#1a1a1a] border border-[#333] rounded-lg text-[10px] text-gray-400"><FileText className="w-3 h-3 text-blue-400" /> CSV</div>
            <div className="flex items-center gap-1 px-2 py-1 bg-[#1a1a1a] border border-[#333] rounded-lg text-[10px] text-gray-400"><FileSpreadsheet className="w-3 h-3 text-emerald-400" /> XLSX</div>
          </div>
        </>
      )}
    </div>
  );
};

export default DropZone;
