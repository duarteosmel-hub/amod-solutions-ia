import React from 'react';
import { MainNavTab, UserRole } from '../types';
import { LayoutDashboard, FileSpreadsheet, ShoppingBag, BarChart3, FolderTree, Bot, ShieldCheck } from 'lucide-react';

interface NavigationProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  salesCount: number;
  docsCount: number;
  userRole?: UserRole;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  salesCount,
  docsCount,
  userRole = 'ADMINISTRADOR'
}) => {
  const tabs: { id: MainNavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
    { id: 'asistente_ia', label: 'Asistente IA', icon: Bot },
    { id: 'documentos', label: 'Gestión Documental', icon: FileSpreadsheet, badge: docsCount }
  ];

  // Show "Registro de Ventas" only to ADMINISTRADOR and SECRETARIADO
  if (userRole === 'ADMINISTRADOR' || userRole === 'SECRETARIADO') {
    tabs.push({ id: 'ventas_registro', label: 'Registro de Ventas', icon: ShoppingBag });
  }

  // Show "Informes de Ventas" to all authorized roles
  tabs.push({ id: 'ventas_informes', label: 'Informes de Ventas', icon: BarChart3, badge: salesCount });

  // Only show "Explorador de Google Drive" and "Gestión de Usuarios" to ADMINISTRADOR
  if (userRole === 'ADMINISTRADOR') {
    tabs.push({ id: 'drive_explorer', label: 'Explorador de Google Drive', icon: FolderTree });
    tabs.push({ id: 'usuarios', label: 'Gestión de Usuarios', icon: ShieldCheck });
  }

  return (
    <nav className="bg-slate-800 border-b border-slate-700/80 text-white shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
