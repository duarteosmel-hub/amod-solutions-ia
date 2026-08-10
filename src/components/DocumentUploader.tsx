import React, { useState, useRef } from 'react';
import { SAMPLE_DOCUMENTS, SampleDoc } from '../data/sampleDocuments';
import { Upload, FileText, Sparkles, FileSpreadsheet, FileCheck, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';

interface DocumentUploaderProps {
  onAnalyzeFile: (fileData: { fileName: string; fileType: string; fileContentBase64?: string; textContent?: string }) => void;
  isAnalyzing: boolean;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onAnalyzeFile, isAnalyzing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    setSelectedFileName(file.name);
    const reader = new FileReader();

    // Text based files
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
      reader.onload = (event) => {
        const textContent = event.target?.result as string;
        onAnalyzeFile({
          fileName: file.name,
          fileType: file.type || 'text/plain',
          textContent
        });
      };
      reader.readAsText(file);
    } else {
      // Binary files (PDF, images, docx)
      reader.onload = (event) => {
        const fileContentBase64 = event.target?.result as string;
        onAnalyzeFile({
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileContentBase64
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSampleSelect = (doc: SampleDoc) => {
    setSelectedFileName(doc.name);
    onAnalyzeFile({
      fileName: doc.name,
      fileType: doc.mimeType,
      textContent: doc.content
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <Upload className="w-5 h-5" />
            </span>
            <span>1. Seleccionar y Cargar Documento</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cargue cualquier archivo empresarial (Factura, Contrato, Cotización, Informe, Orden de Compra).
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
          Paso 1 de 3
        </span>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isAnalyzing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all relative overflow-hidden ${
          isDragging
            ? 'border-blue-500 bg-blue-50/80 scale-[0.99]'
            : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
        } ${isAnalyzing ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.csv,.xlsx"
          className="hidden"
        />

        {isAnalyzing ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-3">
            <div className="relative">
              <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
              <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-800">
                Analizando contenido con Gemini IA Secretarial...
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Identificando área administrativa, tipo de archivo, fecha y generando nomenclatura recomendada...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-blue-100/80 text-blue-600 flex items-center justify-center shadow-inner">
              <FileText className="w-7 h-7" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Arrastre un documento aquí o <span className="text-blue-600 underline decoration-blue-300">examine su equipo</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formatos admitidos: PDF, Word (DOCX), Texto (TXT), Imágenes (PNG/JPG), Hojas de cálculo (CSV)
              </p>
            </div>

            {selectedFileName && (
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-lg border border-blue-200 text-xs font-medium">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span>Archivo cargado: <strong>{selectedFileName}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sample Documents Bar for Academic/Demonstration Testing */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Documentos de muestra para demostración académica:</span>
          </span>
          <span className="text-[11px] text-slate-400">Prueba instantánea en 1 clic</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {SAMPLE_DOCUMENTS.map((doc) => (
            <button
              key={doc.id}
              onClick={() => handleSampleSelect(doc)}
              disabled={isAnalyzing}
              className="text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate max-w-[170px]">
                    {doc.name}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                  {doc.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
