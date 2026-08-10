import React, { useState } from 'react';
import { SaleRecord, AuthUser } from '../types';
import { openGoogleDriveDocument } from '../utils/driveViewer';
import { ShoppingBag, DollarSign, Calendar, User, Package, CreditCard, FileText, CheckCircle2, AlertCircle, Sparkles, ExternalLink, HardDrive, RefreshCw } from 'lucide-react';
import { SalesConfirmationModal } from './SalesConfirmationModal';

interface SalesRegisterProps {
  authUser: AuthUser;
  onConnectDrive: () => void;
  savedSales: SaleRecord[];
  onSaleSavedSuccessfully: (sale: SaleRecord) => void;
}

export const SalesRegister: React.FC<SalesRegisterProps> = ({
  authUser,
  onConnectDrive,
  savedSales,
  onSaleSavedSuccessfully
}) => {
  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState<string>(getTodayString());
  const [cliente, setCliente] = useState<string>('');
  const [productoServicio, setProductoServicio] = useState<string>('');
  const [cantidad, setCantidad] = useState<number | ''>(1);
  const [precioUnitario, setPrecioUnitario] = useState<number | ''>('');
  const [formaPago, setFormaPago] = useState<SaleRecord['formaPago']>('Efectivo');
  const [estadoPago, setEstadoPago] = useState<SaleRecord['estadoPago']>('Pagado');
  const [observaciones, setObservaciones] = useState<string>('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaveStatus, setLastSaveStatus] = useState<'pending' | 'confirming' | 'success' | 'error'>('pending');
  const [lastSavedResult, setLastSavedResult] = useState<SaleRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Automatic calculation
  const numQty = Number(cantidad) || 0;
  const numPrice = Number(precioUnitario) || 0;
  const totalCalculated = numQty * numPrice;

  // Fill demo data
  const handleLoadDemoData = () => {
    setFecha(getTodayString());
    setCliente('Ana Gómez');
    setProductoServicio('Cuaderno Universitario 100 Hojas');
    setCantidad(3);
    setPrecioUnitario(10000);
    setFormaPago('Efectivo');
    setEstadoPago('Pagado');
    setObservaciones('Venta en mostrador. Cliente solicita comprobante.');
    setValidationError(null);
    setLastSaveStatus('pending');
  };

  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setErrorMessage(null);

    if (!fecha) {
      setValidationError('Debe ingresar la fecha de la venta.');
      return;
    }
    if (!cliente.trim()) {
      setValidationError('Debe ingresar el nombre del cliente.');
      return;
    }
    if (!productoServicio.trim()) {
      setValidationError('Debe indicar el producto o servicio.');
      return;
    }
    if (numQty <= 0 || isNaN(numQty)) {
      setValidationError('La cantidad debe ser un número entero o decimal mayor a 0.');
      return;
    }
    if (numPrice < 0 || isNaN(numPrice)) {
      setValidationError('El precio unitario no puede ser un valor negativo.');
      return;
    }

    setLastSaveStatus('confirming');
    setIsConfirmationOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/sales/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleData: {
            fecha,
            cliente: cliente.trim(),
            productoServicio: productoServicio.trim(),
            cantidad: numQty,
            precioUnitario: numPrice,
            formaPago,
            estadoPago,
            observaciones: observaciones.trim()
          }
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo registrar la venta en Google Drive.');
      }

      const newSale: SaleRecord = data.sale;
      setLastSavedResult(newSale);
      setLastSaveStatus('success');
      setIsConfirmationOpen(false);
      onSaleSavedSuccessfully(newSale);

      // Reset form for next sale
      setCliente('');
      setProductoServicio('');
      setCantidad(1);
      setPrecioUnitario('');
      setObservaciones('');

    } catch (err: any) {
      console.error('Error saving sale:', err);
      setErrorMessage(err.message || 'Error inesperado al guardar la venta.');
      setLastSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Demo Data Helper */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg border border-blue-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">
              <ShoppingBag className="w-4 h-4" />
              <span>Secretariado Administrativo • Módulo de Ventas</span>
            </div>
            <h2 className="text-xl font-bold">1. Registro y Almacenamiento Real de Ventas</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Registre las transacciones diarias. Al confirmar, los datos se almacenan automáticamente en el archivo Excel oficial <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300 font-mono">EMPRESA/03_VENTAS/AÑO/Ventas_AÑO-MES.xlsx</code> en Google Drive.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLoadDemoData}
            className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-md transition-all text-xs whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span>Cargar Datos de Demostración</span>
          </button>
        </div>
      </div>

      {/* Operation Status Bar (Section 8 Requirement) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-700">Estado de Operación Actual:</span>
          {lastSaveStatus === 'pending' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
              🟡 VENTA PENDIENTE DE GUARDAR
            </span>
          )}
          {lastSaveStatus === 'confirming' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full font-bold bg-orange-100 text-orange-900 border border-orange-300">
              🟠 CONFIRMACIÓN DE GUARDADO PENDIENTE
            </span>
          )}
          {lastSaveStatus === 'success' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
              🟢 VENTA GUARDADA EN GOOGLE DRIVE
            </span>
          )}
          {lastSaveStatus === 'error' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full font-bold bg-rose-100 text-rose-900 border border-rose-300">
              🔴 ERROR DE GUARDADO
            </span>
          )}
        </div>

        {authUser.connected ? (
          <div className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Google Drive Autenticado: <strong>{authUser.user?.email || 'Conectado'}</strong></span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="text-rose-700 font-semibold">No hay una cuenta de Google Drive conectada</span>
            <button
              onClick={onConnectDrive}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs"
            >
              Conectar Google Drive
            </button>
          </div>
        )}
      </div>

      {/* Success Notification Banner */}
      {lastSaveStatus === 'success' && lastSavedResult && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-950">¡Venta Almacenada Exitosamente en Google Drive!</h4>
                <p className="text-sm font-bold text-emerald-800 mt-0.5 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>¡Comprobante generado exitosamente!</span>
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  ID Venta: <strong className="font-mono">{lastSavedResult.id}</strong> • Cliente: <strong>{lastSavedResult.cliente}</strong> • Total: <strong>${lastSavedResult.total.toLocaleString('es-CO')}</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {lastSavedResult.comprobanteResult && (
                <button
                  onClick={() => openGoogleDriveDocument({
                    fileId: lastSavedResult.comprobanteResult?.fileId,
                    fileName: lastSavedResult.comprobanteResult?.fileName,
                    targetPath: lastSavedResult.comprobanteResult?.parentFolderPath,
                    webViewLink: lastSavedResult.comprobanteResult?.webViewLink
                  })}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Ver documento</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}

              {lastSavedResult.driveResult?.webViewLink && (
                <button
                  onClick={() => openGoogleDriveDocument({
                    fileId: lastSavedResult.driveResult?.fileId,
                    fileName: lastSavedResult.driveResult?.fileName,
                    targetPath: lastSavedResult.driveResult?.parentFolderPath,
                    webViewLink: lastSavedResult.driveResult?.webViewLink
                  })}
                  className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-emerald-900 border border-emerald-300 font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                >
                  <span>Ver Excel en Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200 text-emerald-900">
              📊 <strong>Excel Ventas:</strong> {lastSavedResult.driveResult?.parentFolderPath}/{lastSavedResult.driveResult?.fileName}
            </div>
            {lastSavedResult.comprobanteResult && (
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200 text-emerald-900">
                🧾 <strong>Comprobante PDF:</strong> {lastSavedResult.comprobanteResult.parentFolderPath}/{lastSavedResult.comprobanteResult.fileName}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 text-xs text-rose-900 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-rose-950 block text-sm">Error de Operación</strong>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleOpenConfirmation} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Formulario de Registro de Venta</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">* Campos obligatorios</span>
        </div>

        <div className="p-6 space-y-6">
          
          {validationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* Fecha */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Fecha de Venta *</span>
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Cliente */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Nombre del Cliente *</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Ana Gómez / Distribuidora XYZ"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Producto o Servicio */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                <span>Producto o Servicio *</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Cuaderno Universitario / Asesoría"
                value={productoServicio}
                onChange={(e) => setProductoServicio(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Cantidad */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Cantidad *</label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Precio Unitario */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Precio Unitario ($) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="0.00"
                  value={precioUnitario}
                  onChange={(e) => setPrecioUnitario(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Total Automático (Calculado: Cantidad × Precio Unitario) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1 text-emerald-800">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Total Calculado (Automático)</span>
              </label>
              <div className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-mono font-bold text-sm">
                ${totalCalculated.toLocaleString('es-CO')}
              </div>
            </div>

            {/* Forma de Pago */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span>Forma de Pago</span>
              </label>
              <select
                value={formaPago}
                onChange={(e) => setFormaPago(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                <option value="Cheque">Cheque</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Estado de Pago */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Estado de Pago</label>
              <select
                value={estadoPago}
                onChange={(e) => setEstadoPago(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="Pagado">Pagado (Totalmente)</option>
                <option value="Pendiente">Pendiente (Por Cobrar)</option>
              </select>
            </div>

          </div>

          {/* Observaciones */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Observaciones / Notas Adicionales</span>
            </label>
            <textarea
              rows={2}
              placeholder="Detalles sobre entregas, factura asociada o condiciones especiales..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

        </div>

        {/* Form Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Al hacer clic en continuar, se solicitará confirmación antes de escribir en Google Drive.
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>REGISTRAR Y SOLICITAR CONFIRMACIÓN</span>
          </button>
        </div>

      </form>

      {/* Confirmation Modal */}
      <SalesConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        saleData={{
          fecha,
          cliente,
          productoServicio,
          cantidad: numQty,
          precioUnitario: numPrice,
          total: totalCalculated,
          formaPago,
          estadoPago,
          observaciones
        }}
        authUser={authUser}
        onConnectDrive={onConnectDrive}
        onConfirmSave={handleConfirmSave}
        isSaving={isSaving}
      />

      {/* Historical list of sales saved in session */}
      {savedSales.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <HardDrive className="w-5 h-5 text-blue-600" />
              <span>Registro de Ventas en la Sesión ({savedSales.length})</span>
            </h3>
            <span className="text-xs text-slate-500">
              Ubicación: EMPRESA/03_VENTAS/
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                  <th className="p-3">ID Venta</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Producto / Servicio</th>
                  <th className="p-3 text-right">Cant.</th>
                  <th className="p-3 text-right">P. Unitario</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3">Pago</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-center">Google Drive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {savedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-700">{sale.id}</td>
                    <td className="p-3 text-slate-600">{sale.fecha}</td>
                    <td className="p-3 font-semibold text-slate-900">{sale.cliente}</td>
                    <td className="p-3">{sale.productoServicio}</td>
                    <td className="p-3 text-right">{sale.cantidad}</td>
                    <td className="p-3 text-right">${sale.precioUnitario.toLocaleString('es-CO')}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">
                      ${sale.total.toLocaleString('es-CO')}
                    </td>
                    <td className="p-3">{sale.formaPago}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sale.estadoPago === 'Pagado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {sale.estadoPago}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {sale.comprobanteResult?.webViewLink && (
                          <a
                            href={sale.comprobanteResult.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-bold text-[11px] transition-colors"
                            title="Ver Comprobante PDF en Google Drive"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Comprobante</span>
                          </a>
                        )}
                        {sale.driveResult?.webViewLink && (
                          <a
                            href={sale.driveResult.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-semibold text-[11px]"
                          >
                            <span>Excel</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {!sale.comprobanteResult?.webViewLink && !sale.driveResult?.webViewLink && (
                          <span className="text-slate-400 text-[10px]">Guardado</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
