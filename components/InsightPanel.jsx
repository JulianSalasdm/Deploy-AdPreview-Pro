
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Loader2, Zap, AlertTriangle, ShieldCheck, Smartphone } from 'lucide-react';

const InsightPanel = ({ previewData }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const analyzeWithAI = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analiza este código de publicidad mobile (Rich Media / Tag): ${previewData.content.substring(0, 5000)}`;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              criticalIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              performanceNotes: { type: Type.STRING }
            },
            required: ["score", "criticalIssues", "suggestions", "performanceNotes"]
          }
        }
      });
      setAnalysis(JSON.parse(response.text.trim()));
    } catch (error) { console.error("AI Analysis failed", error); }
    finally { setLoading(false); }
  };

  useEffect(() => { analyzeWithAI(); }, [previewData.content]);

  if (loading) return <div className="flex flex-col items-center justify-center p-12 text-gray-500"><Loader2 className="w-12 h-12 animate-spin text-[#9500cb] mb-4" /><p>Analizando...</p></div>;
  if (!analysis) return null;

  return (
    <div className="max-w-4xl w-full space-y-8 p-6 bg-[#1a1a1a]/80 rounded-3xl border border-[#333] backdrop-blur-sm overflow-y-auto max-h-full custom-scrollbar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#9500cb]/20 rounded-2xl flex items-center justify-center"><Smartphone className="text-[#9500cb] w-6 h-6" /></div>
          <h2 className="text-2xl font-bold text-white">Mobile Insights</h2>
        </div>
        <div className={`text-4xl font-black ${analysis.score > 70 ? 'text-emerald-400' : 'text-red-400'}`}>{analysis.score}</div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#222] p-6 rounded-2xl border border-[#333]"><div className="text-red-400 font-bold mb-4 flex gap-2"><AlertTriangle /> Problemas</div>{analysis.criticalIssues.map((issue, i) => <li key={i} className="text-sm text-gray-300 list-none">• {issue}</li>)}</div>
        <div className="bg-[#222] p-6 rounded-2xl border border-[#333]"><div className="text-emerald-400 font-bold mb-4 flex gap-2"><ShieldCheck /> Optimización</div>{analysis.suggestions.map((sug, i) => <li key={i} className="text-sm text-gray-300 list-none">• {sug}</li>)}</div>
      </div>
      <div className="bg-[#9500cb]/10 p-6 rounded-2xl border border-[#9500cb]/20"><div className="text-[#b02fe0] font-bold mb-2 flex gap-2"><Zap /> Rendimiento</div><p className="text-sm text-gray-300">{analysis.performanceNotes}</p></div>
    </div>
  );
};

export default InsightPanel;
