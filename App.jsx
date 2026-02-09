
import React, { useState, useCallback } from 'react';
import { Upload, Monitor, CheckCircle2, AlertCircle, Info, Layers } from 'lucide-react';
import JSZip from 'jszip';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { AdType, AD_SIZES } from './types';
import Header from './components/Header';
import DropZone from './components/DropZone';
import PreviewWindow from './components/PreviewWindow';
import Controls from './components/Controls';
import InsightPanel from './components/InsightPanel';

const getMimeType = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': return 'text/html';
    case 'css': return 'text/css';
    case 'js': return 'text/javascript';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
};

const getRelativePathVariations = (sourceFile, targetFile) => {
  const variations = new Set();
  variations.add(targetFile);
  const sourceParts = sourceFile.split('/');
  const targetParts = targetFile.split('/');
  sourceParts.pop();
  let i = 0;
  while (i < sourceParts.length && i < targetParts.length && sourceParts[i] === targetParts[i]) {
    i++;
  }
  const dots = sourceParts.slice(i).map(() => '..');
  const rel = [...dots, ...targetParts.slice(i)].join('/');
  if (rel) {
    variations.add(rel);
    variations.add('./' + rel.replace(/^\.\.\//, ''));
  }
  if (targetParts.length > 0) variations.add(targetParts[targetParts.length - 1]);
  return Array.from(variations);
};

const App = () => {
  const [selectedSize, setSelectedSize] = useState(AD_SIZES[0]);
  const [previewData, setPreviewData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('preview');

  const findTagInMatrix = (rows) => {
    let bestCandidate = { text: '', score: -1 };
    
    rows.forEach(row => {
      row.forEach(cell => {
        if (cell && typeof cell === 'string') {
          let score = 0;
          const lower = cell.toLowerCase();
          
          // Scoring system to find the best ad tag candidate
          if (lower.includes('<script')) score += 20;
          if (lower.includes('<iframe')) score += 20;
          if (lower.includes('document.write')) score += 10;
          if (lower.includes('googletag')) score += 10;
          if (lower.includes('doubleclick')) score += 10;
          if (lower.includes('adsbygoogle')) score += 10;
          if (lower.includes('src=')) score += 5;
          if (lower.includes('href=')) score += 5;
          if (cell.length > 50) score += 2; // longer strings are more likely to be tags

          if (score > bestCandidate.score) {
            bestCandidate = { text: cell, score: score };
          }
        }
      });
    });

    // Fallback if no high-score candidate is found but there is data
    if (bestCandidate.score <= 0 && rows.length > 0 && rows[0][0]) {
      return String(rows[0][0]);
    }
    
    return bestCandidate.text;
  };

  const processZip = async (file) => {
    setIsProcessing(true);
    setError(null);
    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      const fileData = {};
      const fileNames = Object.keys(content.files).filter(name => !content.files[name].dir);
      
      for (const name of fileNames) {
        const zipFile = content.files[name];
        const mimeType = getMimeType(name);
        const blob = await zipFile.async('blob');
        const isText = mimeType.startsWith('text/') || mimeType.endsWith('javascript');
        fileData[name] = {
          blob: new Blob([blob], { type: mimeType }),
          url: '',
          content: isText ? await zipFile.async('string') : undefined
        };
      }

      const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const assetNames = Object.keys(fileData).sort((a, b) => b.length - a.length);

      const rewriteContent = (sourceContent, currentFile) => {
        let newContent = sourceContent;
        assetNames.forEach(targetName => {
          if (targetName === currentFile) return;
          const blobUrl = fileData[targetName].url;
          if (!blobUrl) return;
          const variations = getRelativePathVariations(currentFile, targetName);
          variations.forEach(v => {
            const escaped = escapeRegExp(v);
            const regex = new RegExp(`(['"\\(\\s=])${escaped}(['"\\)\\s])`, 'g');
            newContent = newContent.replace(regex, `$1${blobUrl}$2`);
          });
        });
        return newContent;
      };

      assetNames.forEach(name => {
        const mime = getMimeType(name);
        if (!mime.startsWith('text/') && !mime.endsWith('javascript')) {
          fileData[name].url = URL.createObjectURL(fileData[name].blob);
        }
      });

      assetNames.forEach(name => {
        if (name.endsWith('.css') && fileData[name].content) {
          const updated = rewriteContent(fileData[name].content, name);
          fileData[name].url = URL.createObjectURL(new Blob([updated], { type: 'text/css' }));
        }
      });

      assetNames.forEach(name => {
        if (name.endsWith('.js') && fileData[name].content) {
          const updated = rewriteContent(fileData[name].content, name);
          fileData[name].url = URL.createObjectURL(new Blob([updated], { type: 'text/javascript' }));
        }
      });

      const htmlFiles = assetNames.filter(n => n.toLowerCase().endsWith('.html'));
      const mainHtmlName = htmlFiles.find(n => n.toLowerCase() === 'index.html') || htmlFiles[0];
      if (!mainHtmlName) throw new Error('No se encontró archivo HTML.');

      const mainHtml = rewriteContent(fileData[mainHtmlName].content, mainHtmlName);
      setPreviewData({ type: AdType.ZIP, content: mainHtml, fileName: file.name });
      setActiveTab('preview');
    } catch (err) {
      setError(err.message || 'Error al procesar el ZIP.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((files) => {
    const file = files[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    setError(null);
    
    if (name.endsWith('.zip')) {
        processZip(file);
    } else if (name.endsWith('.csv')) {
      Papa.parse(file, {
        complete: (res) => {
          const tag = findTagInMatrix(res.data);
          if (!tag) {
              setError("No se encontró ningún tag válido en el CSV");
              return;
          }
          setPreviewData({ type: AdType.CSV, content: tag, fileName: file.name });
          setActiveTab('preview');
        },
        error: () => setError("Error al leer el archivo CSV")
      });
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
            const wb = XLSX.read(e.target.result);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
            const tag = findTagInMatrix(rows);
            if (!tag) {
                setError("No se encontró ningún tag válido en el Excel");
                return;
            }
            setPreviewData({ type: AdType.TAG, content: tag, fileName: file.name });
            setActiveTab('preview');
        } catch(err) {
            setError("Error al procesar el archivo Excel");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
        setError("Formato de archivo no soportado (.zip, .csv, .xlsx)");
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#121212] text-slate-100">
      <Header />
      <main className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-[#2a2a2a] bg-[#181818] flex flex-col z-20">
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            {!previewData ? (
              <div className="space-y-6">
                <div className="bg-[#222] p-4 rounded-xl border border-[#333]">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 text-center tracking-wider">Configuración</h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#9500cb]" /> <span>Sube un .zip HTML5.</span></li>
                    <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#9500cb]" /> <span>O un tag en .csv / .xlsx.</span></li>
                  </ul>
                </div>
                <DropZone onDrop={onDrop} isProcessing={isProcessing} />
              </div>
            ) : (
              <Controls selectedSize={selectedSize} setSelectedSize={setSelectedSize} reset={() => setPreviewData(null)} previewData={previewData} />
            )}
            {error && <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 text-sm flex gap-3"><AlertCircle className="w-5 h-5 shrink-0" /> <span>{error}</span></div>}
          </div>
        </aside>

        <section className="flex-1 relative overflow-hidden flex flex-col">
          {previewData ? (
            <>
              <div className="h-14 border-b border-[#2a2a2a] flex items-center px-6 justify-between bg-[#121212]/90 backdrop-blur z-10 shrink-0">
                <div className="flex gap-6">
                  <button onClick={() => setActiveTab('preview')} className={`h-14 border-b-2 transition-all flex items-center gap-2 px-1 ${activeTab === 'preview' ? 'text-[#9500cb] border-[#9500cb] font-bold' : 'text-gray-400 border-transparent hover:text-white'}`}><Monitor className="w-4 h-4" /> Preview</button>
                  <button onClick={() => setActiveTab('insights')} className={`h-14 border-b-2 transition-all flex items-center gap-2 px-1 ${activeTab === 'insights' ? 'text-[#9500cb] border-[#9500cb] font-bold' : 'text-gray-400 border-transparent hover:text-white'}`}><Layers className="w-4 h-4" /> Insights AI</button>
                </div>
                <div className="text-xs bg-[#222] px-3 py-1 rounded-full border border-[#333] text-gray-400 font-mono truncate max-w-[200px]">{previewData.fileName}</div>
              </div>
              <div className="flex-1 bg-[radial-gradient(#2a2a2a_1px,transparent_1px)] [background-size:24px_24px] relative bg-[#121212]">
                {activeTab === 'preview' ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PreviewWindow previewData={previewData} size={selectedSize} />
                  </div>
                ) : (
                  <div className="absolute inset-0 p-8 overflow-y-auto custom-scrollbar flex justify-center">
                    <InsightPanel previewData={previewData} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
              <Monitor className="w-32 h-32 opacity-5 mb-8" />
              <p className="text-xl font-light tracking-tight text-gray-500">Arrastra archivos para comenzar</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
