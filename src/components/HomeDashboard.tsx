import React, { useMemo } from 'react';
import { MainNavTab, AuthUser, SaleRecord, SavedDocumentRecord } from '../types';
import { 
  Building2, 
  ShoppingBag, 
  FileSpreadsheet, 
  BarChart3, 
  FolderTree, 
  HardDrive, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  PlusCircle, 
  Upload, 
  Bot, 
  DollarSign, 
  CreditCard, 
  Clock, 
  Calendar,
  FileText, 
  Activity, 
  ShieldCheck, 
  ExternalLink,
  TrendingUp,
  XCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { openGoogleDriveDocument } from '../utils/driveViewer';

interface HomeDashboardProps {
  onSelectTab: (tab: MainNavTab) => void;
  authUser: AuthUser;
  onConnectDrive: () => void;
  docsCount: number;
  salesCount: number;
  savedRecords?: SavedDocumentRecord[];
  savedSales?: SaleRecord[];
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onSelectTab,
  authUser,
  onConnectDrive,
  docsCount,
  salesCount,
  savedRecords = [],
  savedSales = []
}) => {
  // Current month string YYYY-MM
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
  const currentYearMonth = `${currentYear}-${currentMonthNum}`;
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const currentMonthLabel = `${monthNames[now.getMonth()]} ${currentYear}`;

  // Filter sales for the current month
  const currentMonthSales = useMemo(() => {
    return savedSales.filter(s => s.fecha && s.fecha.startsWith(currentYearMonth));
  }, [savedSales, currentYearMonth]);

  // Calculate KPIs
  const totalVentasMes = useMemo(() => {
    // If sales exist for current month, sum them. Fallback to all sales if none for current month but total sales exist
    const listToSum = currentMonthSales.length > 0 ? currentMonthSales : [];
    return listToSum.reduce((acc, sale) => acc + (Number(sale.total) || 0), 0);
  }, [currentMonthSales]);

  const numVentasMes = currentMonthSales.length;

  const totalPagosRecibidos = useMemo(() => {
    const listToSum = currentMonthSales.length > 0 ? currentMonthSales : [];
    return listToSum
      .filter(s => (s.estadoPago || '').toLowerCase() === 'pagado')
      .reduce((acc, sale) => acc + (Number(sale.total) || 0), 0);
  }, [currentMonthSales]);

  // Today's local date string YYYY-MM-DD
  const todayDayNum = String(now.getDate()).padStart(2, '0');
  const todayStr = `${currentYear}-${currentMonthNum}-${todayDayNum}`;

  // Filter sales for today
  const todaySales = useMemo(() => {
    return savedSales.filter(s => s.fecha && s.fecha === todayStr);
  }, [savedSales, todayStr]);

  const totalVentasDia = useMemo(() => {
    return todaySales.reduce((acc, sale) => acc + (Number(sale.total) || 0), 0);
  }, [todaySales]);

  const numVentasDia = todaySales.length;

  // Filter pending sales
  const pendingSales = useMemo(() => {
    return savedSales.filter(s => (s.estadoPago || '').toLowerCase() === 'pendiente');
  }, [savedSales]);

  const totalVentasPendientes = useMemo(() => {
    return pendingSales.reduce((acc, sale) => acc + (Number(sale.total) || 0), 0);
  }, [pendingSales]);

  const numVentasPendientes = pendingSales.length;

  // Daily Sales chart data for current month (or overall if current month is empty)
  const salesChartData = useMemo(() => {
    const salesForChart = currentMonthSales.length > 0 ? currentMonthSales : savedSales;
    if (salesForChart.length === 0) return [];

    const grouped: Record<string, number> = {};
    
    // Sort chronological
    const sorted = [...salesForChart].sort((a, b) => a.fecha.localeCompare(b.fecha));

    sorted.forEach(s => {
      const dayKey = s.fecha; // YYYY-MM-DD
      grouped[dayKey] = (grouped[dayKey] || 0) + (Number(s.total) || 0);
    });

    return Object.keys(grouped).map(dateStr => {
      // Format X-axis label e.g., "08 Aug" or "08/08"
      const parts = dateStr.split('-');
      const formattedLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
      return {
        rawDate: dateStr,
        label: formattedLabel,
        total: grouped[dateStr]
      };
    });
  }, [currentMonthSales, savedSales]);

  // Recent 5 sales
  const recentSales = useMemo(() => {
    return [...savedSales]
      .sort((a, b) => new Date(b.savedAt || b.fecha).getTime() - new Date(a.savedAt || a.fecha).getTime())
      .slice(0, 5);
  }, [savedSales]);

  // Recent 5 documents
  const recentDocs = useMemo(() => {
    return [...savedRecords]
      .sort((a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime())
      .slice(0, 5);
  }, [savedRecords]);

  // Combine activity feed
  const recentActivity = useMemo(() => {
    const activities: Array<{
      id: string;
      type: 'sale' | 'document';
      title: string;
      description: string;
      timestamp: string;
      status: string;
      linkObj?: any;
    }> = [];

    savedSales.forEach(s => {
      activities.push({
        id: `sale-${s.id}`,
        type: 'sale',
        title: `Venta Registrada (${s.id})`,
        description: `${s.cliente} - $${Number(s.total).toFixed(2)} (${s.productoServicio})`,
        timestamp: s.savedAt || s.fecha,
        status: s.estadoPago,
        linkObj: s.comprobanteResult || s.driveResult
      });
    });

    savedRecords.forEach(d => {
      activities.push({
        id: `doc-${d.id}`,
        type: 'document',
        title: `Documento Guardado`,
        description: `${d.analysis?.recommendedFileName || d.driveResult?.fileName} - ${d.analysis?.category || 'Almacenado'}`,
        timestamp: d.savedAt,
        status: 'Almacenado',
        linkObj: d.driveResult
      });
    });

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [savedSales, savedRecords]);

  return (
    <div className="space-y-6">
      
      {/* 1. ENCABEZADO Y ESTADO DE CONEXIÓN */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 md:p-8 text-white shadow-xl border border-blue-900/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sistema Inteligente de Secretariado Administrativo</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              AMOD Solutions IA
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Panel Ejecutivo Central: Supervisión estratégica en tiempo real de ventas, pagos, informes y clasificación documental corporativa.
            </p>
          </div>

          {/* Estado de Conexión Google Drive */}
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-center space-y-2.5 min-w-[260px] self-start md:self-auto shadow-md">
            <div className="flex items-center space-x-2.5">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${authUser.connected ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${authUser.connected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className="text-xs font-bold text-white tracking-wide">
                {authUser.connected ? 'Google Drive conectado' : 'Google Drive sin conexión'}
              </span>
            </div>

            <p className="text-[11px] text-slate-300">
              {authUser.connected 
                ? (authUser.email || authUser.name || 'Sincronización activa en la nube') 
                : 'Conecte su cuenta para sincronización en tiempo real.'}
            </p>

            {!authUser.connected && (
              <button
                onClick={onConnectDrive}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center space-x-1.5"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Conectar Google Drive</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. TARJETAS PRINCIPALES (KPIs REALES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
        
        {/* KPI 1: VENTAS DEL MES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ventas del Mes</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                ${totalVentasMes.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-600">{currentMonthLabel}</span>
            <span className="text-emerald-600 font-bold flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Real</span>
            </span>
          </div>
        </div>

        {/* KPI 2: NÚMERO DE VENTAS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Número de Ventas</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {numVentasMes}
              </div>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Transacciones registradas</span>
            <span className="font-bold text-indigo-600">{numVentasMes > 0 ? `${numVentasMes} en ${currentMonthLabel}` : 'Sin ventas'}</span>
          </div>
        </div>

        {/* KPI 3: DOCUMENTOS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documentos</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {docsCount}
              </div>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Gestión Documental</span>
            <span className="font-bold text-purple-600">{docsCount > 0 ? 'Clasificados IA' : '0 Archivos'}</span>
          </div>
        </div>

        {/* KPI 4: PAGOS RECIBIDOS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pagos Recibidos</span>
              <div className="text-2xl font-black text-emerald-700 tracking-tight">
                ${totalPagosRecibidos.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Estado: Pagado</span>
            <span className="font-bold text-emerald-600">Cobro verificado</span>
          </div>
        </div>

        {/* KPI 5: VENTAS DEL DÍA */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ventas del Día</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                ${totalVentasDia.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Fecha local ({todayStr})</span>
            <span className="font-bold text-sky-600">{numVentasDia} {numVentasDia === 1 ? 'venta' : 'ventas'}</span>
          </div>
        </div>

        {/* KPI 6: VENTAS PENDIENTES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ventas Pendientes</span>
              <div className="text-2xl font-black text-amber-700 tracking-tight">
                ${totalVentasPendientes.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Estado: Pendiente</span>
            <span className="font-bold text-amber-600">{numVentasPendientes} {numVentasPendientes === 1 ? 'por cobrar' : 'por cobrar'}</span>
          </div>
        </div>

      </div>

      {/* 6. ACCESOS RÁPIDOS (Visual Quick Action Buttons) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Accesos Rápidos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <button
            onClick={() => onSelectTab('ventas_registro')}
            className="p-3.5 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80 rounded-xl transition-all text-left flex items-center space-x-3 group cursor-pointer"
          >
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs group-hover:scale-105 transition-transform">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-blue-900">+ Registrar nueva venta</span>
              <span className="block text-[10px] text-blue-700">Módulo Registro</span>
            </div>
          </button>

          <button
            onClick={() => onSelectTab('documentos')}
            className="p-3.5 bg-purple-50 hover:bg-purple-100/80 border border-purple-200/80 rounded-xl transition-all text-left flex items-center space-x-3 group cursor-pointer"
          >
            <div className="p-2 bg-purple-600 text-white rounded-lg shadow-xs group-hover:scale-105 transition-transform">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-purple-900">+ Subir documento</span>
              <span className="block text-[10px] text-purple-700">Clasificación IA</span>
            </div>
          </button>

          <button
            onClick={() => onSelectTab('ventas_informes')}
            className="p-3.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-xl transition-all text-left flex items-center space-x-3 group cursor-pointer"
          >
            <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs group-hover:scale-105 transition-transform">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-emerald-900">📊 Ver informes</span>
              <span className="block text-[10px] text-emerald-700">Estadísticas y PDF</span>
            </div>
          </button>

          <button
            onClick={() => onSelectTab('asistente_ia')}
            className="p-3.5 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80 rounded-xl transition-all text-left flex items-center space-x-3 group cursor-pointer"
          >
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs group-hover:scale-105 transition-transform">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-indigo-900">🤖 Preguntar al asistente</span>
              <span className="block text-[10px] text-indigo-700">Secretariado IA</span>
            </div>
          </button>

        </div>
      </div>

      {/* 3. GRÁFICO DE VENTAS DEL MES */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>Ventas del Mes</span>
            </h3>
            <p className="text-xs text-slate-500">Agrupadas por día con datos reales del Registro de Ventas ({currentMonthLabel})</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto">
            {salesChartData.length} Días con transacciones
          </span>
        </div>

        {salesChartData.length > 0 ? (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11, fill: '#64748B' }} 
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748B' }} 
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Ventas']}
                  labelFormatter={(label) => `Fecha: ${label}`}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    borderRadius: '12px',
                    color: '#FFF',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
                <Bar 
                  dataKey="total" 
                  fill="#2563EB" 
                  radius={[6, 6, 0, 0]} 
                  name="Monto Venta ($)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 text-center space-y-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <BarChart3 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">Sin datos disponibles de ventas este mes</p>
            <p className="text-xs text-slate-400">El gráfico se generará automáticamente al registrar transacciones en el sistema.</p>
          </div>
        )}
      </div>

      {/* GRID DE MÓDULOS PRINCIPALES: ÚLTIMAS VENTAS Y DOCUMENTOS RECIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 4. ÚLTIMAS VENTAS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Últimas Ventas</h3>
              </div>
              <button
                onClick={() => onSelectTab('ventas_registro')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <span>Ver todas las ventas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentSales.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-2.5 px-2">ID</th>
                      <th className="py-2.5 px-2">Fecha</th>
                      <th className="py-2.5 px-2">Cliente</th>
                      <th className="py-2.5 px-2">Producto/Servicio</th>
                      <th className="py-2.5 px-2 text-right">Total</th>
                      <th className="py-2.5 px-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentSales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-2 font-mono font-bold text-blue-700 whitespace-nowrap">{s.id}</td>
                        <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">{s.fecha}</td>
                        <td className="py-2.5 px-2 font-semibold text-slate-800 truncate max-w-[110px]">{s.cliente}</td>
                        <td className="py-2.5 px-2 text-slate-600 truncate max-w-[120px]">{s.productoServicio}</td>
                        <td className="py-2.5 px-2 text-right font-extrabold text-slate-900 whitespace-nowrap">
                          ${Number(s.total).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            (s.estadoPago || '').toLowerCase() === 'pagado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {s.estadoPago}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p className="text-xs font-bold text-slate-500">Sin datos disponibles</p>
                <p className="text-[11px] text-slate-400">No hay ventas registradas aún.</p>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => onSelectTab('ventas_registro')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer text-center"
            >
              Ver todas las ventas ({salesCount})
            </button>
          </div>
        </div>

        {/* 5. DOCUMENTOS RECIENTES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Documentos Recientes</h3>
              </div>
              <button
                onClick={() => onSelectTab('documentos')}
                className="text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <span>Ver documentos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentDocs.length > 0 ? (
              <div className="space-y-2">
                {recentDocs.map((rec) => {
                  const fileName = rec.analysis?.recommendedFileName || rec.driveResult?.fileName || 'Documento sin nombre';
                  const category = rec.analysis?.category || rec.analysis?.recommendedFolder || 'Otros';
                  return (
                    <div key={rec.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 hover:bg-slate-100/60 transition-colors">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="p-2 bg-purple-100 text-purple-700 rounded-lg flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{fileName}</h4>
                          <p className="text-[10px] text-slate-500 truncate">
                            Categoría: <span className="font-semibold text-purple-700">{category}</span> • {rec.savedAt ? new Date(rec.savedAt).toLocaleDateString() : 'Reciente'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => openGoogleDriveDocument({
                          fileId: rec.driveResult?.fileId,
                          fileName: rec.driveResult?.fileName || fileName,
                          targetPath: rec.driveResult?.parentFolderPath,
                          webViewLink: rec.driveResult?.webViewLink
                        })}
                        className="px-2.5 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-lg font-bold text-[10px] flex items-center space-x-1 flex-shrink-0 transition-colors cursor-pointer"
                      >
                        <span>Abrir</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p className="text-xs font-bold text-slate-500">Sin datos disponibles</p>
                <p className="text-[11px] text-slate-400">No hay documentos clasificados aún en el sistema.</p>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => onSelectTab('documentos')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer text-center"
            >
              Ver documentos ({docsCount})
            </button>
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: ACTIVIDAD RECIENTE & ESTADO DEL SISTEMA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 7. ACTIVIDAD RECIENTE */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Actividad Reciente</h3>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Eventos reales
            </span>
          </div>

          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((act) => (
                <div key={act.id} className="flex items-start space-x-3 text-xs border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                  <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                    act.type === 'sale' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {act.type === 'sale' ? <ShoppingBag className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-800 truncate">{act.title}</h4>
                      <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                        {act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate">{act.description}</p>
                  </div>

                  {act.linkObj && (
                    <button
                      onClick={() => openGoogleDriveDocument({
                        fileId: act.linkObj.fileId,
                        fileName: act.linkObj.fileName,
                        webViewLink: act.linkObj.webViewLink
                      })}
                      className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer flex-shrink-0"
                      title="Ver documento en Drive"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center bg-slate-50 rounded-xl space-y-1">
              <p className="text-xs font-bold text-slate-500">Sin datos disponibles</p>
              <p className="text-[11px] text-slate-400">Sin actividad reciente registrada en la plataforma.</p>
            </div>
          )}
        </div>

        {/* 8. ESTADO DEL SISTEMA */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Estado del Sistema</h3>
          </div>

          <div className="space-y-3 text-xs">
            
            {/* Google Drive Status */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <HardDrive className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-800">Google Drive</span>
              </div>
              <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                authUser.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {authUser.connected ? 'CONECTADO' : 'DESCONECTADO'}
              </span>
            </div>

            {/* Google Sheets Status */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-800">Google Sheets</span>
              </div>
              <span className="px-2 py-0.5 rounded-md font-extrabold text-[10px] bg-emerald-100 text-emerald-800">
                CONECTADO
              </span>
            </div>

            {/* Asistente IA Status */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Bot className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-800">Asistente IA</span>
              </div>
              <span className="px-2 py-0.5 rounded-md font-extrabold text-[10px] bg-indigo-100 text-indigo-800">
                DISPONIBLE
              </span>
            </div>

            {/* Gestión Documental Status */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <FolderTree className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-slate-800">Gestión Documental</span>
              </div>
              <span className="px-2 py-0.5 rounded-md font-extrabold text-[10px] bg-purple-100 text-purple-800">
                ACTIVA
              </span>
            </div>

            {/* Registro de Ventas Status */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-800">Registro de Ventas</span>
              </div>
              <span className="px-2 py-0.5 rounded-md font-extrabold text-[10px] bg-blue-100 text-blue-800">
                ACTIVO
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
