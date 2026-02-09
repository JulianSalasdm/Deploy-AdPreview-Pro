
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Sparkles, Loader2, Zap, AlertTriangle, ShieldCheck, Smartphone } from 'lucide-react';
import { PreviewData } from '../types';

interface InsightPanelProps {
  previewData: PreviewData;
}

interface AnalysisResult {
  score: number;
  criticalIssues: string[];
  suggestions: string[];
  performanceNotes: string;
}

const InsightPanel: React.FC<InsightPanelProps> = ({ previewData }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const analyzeWithAI = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Actúa como un experto en QA de Publicidad Digital especializado en entornos MOBILE.
        Analiza el siguiente fragmento de código de un anuncio (Rich Media o Ad Tag).
        Tu prioridad absoluta es la COMPATIBILIDAD Y RENDIMIENTO EN DISPOSITIVOS MÓVILES.
        
        Evalúa:
        1. Viewport: ¿Está configurado correctamente para mobile?
        2. Touch Targets: ¿Los elementos interactivos son aptos para dedos (mínimo 44x44px)?
        3. Peso y Assets: ¿Es demasiado pesado para conexiones 4G/LTE?
        4. Errores de sintaxis o trackers bloqueados.
        5. Carruseles y Animaciones: ¿Funcionarán suavemente en un procesador móvil?

        Código:
        ${previewData.content.substring(0, 5000)}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER, description: 'Calificación del 1 al 100 basada en mobile readiness.' },
              criticalIssues: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Errores graves que impiden el correcto funcionamiento en mobile.' },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Mejoras específicas para UX táctil y rendimiento móvil.' },
              performanceNotes: { type: Type.STRING, description: 'Resumen del comportamiento esperado en dispositivos de gama media/baja.' }
            },
            required: ["score", "criticalIssues", "suggestions", "performanceNotes"]
          }
        }
      });

      const result = JSON.parse(response.text.trim());
      setAnalysis(result);
    } catch (error) {
      console.error("AI Analysis failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    analyzeWithAI();
  }, [previewData.content]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500">
        <Loader2 className="w-12 h-12 animate-spin text-[#9500cb] mb-4" />
        <p className="text-lg font-medium">Gemini está analizando tu código...</p>
        <p className="text-sm opacity-60">Validando parámetros Mobile-First...</p>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="max-w-4xl w-full space-y-8 p-6 bg-[#1a1a1a]/80 rounded-3xl border border-[#333] backdrop-blur-sm overflow-y-auto max-h-full custom-scrollbar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#9500cb]/20 rounded-2xl flex items-center justify-center">
            <Smartphone className="text-[#9500cb] w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Mobile Ad Insights</h2>
            <p className="text-gray-400 text-sm">Validación optimizada para dispositivos móviles</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Mobile Readiness</div>
          <div className={`text-4xl font-black ${analysis.score > 70 ? 'text-emerald-400' : analysis.score > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {analysis.score}<span className="text-lg opacity-50">/100</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#222] p-6 rounded-2xl border border-[#333]">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm uppercase mb-4">
            <AlertTriangle className="w-4 h-4" /> Problemas en Mobile
          </div>
          {analysis.criticalIssues.length > 0 ? (
            <ul className="space-y-3">
              {analysis.criticalIssues.map((issue, i) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-red-500 shrink-0">•</span> {issue}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">No se detectaron problemas críticos para mobile.</p>
          )}
        </div>

        <div className="bg-[#222] p-6 rounded-2xl border border-[#333]">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase mb-4">
            <ShieldCheck className="w-4 h-4" /> Optimización Mobile
          </div>
          <ul className="space-y-3">
            {analysis.suggestions.map((sug, i) => (
              <li key={i} className="text-sm text-gray-300 flex gap-2">
                <span className="text-emerald-500 shrink-0">•</span> {sug}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-[#9500cb]/10 p-6 rounded-2xl border border-[#9500cb]/20">
        <div className="flex items-center gap-2 text-[#b02fe0] font-bold text-sm uppercase mb-2">
          <Zap className="w-4 h-4" /> Rendimiento en Dispositivo
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          {analysis.performanceNotes}
        </p>
      </div>
    </div>
  );
};

export default InsightPanel;
