import React from 'react';
import { SaleRecord, AuthUser } from '../types';
import { CheckCircle2, AlertTriangle, X, ShoppingBag, HardDrive, DollarSign, LogIn, Lock } from 'lucide-react';

interface SalesConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: Partial<SaleRecord>;
  authUser: AuthUser;
  onConnectDrive: () => void;
  onConfirmSave: () => void;
  isSaving: boolean;
}

export const SalesConfirmationModal: React.FC<SalesConfirmationModalProps> = ({
  isOpen,
  onClose,
  saleData,
  authUser,
  onConnectDrive,
  onConfirmSave,
  isSaving
}) => {
  if (!isOpen) return null;

  const total = (Number(saleData.cantidad) || 0) * (Number(saleData.precioUnitario) || 0);

  // Derive target folder path based on sale date
  const saleYear = saleData.fecha ? saleData.fecha.split('-')[0] : new Date().getFullYear().toString();
  const saleMonth = saleData.fecha ? saleData.fecha.split('-')[1] : String(new Date().getMonth() + 1).padStart(2, '0');
  const targetDrivePath = `EMPRESA/03_VENTAS/${saleYear}/Ventas_${saleYear}-${saleMonth}.xlsx`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">2. Confirmación de Registro de Venta</h3>
              <p className="text-xs text-amber-100">Amod Solutions IA • Guardado Real en Google Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          
          {/* Status Indicator: 🟠 CONFIRMACIÓN DE GUARDADO */}
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center space-x-2 text-xs text-amber-900">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse flex-shrink-0"></span>
            <strong className="font-bold">Estado: 🟠 CONFIRMACIÓN DE GUARDADO PENDIENTE</strong>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-2">
              <span>REGISTRO DE VENTA</span>
              <span className="text-blue-600 font-mono font-semibold">{saleData.fecha}</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Cliente:</span>
                <strong className="text-slate-900 text-sm font-semibold">{saleData.cliente || '-'}</strong>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Producto / Servicio:</span>
                <strong className="text-slate-900 text-sm font-semibold">{saleData.productoServicio || '-'}</strong>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Cantidad:</span>
                <span className="text-slate-900 font-medium">{saleData.cantidad}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Precio Unitario:</span>
                <span className="text-slate-900 font-medium">${Number(saleData.precioUnitario).toLocaleString('es-CO')}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Forma de Pago:</span>
                <span className="inline-flex px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-medium">
                  {saleData.formaPago}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Estado:</span>
                <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                  saleData.estadoPago === 'Pagado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {saleData.estadoPago}
                </span>
              </div>
            </div>

            {saleData.observaciones && (
              <div className="pt-2 border-t border-slate-200 text-xs">
                <span className="text-slate-500 block text-[11px]">Observaciones:</span>
                <p className="text-slate-700 italic">{saleData.observaciones}</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between bg-emerald-50/80 p-3 rounded-lg border-emerald-200">
              <span className="text-xs font-bold text-emerald-900">TOTAL CALCULADO:</span>
              <span className="text-lg font-black text-emerald-700 font-mono">
                ${total.toLocaleString('es-CO')}
              </span>
            </div>
          </div>

          {/* Drive Destination Info */}
          <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 text-xs space-y-2 border border-slate-800">
            <div className="flex items-center space-x-2 text-blue-400 font-bold">
              <HardDrive className="w-4 h-4" />
              <span>Archivos a generar en Google Drive:</span>
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              <p className="text-emerald-300 break-all bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center space-x-1.5">
                <span>📊 <strong>Excel Ventas:</strong> {targetDrivePath}</span>
              </p>
              <p className="text-teal-300 break-all bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center space-x-1.5">
                <span>🧾 <strong>Comprobante PDF:</strong> EMPRESA/03_VENTAS/Comprobantes/Comprobante_[ID].pdf</span>
              </p>
            </div>
            <p className="text-[11px] text-slate-400">
              * Se creará la carpeta "Comprobantes" automáticamente si no existe y se generará el PDF oficial.
            </p>
          </div>

          {/* Verification requirement if not connected */}
          {!authUser.connected ? (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl space-y-2 text-xs text-rose-900">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-rose-950 block">No hay una cuenta de Google Drive conectada</strong>
                  <p className="mt-0.5 text-rose-800">
                    No se puede realizar el guardado real en Google Drive sin iniciar sesión previa.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onConnectDrive}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center space-x-1.5 shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Conectar Google Drive</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 font-medium text-center">
              "Revise la información antes de guardar."
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700 shadow-xs transition-all"
          >
            CANCELAR
          </button>

          <button
            type="button"
            onClick={onConfirmSave}
            disabled={!authUser.connected || isSaving}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all flex items-center space-x-2 ${
              authUser.connected && !isSaving
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                : 'bg-slate-400 cursor-not-allowed opacity-75'
            }`}
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Guardando en Google Drive...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>CONFIRMAR Y GUARDAR</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
