
import React, { useEffect, useRef, useState } from 'react';

const PreviewWindow = ({ previewData, size }) => {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current) return;
      const padding = 64;
      const containerWidth = containerRef.current.parentElement?.clientWidth || 0;
      const containerHeight = containerRef.current.parentElement?.clientHeight || 0;
      const targetWidth = size.width + 24;
      const targetHeight = size.height + 60;
      const scaleX = (containerWidth - padding) / targetWidth;
      const scaleY = (containerHeight - padding) / targetHeight;
      setScale(Math.min(scaleX, scaleY, 1));
    };
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [size]);

  useEffect(() => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (!doc) return;

    let content = previewData.content;
    if (previewData.type !== 'ZIP') {
      content = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body, html { margin: 0; padding: 0; height: 100%; width: 100%; display: flex; justify-content: center; align-items: center; background: #fff; overflow: hidden; }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>
          <div style="width:100%; height:100%; display: flex; align-items: center; justify-content: center;">
            ${previewData.content}
          </div>
        </body>
        </html>
      `;
    }

    doc.open();
    doc.write(content);
    doc.close();
  }, [previewData]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden">
      <div className="transition-transform duration-300 ease-out flex flex-col items-center origin-center" style={{ transform: `scale(${scale})` }}>
        <div className="relative p-[12px] bg-[#1a1a1a] rounded-[3rem] border-[6px] border-[#333] shadow-2xl shadow-black/50">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#1a1a1a] rounded-b-xl flex items-center justify-center z-10">
            <div className="w-8 h-1 bg-[#333] rounded-full" />
          </div>
          <div className="bg-white overflow-hidden rounded-[2rem] relative shadow-inner" style={{ width: size.width, height: size.height }}>
            <iframe ref={iframeRef} title="Ad Preview" className="w-full h-full border-0 overflow-hidden" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" />
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#333] rounded-full" />
        </div>
        <div className="mt-6 flex flex-col items-center gap-1 text-gray-200">
          <span className="text-xl font-bold">{size.width} × {size.height}</span>
          {scale < 1 && <span className="text-[10px] bg-[#9500cb]/20 text-[#9500cb] px-2 py-0.5 rounded-full font-bold">Escalado {Math.round(scale * 100)}%</span>}
        </div>
      </div>
    </div>
  );
};

export default PreviewWindow;
