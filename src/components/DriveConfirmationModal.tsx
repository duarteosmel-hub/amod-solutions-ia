import React, { useState, useEffect } from 'react';
import { DocumentAnalysis, AuthUser } from '../types';
import { HardDrive, AlertTriangle, CheckCircle2, ShieldCheck, X, FolderTree, FileText, AlertOctagon, RefreshCw, Lock, LogIn } from 'lucide-react';

interface DriveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: DocumentAnalysis;
  authUser: AuthUser;
  onConnectDrive: () => void;
  onConfirmSave: (overwriteAction: 'none' | 'rename' | 'overwrite') => void;
  isSaving: boolean;
}

export const DriveConfirmationModal: React.FC<DriveConfirmationModalProps> = ({
  isOpen,
  onClose,
  analysis,
  authUser,
  onConnectDrive,
  onConfirmSave,
  isSaving
}) => {
  const [checkingExists, setCheckingExists] = useState(false);
  const [fileExists, setFileExists] = useState(false);
  const [overwriteAction, setOverwriteAction] = useState<'none' | 'rename' | 'overwrite'>('none');
  const [userCheckbox, setUserCheckbox] = useState(false);

  const fullTargetPath = `EMPRESA/${analysis.recommendedFolder}/${analysis.recommendedSubfolder}`;

  useEffect(() => {
    if (isOpen && authUser.connected) {
      checkDriveDuplicate();
      setUserCheckbox(false);
      setOverwriteAction('none');
    }
  }, [isOpen, analysis, authUser.connected]);

  const checkDriveDuplicate = async () => {
    setCheckingExists(true);
    try {
      const res = await fetch('/api/drive/check-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: analysis.recommendedFileName,
          targetPath: fullTargetPath
        })
      });

      if (res.ok) {
        const data = await res.json();
        setFileExists(data.exists);
        if (data.exists) {
          setOverwriteAction('rename'); // Default to safe auto-rename if file exists
        }
      }
    } catch (err) {
      console.warn('Error checking file duplicate in Drive:', err);
    } finally {
      setCheckingExists(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden transform transition-all">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">3. Confirmación de Operación en Google Drive</h3>
              <p className="text-xs text-slate-400">Amod Solutions IA • Guardado Real en Google Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* Connection requirement if not connected */}
          {!authUser.connected ? (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3 text-xs text-amber-900">
              <div className="flex items-start space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-amber-950 text-sm block">Autenticación Requerida con Google Drive</strong>
                  <p className="mt-1 text-slate-700">
                    No hay una cuenta de Google conectada. Para guardar este archivo de forma real en su unidad de Google Drive, debe iniciar sesión y autorizar los permisos correspondientes.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onConnectDrive}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all text-xs"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Iniciar Sesión con Google</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Autenticado como: <strong>{authUser.user?.email || authUser.user?.name || 'Cuenta de Google'}</strong></span>
              </div>
              <span className="text-[11px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded">OAuth Activo</span>
            </div>
          )}

          {/* Destination Path Confirmation Box */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <FolderTree className="w-4 h-4 text-blue-600" />
              <span>Estructura de Carpetas a Crear en Google Drive:</span>
            </span>

            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5 font-mono text-xs">
              <div className="flex items-center text-slate-600">
                <span className="w-24 text-[11px] font-semibold text-slate-400">Directorio Raíz:</span>
                <span className="text-blue-700 font-bold">EMPRESA /</span>
              </div>
              <div className="flex items-center text-slate-600">
                <span className="w-24 text-[11px] font-semibold text-slate-400">Área:</span>
                <span className="text-indigo-700 font-bold">{analysis.recommendedFolder} /</span>
              </div>
              <div className="flex items-center text-slate-600">
                <span className="w-24 text-[11px] font-semibold text-slate-400">Subcarpeta:</span>
                <span className="text-amber-700 font-bold">{analysis.recommendedSubfolder} /</span>
              </div>
              <div className="flex items-center text-slate-900 pt-1.5 border-t border-slate-100">
                <span className="w-24 text-[11px] font-semibold text-slate-400">Archivo:</span>
                <span className="text-slate-900 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {analysis.recommendedFileName}
                </span>
              </div>
            </div>
          </div>

          {/* Duplicate File Checking Alert */}
          {authUser.connected && (
            checkingExists ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Verificando si existen archivos duplicados en Google Drive...</span>
              </div>
            ) : fileExists ? (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-3 text-xs text-rose-900">
                <div className="flex items-center space-x-2 font-bold text-rose-950">
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  <span>¡Advertencia de Archivo Existente en Google Drive!</span>
                </div>
                <p>
                  Ya existe un archivo con el nombre <strong>"{analysis.recommendedFileName}"</strong> en la carpeta destino de Google Drive.
                </p>

                <div className="space-y-2 pt-1">
                  <span className="font-semibold block text-slate-800">Seleccione la acción a realizar:</span>
                  
                  <label className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="overwriteOption"
                      checked={overwriteAction === 'rename'}
                      onChange={() => setOverwriteAction('rename')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-800">
                      Renombrar automáticamente (agregar sufijo _v2, _v3)
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="overwriteOption"
                      checked={overwriteAction === 'overwrite'}
                      onChange={() => setOverwriteAction('overwrite')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-medium text-rose-800">
                      Sobrescribir archivo existente (requiere confirmación)
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verificación completada: No existen archivos duplicados en esta ruta de Google Drive.</span>
              </div>
            )
          )}

          {/* Mandatory Checkbox for User Confirmation */}
          <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={userCheckbox}
                disabled={!authUser.connected}
                onChange={(e) => setUserCheckbox(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <span className="text-xs text-slate-700 font-medium">
                Confirmo que he revisado la propuesta de clasificación y autorizo a Amod Solutions IA a crear las carpetas necesarias y almacenar realmente el archivo en mi unidad de Google Drive.
              </span>
            </label>
          </div>

        </div>

        {/* Modal Footer Buttons */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl shadow-sm transition-all"
          >
            Cancelar
          </button>

          <button
            onClick={() => onConfirmSave(overwriteAction)}
            disabled={!authUser.connected || !userCheckbox || isSaving}
            className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all ${
              authUser.connected && userCheckbox && !isSaving
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                : 'bg-slate-400 cursor-not-allowed opacity-70'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Guardando en Google Drive...</span>
              </>
            ) : (
              <>
                <HardDrive className="w-4 h-4" />
                <span>Confirmar y Guardar en Drive</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

