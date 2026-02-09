
import React from 'react';
import { Maximize2, RefreshCw, XCircle, FileCode, CheckCircle2 } from 'lucide-react';
import { AdSize, AD_SIZES, PreviewData } from '../types';

interface ControlsProps {
  selectedSize: AdSize;
  setSelectedSize: (size: AdSize) => void;
  reset: () => void;
  previewData: PreviewData;
}

const Controls: React.FC<ControlsProps> = ({ selectedSize, setSelectedSize, reset, previewData }) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Configuración</h3>
        <button 
          onClick={reset}
          className="p-2 text-gray-500 hover:text-red-400 transition-colors"
          title="Cambiar archivo"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-2">
          <Maximize2 className="w-3 h-3" /> Tamaño del Ad
        </label>
        <div className="grid grid-cols-1 gap-2">
          {AD_SIZES.map((size) => (
            <button
              key={size.label}
              onClick={() => setSelectedSize(size)}
              className={`
                text-left px-4 py-3 rounded-xl border text-sm transition-all
                ${selectedSize.label === size.label 
                  ? 'bg-[#9500cb] border-[#9500cb] text-white shadow-lg shadow-[#9500cb]/20' 
                  : 'bg-[#222] border-[#333] text-gray-400 hover:border-[#555] hover:text-white'}
              `}
            >
              <div className="font-semibold">{size.width} × {size.height}</div>
              <div className="text-[10px] opacity-70 truncate">{size.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-[#333]">
        <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-2 mb-4">
          <FileCode className="w-3 h-3" /> Metadata Detectada
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Formato:</span>
            <span className="text-[#9500cb] font-mono font-bold">{previewData.type}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Sandbox:</span>
            <span className="text-emerald-500 flex items-center gap-1">Active <CheckCircle2 className="w-3 h-3" /></span>
          </div>
        </div>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#222] hover:bg-[#333] text-gray-300 rounded-xl border border-[#333] text-sm font-medium transition-colors"
      >
        <RefreshCw className="w-4 h-4" /> Hard Reload Preview
      </button>
    </div>
  );
};

export default Controls;
