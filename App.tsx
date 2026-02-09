
import React, { useState, useCallback } from 'react';
import { Upload, Monitor, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import JSZip from 'jszip';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { AdType, AdSize, AD_SIZES, PreviewData } from './types';
import Header from './components/Header';
import DropZone from './components/DropZone';
import PreviewWindow from './components/PreviewWindow';
import Controls from './components/Controls';

const getMimeType = (filename: string): string => {
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
    case 'woff': return 'font/woff';
    case 'woff2': return 'font/woff2';
    case 'ttf': return 'font/ttf';
    case 'otf': return 'font/otf';
    default: return 'application/octet-stream';
  }
};

const getRelativePathVariations = (sourceFile: string, targetFile: string): string[] => {
  const variations = new Set<string>();
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

  if (targetParts.length > 0) {
    variations.add(targetParts[targetParts.length - 1]);
  }

  return Array.from(variations);
};

const App: React.FC = () => {
  const [selectedSize, setSelectedSize] = useState<AdSize>(AD_SIZES[0]);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processZip = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      const fileData: Record<string, { blob: Blob; url: string; content?: string }> = {};
      
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

      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const assetNames = Object.keys(fileData).sort((a, b) => b.length - a.length);

      const rewriteContent = (sourceContent: string, currentFile: string) => {
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
          const updated = rewriteContent(fileData[name].content!, name);
          const newBlob = new Blob([updated], { type: 'text/css' });
          fileData[name].url = URL.createObjectURL(newBlob);
        }
      });

      assetNames.forEach(name => {
        if (name.endsWith('.js') && fileData[name].content) {
          const updated = rewriteContent(fileData[name].content!, name);
          const newBlob = new Blob([updated], { type: 'text/javascript' });
          fileData[name].url = URL.createObjectURL(newBlob);
        }
      });

      const htmlFiles = assetNames.filter(n => n.toLowerCase().endsWith('.html'));
      const mainHtmlName = htmlFiles.find(n => n.toLowerCase() === 'index.html') || htmlFiles[0];

      if (!mainHtmlName) throw new Error('No se encontró archivo HTML.');

      const mainHtml = rewriteContent(fileData[mainHtmlName].content!, mainHtmlName);
      const finalAssets: Record<string, string> = {};
      Object.keys(fileData).forEach(k => finalAssets[k] = fileData[k].url);

      setPreviewData({
        type: AdType.ZIP,
        content: mainHtml,
        assets: finalAssets,
        fileName: file.name
      });
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo ZIP.');
    } finally {
      setIsProcessing(false);
    }
  };

  const findTagInMatrix = (rows: any[][]): string => {
    let tagFound = '';
    for (const row of rows) {
      for (const cell of row) {
        if (cell && typeof cell === 'string' && (cell.includes('<script') || cell.includes('<iframe') || cell.includes('document.write'))) {
          tagFound = cell;
          break;
        }
      }
      if (tagFound) break;
    }
    if (!tagFound && rows.length > 0 && rows[0][0]) {
      tagFound = String(rows[0][0]);
    }
    return tagFound;
  };

  const processCsv = (file: File) => {
    setIsProcessing(true);
    setError(null);
    Papa.parse(file, {
      complete: (results) => {
        try {
          const tag = findTagInMatrix(results.data as any[][]);
          if (!tag) throw new Error('No se detectó un tag de publicidad en el CSV.');
          setPreviewData({ type: AdType.CSV, content: tag, fileName: file.name });
        } catch (err: any) {
          setError(err.message || 'Error al procesar el archivo CSV.');
        } finally {
          setIsProcessing(false);
        }
      },
      error: () => {
        setError('Error al parsear el CSV.');
        setIsProcessing(false);
      }
    });
  };

  const processXlsx = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      const tag = findTagInMatrix(rows);
      if (!tag) throw new Error('No se detectó un tag de publicidad en el Excel.');
      
      setPreviewData({ type: AdType.TAG, content: tag, fileName: file.name });
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo Excel.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((files: FileList) => {
    const file = files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.zip')) {
      processZip(file);
    } else if (fileName.endsWith('.csv')) {
      processCsv(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      processXlsx(file);
    } else {
      setError('Formato no soportado. Por favor sube un .zip, .csv o .xlsx');
    }
  }, []);

  const reset = () => {
    setPreviewData(null);
    setError(null);
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#121212] text-slate-100">
      <Header />
      
      <main className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-[#2a2a2a] bg-[#181818] flex flex-col z-20">
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            {!previewData ? (
              <div className="space-y-6">
                <div className="bg-[#222] p-4 rounded-xl border border-[#333]">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 text-center">Configuración de Pieza</h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#9500cb] shrink-0" />
                      <span>Sube un .zip con tu pieza HTML5.</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#9500cb] shrink-0" />
                      <span>O un .csv / .xlsx con el tag.</span>
                    </li>
                  </ul>
                </div>
                <DropZone onDrop={onDrop} isProcessing={isProcessing} />
              </div>
            ) : (
              <Controls 
                selectedSize={selectedSize} 
                setSelectedSize={setSelectedSize} 
                reset={reset} 
                previewData={previewData}
              />
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex gap-3 text-red-200 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-[#2a2a2a] text-xs text-gray-500 flex justify-between items-center bg-[#181818]">
            <span>AdPreview Pro</span>
            <span className="flex items-center gap-1 font-mono">
              v2.1.0 <Info className="w-3 h-3" />
            </span>
          </div>
        </aside>

        <section className="flex-1 relative overflow-hidden flex flex-col">
          {previewData ? (
            <>
              <div className="h-14 border-b border-[#2a2a2a] flex items-center px-6 justify-between bg-[#121212]/90 backdrop-blur z-10 shrink-0">
                <div className="flex gap-6">
                  <div className="h-14 border-b-2 text-[#9500cb] border-[#9500cb] font-bold transition-all flex items-center gap-2 px-1">
                    <Monitor className="w-4 h-4" /> Preview
                  </div>
                </div>
                <div className="text-xs bg-[#222] px-3 py-1 rounded-full border border-[#333] text-gray-400 font-mono">
                  {previewData.fileName}
                </div>
              </div>

              <div className="flex-1 bg-[radial-gradient(#2a2a2a_1px,transparent_1px)] [background-size:24px_24px] relative bg-[#121212]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <PreviewWindow previewData={previewData} size={selectedSize} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
              <div className="relative mb-8">
                <Monitor className="w-32 h-32 opacity-5" />
                <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                  <Upload className="w-12 h-12 text-[#333]" />
                </div>
              </div>
              <p className="text-xl font-light tracking-tight text-gray-500">Arrastra archivos para comenzar</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
