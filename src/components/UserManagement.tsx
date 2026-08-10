import React, { useState } from 'react';
import { UserRecord, UserRole, AuditLogRecord, AuthUser } from '../types';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Search, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  Key, 
  RefreshCw, 
  Edit, 
  UserCheck, 
  UserX,
  FileText,
  Building2,
  Clock,
  ShieldAlert
} from 'lucide-react';

interface UserManagementProps {
  authUser: AuthUser;
  users: UserRecord[];
  auditLogs: AuditLogRecord[];
  onAddUser: (user: Omit<UserRecord, 'id' | 'createdAt'>) => Promise<void>;
  onChangeUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  onToggleUserStatus: (userId: string, active: boolean) => Promise<void>;
  onRefreshData?: () => void;
  onSimulateRoleChange?: (role: UserRole) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  authUser,
  users,
  auditLogs,
  onAddUser,
  onChangeUserRole,
  onToggleUserStatus,
  onRefreshData,
  onSimulateRoleChange
}) => {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'auditoria' | 'permisos'>('usuarios');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('TODOS');
  
  // Modal state for adding user
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('SECRETARIADO');
  const [newUserActive, setNewUserActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'TODOS' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Filter audit logs
  const [auditModuleFilter, setAuditModuleFilter] = useState('TODOS');
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditModuleFilter !== 'TODOS' && log.module !== auditModuleFilter) return false;
    return true;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      setActionError('Por favor complete el nombre y correo electrónico.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await onAddUser({
        name: newUserName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        role: newUserRole,
        active: newUserActive
      });
      setActionSuccess(`Usuario "${newUserEmail}" registrado correctamente con rol ${newUserRole}.`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('SECRETARIADO');
      setIsAddModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Error al registrar el usuario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMINISTRADOR':
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">ADMINISTRADOR</span>;
      case 'SECRETARIADO':
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">SECRETARIADO</span>;
      case 'CONTABILIDAD':
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">CONTABILIDAD</span>;
      case 'CONSULTA':
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">CONSULTA</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-slate-100 text-slate-600">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Fase 9: Control de Acceso y Auditoría</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Gestión de Usuarios, Roles y Seguridad
          </h1>
          <p className="text-xs md:text-sm text-slate-300">
            Administración centralizada de cuentas de usuario, asignación de permisos según el cargo y registro oficial de auditoría de operaciones en AMOD.
          </p>
        </div>

        {/* Current Identity & Role Card */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 min-w-[280px] space-y-2 shadow-inner">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identidad Autenticada</div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-600/30 text-indigo-300 rounded-lg border border-indigo-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate max-w-[200px]">
                {authUser.email || authUser.name || 'duarteosmel@gmail.com'}
              </div>
              <div className="mt-0.5">
                {getRoleBadge(authUser.role || 'ADMINISTRADOR')}
              </div>
            </div>
          </div>

          {/* Role testing simulation dropdown for admins */}
          {onSimulateRoleChange && (
            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-semibold">Probar vista como:</span>
              <select
                value={authUser.role || 'ADMINISTRADOR'}
                onChange={(e) => onSimulateRoleChange(e.target.value as UserRole)}
                className="bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-slate-200 font-bold text-[10px] focus:outline-none"
              >
                <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                <option value="SECRETARIADO">SECRETARIADO</option>
                <option value="CONTABILIDAD">CONTABILIDAD</option>
                <option value="CONSULTA">CONSULTA</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* FEEDBACK NOTIFICATIONS */}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center space-x-2">
          <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'usuarios'
              ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuarios y Cuentas ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'auditoria'
              ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Registro de Auditoría ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('permisos')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'permisos'
              ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Matriz de Permisos</span>
        </button>
      </div>

      {/* TAB 1: USUARIOS Y CUENTAS */}
      {activeTab === 'usuarios' && (
        <div className="space-y-6">
          
          {/* STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Usuarios</span>
              <div className="text-xl font-extrabold text-slate-900 mt-1">{users.length}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Administradores</span>
              <div className="text-xl font-extrabold text-rose-700 mt-1">
                {users.filter(u => u.role === 'ADMINISTRADOR').length}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Secretaría / Contador</span>
              <div className="text-xl font-extrabold text-blue-700 mt-1">
                {users.filter(u => u.role === 'SECRETARIADO' || u.role === 'CONTABILIDAD').length}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuentas Activas</span>
              <div className="text-xl font-extrabold text-emerald-700 mt-1">
                {users.filter(u => u.active).length}
              </div>
            </div>
          </div>

          {/* CONTROLS BAR: SEARCH, FILTER & ADD USER BUTTON */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o correo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="TODOS">Todos los roles</option>
                <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                <option value="SECRETARIADO">SECRETARIADO</option>
                <option value="CONTABILIDAD">CONTABILIDAD</option>
                <option value="CONSULTA">CONSULTA</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
              {onRefreshData && (
                <button
                  onClick={onRefreshData}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Actualizar lista de usuarios"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Agregar Usuario</span>
              </button>
            </div>
          </div>

          {/* USERS TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Correo Electrónico</th>
                    <th className="py-3 px-4">Rol Asignado</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4">Fecha Registro</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isPrimaryAdmin = user.email.toLowerCase() === 'duarteosmel@gmail.com';
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Name */}
                        <td className="py-3 px-4 font-bold text-slate-800">
                          <div className="flex items-center space-x-2">
                            <span>{user.name}</span>
                            {isPrimaryAdmin && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                Principal
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3 px-4 text-slate-600 font-mono">{user.email}</td>

                        {/* Role Select or Badge */}
                        <td className="py-3 px-4">
                          {isPrimaryAdmin ? (
                            getRoleBadge(user.role)
                          ) : (
                            <select
                              value={user.role}
                              onChange={(e) => onChangeUserRole(user.id, e.target.value as UserRole)}
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            >
                              <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                              <option value="SECRETARIADO">SECRETARIADO</option>
                              <option value="CONTABILIDAD">CONTABILIDAD</option>
                              <option value="CONSULTA">CONSULTA</option>
                            </select>
                          )}
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            user.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {user.active ? <UserCheck className="w-3 h-3 mr-1" /> : <UserX className="w-3 h-3 mr-1" />}
                            {user.active ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                        </td>

                        {/* Registration Date */}
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          {isPrimaryAdmin ? (
                            <span className="text-[10px] font-bold text-slate-400 italic">Protegido</span>
                          ) : (
                            <button
                              onClick={() => onToggleUserStatus(user.id, !user.active)}
                              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors cursor-pointer ${
                                user.active 
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' 
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {user.active ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: REGISTRO DE AUDITORÍA */}
      {activeTab === 'auditoria' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                <span>Registro de Auditoría de Operaciones</span>
              </h3>
              <p className="text-xs text-slate-500">Historial completo e inmutable de acciones realizadas en el sistema AMOD Solutions IA.</p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500">Módulo:</span>
              <select
                value={auditModuleFilter}
                onChange={(e) => setAuditModuleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="TODOS">Todos los módulos</option>
                <option value="Registro de Ventas">Registro de Ventas</option>
                <option value="Gestión Documental">Gestión Documental</option>
                <option value="Informes">Informes</option>
                <option value="Usuarios">Usuarios</option>
                <option value="Seguridad">Seguridad</option>
                <option value="Sistema">Sistema</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4">Acción Realizada</th>
                  <th className="py-3 px-4 text-center">Resultado</th>
                  <th className="py-3 px-4">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                      {log.userEmail}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        log.status === 'Éxito' ? 'bg-emerald-100 text-emerald-800' :
                        log.status === 'Rechazado' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {log.status === 'Éxito' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-[220px] truncate">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MATRIZ DE PERMISOS */}
      {activeTab === 'permisos' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              <span>Matriz Oficial de Permisos por Rol</span>
            </h3>
            <p className="text-xs text-slate-500">Definición de capacidades operativas aplicadas en la interfaz y en el backend.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Módulo / Función</th>
                  <th className="py-3 px-4 text-center bg-rose-950/60">ADMINISTRADOR</th>
                  <th className="py-3 px-4 text-center bg-blue-950/60">SECRETARIADO</th>
                  <th className="py-3 px-4 text-center bg-amber-950/60">CONTABILIDAD</th>
                  <th className="py-3 px-4 text-center bg-slate-800">CONSULTA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Dashboard Ejecutivo</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Completo</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Completo</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Completo</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Completo</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Registrar Nuevas Ventas</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Permitido</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Permitido</td>
                  <td className="py-3 px-4 text-center text-slate-400">✕ No permitido</td>
                  <td className="py-3 px-4 text-center text-slate-400">✕ No permitido</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Consultar Historial de Ventas</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Permitido</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Permitido</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Permitido</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Permitido</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Subir y Clasificar Documentos IA</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Permitido</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Permitido</td>
                  <td className="py-3 px-4 text-center text-slate-400">✕ No permitido</td>
                  <td className="py-3 px-4 text-center text-slate-400">✕ No permitido</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Generar Informes de Ventas (PDF/Excel)</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Permitido</td>
                  <td className="py-3 px-4 text-center text-slate-400">✕ No permitido</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Permitido</td>
                  <td className="py-3 px-4 text-center text-slate-400">✕ Solo visualización</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Asistente Administrativo IA</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Completo</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Completo</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Completo</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Modo Consulta</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Gestión de Usuarios y Seguridad</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">✓ Completo</td>
                  <td className="py-3 px-4 text-center text-slate-400">✕ Sin acceso</td>
                  <td className="py-3 px-4 text-center text-slate-400">✕ Sin acceso</td>
                  <td className="py-3 px-4 text-center text-slate-400">✕ Sin acceso</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW USER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Registrar Nuevo Usuario</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. María Rodríguez"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico (Google Account)</label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@amodsolutions.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rol Asignado</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="SECRETARIADO">SECRETARIADO (Registrar ventas, Subir documentos)</option>
                  <option value="CONTABILIDAD">CONTABILIDAD (Consultas e Informes Financieros)</option>
                  <option value="CONSULTA">CONSULTA (Solo Lectura)</option>
                  <option value="ADMINISTRADOR">ADMINISTRADOR (Acceso Total)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={newUserActive}
                  onChange={(e) => setNewUserActive(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="activeCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Activar cuenta inmediatamente
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear Usuario'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
