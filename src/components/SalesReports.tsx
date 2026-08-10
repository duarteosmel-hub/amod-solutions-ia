import React, { useState, useMemo } from 'react';
import { SaleRecord, SalesFilterPeriod, AuthUser, AiSalesReport } from '../types';
import { openGoogleDriveDocument } from '../utils/driveViewer';
import { 
  BarChart3, Calendar, FileText, Download, HardDrive, CheckCircle2, 
  TrendingUp, Users, Package, CreditCard, DollarSign, ExternalLink, 
  RefreshCw, AlertCircle, Sparkles, Receipt, Layers, Award, ShieldAlert,
  ArrowUpRight, FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

interface SalesReportsProps {
  sales: SaleRecord[];
  authUser: AuthUser;
  onConnectDrive: () => void;
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

export const SalesReports: React.FC<SalesReportsProps> = ({
  sales,
  authUser,
  onConnectDrive
}) => {
  const [filterPeriod, setFilterPeriod] = useState<SalesFilterPeriod>('ESTE_MES');
  const [selectedCustomMonth, setSelectedCustomMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'TODOS' | 'Pagado' | 'Pendiente'>('TODOS');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('TODOS');

  // AI Report State
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<AiSalesReport | null>(null);
  const [aiReportError, setAiReportError] = useState<string | null>(null);

  // Drive Save State
  const [isSavingPdfToDrive, setIsSavingPdfToDrive] = useState<boolean>(false);
  const [pdfDriveSaveResult, setPdfDriveSaveResult] = useState<{ fileName: string; webViewLink: string; parentFolderPath: string } | null>(null);
  const [savePdfError, setSavePdfError] = useState<string | null>(null);

  // Local Download State
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  // Extract unique clients list from sales
  const clientList = useMemo(() => {
    const clientsSet = new Set<string>();
    sales.forEach((s) => {
      if (s.cliente && s.cliente.trim()) {
        clientsSet.add(s.cliente.trim());
      }
    });
    return Array.from(clientsSet).sort((a, b) => a.localeCompare(b));
  }, [sales]);

  const handleClientFilterChange = (client: string) => {
    setSelectedClientFilter(client);
    setAiReport(null);
  };

  // Validate & Get Report File Name: Informe_Ventas_AAAA-MM.pdf
  const getReportFileName = (): string => {
    let yearMonth = '';

    if (filterPeriod === 'MES_PERSONALIZADO' && selectedCustomMonth && /^\d{4}-\d{2}$/.test(selectedCustomMonth)) {
      yearMonth = selectedCustomMonth;
    } else if (filteredSales.length > 0 && filteredSales[0].fecha && /^\d{4}-\d{2}/.test(filteredSales[0].fecha)) {
      yearMonth = filteredSales[0].fecha.substring(0, 7);
    } else {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      yearMonth = `${yyyy}-${mm}`;
    }

    const fileName = `Informe_Ventas_${yearMonth}.pdf`;

    // Validate name pattern Informe_Ventas_AAAA-MM.pdf
    const nameRegex = /^Informe_Ventas_\d{4}-\d{2}\.pdf$/;
    if (!nameRegex.test(fileName)) {
      throw new Error(`El nombre de archivo generado "${fileName}" no cumple con la regla de nomenclatura Informe_Ventas_AAAA-MM.pdf.`);
    }

    return fileName;
  };

  // Period Label readable
  const periodLabel = useMemo(() => {
    let label = '';
    switch (filterPeriod) {
      case 'HOY': label = 'Hoy'; break;
      case 'ESTA_SEMANA': label = 'Esta semana'; break;
      case 'ESTE_MES': label = 'Este mes'; break;
      case 'MES_PERSONALIZADO': label = `Mes ${selectedCustomMonth}`; break;
      case 'TODAS': label = 'Todas las ventas'; break;
      case 'RANGO': label = `Rango (${startDate || 'Inicio'} a ${endDate || 'Fin'})`; break;
      default: label = 'Este mes'; break;
    }
    if (paymentStatusFilter !== 'TODOS') {
      label += ` - ${paymentStatusFilter}`;
    }
    if (selectedClientFilter !== 'TODOS') {
      label += ` - Cliente: ${selectedClientFilter}`;
    }
    return label;
  }, [filterPeriod, selectedCustomMonth, startDate, endDate, paymentStatusFilter, selectedClientFilter]);

  const handlePaymentStatusChange = (status: 'TODOS' | 'Pagado' | 'Pendiente') => {
    setPaymentStatusFilter(status);
    setAiReport(null);
  };

  // Filter sales based on selected period, payment status, and selected client
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return sales.filter((sale) => {
      if (!sale.fecha) return false;

      // Filter by Payment Status
      if (paymentStatusFilter !== 'TODOS') {
        const statusStr = (sale.estadoPago || '').trim();
        if (statusStr.toLowerCase() !== paymentStatusFilter.toLowerCase()) {
          return false;
        }
      }

      // Filter by Selected Client
      if (selectedClientFilter !== 'TODOS') {
        const clientStr = (sale.cliente || '').trim();
        if (clientStr.toLowerCase() !== selectedClientFilter.trim().toLowerCase()) {
          return false;
        }
      }

      if (filterPeriod === 'HOY') {
        return sale.fecha === todayStr;
      }

      if (filterPeriod === 'ESTA_SEMANA') {
        const saleDate = new Date(sale.fecha);
        const dayOfWeek = now.getDay() || 7; // Sunday = 7
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
        startOfWeek.setHours(0, 0, 0, 0);

        return saleDate >= startOfWeek && saleDate <= now;
      }

      if (filterPeriod === 'ESTE_MES') {
        const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return sale.fecha.startsWith(currentYearMonth);
      }

      if (filterPeriod === 'MES_PERSONALIZADO') {
        return sale.fecha.startsWith(selectedCustomMonth);
      }

      if (filterPeriod === 'TODAS') {
        return true;
      }

      if (filterPeriod === 'RANGO') {
        if (!startDate && !endDate) return true;
        if (startDate && sale.fecha < startDate) return false;
        if (endDate && sale.fecha > endDate) return false;
        return true;
      }

      return true;
    });
  }, [sales, filterPeriod, selectedCustomMonth, startDate, endDate, paymentStatusFilter, selectedClientFilter]);

  // Compute key analytics metrics
  const metrics = useMemo(() => {
    const totalVendido = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);
    const numVentas = filteredSales.length;
    const ticketPromedio = numVentas > 0 ? totalVendido / numVentas : 0;

    const unidadesVendidas = filteredSales.reduce((acc, s) => acc + (s.cantidad || 0), 0);

    // Products tally
    const productQtyMap: Record<string, number> = {};
    const productRevenueMap: Record<string, number> = {};

    // Clients tally
    const clientCountMap: Record<string, number> = {};
    const clientTotalMap: Record<string, number> = {};

    // Payment methods tally
    const methodCountMap: Record<string, number> = {};
    const totalPorMetodoPago: Record<string, number> = {};

    let totalPendiente = 0;
    let totalPagado = 0;

    filteredSales.forEach((s) => {
      const prod = s.productoServicio || 'General';
      productQtyMap[prod] = (productQtyMap[prod] || 0) + (s.cantidad || 1);
      productRevenueMap[prod] = (productRevenueMap[prod] || 0) + (s.total || 0);

      const cliente = s.cliente?.trim() || 'Cliente General';
      clientCountMap[cliente] = (clientCountMap[cliente] || 0) + 1;
      clientTotalMap[cliente] = (clientTotalMap[cliente] || 0) + (s.total || 0);

      const metodo = s.formaPago || 'Efectivo';
      methodCountMap[metodo] = (methodCountMap[metodo] || 0) + 1;
      totalPorMetodoPago[metodo] = (totalPorMetodoPago[metodo] || 0) + (s.total || 0);

      if (s.estadoPago === 'Pagado') {
        totalPagado += s.total;
      } else {
        totalPendiente += s.total;
      }
    });

    // Producto más vendido
    let productoMasVendido = '-';
    let maxQty = 0;
    Object.entries(productQtyMap).forEach(([prod, qty]) => {
      if (qty > maxQty) {
        maxQty = qty;
        productoMasVendido = prod;
      }
    });

    // Cliente con mayor número de compras
    let clienteTop = '-';
    let maxClientCount = 0;
    Object.entries(clientCountMap).forEach(([cli, count]) => {
      if (count > maxClientCount) {
        maxClientCount = count;
        clienteTop = `${cli} (${count} ${count === 1 ? 'compra' : 'compras'})`;
      }
    });

    // Método de pago más utilizado
    let metodoMasUtilizado = '-';
    let maxMethodCount = 0;
    Object.entries(methodCountMap).forEach(([met, count]) => {
      if (count > maxMethodCount) {
        maxMethodCount = count;
        metodoMasUtilizado = `${met} (${count})`;
      }
    });

    return {
      totalVendido,
      numVentas,
      ticketPromedio,
      unidadesVendidas,
      productoMasVendido,
      clienteTop,
      metodoMasUtilizado,
      totalPorMetodoPago,
      totalPendiente,
      totalPagado
    };
  }, [filteredSales]);

  // Chart Data Preparation
  const chartDataByDay = useMemo(() => {
    const dayMap: Record<string, number> = {};
    filteredSales.forEach((s) => {
      if (!s.fecha) return;
      dayMap[s.fecha] = (dayMap[s.fecha] || 0) + (s.total || 0);
    });

    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, total]) => ({
        fecha: fecha.substring(5), // MM-DD
        fechaFull: fecha,
        total
      }));
  }, [filteredSales]);

  const chartDataByProduct = useMemo(() => {
    const prodMap: Record<string, number> = {};
    filteredSales.forEach((s) => {
      const name = s.productoServicio || 'General';
      prodMap[name] = (prodMap[name] || 0) + (s.total || 0);
    });

    return Object.entries(prodMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([producto, total]) => ({
        producto: producto.length > 18 ? producto.substring(0, 16) + '...' : producto,
        total
      }));
  }, [filteredSales]);

  const chartDataByPaymentMethod = useMemo(() => {
    const methodMap: Record<string, number> = {};
    filteredSales.forEach((s) => {
      const metodo = s.formaPago || 'Efectivo';
      methodMap[metodo] = (methodMap[metodo] || 0) + (s.total || 0);
    });

    return Object.entries(methodMap).map(([metodo, total]) => ({
      name: metodo,
      value: total
    }));
  }, [filteredSales]);

  // Generate AI Executive Report with Gemini
  const handleGenerateAiReport = async () => {
    setIsGeneratingAiReport(true);
    setAiReportError(null);

    try {
      const res = await fetch('/api/sales/report/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales: filteredSales,
          periodName: periodLabel,
          metrics
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al generar el informe con IA.');
      }

      setAiReport(data.report);

    } catch (err: any) {
      console.error('Error al generar informe con IA:', err);
      setAiReportError(err.message || 'Error al conectar con la Inteligencia Artificial.');
    } finally {
      setIsGeneratingAiReport(false);
    }
  };

  // Create PDF Document (Includes Metrics, AI report if available, & Sales list)
  const createPdfDocument = (): jsPDF => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const todayStr = new Date().toISOString().split('T')[0];

    // Header Banner
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 210, 38, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('AMOD Solutions IA', 15, 16);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(147, 197, 253);
    doc.text('INFORME INTELIGENTE DE VENTAS', 15, 24);

    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Período: ${periodLabel} • Emisión: ${todayStr}`, 195, 20, { align: 'right' });

    let y = 48;

    // Metrics Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, y, 180, 48, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('RESUMEN DE MÉTRICAS CLAVE', 20, y + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    doc.text(`• Total de Ventas:`, 20, y + 17);
    doc.setFont('helvetica', 'bold');
    doc.text(`$ ${(metrics.totalVendido || 0).toLocaleString('es-CO')}`, 70, y + 17);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Número de Ventas:`, 20, y + 24);
    doc.setFont('helvetica', 'bold');
    doc.text(`${metrics.numVentas || 0}`, 70, y + 24);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Ticket Promedio:`, 20, y + 31);
    doc.setFont('helvetica', 'bold');
    doc.text(`$ ${Math.round(metrics.ticketPromedio || 0).toLocaleString('es-CO')}`, 70, y + 31);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Producto más vendido:`, 105, y + 17);
    doc.setFont('helvetica', 'bold');
    doc.text((metrics.productoMasVendido || '-').substring(0, 32), 150, y + 17);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Cliente con más compras:`, 105, y + 24);
    doc.setFont('helvetica', 'bold');
    doc.text((metrics.clienteTop || '-').substring(0, 32), 150, y + 24);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Método pago principal:`, 105, y + 31);
    doc.setFont('helvetica', 'bold');
    doc.text((metrics.metodoMasUtilizado || '-').substring(0, 32), 150, y + 31);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Estado de Recaudo:`, 20, y + 40);
    doc.setFont('helvetica', 'bold');
    doc.text(`Pagado: $${(metrics.totalPagado || 0).toLocaleString('es-CO')}  |  Pendiente: $${(metrics.totalPendiente || 0).toLocaleString('es-CO')}`, 70, y + 40);

    y += 58;

    // AI Analysis Section if present
    if (aiReport) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138); // Deep Blue
      doc.text('ANÁLISIS INTELIGENTE REALIZADO POR GEMINI AI', 15, y);

      y += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);

      // Resumen Ejecutivo
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen Ejecutivo:', 15, y);
      doc.setFont('helvetica', 'normal');
      const resLines = doc.splitTextToSize(aiReport.resumenEjecutivo || '', 180);
      doc.text(resLines, 15, y + 5);

      y += 6 + (resLines.length * 4.5);

      // Recomendaciones
      if (aiReport.recomendacionesAdministrativas && aiReport.recomendacionesAdministrativas.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Recomendaciones Administrativas Clave:', 15, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        aiReport.recomendacionesAdministrativas.slice(0, 4).forEach((rec) => {
          const recLines = doc.splitTextToSize(`• ${rec}`, 175);
          doc.text(recLines, 18, y);
          y += (recLines.length * 4.5);
        });
      }

      y += 6;
    }

    // Sales Table
    if (y > 220) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('REGISTRO DETALLADO DE VENTAS DEL PERÍODO:', 15, y);

    y += 6;

    const drawTableHeader = (currentY: number) => {
      doc.setFillColor(30, 64, 175);
      doc.rect(15, currentY, 180, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('ID VENTA', 18, currentY + 5.5);
      doc.text('FECHA', 45, currentY + 5.5);
      doc.text('CLIENTE', 70, currentY + 5.5);
      doc.text('PRODUCTO / SERVICIO', 115, currentY + 5.5);
      doc.text('TOTAL', 165, currentY + 5.5);
      doc.text('ESTADO', 185, currentY + 5.5);
      return currentY + 8;
    };

    y = drawTableHeader(y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    if (filteredSales.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('No hay registros de ventas para el período seleccionado.', 18, y + 6);
      y += 10;
    } else {
      filteredSales.forEach((sale) => {
        if (y > 265) {
          doc.addPage();
          y = 20;
          y = drawTableHeader(y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 23, 42);
        }
        doc.setFontSize(8);
        doc.text((sale.id || '').substring(0, 14), 18, y + 4.5);
        doc.text(sale.fecha || '', 45, y + 4.5);
        doc.text((sale.cliente || '').substring(0, 22), 70, y + 4.5);
        doc.text((sale.productoServicio || '').substring(0, 26), 115, y + 4.5);
        doc.text(`$${(sale.total || 0).toLocaleString('es-CO')}`, 165, y + 4.5);
        doc.text(sale.estadoPago || 'Pagado', 185, y + 4.5);
        y += 6.5;
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Documento oficial generado por AMOD Solutions IA • Ubicación en Drive: EMPRESA/04_INFORMES/', 105, 285, { align: 'center' });

    return doc;
  };

  // Download local PDF with strict validation and fallback
  const handleDownloadPdf = () => {
    setDownloadError(null);
    setDownloadSuccessMessage(null);

    try {
      // 1. Validar nombre de archivo en formato Informe_Ventas_AAAA-MM.pdf
      const fileName = getReportFileName();

      // 2. Generar informe en PDF con datos reales de la vista/filtro
      const doc = createPdfDocument();

      // 3. Verificar que el PDF tenga contenido
      const pdfBlob = doc.output('blob');
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('El documento PDF generado está vacío o no contiene datos válidos.');
      }

      // 4. Descargar localmente
      let downloadSuccess = false;

      try {
        doc.save(fileName);
        downloadSuccess = true;
      } catch (saveErr: any) {
        console.warn('doc.save() falló o fue bloqueado, ejecutando método fallback Blob URL:', saveErr);
      }

      if (!downloadSuccess) {
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }

      setDownloadSuccessMessage(`Informe en PDF descargado correctamente: ${fileName}`);

    } catch (err: any) {
      console.error('Error al generar o descargar el informe PDF:', err);
      setDownloadError(
        err?.message 
          ? `Error al descargar el informe PDF: ${err.message}` 
          : 'Error inesperado al generar y descargar el informe PDF.'
      );
    }
  };

  // Export currently filtered sales to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      setDownloadError(null);
      setDownloadSuccessMessage(null);

      if (filteredSales.length === 0) {
        setDownloadError('No hay ventas registradas en el período/filtro seleccionado para exportar.');
        return;
      }

      // 1. Mapear ventas filtradas a formato plano de tabla Excel
      const excelRows = filteredSales.map((s) => ({
        'ID Venta': s.id || '',
        'Fecha': s.fecha || '',
        'Cliente': s.cliente || '',
        'Producto / Servicio': s.productoServicio || '',
        'Cantidad': s.cantidad || 1,
        'Precio Unitario': s.precioUnitario || 0,
        'Total': s.total || 0,
        'Método de Pago': s.formaPago || 'Efectivo',
        'Estado de Pago': s.estadoPago || 'Pagado'
      }));

      // 2. Crear hoja de cálculo y libro de trabajo con XLSX
      const worksheet = XLSX.utils.json_to_sheet(excelRows);

      // Ajustar anchos de columnas
      const maxColWidths = [
        { wch: 15 }, // ID Venta
        { wch: 12 }, // Fecha
        { wch: 25 }, // Cliente
        { wch: 30 }, // Producto / Servicio
        { wch: 10 }, // Cantidad
        { wch: 15 }, // Precio Unitario
        { wch: 15 }, // Total
        { wch: 18 }, // Método de Pago
        { wch: 15 }, // Estado de Pago
      ];
      worksheet['!cols'] = maxColWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');

      // 3. Determinar nombre de archivo Excel
      let excelFileName = 'Registro_Ventas_Completo.xlsx';
      if (filterPeriod === 'MES_PERSONALIZADO' && selectedCustomMonth && /^\d{4}-\d{2}$/.test(selectedCustomMonth)) {
        excelFileName = `Registro_Ventas_${selectedCustomMonth}.xlsx`;
      } else if (filterPeriod === 'ESTE_MES') {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        excelFileName = `Registro_Ventas_${yyyy}-${mm}.xlsx`;
      } else if (filteredSales.length > 0 && filteredSales[0].fecha && /^\d{4}-\d{2}/.test(filteredSales[0].fecha)) {
        excelFileName = `Registro_Ventas_${filteredSales[0].fecha.substring(0, 7)}.xlsx`;
      }

      // 4. Descargar archivo Excel
      XLSX.writeFile(workbook, excelFileName);
      setDownloadSuccessMessage(`Archivo de Excel exportado correctamente: ${excelFileName}`);
    } catch (err: any) {
      console.error('Error al exportar a Excel:', err);
      setDownloadError(
        err?.message 
          ? `Error al exportar Excel: ${err.message}` 
          : 'Error inesperado al exportar el archivo de Excel.'
      );
    }
  };

  // Save PDF Report directly to Google Drive in EMPRESA/04_INFORMES/
  const handleSaveReportToDrive = async () => {
    if (!authUser.connected) {
      setSavePdfError('No hay una cuenta de Google Drive conectada. Por favor inicie sesión.');
      return;
    }

    setIsSavingPdfToDrive(true);
    setSavePdfError(null);
    setPdfDriveSaveResult(null);

    try {
      const fileName = getReportFileName();
      const doc = createPdfDocument();

      const pdfBlob = doc.output('blob');
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('El documento PDF generado está vacío o sin contenido.');
      }

      // Read binary PDF blob to clean base64 string
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const resStr = reader.result as string;
          const base64Str = resStr.includes(',') ? resStr.split(',')[1] : resStr;
          resolve(base64Str);
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo PDF binario generado.'));
        reader.readAsDataURL(pdfBlob);
      });

      const res = await fetch('/api/sales/report/save-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          fileName
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar el informe en Google Drive.');
      }

      setPdfDriveSaveResult(data.driveResult);

    } catch (err: any) {
      console.error('Save PDF error:', err);
      setSavePdfError(err?.message ? `Error en Google Drive: ${err.message}` : 'Error al guardar informe en Google Drive.');
    } finally {
      setIsSavingPdfToDrive(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
              <BarChart3 className="w-4 h-4" />
              <span>AMOD Solutions IA • FASE 5: Informes Inteligentes</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Informes de Ventas</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Análisis completo de transacciones almacenadas en Google Sheets/Drive con Inteligencia Artificial.
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleGenerateAiReport}
              disabled={isGeneratingAiReport || filteredSales.length === 0}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {isGeneratingAiReport ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generando con Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generar informe con IA</span>
                </>
              )}
            </button>

            <button
              onClick={handleSaveReportToDrive}
              disabled={isSavingPdfToDrive}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {isSavingPdfToDrive ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando en Drive...</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4" />
                  <span>Guardar informe en Drive</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors shadow-xs"
              title="Descargar informe PDF localmente"
            >
              <Download className="w-4 h-4 text-slate-700" />
              <span>Descargar PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors shadow-xs"
              title="Exportar registro de ventas a Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* Local Download Success Banner */}
        {downloadSuccessMessage && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="font-semibold">{downloadSuccessMessage}</span>
          </div>
        )}

        {/* Local Download Error Banner */}
        {downloadError && (
          <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{downloadError}</span>
          </div>
        )}

        {/* Filter Period, Customer & Payment Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => { setFilterPeriod('HOY'); setAiReport(null); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterPeriod === 'HOY'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => { setFilterPeriod('ESTA_SEMANA'); setAiReport(null); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterPeriod === 'ESTA_SEMANA'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Esta semana
            </button>
            <button
              onClick={() => { setFilterPeriod('ESTE_MES'); setAiReport(null); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterPeriod === 'ESTE_MES'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Este mes
            </button>
            <button
              onClick={() => { setFilterPeriod('MES_PERSONALIZADO'); setAiReport(null); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterPeriod === 'MES_PERSONALIZADO'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mes personalizado
            </button>
            <button
              onClick={() => { setFilterPeriod('TODAS'); setAiReport(null); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterPeriod === 'TODAS'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas las ventas
            </button>
            <button
              onClick={() => { setFilterPeriod('RANGO'); setAiReport(null); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterPeriod === 'RANGO'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rango
            </button>
          </div>

          {/* Right Side Filters: Customer & Payment Status */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Customer Filter */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-medium">Cliente:</span>
              <select
                value={selectedClientFilter}
                onChange={(e) => handleClientFilterChange(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="TODOS">Todos los clientes</option>
                {clientList.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Status Filter */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-medium">Estado de pago:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => handlePaymentStatusChange('TODOS')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    paymentStatusFilter === 'TODOS'
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => handlePaymentStatusChange('Pagado')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    paymentStatusFilter === 'Pagado'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pagado
                </button>
                <button
                  onClick={() => handlePaymentStatusChange('Pendiente')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    paymentStatusFilter === 'Pendiente'
                      ? 'bg-amber-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pendiente
                </button>
              </div>
            </div>
          </div>

          {/* Sub-inputs for custom filters */}
          {filterPeriod === 'MES_PERSONALIZADO' && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-medium">Seleccionar mes:</span>
              <input
                type="month"
                value={selectedCustomMonth}
                onChange={(e) => { setSelectedCustomMonth(e.target.value); setAiReport(null); }}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold"
              />
            </div>
          )}

          {filterPeriod === 'RANGO' && (
            <div className="flex items-center space-x-2 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setAiReport(null); }}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 text-xs"
              />
              <span className="text-slate-400">a</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setAiReport(null); }}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 text-xs"
              />
            </div>
          )}
        </div>

        {/* Drive Save Success Banner */}
        {pdfDriveSaveResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <strong className="font-bold text-sm text-emerald-900 block">¡Informe guardado en Google Drive exitosamente!</strong>
                <p className="text-emerald-800 mt-0.5">
                  Ruta oficial: <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-900 font-bold">{pdfDriveSaveResult.parentFolderPath}/{pdfDriveSaveResult.fileName}</code>
                </p>
              </div>
            </div>
            <button
              onClick={() => openGoogleDriveDocument({
                fileId: pdfDriveSaveResult.fileId,
                fileName: pdfDriveSaveResult.fileName,
                targetPath: pdfDriveSaveResult.parentFolderPath,
                webViewLink: pdfDriveSaveResult.webViewLink
              })}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
            >
              <span>Ver documento</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {savePdfError && (
          <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{savePdfError}</span>
          </div>
        )}

      </div>

      {/* DASHBOARD PANEL: 6 MANDATORY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* 1. Total de ventas */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-bold uppercase tracking-wider">Total de Ventas</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            ${metrics.totalVendido.toLocaleString('es-CO')}
          </div>
          <p className="text-[10px] text-slate-400">Sumatoria bruta</p>
        </div>

        {/* 2. Número de ventas */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-bold uppercase tracking-wider">Número de Ventas</span>
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {metrics.numVentas}
          </div>
          <p className="text-[10px] text-slate-400">Transacciones cerradas</p>
        </div>

        {/* 3. Ticket promedio */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-bold uppercase tracking-wider">Ticket Promedio</span>
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            ${Math.round(metrics.ticketPromedio).toLocaleString('es-CO')}
          </div>
          <p className="text-[10px] text-slate-400">Promedio por venta</p>
        </div>

        {/* 4. Producto o servicio más vendido */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-bold uppercase tracking-wider">Producto Top</span>
            <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900 truncate" title={metrics.productoMasVendido}>
            {metrics.productoMasVendido}
          </div>
          <p className="text-[10px] text-slate-400">Mayor demanda</p>
        </div>

        {/* 5. Cliente con mayor número de compras */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-bold uppercase tracking-wider">Cliente Principal</span>
            <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900 truncate" title={metrics.clienteTop}>
            {metrics.clienteTop}
          </div>
          <p className="text-[10px] text-slate-400">Mayor volumen compras</p>
        </div>

        {/* 6. Método de pago más utilizado */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-bold uppercase tracking-wider">Método Frecuente</span>
            <div className="p-1.5 bg-teal-100 text-teal-700 rounded-lg">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900 truncate" title={metrics.metodoMasUtilizado}>
            {metrics.metodoMasUtilizado}
          </div>
          <p className="text-[10px] text-slate-400">Canal preferido</p>
        </div>

      </div>

      {/* AI GENERATED REPORT SECTION */}
      {aiReport && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-500/30 space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/20 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-600/50 rounded-xl border border-indigo-400/30">
                <Sparkles className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Informe Analítico de Ventas con IA</h3>
                <p className="text-xs text-indigo-200">
                  Generado por Gemini AI • Período: {aiReport.periodoNombre} • {aiReport.fechaGeneracion}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-xs text-indigo-300 font-mono">
              <span>Modelo: Gemini 3.6 Flash</span>
            </span>
          </div>

          {/* Resumen Ejecutivo */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-2">
              <Award className="w-4 h-4" />
              <span>Resumen Ejecutivo</span>
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed">
              {aiReport.resumenEjecutivo}
            </p>
          </div>

          {/* Grid: Principales Resultados & Productos Destacados */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Principales Resultados</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-200">
                {aiReport.principalesResultados?.map((res, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{res}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>Productos Destacados</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-200">
                {aiReport.productosDestacados?.map((prod, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>{prod}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Comportamiento de las Ventas */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center space-x-2">
              <Layers className="w-4 h-4" />
              <span>Comportamiento de las Ventas</span>
            </h4>
            <p className="text-xs text-slate-200 leading-relaxed">
              {aiReport.comportamientoVentas}
            </p>
          </div>

          {/* Grid: Observaciones & Recomendaciones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4" />
                <span>Observaciones Administrativas</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-200">
                {aiReport.observaciones?.map((obs, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Recomendaciones Estratégicas</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-200">
                {aiReport.recomendacionesAdministrativas?.map((rec, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-teal-300 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {aiReportError && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{aiReportError}</span>
        </div>
      )}

      {/* VISUAL CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Ventas por día */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Ventas por Día</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Evolución diaria de ingresos ($)</p>
          </div>

          <div className="h-56 w-full">
            {chartDataByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    formatter={(value: any) => [`$${Number(value).toLocaleString('es-CO')}`, 'Total']}
                    labelFormatter={(label: any) => `Fecha: ${label}`}
                  />
                  <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sin datos en este período
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Ventas por producto */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Ventas por Producto</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Top productos por facturación ($)</p>
          </div>

          <div className="h-56 w-full">
            {chartDataByProduct.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataByProduct} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(val) => `$${val}`} />
                  <YAxis type="category" dataKey="producto" tick={{ fontSize: 10, fill: '#64748B' }} width={90} />
                  <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString('es-CO')}`, 'Ingresos']} />
                  <Bar dataKey="total" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sin datos en este período
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Ventas por método de pago */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span>Método de Pago</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Distribución por canal de cobro</p>
          </div>

          <div className="h-56 w-full">
            {chartDataByPaymentMethod.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartDataByPaymentMethod}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartDataByPaymentMethod.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${Number(value).toLocaleString('es-CO')}`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sin datos en este período
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SALES TABLE FOR SELECTED PERIOD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Listado de Ventas ({filteredSales.length})
            </h3>
            <p className="text-xs text-slate-500">
              Registros correspondientes al período seleccionado: <strong className="text-slate-800">{periodLabel}</strong>
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Fuente: Google Drive / Sheets (AMOD)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
                <th className="p-3.5">ID Venta</th>
                <th className="p-3.5">Fecha</th>
                <th className="p-3.5">Cliente</th>
                <th className="p-3.5">Producto / Servicio</th>
                <th className="p-3.5 text-center">Cant.</th>
                <th className="p-3.5 text-right">P. Unitario</th>
                <th className="p-3.5 text-right">Total</th>
                <th className="p-3.5">Método Pago</th>
                <th className="p-3.5 text-center">Estado</th>
                <th className="p-3.5 text-center">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No hay registros de ventas para el período seleccionado.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono text-blue-700 font-bold">{sale.id}</td>
                    <td className="p-3.5 whitespace-nowrap">{sale.fecha}</td>
                    <td className="p-3.5 font-semibold text-slate-900">{sale.cliente}</td>
                    <td className="p-3.5 max-w-[200px] truncate" title={sale.productoServicio}>
                      {sale.productoServicio}
                    </td>
                    <td className="p-3.5 text-center font-mono">{sale.cantidad}</td>
                    <td className="p-3.5 text-right font-mono">${sale.precioUnitario.toLocaleString('es-CO')}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      ${sale.total.toLocaleString('es-CO')}
                    </td>
                    <td className="p-3.5">{sale.formaPago}</td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        sale.estadoPago === 'Pagado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {sale.estadoPago}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {sale.comprobanteResult?.webViewLink ? (
                        <a
                          href={sale.comprobanteResult.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-bold text-[11px] transition-colors"
                        >
                          <FileText className="w-3 h-3 text-emerald-600" />
                          <span>Ver PDF</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Sin PDF</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
