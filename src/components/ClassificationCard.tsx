import React, { useState } from 'react';
import { DocumentAnalysis, AdminArea } from '../types';
import { ADMIN_AREAS } from '../data/adminAreas';
import { Sparkles, FolderTree, FileText, Calendar, Building, DollarSign, Edit3, Check, HardDrive, ShieldCheck, Tag, Info, AlertTriangle } from 'lucide-react';

interface ClassificationCardProps {
  analysis: DocumentAnalysis;
  onUpdateAnalysis: (updated: DocumentAnalysis) => void;
  onProceedToSave: () => void;
  isSaving: boolean;
}

export const ClassificationCard: React.FC<ClassificationCardProps> = ({
  analysis,
  onUpdateAnalysis,
  onProceedToSave,
  isSaving
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<DocumentAnalysis>({ ...analysis });

  // Update local editedData if proposal changes externally
  React.useEffect(() => {
    setEditedData({ ...analysis });
  }, [analysis]);

  const handleSaveEdits = () => {
    onUpdateAnalysis(editedData);
    setIsEditing(false);
  };

  const handleAreaChange = (newAreaCode: AdminArea) => {
    const areaInfo = ADMIN_AREAS[newAreaCode];
    const defaultSub = areaInfo.defaultSubfolders[0] || 'General_2026';
    
    setEditedData({
      ...editedData,
      adminArea: newAreaCode,
      recommendedFolder: newAreaCode,
      recommendedSubfolder: defaultSub
    });
  };

  const currentAreaInfo = ADMIN_AREAS[editedData.adminArea] || ADMIN_AREAS['01_ADMINISTRACION'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden transition-all">
      {/* Top Banner: PROPUESTA DE CLASIFICACIÓN (MANDATORY REQUIREMENT) */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500 text-white rounded-lg shadow-sm">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded">
                ESTADO: PROPUESTA
              </span>
              <span className="text-xs font-semibold text-amber-700">
                (Pendiente de confirmación)
              </span>
            </div>
            <p className="text-xs text-amber-900 font-medium mt-0.5">
              Revise la propuesta de organización antes de autorizar el guardado en Google Drive.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {isEditing ? (
            <button
              onClick={handleSaveEdits}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar Cambios</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-all"
            >
              <Edit3 className="w-4 h-4" />
              <span>Editar Propuesta</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </span>
          <span>2. Análisis y Propuesta de Clasificación</span>
        </h3>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
          Paso 2 de 3
        </span>
      </div>

      {/* Main Classification Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Folder & File Structure Proposal */}
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <FolderTree className="w-4 h-4 text-blue-600" />
                <span>Ruta Recomendada en Google Drive</span>
              </span>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Confianza IA: {analysis.confidenceScore}%
              </span>
            </div>

            {/* Area Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Área Administrativa:
              </label>
              {isEditing ? (
                <select
                  value={editedData.adminArea}
                  onChange={(e) => handleAreaChange(e.target.value as AdminArea)}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(ADMIN_AREAS).map((area) => (
                    <option key={area.code} value={area.code}>
                      {area.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={`p-2.5 rounded-lg border text-xs font-semibold ${currentAreaInfo.color}`}>
                  {currentAreaInfo.name}
                </div>
              )}
            </div>

            {/* Target Folder Path */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Carpeta Principal:
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={editedData.recommendedFolder}
                  onChange={(e) => setEditedData({ ...editedData, recommendedFolder: e.target.value })}
                  className="w-full text-xs font-medium p-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Subcarpeta Recomendada:
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={editedData.recommendedSubfolder}
                  onChange={(e) => setEditedData({ ...editedData, recommendedSubfolder: e.target.value })}
                  className="w-full text-xs font-medium p-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 text-slate-800"
                />
              </div>
            </div>

            {/* Recommended File Name (Nomenclatura Standard) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Nombre de Archivo Recomendado (Nomenclatura Oficial):
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  TIPO_FECHA_ENTIDAD.ext
                </span>
              </div>
              <input
                type="text"
                disabled={!isEditing}
                value={editedData.recommendedFileName}
                onChange={(e) => setEditedData({ ...editedData, recommendedFileName: e.target.value })}
                className="w-full text-xs font-mono font-bold p-2.5 border border-blue-300 rounded-lg bg-blue-50/50 text-blue-900 disabled:bg-slate-100 disabled:text-slate-900"
              />
            </div>

            {/* Full Visual Path Preview */}
            <div className="p-2.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto flex items-center space-x-1">
              <span className="text-slate-400">Ruta Final:</span>
              <span className="text-emerald-400">EMPRESA</span>
              <span className="text-slate-500">/</span>
              <span className="text-blue-300">{editedData.recommendedFolder}</span>
              <span className="text-slate-500">/</span>
              <span className="text-amber-300">{editedData.recommendedSubfolder}</span>
              <span className="text-slate-500">/</span>
              <span className="text-white font-bold">{editedData.recommendedFileName}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Extracted Metadata & Executive Summary */}
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-200 pb-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Metadatos Extraídos del Documento</span>
            </span>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>Fecha Detectada:</span>
                </span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  {analysis.detectedDate || 'No detectada'}
                </span>
              </div>

              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 flex items-center space-x-1">
                  <Building className="w-3.5 h-3.5 text-purple-500" />
                  <span>Entidad / Empresa:</span>
                </span>
                <span className="font-semibold text-slate-900 block mt-0.5 truncate">
                  {analysis.entityName || 'No identificada'}
                </span>
              </div>

              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 flex items-center space-x-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Tipo de Documento:</span>
                </span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  {analysis.documentType}
                </span>
              </div>

              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 flex items-center space-x-1">
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                  <span>Importe / Monto:</span>
                </span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  {analysis.amountTotal || 'No aplica'}
                </span>
              </div>
            </div>

            {/* Executive Summary */}
            <div>
              <span className="text-xs font-semibold text-slate-600 block mb-1">
                Resumen Ejecutivo para Archivo Secretarial:
              </span>
              <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed italic">
                "{analysis.summary}"
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Action Footer Button */}
      <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span>Al presionar el botón, se le solicitará confirmación explícita antes de guardar en Google Drive.</span>
        </div>

        <button
          onClick={onProceedToSave}
          disabled={isSaving}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <HardDrive className="w-5 h-5" />
          <span>Proceder a Confirmación y Guardado</span>
        </button>
      </div>

    </div>
  );
};
