import React from 'react';
import { ADMIN_AREAS } from '../data/adminAreas';
import { FolderTree, Sparkles, Folder, FileCode, CheckCircle2, Info, ArrowRight } from 'lucide-react';

export const FolderStructureGuide: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <FolderTree className="w-5 h-5" />
            </span>
            <span>Manual de Estructura Organizativa de Carpetas y Nomenclatura</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Estándar oficial de Secretariado Administrativo para la organización de archivos corporativos en Google Drive.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Visual Tree Hierarchy */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 font-mono text-xs shadow-inner space-y-2 overflow-x-auto">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold border-b border-slate-800 pb-2">
              <Folder className="w-4 h-4 fill-emerald-400/20 text-emerald-400" />
              <span>EMPRESA (Directorio Raíz Oficial)</span>
            </div>

            <div className="pl-4 space-y-2 pt-1 text-slate-300">
              <div className="flex items-start space-x-2">
                <span className="text-slate-600">├──</span>
                <div>
                  <span className="text-blue-300 font-bold">01_ADMINISTRACION</span>
                  <span className="text-slate-500 text-[11px] block">(Actas, Políticas, Comunicados e Informes Directivos)</span>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="text-slate-600">├──</span>
                <div>
                  <span className="text-emerald-300 font-bold">02_CLIENTES</span>
                  <span className="text-slate-500 text-[11px] block">(Expedientes de clientes, cotizaciones y propuestas)</span>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="text-slate-600">├──</span>
                <div>
                  <span className="text-indigo-300 font-bold">03_VENTAS</span>
                  <span className="text-slate-500 text-[11px] block">(Órdenes de venta, reportes comerciales y comprobantes)</span>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="text-slate-600">├──</span>
                <div>
                  <span className="text-amber-300 font-bold">04_FACTURACION</span>
                  <span className="text-slate-500 text-[11px] block">(Facturas emitidas, notas de crédito y recibos de cobro)</span>
                </div>
              </div>

              {/* Highlighted Example Folder: 05_PROVEEDORES */}
              <div className="flex items-start space-x-2 bg-purple-950/60 p-2 rounded-lg border border-purple-500/40">
                <span className="text-purple-400 font-bold">├──</span>
                <div>
                  <span className="text-purple-300 font-bold underline">05_PROVEEDORES</span>
                  <span className="text-purple-200 text-[11px] block">(Facturas recibidas, órdenes de compra y cotizaciones)</span>
                  
                  {/* Subfolder Example */}
                  <div className="pl-4 pt-1 text-amber-300">
                    <span>└── Facturas_Recibidas_2026 /</span>
                    <div className="pl-4 pt-0.5 text-white font-bold flex items-center space-x-1">
                      <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Factura_Compra_2026-08-07_Proveedor_ABC.pdf</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="text-slate-600">├──</span>
                <div>
                  <span className="text-rose-300 font-bold">06_CONTRATOS</span>
                  <span className="text-slate-500 text-[11px] block">(Contratos con proveedores, laborales y acuerdos legales)</span>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="text-slate-600">└──</span>
                <div>
                  <span className="text-slate-400 font-bold">07_ARCHIVO</span>
                  <span className="text-slate-500 text-[11px] block">(Documentación de años anteriores y archivo histórico pasivo)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Nomenclatura Rules */}
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3 text-xs text-blue-900">
            <span className="font-bold text-sm text-blue-950 block flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Regla Estricta de Nomenclatura</span>
            </span>

            <p className="leading-relaxed">
              Todos los documentos procesados por Amod Solutions IA reciben automáticamente una nomenclatura uniforme antes de ser guardados:
            </p>

            <div className="bg-white p-3 rounded-xl border border-blue-300 font-mono text-center font-bold text-blue-950 text-xs shadow-xs">
              TIPO_DOCUMENTO_FECHA_ENTIDAD.ext
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Tipo de Documento:</strong> Factura_Compra, Contrato_Servicios, Recibo_Pago, Informe_Gestion.
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Fecha Normalizada:</strong> Formato estándar YYYY-MM-DD (ej: 2026-08-07).
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Entidad Normalizada:</strong> Nombre empresarial limpio sin caracteres especiales (ej: Proveedor_ABC).
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
