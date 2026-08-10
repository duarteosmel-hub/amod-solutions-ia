import React, { useState, useEffect } from 'react';
import { AuthUser, DocumentAnalysis, StorageStatus, DriveSaveResult, SavedDocumentRecord, MainNavTab, SaleRecord, UserRecord, AuditLogRecord, UserRole } from './types';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { HomeDashboard } from './components/HomeDashboard';
import { DocumentUploader } from './components/DocumentUploader';
import { ClassificationCard } from './components/ClassificationCard';
import { DriveConfirmationModal } from './components/DriveConfirmationModal';
import { StatusBanner } from './components/StatusBanner';
import { DriveExplorer } from './components/DriveExplorer';
import { FolderStructureGuide } from './components/FolderStructureGuide';
import { DocumentManager } from './components/DocumentManager';
import { SalesRegister } from './components/SalesRegister';
import { SalesReports } from './components/SalesReports';
import { AIAssistantModule } from './components/AIAssistantModule';
import { UserManagement } from './components/UserManagement';
import { FileText, HardDrive, BookOpen, ShieldCheck } from 'lucide-react';

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser>({ connected: false, role: 'ADMINISTRADOR' });
  const [activeTab, setActiveTab] = useState<MainNavTab>('inicio');
  
  // Phase 9 Users & Audit Logs State
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  // Document state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<DocumentAnalysis | null>(null);
  const [lastUploadedFileData, setLastUploadedFileData] = useState<{
    fileContentBase64?: string;
    textContent?: string;
  } | null>(null);

  // Storage status state (proposal | saving | saved | error)
  const [storageStatus, setStorageStatus] = useState<StorageStatus>('proposal');
  const [saveResult, setSaveResult] = useState<DriveSaveResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

  // Saved document records list
  const [savedRecords, setSavedRecords] = useState<SavedDocumentRecord[]>([]);

  // Saved sales records list
  const [savedSales, setSavedSales] = useState<SaleRecord[]>([]);

  // Check initial OAuth status and load drive, sales, users and audit records
  useEffect(() => {
    checkAuthStatus();
    loadDriveRecords();
    loadSales();
    loadUsers();
    loadAuditLogs();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkAuthStatus();
        loadDriveRecords();
        loadSales();
        loadUsers();
        loadAuditLogs();
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setErrorMessage(`Error de autenticación con Google Drive: ${event.data.error || 'Permiso denegado'}`);
        setStorageStatus('error');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/status', {
        headers: { 'x-user-email': authUser.email || 'duarteosmel@gmail.com' }
      });
      if (res.ok) {
        const data = await res.json();
        setAuthUser(prev => ({
          ...data,
          role: prev.role || data.role || 'ADMINISTRADOR'
        }));
      }
    } catch (e) {
      console.warn('Error checking auth status:', e);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users/list');
      if (res.ok) {
        const data = await res.json();
        if (data.users) {
          setUsersList(data.users);
        }
      }
    } catch (e) {
      console.warn('Error loading users list:', e);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit/list', {
        headers: { 'x-user-email': authUser.email || 'duarteosmel@gmail.com' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.auditLogs) {
          setAuditLogs(data.auditLogs);
        }
      }
    } catch (e) {
      console.warn('Error loading audit logs:', e);
    }
  };

  const loadDriveRecords = async () => {
    try {
      const res = await fetch('/api/drive/files', {
        headers: { 'x-user-email': authUser.email || 'duarteosmel@gmail.com' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.files) {
          setSavedRecords(data.files);
        }
      }
    } catch (e) {
      console.warn('Error loading drive records:', e);
    }
  };

  const loadSales = async () => {
    try {
      const res = await fetch('/api/sales/list');
      if (res.ok) {
        const data = await res.json();
        if (data.sales) {
          setSavedSales(data.sales);
        }
      }
    } catch (e) {
      console.warn('Error loading sales:', e);
    }
  };

  const handleAddUser = async (user: Omit<UserRecord, 'id' | 'createdAt'>) => {
    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': authUser.email || 'duarteosmel@gmail.com'
      },
      body: JSON.stringify(user)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al crear el usuario.');
    }

    loadUsers();
    loadAuditLogs();
  };

  const handleChangeUserRole = async (userId: string, newRole: UserRole) => {
    const res = await fetch('/api/users/update-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': authUser.email || 'duarteosmel@gmail.com'
      },
      body: JSON.stringify({ userId, newRole })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.error || 'No se pudo actualizar el rol.');
      return;
    }

    loadUsers();
    loadAuditLogs();
  };

  const handleToggleUserStatus = async (userId: string, active: boolean) => {
    const res = await fetch('/api/users/toggle-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': authUser.email || 'duarteosmel@gmail.com'
      },
      body: JSON.stringify({ userId, active })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.error || 'No se pudo modificar el estado del usuario.');
      return;
    }

    loadUsers();
    loadAuditLogs();
  };

  const handleSimulateRoleChange = (role: UserRole) => {
    setAuthUser(prev => ({ ...prev, role }));
    if (role !== 'ADMINISTRADOR' && (activeTab === 'usuarios' || activeTab === 'drive_explorer')) {
      setActiveTab('inicio');
    }
    if ((role === 'CONTABILIDAD' || role === 'CONSULTA') && activeTab === 'ventas_registro') {
      setActiveTab('inicio');
    }
  };

  const handleConnectDrive = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();

      if (!res.ok || !data.url) {
        alert(data.error || 'Las credenciales de Google OAuth (GOOGLE_CLIENT_ID) no están configuradas.');
        return;
      }

      const authWindow = window.open(data.url, 'google_drive_oauth', 'width=600,height=700');
      if (!authWindow) {
        alert('Por favor permita las ventanas emergentes (popups) en su navegador para iniciar sesión con Google.');
      }
    } catch (err) {
      console.error('Connection error:', err);
      alert('Error al iniciar la autenticación con Google Drive.');
    }
  };

  const handleLogoutDrive = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuthUser({ connected: false });
    } catch (e) {
      console.warn('Logout error:', e);
    }
  };

  // Analyze document with Gemini AI
  const handleAnalyzeFile = async (fileData: {
    fileName: string;
    fileType: string;
    fileContentBase64?: string;
    textContent?: string;
  }) => {
    setIsAnalyzing(true);
    setCurrentAnalysis(null);
    setStorageStatus('proposal');
    setSaveResult(null);
    setErrorMessage(null);
    setLastUploadedFileData({
      fileContentBase64: fileData.fileContentBase64,
      textContent: fileData.textContent
    });

    try {
      const res = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileData)
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Error al procesar el archivo con la Inteligencia Artificial.');
      }

      const analysisData: DocumentAnalysis = await res.json();
      setCurrentAnalysis(analysisData);
      setStorageStatus('proposal');
    } catch (err: any) {
      console.error('Analyze file error:', err);
      setErrorMessage(err.message || 'Ocurrió un error inesperado al analizar el documento.');
      setStorageStatus('error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProceedToSave = () => {
    if (!currentAnalysis) return;
    setIsConfirmationModalOpen(true);
  };

  const handleConfirmSaveDrive = async (overwriteAction: 'none' | 'rename' | 'overwrite') => {
    if (!currentAnalysis) return;

    setIsSaving(true);
    setStorageStatus('saving');
    setIsConfirmationModalOpen(false);

    try {
      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: currentAnalysis,
          fileContentBase64: lastUploadedFileData?.fileContentBase64,
          textContent: lastUploadedFileData?.textContent,
          fileName: currentAnalysis.recommendedFileName,
          targetPath: `EMPRESA/${currentAnalysis.recommendedFolder}/${currentAnalysis.recommendedSubfolder}`,
          overwriteAction
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStorageStatus('error');
        setErrorMessage(data.error || 'Google Drive rechazó la operación.');
        setSaveResult(null);
      } else {
        setStorageStatus('saved');
        setSaveResult(data.driveResult);
        if (data.savedRecord) {
          setSavedRecords((prev) => [data.savedRecord, ...prev]);
        }
      }
    } catch (err: any) {
      console.error('Drive save error:', err);
      setStorageStatus('error');
      setErrorMessage(`No se pudo completar el guardado en Google Drive: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setCurrentAnalysis(null);
    setStorageStatus('proposal');
    setSaveResult(null);
    setErrorMessage(null);
  };

  const handleSaleSavedSuccessfully = (newSale: SaleRecord) => {
    setSavedSales((prev) => [newSale, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      {/* Top Header */}
      <Header
        authUser={authUser}
        onConnectDrive={handleConnectDrive}
        onLogoutDrive={handleLogoutDrive}
      />

      {/* Main Tab Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        salesCount={savedSales.length}
        docsCount={savedRecords.length}
        userRole={authUser.role}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Tab 1: Inicio / Dashboard */}
        {activeTab === 'inicio' && (
          <HomeDashboard
            onSelectTab={setActiveTab}
            authUser={authUser}
            onConnectDrive={handleConnectDrive}
            docsCount={savedRecords.length}
            salesCount={savedSales.length}
            savedRecords={savedRecords}
            savedSales={savedSales}
          />
        )}

        {/* Tab: Asistente Administrativo IA */}
        {activeTab === 'asistente_ia' && (
          <AIAssistantModule
            salesRecords={savedSales}
            savedRecords={savedRecords}
          />
        )}

        {/* Tab 2: Gestión Documental */}
        {activeTab === 'documentos' && (
          <DocumentManager
            authUser={authUser}
            onConnectDrive={handleConnectDrive}
            savedRecords={savedRecords}
            onDocumentSaved={(newRecord) => {
              setSavedRecords((prev) => [newRecord, ...prev]);
            }}
          />
        )}

        {/* Tab 3: Registro de Ventas */}
        {activeTab === 'ventas_registro' && (authUser.role === 'ADMINISTRADOR' || authUser.role === 'SECRETARIADO') && (
          <SalesRegister
            authUser={authUser}
            onConnectDrive={handleConnectDrive}
            savedSales={savedSales}
            onSaleSavedSuccessfully={handleSaleSavedSuccessfully}
          />
        )}

        {/* Tab 4: Informes de Ventas */}
        {activeTab === 'ventas_informes' && (
          <SalesReports
            sales={savedSales}
            authUser={authUser}
            onConnectDrive={handleConnectDrive}
          />
        )}

        {/* Tab 5: Explorador de Google Drive y Manual */}
        {activeTab === 'drive_explorer' && authUser.role === 'ADMINISTRADOR' && (
          <div className="space-y-6">
            <DriveExplorer savedRecords={savedRecords} />
            <FolderStructureGuide />
          </div>
        )}

        {/* Tab 6: Gestión de Usuarios y Seguridad */}
        {activeTab === 'usuarios' && authUser.role === 'ADMINISTRADOR' && (
          <UserManagement
            authUser={authUser}
            users={usersList}
            auditLogs={auditLogs}
            onAddUser={handleAddUser}
            onChangeUserRole={handleChangeUserRole}
            onToggleUserStatus={handleToggleUserStatus}
            onRefreshData={() => {
              loadUsers();
              loadAuditLogs();
            }}
            onSimulateRoleChange={handleSimulateRoleChange}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Amod Solutions IA • Secretariado Administrativo y Gestión Empresarial</span>
          <span className="font-mono text-[11px] text-slate-400">
            Archivos en Google Drive: EMPRESA/03_VENTAS/ y Categorías Oficiales
          </span>
        </div>
      </footer>
    </div>
  );
}

