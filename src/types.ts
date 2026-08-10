export type AdminArea = 
  | '01_ADMINISTRACION'
  | '02_CLIENTES'
  | '03_VENTAS'
  | '04_FACTURACION'
  | '05_PROVEEDORES'
  | '06_CONTRATOS'
  | '07_ARCHIVO';

export interface AdminAreaInfo {
  code: AdminArea;
  name: string;
  description: string;
  color: string;
  iconName: string;
  defaultSubfolders: string[];
}

export type DocumentCategory = 
  | 'Facturas'
  | 'Contratos'
  | 'Comprobantes'
  | 'Informes'
  | 'Documentos administrativos'
  | 'Clientes'
  | 'Otros';

export interface DocumentAnalysis {
  id: string;
  originalFileName: string;
  fileTypeMime: string;
  fileSize: number;
  
  // Classification
  documentType: string;         // e.g., Factura, Contrato, Comprobante, Informe, etc.
  category: DocumentCategory;    // e.g., Facturas, Contratos, Comprobantes, etc.
  adminArea?: AdminArea | string; // Backward compatibility with admin areas
  recommendedFolder: string;     // e.g., 01_DOCUMENTOS
  recommendedSubfolder: string;  // e.g., Facturas
  recommendedFileName: string;   // e.g., Factura_001.pdf
  
  // Extracted Metadata
  detectedDate: string;          // YYYY-MM-DD or "No identificado"
  entityName: string;            // Empresa o Proveedor or "No identificado"
  documentNumber?: string;       // Número de documento or "No identificado"
  amountTotal?: string;          // Valor total or "No identificado"
  clientRelated?: string;        // Cliente relacionado or "No identificado"
  summary: string;               // Resumen o descripción
  keywords: string[];
  confidenceScore: number;       // e.g., 95%
}

export type StorageStatus = 'proposal' | 'saving' | 'saved' | 'error';

export interface DriveSaveResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
  parentFolderPath: string;
  parentFolderId?: string;
  savedAt: string;
}

export interface DriveExistingFile {
  id: string;
  name: string;
  webViewLink?: string;
}

export interface SavedDocumentRecord {
  id: string;
  analysis: DocumentAnalysis;
  driveResult: DriveSaveResult;
  savedBy: string;
  savedAt: string;
}

export type UserRole = 'ADMINISTRADOR' | 'SECRETARIADO' | 'CONTABILIDAD' | 'CONSULTA';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastAccessAt?: string;
}

export interface AuditLogRecord {
  id: string;
  userEmail: string;
  userName?: string;
  timestamp: string;
  action: string;
  module: string;
  status: 'Éxito' | 'Rechazado' | 'Advertencia';
  details?: string;
}

export interface AuthUser {
  connected: boolean;
  email?: string;
  name?: string;
  picture?: string;
  role?: UserRole;
  active?: boolean;
}

export type MainNavTab = 'inicio' | 'documentos' | 'ventas_registro' | 'ventas_informes' | 'drive_explorer' | 'asistente_ia' | 'usuarios';

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  foundDocuments?: Array<{
    name: string;
    category: string;
    location: string;
    webViewLink?: string;
  }>;
}

export interface SaleRecord {
  id: string; // e.g., V-20260807-001
  fecha: string; // YYYY-MM-DD
  cliente: string;
  productoServicio: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  formaPago: 'Efectivo' | 'Transferencia' | 'Tarjeta de Crédito' | 'Tarjeta de Débito' | 'Cheque' | 'Otro';
  estadoPago: 'Pagado' | 'Pendiente';
  observaciones: string;
  driveResult?: DriveSaveResult;
  comprobanteResult?: DriveSaveResult;
  savedBy?: string;
  savedAt?: string;
}

export type SalesFilterPeriod = 'HOY' | 'ESTA_SEMANA' | 'ESTE_MES' | 'MES_PERSONALIZADO' | 'TODAS' | 'RANGO';

export interface AiSalesReport {
  resumenEjecutivo: string;
  principalesResultados: string[];
  productosDestacados: string[];
  comportamientoVentas: string;
  observaciones: string[];
  recomendacionesAdministrativas: string[];
  periodoNombre: string;
  fechaGeneracion: string;
}

export interface SalesReportMetrics {
  totalVendido: number;
  numVentas: number;
  ticketPromedio: number;
  unidadesVendidas: number;
  productoMasVendido: string;
  clienteTop: string;
  metodoMasUtilizado: string;
  totalPorMetodoPago: Record<string, number>;
  totalPendiente: number;
  totalPagado: number;
}

