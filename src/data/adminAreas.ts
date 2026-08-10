import { AdminArea, AdminAreaInfo } from '../types';

export const ADMIN_AREAS: Record<AdminArea, AdminAreaInfo> = {
  '01_ADMINISTRACION': {
    code: '01_ADMINISTRACION',
    name: '01. Administración General',
    description: 'Políticas internas, actas de reuniones, comunicados, reglamentos e informes directivos.',
    color: 'border-blue-500 bg-blue-50 text-blue-900',
    iconName: 'Building2',
    defaultSubfolders: ['Actas_Directivas_2026', 'Informes_Gestion_2026', 'Politicas_y_Manuales', 'Comunicaciones_Oficiales']
  },
  '02_CLIENTES': {
    code: '02_CLIENTES',
    name: '02. Gestión de Clientes',
    description: 'Expedientes de clientes, cotizaciones enviadas, solicitudes, acuerdos comerciales y correspondencia.',
    color: 'border-emerald-500 bg-emerald-50 text-emerald-900',
    iconName: 'Users',
    defaultSubfolders: ['Expedientes_Clientes', 'Cotizaciones_Clientes_2026', 'Propuestas_Comerciales', 'Solicitudes_Atendidas']
  },
  '03_VENTAS': {
    code: '03_VENTAS',
    name: '03. Ventas y Comercial',
    description: 'Órdenes de pedido, reportes de ventas, contratos comerciales de venta e historial de clientes.',
    color: 'border-indigo-500 bg-indigo-50 text-indigo-900',
    iconName: 'TrendingUp',
    defaultSubfolders: ['Ordenes_Venta_2026', 'Reportes_Comerciales_2026', 'Comprobantes_Venta', 'Estrategias_Comerciales']
  },
  '04_FACTURACION': {
    code: '04_FACTURACION',
    name: '04. Facturación Emitida',
    description: 'Facturas emitidas a clientes, recibos de cobro, notas de crédito y registros fiscales.',
    color: 'border-amber-500 bg-amber-50 text-amber-900',
    iconName: 'Receipt',
    defaultSubfolders: ['Facturas_Emitidas_2026', 'Notas_Credito_2026', 'Recibos_Cobro_2026', 'Reportes_Facturacion']
  },
  '05_PROVEEDORES': {
    code: '05_PROVEEDORES',
    name: '05. Proveedores y Compras',
    description: 'Facturas recibidas de proveedores, órdenes de compra, cotizaciones de compras y comprobantes de pago.',
    color: 'border-purple-500 bg-purple-50 text-purple-900',
    iconName: 'Truck',
    defaultSubfolders: ['Facturas_Recibidas_2026', 'Ordenes_Compra_2026', 'Cotizaciones_Proveedores', 'Comprobantes_Pago_2026']
  },
  '06_CONTRATOS': {
    code: '06_CONTRATOS',
    name: '06. Contratos y Legal',
    description: 'Contratos con proveedores, acuerdos de confidencialidad, contratos laborales y documentos legales.',
    color: 'border-rose-500 bg-rose-50 text-rose-900',
    iconName: 'FileText',
    defaultSubfolders: ['Contratos_Proveedores', 'Contratos_Clientes', 'Contratos_Laborales_2026', 'Convenios_y_NDAs']
  },
  '07_ARCHIVO': {
    code: '07_ARCHIVO',
    name: '07. Archivo Histórico',
    description: 'Documentación de años anteriores, auditorías finalizadas y archivo general pasivo.',
    color: 'border-slate-500 bg-slate-50 text-slate-900',
    iconName: 'Archive',
    defaultSubfolders: ['Historico_2025', 'Auditorias_Finalizadas', 'Documentos_Inactivos', 'Registros_Soporte']
  }
};
