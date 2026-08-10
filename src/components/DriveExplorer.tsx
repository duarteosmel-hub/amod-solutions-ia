import React, { useState } from 'react';
import { SavedDocumentRecord, AdminArea } from '../types';
import { ADMIN_AREAS } from '../data/adminAreas';
import { openGoogleDriveDocument } from '../utils/driveViewer';
import { FolderTree, FileText, ExternalLink, Search, Calendar, HardDrive, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';

interface DriveExplorerProps {
  savedRecords: SavedDocumentRecord[];
  onSelectRecord?: (record: SavedDocumentRecord) => void;
}

export const DriveExplorer: React.FC<DriveExplorerProps> = ({ savedRecords }) => {
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredRecords = savedRecords.filter((rec) => {
    const matchesTab = selectedTab === 'all' || rec.analysis.adminArea === selectedTab;
    const matchesSearch =
      rec.driveResult.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.analysis.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.analysis.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.driveResult.parentFolderPath.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <HardDrive className="w-5 h-5" />
            </span>
            <span>Explorador de Documentos Guardados en Google Drive</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro oficial de archivos clasificados e integrados en la estructura empresarial de Google Drive.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre, entidad o ruta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-slate-50"
          />
        </div>
      </div>

      {/* Area Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-none text-xs">
        <button
          onClick={() => setSelectedTab('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
            selectedTab === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todas las Áreas ({savedRecords.length})
        </button>

        {Object.values(ADMIN_AREAS).map((area) => {
          const count = savedRecords.filter((r) => r.analysis.adminArea === area.code).length;
          return (
            <button
              key={area.code}
              onClick={() => setSelectedTab(area.code)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                selectedTab === area.code
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{area.code.split('_')[0]} {area.code.split('_')[1]}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedTab === area.code ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table List of Saved Drive Files */}
      {filteredRecords.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <FolderTree className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No hay documentos guardados en esta sección</p>
          <p className="text-xs text-slate-400 mt-1">
            Los documentos confirmados y almacenados en Google Drive aparecerán aquí listados.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 uppercase font-bold border-b border-slate-200 text-[11px]">
                <th className="py-3 px-3">Nombre del Archivo (Drive)</th>
                <th className="py-3 px-3">Área / Subcarpeta</th>
                <th className="py-3 px-3">Entidad / Fecha</th>
                <th className="py-3 px-3">Estado Drive</th>
                <th className="py-3 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-2.5">
                      <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold text-slate-900 font-mono block">
                          {rec.driveResult.fileName}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate max-w-xs block">
                          Original: {rec.analysis.originalFileName}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="space-y-0.5">
                      <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-800 font-semibold rounded border border-blue-200 text-[10px]">
                        {rec.analysis.adminArea}
                      </span>
                      <span className="block text-[11px] text-slate-500 font-mono">
                        {rec.driveResult.parentFolderPath}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-800 block truncate max-w-[140px]">
                        {rec.analysis.entityName}
                      </span>
                      <span className="text-slate-400 text-[11px] flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{rec.analysis.detectedDate}</span>
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 font-semibold rounded-full text-[10px]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Confirmado Drive</span>
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={(e) => openGoogleDriveDocument({
                        fileId: rec.driveResult?.fileId,
                        fileName: rec.driveResult?.fileName || rec.analysis?.recommendedFileName || rec.analysis?.originalFileName,
                        targetPath: rec.driveResult?.parentFolderPath || `EMPRESA/01_DOCUMENTOS/${rec.analysis?.category || 'Otros'}`,
                        webViewLink: rec.driveResult?.webViewLink
                      })}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg border border-blue-200 text-xs transition-all cursor-pointer"
                    >
                      <span>Ver documento</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
