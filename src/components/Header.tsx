import React from 'react';
import { AuthUser } from '../types';
import { HardDrive, LogOut, Sparkles, AlertCircle } from 'lucide-react';
import amodLogo from '../assets/images/amod_logo_1786213502800.jpg';

interface HeaderProps {
  authUser: AuthUser;
  onConnectDrive: () => void;
  onLogoutDrive: () => void;
}

export const Header: React.FC<HeaderProps> = ({ authUser, onConnectDrive, onLogoutDrive }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Brand & App Title */}
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl overflow-hidden shadow-md bg-white p-0.5 border border-slate-700/80 flex items-center justify-center shrink-0 group hover:border-blue-500 transition-all">
            <img 
              src={amodLogo} 
              alt="Amod Solutions IA Logo" 
              className="w-full h-full object-cover rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Amod Solutions IA</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <Sparkles className="w-3 h-3 mr-1" />
                Secretariado Administrativo
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Asistente Inteligente para Organización Documental Empresarial
            </p>
          </div>
        </div>

        {/* Google Drive & User Identity Status Bar */}
        <div className="flex items-center space-x-3">
          
          {/* User Role Badge */}
          {authUser.role && (
            <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300">
              <span className="text-[10px] text-slate-400 uppercase">Rol:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                authUser.role === 'ADMINISTRADOR' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                authUser.role === 'SECRETARIADO' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                authUser.role === 'CONTABILIDAD' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                'bg-slate-700 text-slate-200'
              }`}>
                {authUser.role}
              </span>
            </div>
          )}

          {authUser.connected ? (
            <div className="flex items-center bg-slate-800/80 border border-emerald-500/40 rounded-xl px-3.5 py-1.5 shadow-xs space-x-3">
              <div className="flex items-center space-x-2 text-xs">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-medium hidden sm:inline">Google Drive:</span>
                <span className="text-slate-200 font-semibold truncate max-w-[160px]">
                  {authUser.email || authUser.name || 'Cuenta Activa'}
                </span>
              </div>
              <button
                onClick={onLogoutDrive}
                title="Cerrar sesión de Google Drive"
                className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                <span>Modo Sin Conexión a Drive</span>
              </div>
              <button
                onClick={onConnectDrive}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <HardDrive className="w-4 h-4" />
                <span>Conectar Google Drive</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
