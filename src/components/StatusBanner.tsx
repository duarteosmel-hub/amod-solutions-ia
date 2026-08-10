import React from 'react';
import { StorageStatus, DriveSaveResult } from '../types';
import { CheckCircle2, AlertOctagon, ExternalLink, HardDrive, RefreshCw, Clock, FolderCheck, AlertTriangle } from 'lucide-react';

interface StatusBannerProps {
  status: StorageStatus;
  saveResult: DriveSaveResult | null;
  errorMessage: string | null;
  onReset: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  saveResult,
  errorMessage,
  onReset
}) => {
  if (status === 'proposal') {
    return (
      <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm mb-6">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                ESTADO 1: PROPUESTA DE CLASIFICACIÓN
              </span>
            </div>
            <p className="text-xs text-amber-900 font-medium mt-1">
              Documento analizado con éxito por Gemini IA. El archivo aún <strong>NO se ha guardado en Google Drive</strong>.
              Por favor revise la propuesta antes de dar su confirmación explícita.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'saving') {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-xl shadow-sm mb-6 flex items-center space-x-3.5">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin flex-shrink-0" />
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
            PROCESANDO ALMACENAMIENTO EN GOOGLE DRIVE...
          </span>
          <p className="text-xs text-blue-800 mt-0.5">
            Verificando carpetas de área, creando subdirectorios requeridos y transfiriendo el archivo de manera segura...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'saved' && saveResult) {
    return (
      <div className="bg-emerald-500/10 border-l-4 border-emerald-600 p-5 rounded-2xl shadow-sm mb-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 bg-emerald-200/90 px-2.5 py-0.5 rounded-md">
                  ESTADO 2: ARCHIVO REALMENTE GUARDADO EN GOOGLE DRIVE
                </span>
                <span className="text-[11px] font-semibold text-emerald-800">
                  Confirmación Oficial de Google Drive
                </span>
              </div>
              <p className="text-xs text-emerald-950 font-medium mt-1">
                Google Drive ha verificado y confirmado la recepción correcta del archivo en la ruta especificada.
              </p>
            </div>
          </div>

          <button
            onClick={onReset}
            className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold text-xs rounded-lg border border-emerald-300 transition-all"
          >
            Clasificar Otro Documento
          </button>
        </div>

        {/* Confirmation Details Card */}
        <div className="bg-white rounded-xl p-4 border border-emerald-200 space-y-2.5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
            <div>
              <span className="text-slate-500 block text-[11px]">ID de Archivo en Google Drive:</span>
              <span className="font-bold text-slate-800 truncate block bg-slate-100 p-1.5 rounded border border-slate-200">
                {saveResult.fileId}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Ruta de Carpetas Creadas:</span>
              <span className="font-bold text-emerald-800 truncate block bg-emerald-50 p-1.5 rounded border border-emerald-200">
                {saveResult.parentFolderPath}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-slate-100 gap-3">
            <div className="flex items-center space-x-2 text-slate-600 text-[11px]">
              <FolderCheck className="w-4 h-4 text-emerald-600" />
              <span>Guardado registrado el: <strong>{new Date(saveResult.savedAt).toLocaleString()}</strong></span>
            </div>

            <a
              href={saveResult.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir Archivo en Google Drive</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-rose-500/10 border-l-4 border-rose-600 p-5 rounded-2xl shadow-sm mb-6 space-y-3">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-sm">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-950 bg-rose-200/90 px-2.5 py-0.5 rounded-md">
                ESTADO 3: ERROR DE ALMACENAMIENTO
              </span>
            </div>
            <p className="text-xs text-rose-950 font-medium mt-1">
              Google Drive <strong>NO confirmó</strong> el guardado del archivo. La operación ha sido abortada.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-rose-200 text-xs font-mono text-rose-900">
          <strong>Detalle técnico del error:</strong> {errorMessage || 'Fallo desconocido de autenticación o de conexión con la API de Google Drive.'}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onReset}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition-all"
          >
            Reintentar Operación
          </button>
        </div>
      </div>
    );
  }

  return null;
};
