import React, { useState, useRef, useMemo } from 'react';
import { DocumentAnalysis, SavedDocumentRecord, AuthUser, DocumentCategory } from '../types';
import { openGoogleDriveDocument } from '../utils/driveViewer';
import { SAMPLE_DOCUMENTS, SampleDoc } from '../data/sampleDocuments';
import { 
  Upload, 
  FileText, 
  Sparkles, 
  RefreshCw, 
  FileCheck, 
  ArrowRight, 
  HardDrive, 
  ExternalLink, 
  Search, 
  Filter, 
  Calendar, 
  Building, 
  Tag, 
  DollarSign, 
  User, 
  Hash, 
  FolderCheck, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileCode, 
  FolderTree,
  FileSpreadsheet,
  FileBox
} from 'lucide-react';

interface DocumentManagerProps {
  authUser: AuthUser;
  onConnectDrive: () => void;
  savedRecords: SavedDocumentRecord[];
  onDocumentSaved: (record: SavedDocumentRecord) => void;
}

const CATEGORIES: DocumentCategory[] = [
  'Facturas',
  'Contratos',
  'Comprobantes',
  'Informes',
  'Documentos administrativos',
  'Clientes',
  'Otros'
];

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  authUser,
  onConnectDrive,
  savedRecords,
  onDocumentSaved
}) => {
  // File Upload & Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<DocumentAnalysis | null>(null);
  const [lastUploadedFile, setLastUploadedFile] = useState<{
    fileName: string;
    fileType: string;
    fileContentBase64?: string;
    textContent?: string;
  } | null>(null);

  // Storage & Operation State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessRecord, setSaveSuccessRecord] = useState<SavedDocumentRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Search & Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process selected file
  const processSelectedFile = (file: File) => {
    setSaveSuccessRecord(null);
    setErrorMessage(null);
    setCurrentAnalysis(null);

    const reader = new FileReader();

    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
      reader.onload = (event) => {
        const textContent = event.target?.result as string;
        analyzeDocument({
          fileName: file.name,
          fileType: file.type || 'text/plain',
          textContent
        });
      };
      reader.readAsText(file);
    } else {
      reader.onload = (event) => {
        const fileContentBase64 = event.target?.result as string;
        analyzeDocument({
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileContentBase64
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger AI Analysis
  const analyzeDocument = async (fileData: {
    fileName: string;
    fileType: string;
    fileContentBase64?: string;
    textContent?: string;
  }) => {
    setIsAnalyzing(true);
    setLastUploadedFile(fileData);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileData)
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Error al procesar el archivo con Inteligencia Artificial.');
      }

      const analysisData: DocumentAnalysis = await res.json();
      setCurrentAnalysis(analysisData);
    } catch (err: any) {
      console.error('Document analysis error:', err);
      setErrorMessage(err.message || 'Ocurrió un error inesperado al analizar el documento.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sample document selection
  const handleSampleSelect = (doc: SampleDoc) => {
    analyzeDocument({
      fileName: doc.name,
      fileType: doc.mimeType,
      textContent: doc.content
    });
  };

  // Save Document to Google Drive
  const handleConfirmSaveDrive = async () => {
    if (!currentAnalysis || !lastUploadedFile) return;

    if (!authUser.connected) {
      onConnectDrive();
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const categoryFolder = currentAnalysis.category || 'Otros';
      const targetPath = `EMPRESA/01_DOCUMENTOS/${categoryFolder}`;

      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: currentAnalysis,
          fileContentBase64: lastUploadedFile.fileContentBase64,
          textContent: lastUploadedFile.textContent,
          fileName: currentAnalysis.recommendedFileName || lastUploadedFile.fileName,
          targetPath,
          overwriteAction: 'rename'
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar en Google Drive.');
      }

      const newRecord: SavedDocumentRecord = data.savedRecord || {
        id: `doc_rec_${Date.now()}`,
        analysis: currentAnalysis,
        driveResult: data.driveResult,
        savedBy: authUser.email || 'Usuario',
        savedAt: new Date().toISOString().split('T')[0]
      };

      setSaveSuccessRecord(newRecord);
      onDocumentSaved(newRecord);
      setCurrentAnalysis(null);
    } catch (err: any) {
      console.error('Save to drive error:', err);
      setErrorMessage(err.message || 'No se pudo completar el guardado en Google Drive.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelAnalysis = () => {
    setCurrentAnalysis(null);
    setLastUploadedFile(null);
    setErrorMessage(null);
  };

  // Filtered and sorted history records (from most recent to oldest)
  const filteredRecords = useMemo(() => {
    const sorted = [...savedRecords].sort((a, b) => {
      const dateA = a.savedAt || a.analysis?.detectedDate || '';
      const dateB = b.savedAt || b.analysis?.detectedDate || '';
      return dateB.localeCompare(dateA);
    });

    return sorted.filter((rec) => {
      const categoryMatch = selectedCategory === 'TODAS' || rec.analysis?.category === selectedCategory;

      if (!categoryMatch) return false;

      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      const name = (rec.driveResult?.fileName || rec.analysis?.recommendedFileName || rec.analysis?.originalFileName || '').toLowerCase();
      const type = (rec.analysis?.documentType || '').toLowerCase();
      const category = (rec.analysis?.category || '').toLowerCase();
      const date = (rec.analysis?.detectedDate || rec.savedAt || '').toLowerCase();
      const entity = (rec.analysis?.entityName || '').toLowerCase();
      const client = (rec.analysis?.clientRelated || '').toLowerCase();
      const number = (rec.analysis?.documentNumber || '').toLowerCase();
      const keywords = (rec.analysis?.keywords || []).join(' ').toLowerCase();

      return (
        name.includes(term) ||
        type.includes(term) ||
        category.includes(term) ||
        date.includes(term) ||
        entity.includes(term) ||
        client.includes(term) ||
        number.includes(term) ||
        keywords.includes(term)
      );
    });
  }, [savedRecords, searchTerm, selectedCategory]);

  return (
    <div className="space-y-6">
      
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>FASE 6: GESTIÓN DOCUMENTAL INTELIGENTE</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Gestión Documental
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Cargue sus documentos (PDF, DOCX, XLSX, JPG, PNG) para que Gemini los analice, clasifique y organice automáticamente en Google Drive según las 7 categorías oficiales de la empresa.
            </p>
          </div>

          {!authUser.connected ? (
            <button
              onClick={onConnectDrive}
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all self-start md:self-auto"
            >
              <HardDrive className="w-4 h-4" />
              <span>Conectar Google Drive</span>
            </button>
          ) : (
            <div className="inline-flex items-center space-x-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-3.5 py-2 rounded-xl text-xs font-medium self-start md:self-auto">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Google Drive Conectado ({authUser.email})</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Notification Card (After Saving to Drive) */}
      {saveSuccessRecord && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 text-emerald-900">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-900">
                ¡Documento clasificado y almacenado exitosamente!
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                El archivo ha sido guardado intacto en la carpeta correspondiente de Google Drive.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-emerald-200 text-xs">
            <div>
              <span className="text-slate-500 block font-medium">Nombre del archivo:</span>
              <span className="font-bold text-slate-800 break-all">
                {saveSuccessRecord.driveResult?.fileName || saveSuccessRecord.analysis?.recommendedFileName}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Categoría:</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block mt-0.5">
                {saveSuccessRecord.analysis?.category}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Ubicación en Google Drive:</span>
              <span className="font-mono text-slate-700 block mt-0.5 text-[11px]">
                EMPRESA/01_DOCUMENTOS/{saveSuccessRecord.analysis?.category}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <a
              href={saveSuccessRecord.driveResult?.webViewLink || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Ver documento en Google Drive</span>
            </a>

            <button
              onClick={() => {
                setSaveSuccessRecord(null);
                setLastUploadedFile(null);
              }}
              className="inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors border border-slate-300"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Subir otro documento</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: UPLOAD DOCUMENT */}
      {!currentAnalysis && !saveSuccessRecord && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Upload className="w-5 h-5" />
                </span>
                <span>Subir documento para análisis</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Seleccione o arrastre un documento compatible (PDF, DOCX, XLSX, JPG, PNG).
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              Formatos: PDF, DOCX, XLSX, JPG, PNG
            </span>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processSelectedFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => !isAnalyzing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging ? 'border-blue-500 bg-blue-50/80 scale-[0.99]' : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
            } ${isAnalyzing ? 'pointer-events-none opacity-70' : ''}`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && processSelectedFile(e.target.files[0])}
              accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.csv,.txt"
              className="hidden"
            />

            {isAnalyzing ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-3">
                <div className="relative">
                  <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
                  <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Analizando contenido con Inteligencia Artificial Gemini...
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Extrayendo tipo, fecha, empresa/proveedor, valor total y asignando categoría oficial...
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Haga clic aquí para <span className="text-blue-600 underline decoration-blue-300 font-bold">Subir documento</span> o arrastre un archivo
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Documentos compatibles: PDF, Word (DOCX), Excel (XLSX), Imágenes (JPG, PNG)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sample Documents for 1-click Testing */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Documentos de prueba rápida (1 Clic):</span>
              </span>
              <span className="text-[11px] text-slate-400">Demostración académica</span>
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
      )}

      {/* SECTION 2: AI ANALYSIS PREVIEW CARD ("DOCUMENTO ANALIZADO") */}
      {currentAnalysis && (
        <div className="bg-white rounded-2xl border-2 border-blue-500 p-6 shadow-md space-y-6 relative overflow-hidden">
          
          {/* Header Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 border border-blue-200 p-3.5 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-900 bg-blue-200 px-2 py-0.5 rounded">
                  DOCUMENTO ANALIZADO
                </span>
                <p className="text-xs text-blue-950 font-medium mt-0.5">
                  Revise los datos extraídos por la IA antes de confirmar el almacenamiento en Google Drive.
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
              Confianza IA: {currentAnalysis.confidenceScore || 95}%
            </span>
          </div>

          {/* Preview Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 text-xs flex items-center space-x-1 font-medium">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Nombre del documento:</span>
              </span>
              <span className="font-bold text-slate-900 text-sm block break-all">
                {currentAnalysis.recommendedFileName || currentAnalysis.originalFileName}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 text-xs flex items-center space-x-1 font-medium">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tipo de documento:</span>
              </span>
              <span className="font-bold text-slate-900 text-sm block">
                {currentAnalysis.documentType || 'No identificado'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 text-xs flex items-center space-x-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Fecha del documento:</span>
              </span>
              <span className="font-bold text-slate-900 text-sm block">
                {currentAnalysis.detectedDate || 'No identificado'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 text-xs flex items-center space-x-1 font-medium">
                <Building className="w-3.5 h-3.5 text-purple-600" />
                <span>Empresa o proveedor:</span>
              </span>
              <span className="font-bold text-slate-900 text-sm block">
                {currentAnalysis.entityName || 'No identificado'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 text-xs flex items-center space-x-1 font-medium">
                <Hash className="w-3.5 h-3.5 text-amber-600" />
                <span>Número de documento:</span>
              </span>
              <span className="font-bold text-slate-900 text-sm block">
                {currentAnalysis.documentNumber || 'No identificado'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 text-xs flex items-center space-x-1 font-medium">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Valor total:</span>
              </span>
              <span className="font-bold text-slate-900 text-sm block">
                {currentAnalysis.amountTotal || 'No identificado'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 md:col-span-2">
              <span className="text-slate-500 text-xs flex items-center space-x-1 font-medium">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Cliente relacionado:</span>
              </span>
              <span className="font-bold text-slate-900 text-sm block">
                {currentAnalysis.clientRelated || 'No identificado'}
              </span>
            </div>

          </div>

          {/* Destination Folder Box */}
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-1.5 font-mono">
            <span className="text-slate-400 text-xs uppercase tracking-wider block font-sans">
              Carpeta de destino en Google Drive:
            </span>
            <div className="text-sm font-bold text-emerald-400 flex items-center space-x-2">
              <FolderTree className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>EMPRESA/01_DOCUMENTOS/{currentAnalysis.category}</span>
            </div>
          </div>

          {/* Keywords */}
          {currentAnalysis.keywords && currentAnalysis.keywords.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-slate-600 block mb-1.5">
                Palabras clave identificadas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentAnalysis.keywords.map((kw, i) => (
                  <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200">
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              onClick={handleCancelAnalysis}
              disabled={isSaving}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors"
            >
              Cancelar
            </button>

            <button
              onClick={handleConfirmSaveDrive}
              disabled={isSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando en Google Drive...</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4" />
                  <span>Guardar en Google Drive</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* SECTION 3: SEARCH & FILTERS + HISTORIAL DE DOCUMENTOS CLASIFICADOS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <FolderCheck className="w-5 h-5 text-blue-600" />
              <span>Historial de Documentos Clasificados</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Consulte y busque en el expediente de documentos organizados en Google Drive.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, tipo, fecha, empresa, categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Categoría:</span>
          </span>

          <button
            onClick={() => setSelectedCategory('TODAS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === 'TODAS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({savedRecords.length})
          </button>

          {CATEGORIES.map((cat) => {
            const count = savedRecords.filter((r) => r.analysis?.category === cat).length;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Documents Results View */}
        {searchTerm.trim() ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Search className="w-4 h-4 text-blue-600" />
                <span>DOCUMENTOS ENCONTRADOS ({filteredRecords.length})</span>
              </h3>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <FileBox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-sm text-slate-700">No se encontraron documentos.</p>
                <p className="text-xs text-slate-400 mt-1">
                  No hay archivos que coincidan con la búsqueda "{searchTerm}".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRecords.map((record) => {
                  const fileName = record.driveResult?.fileName || record.analysis?.recommendedFileName || record.analysis?.originalFileName;
                  const category = record.analysis?.category || 'Otros';
                  const date = record.savedAt || record.analysis?.detectedDate || 'Sin fecha';
                  const entity = record.analysis?.entityName || 'No identificado';
                  const docType = record.analysis?.documentType || 'Documento';
                  const drivePath = `EMPRESA/01_DOCUMENTOS/${category}`;

                  return (
                    <div key={record.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 transition-all space-y-3">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2">
                        <div>
                          <span className="font-bold text-slate-900 text-sm block break-all">
                            {fileName}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
                          {category}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                        <div>
                          <span className="text-slate-400 font-medium block text-[11px]">Tipo:</span>
                          <span className="font-semibold text-slate-800">{docType}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[11px]">Categoría:</span>
                          <span className="font-semibold text-slate-800">{category}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[11px]">Fecha:</span>
                          <span className="font-semibold text-slate-800 font-mono">{date}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[11px]">Proveedor / Empresa:</span>
                          <span className="font-semibold text-slate-800 truncate block" title={entity}>{entity}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-slate-400 text-[10px] block font-medium">Ubicación:</span>
                          <span className="font-mono text-[11px] text-emerald-700 font-bold">
                            {drivePath}
                          </span>
                        </div>

                        <button
                          onClick={(e) => openGoogleDriveDocument({
                            fileId: record.driveResult?.fileId,
                            fileName: record.driveResult?.fileName || record.analysis?.recommendedFileName || record.analysis?.originalFileName,
                            targetPath: `EMPRESA/01_DOCUMENTOS/${record.analysis?.category || 'Otros'}`,
                            webViewLink: record.driveResult?.webViewLink
                          })}
                          className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
                        >
                          <span>Ver documento</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Default Table View when not actively typing in search */
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Nombre del Archivo</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Empresa / Proveedor</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Ubicación en Drive</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      <FileBox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-sm text-slate-700">No se encontraron documentos.</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Cargue un nuevo documento en la parte superior para comenzar a registrar expedientes.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => {
                    const fileName = record.driveResult?.fileName || record.analysis?.recommendedFileName || record.analysis?.originalFileName;
                    const category = record.analysis?.category || 'Otros';
                    const date = record.savedAt || record.analysis?.detectedDate || 'Sin fecha';
                    const entity = record.analysis?.entityName || 'No identificado';
                    const drivePath = `EMPRESA/01_DOCUMENTOS/${category}`;

                    return (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {date}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 max-w-[200px] truncate" title={fileName}>
                          {fileName}
                        </td>
                        <td className="p-3 text-slate-700 font-medium whitespace-nowrap">
                          {record.analysis?.documentType || 'Documento'}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            {category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 max-w-[140px] truncate" title={entity}>
                          {entity}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Almacenado</span>
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-emerald-700 whitespace-nowrap">
                          {drivePath}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => openGoogleDriveDocument({
                              fileId: record.driveResult?.fileId,
                              fileName: record.driveResult?.fileName || record.analysis?.recommendedFileName || record.analysis?.originalFileName,
                              targetPath: `EMPRESA/01_DOCUMENTOS/${record.analysis?.category || 'Otros'}`,
                              webViewLink: record.driveResult?.webViewLink
                            })}
                            className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer bg-transparent border-0"
                          >
                            <span>Ver documento</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
