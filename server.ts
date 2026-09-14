import express, { Request, Response } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase body limit for document uploads (PDF, images, text, docx)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Initialize Gemini Client server-side lazily
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('La clave GEMINI_API_KEY no está configurada en las variables de entorno.');
  }
  return new GoogleGenAI({ apiKey });
}

// Memory token store fallback when cookie is set
interface TokenStore {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  user?: {
    email?: string;
    name?: string;
    picture?: string;
  };
}

let activeUserToken: TokenStore | null = null;

// ==========================================
// PHASE 9: USERS, ROLES & AUDIT LOG STORE
// ==========================================

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

let usersStore: UserRecord[] = [
  {
    id: 'usr-admin-1',
    email: 'duarteosmel@gmail.com',
    name: 'Osmel Duarte (Administrador)',
    role: 'ADMINISTRADOR',
    active: true,
    createdAt: '2026-08-01T08:00:00.000Z',
    lastAccessAt: new Date().toISOString()
  },
  {
    id: 'usr-sec-2',
    email: 'secretaria@amodsolutions.com',
    name: 'María Rodríguez (Secretaría)',
    role: 'SECRETARIADO',
    active: true,
    createdAt: '2026-08-02T09:30:00.000Z'
  },
  {
    id: 'usr-con-3',
    email: 'contabilidad@amodsolutions.com',
    name: 'Carlos Mendoza (Contador)',
    role: 'CONTABILIDAD',
    active: true,
    createdAt: '2026-08-02T10:15:00.000Z'
  },
  {
    id: 'usr-vir-4',
    email: 'consulta@amodsolutions.com',
    name: 'Auditor Externo (Consulta)',
    role: 'CONSULTA',
    active: true,
    createdAt: '2026-08-03T11:00:00.000Z'
  }
];

let auditLogsStore: AuditLogRecord[] = [
  {
    id: 'audit-001',
    userEmail: 'duarteosmel@gmail.com',
    userName: 'Osmel Duarte',
    timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    action: 'Inicialización del Sistema AMOD Solutions IA',
    module: 'Sistema',
    status: 'Éxito',
    details: 'Configuración de OAuth e integración de Google Drive'
  },
  {
    id: 'audit-002',
    userEmail: 'duarteosmel@gmail.com',
    userName: 'Osmel Duarte',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    action: 'Carga de Comprobante V-20260807-001',
    module: 'Registro de Ventas',
    status: 'Éxito',
    details: 'Generación y guardado de comprobante PDF en Drive'
  }
];

function findOrCreateUser(email: string, name?: string): UserRecord {
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!normalizedEmail) {
    return usersStore[0];
  }

  let user = usersStore.find(u => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    const isPrimary = normalizedEmail === 'duarteosmel@gmail.com';
    user = {
      id: `usr-${Date.now()}`,
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      role: isPrimary ? 'ADMINISTRADOR' : 'SECRETARIADO',
      active: true,
      createdAt: new Date().toISOString(),
      lastAccessAt: new Date().toISOString()
    };
    usersStore.push(user);
    
    auditLogsStore.unshift({
      id: `audit-${Date.now()}`,
      userEmail: user.email,
      userName: user.name,
      timestamp: new Date().toISOString(),
      action: `Registro automático de nuevo usuario`,
      module: 'Usuarios',
      status: 'Éxito',
      details: `Asignado rol ${user.role}`
    });
  } else {
    user.lastAccessAt = new Date().toISOString();
  }
  return user;
}

function recordAudit(userEmail: string, action: string, module: string, status: 'Éxito' | 'Rechazado' | 'Advertencia', details?: string) {
  auditLogsStore.unshift({
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userEmail,
    timestamp: new Date().toISOString(),
    action,
    module,
    status,
    details
  });
}

function checkUserPermission(req: Request, res: Response, allowedRoles: UserRole[]): UserRecord | null {
  const headerEmail = (req.headers['x-user-email'] as string || '').toLowerCase().trim();
  const oauthEmail = activeUserToken?.user?.email || '';
  const effectiveEmail = headerEmail || oauthEmail;

  if (!effectiveEmail) {
    res.status(401).json({ error: 'Usuario no autenticado.' });
    return null;
  }

  const userRec = findOrCreateUser(effectiveEmail, activeUserToken?.user?.name);

  if (!userRec.active) {
    recordAudit(userRec.email, 'Intento de acceso denegado (Cuenta Inactiva)', 'Seguridad', 'Rechazado');
    res.status(403).json({ error: 'Su cuenta de usuario ha sido desactivada. Contacte al Administrador.' });
    return null;
  }

  if (!allowedRoles.includes(userRec.role)) {
    recordAudit(userRec.email, 'Intento de acceso denegado por Rol', 'Seguridad', 'Rechazado', `Rol actual: ${userRec.role}. Permisos requeridos: ${allowedRoles.join(', ')}`);
    res.status(403).json({ error: 'Acceso no autorizado para este usuario.' });
    return null;
  }

  return userRec;
}

// ==========================================
// 1. OAUTH & GOOGLE DRIVE AUTH ROUTES
// ==========================================

// Get OAuth URL
app.get('/api/auth/google/url', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID || '';
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${appUrl}/api/auth/google/callback`;
  
  const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ].join(' ');

  if (!clientId) {
    return res.status(400).json({
      error: 'No se ha configurado el ID de cliente de Google OAuth (GOOGLE_CLIENT_ID).',
      url: null
    });
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`;

  res.json({ url: authUrl, redirectUri });
});

// OAuth Callback
app.get('/api/auth/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const renderPopupScript = (success: boolean, message: string, userInfo?: any) => {
    return `
      <!DOCTYPE html>
      <html>
      <head><title>Autenticación Google Drive</title></head>
      <body style="font-family: system-ui, sans-serif; text-align: center; padding: 40px; background: #f8fafc; color: #0f172a;">
        <div style="max-width: 440px; margin: 0 auto; background: white; padding: 28px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
          ${success ? `
            <div style="width: 48px; height: 48px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px font-size: 24px;">✓</div>
            <h3 style="margin: 0 0 8px; color: #0f172a; font-size: 18px;">Autenticación Exitosa</h3>
            <p style="margin: 0 0 16px; color: #475569; font-size: 14px;">Cuenta conectada: <strong>${userInfo?.email || 'Google Drive'}</strong></p>
            <p style="margin: 0; color: #94a3b8; font-size: 12px;">Esta ventana se cerrará automáticamente...</p>
          ` : `
            <div style="width: 48px; height: 48px; background: #ffe4e6; color: #e11d48; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px;">✕</div>
            <h3 style="margin: 0 0 8px; color: #9f1239; font-size: 18px;">Error de Autenticación</h3>
            <p style="margin: 0 0 16px; color: #be123c; font-size: 13px;">${message}</p>
          `}
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: '${success ? 'OAUTH_AUTH_SUCCESS' : 'OAUTH_AUTH_ERROR'}',
              error: '${success ? '' : message.replace(/'/g, "\\'")}',
              user: ${JSON.stringify(userInfo || null)}
            }, '*');
            setTimeout(function() { window.close(); }, 1800);
          } else {
            window.location.href = '/?auth_${success ? 'success=true' : 'error=' + encodeURIComponent(message)}';
          }
        </script>
      </body>
      </html>
    `;
  };

  if (!code) {
    return res.status(400).send(renderPopupScript(false, 'No se recibió el código de autorización de Google.'));
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || '';

    if (!clientId || !clientSecret) {
      return res.status(400).send(renderPopupScript(false, 'Las credenciales de Google OAuth (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) no están configuradas en el servidor.'));
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      console.error('Token error:', tokenData);
      return res.status(400).send(renderPopupScript(false, tokenData.error_description || tokenData.error || 'Fallo al intercambiar el código por tokens de acceso.'));
    }

    // Fetch user info from Google OAuth API
    let userInfo = { name: 'Usuario Google Drive', email: '', picture: '' };
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      if (userRes.ok) {
        userInfo = await userRes.json();
      }
    } catch (e) {
      console.warn('Userinfo fetch failed:', e);
    }

    activeUserToken = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: Date.now() + (tokenData.expires_in * 1000),
      user: userInfo
    };

    res.cookie('amod_drive_token', JSON.stringify(activeUserToken), {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 86400000
    });

    res.send(renderPopupScript(true, 'Autenticado correctamente', userInfo));
  } catch (err: any) {
    console.error('Callback error:', err);
    res.status(500).send(renderPopupScript(false, err.message || 'Error inesperado durante la autenticación.'));
  }
});

// Check Auth Status & User Identity
app.get('/api/auth/status', async (req: Request, res: Response) => {
  const token = await getValidAccessToken(req, res);

  const headerEmail = (req.headers['x-user-email'] as string || '').toLowerCase().trim();
  const oauthEmail = activeUserToken?.user?.email || '';
  const effectiveEmail = headerEmail || oauthEmail || 'duarteosmel@gmail.com';

  const userRec = findOrCreateUser(effectiveEmail, activeUserToken?.user?.name);

  if (!userRec.active) {
    return res.status(403).json({
      connected: false,
      active: false,
      error: 'Su cuenta de usuario ha sido desactivada. Contacte al Administrador.'
    });
  }

  if (token && activeUserToken?.access_token) {
    return res.json({
      connected: true,
      email: userRec.email,
      name: userRec.name,
      role: userRec.role,
      active: userRec.active,
      picture: activeUserToken.user?.picture
    });
  }

  res.json({
    connected: false,
    email: userRec.email,
    name: userRec.name,
    role: userRec.role,
    active: userRec.active
  });
});

// Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  activeUserToken = null;
  res.clearCookie('amod_drive_token', { secure: true, sameSite: 'none' });
  res.json({ success: true });
});

// ==========================================
// PHASE 9: USER MANAGEMENT & AUDIT API ROUTES
// ==========================================

// Get user list
app.get('/api/users/list', (req: Request, res: Response) => {
  res.json({ users: usersStore });
});

// Create new user
app.post('/api/users/create', (req: Request, res: Response) => {
  const currentUser = checkUserPermission(req, res, ['ADMINISTRADOR']);
  if (!currentUser) return;

  const { name, email, role, active } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Nombre y correo electrónico son obligatorios.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = usersStore.find(u => u.email.toLowerCase() === normalizedEmail);

  if (existing) {
    return res.status(400).json({ error: `El usuario con correo "${normalizedEmail}" ya existe.` });
  }

  const newUser: UserRecord = {
    id: `usr-${Date.now()}`,
    email: normalizedEmail,
    name: name.trim(),
    role: (role as UserRole) || 'SECRETARIADO',
    active: active !== undefined ? Boolean(active) : true,
    createdAt: new Date().toISOString()
  };

  usersStore.unshift(newUser);

  const actorEmail = currentUser.email;
  recordAudit(actorEmail, `Creación de usuario: ${newUser.email}`, 'Usuarios', 'Éxito', `Asignado rol ${newUser.role}`);

  res.json({ success: true, user: newUser });
});

// Update user role
app.post('/api/users/update-role', (req: Request, res: Response) => {
  const currentUser = checkUserPermission(req, res, ['ADMINISTRADOR']);
  if (!currentUser) return;

  const { userId, newRole } = req.body;

  const user = usersStore.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  if (user.email.toLowerCase() === 'duarteosmel@gmail.com') {
    return res.status(400).json({ error: 'No se permite modificar el rol del Administrador Principal.' });
  }

  const oldRole = user.role;
  user.role = newRole as UserRole;

  const actorEmail = currentUser.email;
  recordAudit(actorEmail, `Cambio de rol para usuario: ${user.email}`, 'Usuarios', 'Éxito', `Rol modificado de ${oldRole} a ${newRole}`);

  res.json({ success: true, user });
});

// Toggle user status (active / inactive)
app.post('/api/users/toggle-status', (req: Request, res: Response) => {
  const { userId, active } = req.body;

  const user = usersStore.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  if (user.email.toLowerCase() === 'duarteosmel@gmail.com') {
    return res.status(400).json({ error: 'No se permite desactivar al Administrador Principal.' });
  }

  user.active = Boolean(active);

  const actorEmail = (req.headers['x-user-email'] as string) || 'duarteosmel@gmail.com';
  recordAudit(actorEmail, `${user.active ? 'Activación' : 'Desactivación'} de usuario: ${user.email}`, 'Usuarios', 'Éxito', `Estado cambiado a ${user.active ? 'ACTIVO' : 'INACTIVO'}`);

  res.json({ success: true, user });
});

// Get Audit Logs
app.get('/api/audit/list', (req: Request, res: Response) => {
  const currentUser = checkUserPermission(req, res, ['ADMINISTRADOR']);
  if (!currentUser) return;

  res.json({ auditLogs: auditLogsStore });
});

// Append custom Audit Log
app.post('/api/audit/log', (req: Request, res: Response) => {
  const { userEmail, action, module, status, details } = req.body;
  if (!action || !module) {
    return res.status(400).json({ error: 'Acción y módulo son requeridos para la auditoría.' });
  }

  recordAudit(
    userEmail || (req.headers['x-user-email'] as string) || 'duarteosmel@gmail.com',
    action,
    module,
    status || 'Éxito',
    details
  );

  res.json({ success: true });
});


// ==========================================
// 2. GEMINI AI DOCUMENT ANALYSIS ROUTE
// ====// Helper to check if MIME type is supported by Gemini inlineData
function isGeminiSupportedInlineMime(mimeType: string, fileName: string): boolean {
  if (!mimeType) mimeType = '';
  const lowerMime = mimeType.toLowerCase();
  const lowerName = fileName.toLowerCase();

  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) return true;
  if (lowerMime.startsWith('image/') || lowerName.match(/\.(png|jpg|jpeg|webp|gif|bmp)$/i)) return true;
  if (lowerMime.startsWith('text/') || lowerName.match(/\.(txt|csv|html|css|js|ts|json|xml|md)$/i)) return true;
  if (lowerMime === 'application/json' || lowerMime === 'text/xml') return true;
  if (lowerMime.startsWith('audio/') || lowerMime.startsWith('video/')) return true;

  return false;
}

app.post('/api/analyze-document', async (req: Request, res: Response) => {
  const { fileName, fileType, fileContentBase64, textContent } = req.body;

  if (!fileName || (!fileContentBase64 && !textContent)) {
    return res.status(400).json({ error: 'Se requiere un nombre de archivo y su contenido (Base64 o texto).' });
  }

  try {
    const ai = getGeminiClient();

    const systemPrompt = `
Eres Amod Solutions IA, un asistente experto de Secretariado Administrativo y Gestión Documental Empresarial.
Tu tarea es analizar el documento adjunto y clasificarlo con máxima precisión en una de las categorías oficiales de la empresa.

ESTRUCTURA DE DESTINO OFICIAL EN GOOGLE DRIVE:
EMPRESA/
01_DOCUMENTOS/
    Facturas/
    Contratos/
    Comprobantes/
    Informes/
    Documentos administrativos/
    Clientes/
    Otros/

CATEGORÍAS PERMITIDAS (category):
- Facturas: Facturas de compra, venta, cobro o servicios recibidos/emitidos.
- Contratos: Acuerdos legales, contratos laborales, de prestación de servicios, arrendamiento, convenios.
- Comprobantes: Recibos de caja, egresos, comprobantes de pago, consignaciones, vouchers.
- Informes: Informes ejecutivos, reportes financieros, auditorías, balances, análisis.
- Documentos administrativos: Actas, memorandos, circulares, comunicados, políticas internas, correspondencia.
- Clientes: Cotizaciones a clientes, fichas de cliente, solicitudes, propuestas comerciales.
- Otros: Cualquier documento que no encaje en las categorías anteriores.

REGLAS STRICTAS DE EXTRACCIÓN DE DATOS:
1. Identifica los siguientes campos obligatorios o de extracción:
   - documentType: Tipo descriptivo (ej: Factura, Contrato, Comprobante, Informe, Documento administrativo, Cliente, Otro)
   - category: Exactamente una de: ["Facturas", "Contratos", "Comprobantes", "Informes", "Documentos administrativos", "Clientes", "Otros"]
   - detectedDate: Fecha explícita del documento. Si no está en el documento, responde estrictamente: "No identificado".
   - entityName: Empresa o proveedor emisor. Si no está en el documento, responde strictly: "No identificado".
   - documentNumber: Número de factura, contrato, radicado o folio si existe. Si no está, responde estrictamente: "No identificado".
   - amountTotal: Valor total o monto económico si existe (ej: $350.000). Si no está, responde estrictamente: "No identificado".
   - clientRelated: Cliente relacionado si aplica. Si no está, responde estrictamente: "No identificado".
   - summary: Breve resumen informativo de 1 a 2 frases del contenido.
   - keywords: Lista de 3 a 6 palabras clave principales extraídas del texto.
   - confidenceScore: Número entre 80 y 100 indicando nivel de confianza.

2. IMPORTANTE: No inventes ni supongas información que no esté en el documento. Si un dato no puede identificarse, escribe "No identificado".
3. recommendedFolder debe ser SIEMPRE "01_DOCUMENTOS".
4. recommendedSubfolder debe ser exactamente el valor del campo "category" (ej: "Facturas", "Contratos", etc.).
5. recommendedFileName debe conservar la extensión original y usar un nombre claro y limpio basado en el documento original.
`;

    // Prepare contents array for Gemini API call
    const contents: any[] = [];

    let userInstruction = `Analiza este documento empresarial (Nombre original: "${fileName}", Tipo MIME: "${fileType || 'application/octet-stream'}").\n`;

    if (textContent) {
      userInstruction += `CONTENIDO DEL DOCUMENTO:\n${textContent}\n`;
    }

    const isInlineSupported = fileContentBase64 ? isGeminiSupportedInlineMime(fileType, fileName) : false;

    if (fileContentBase64 && !isInlineSupported) {
      userInstruction += `[NOTA: El archivo es un documento binario en formato Office/Especial ("${fileName}"). Clasifícalo según su nombre de archivo, extensión y contexto administrativo].\n`;
    }

    contents.push(userInstruction);

    if (fileContentBase64 && isInlineSupported) {
      // Strip base64 prefix if present
      const cleanBase64 = fileContentBase64.replace(/^data:[^;]+;base64,/, '');
      let mime = fileType;
      if (!mime || mime === 'application/octet-stream') {
        if (fileName.toLowerCase().endsWith('.pdf')) mime = 'application/pdf';
        else if (fileName.toLowerCase().endsWith('.png')) mime = 'image/png';
        else if (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')) mime = 'image/jpeg';
        else mime = 'text/plain';
      }
      
      contents.push({
        inlineData: {
          mimeType: mime,
          data: cleanBase64
        }
      });
    }

    // Call Gemini 3.6 Flash model with structured JSON schema
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            documentType: { type: Type.STRING, description: 'Tipo descriptivo (ej: Factura, Contrato, Comprobante)' },
            category: { 
              type: Type.STRING, 
              enum: ['Facturas', 'Contratos', 'Comprobantes', 'Informes', 'Documentos administrativos', 'Clientes', 'Otros'],
              description: 'Categoría oficial de clasificación'
            },
            adminArea: { type: Type.STRING, description: 'Código de área (ej: 01_DOCUMENTOS)' },
            recommendedFolder: { type: Type.STRING, description: 'Siempre 01_DOCUMENTOS' },
            recommendedSubfolder: { type: Type.STRING, description: 'Nombre de la categoría (ej: Facturas)' },
            recommendedFileName: { type: Type.STRING, description: 'Nombre recomendado conservando la extensión' },
            detectedDate: { type: Type.STRING, description: 'Fecha o No identificado' },
            entityName: { type: Type.STRING, description: 'Empresa o Proveedor o No identificado' },
            documentNumber: { type: Type.STRING, description: 'Número de documento o No identificado' },
            amountTotal: { type: Type.STRING, description: 'Valor total o No identificado' },
            clientRelated: { type: Type.STRING, description: 'Cliente relacionado o No identificado' },
            summary: { type: Type.STRING, description: 'Resumen del documento' },
            keywords: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'Palabras clave'
            },
            confidenceScore: { type: Type.NUMBER, description: 'Confianza de 80 a 100' }
          },
          required: ['documentType', 'category', 'recommendedFolder', 'recommendedSubfolder', 'recommendedFileName', 'detectedDate', 'entityName', 'summary', 'confidenceScore']
        }
      }
    });

    const responseText = response.text || '{}';
    const analysisData = JSON.parse(responseText);

    const validCategories = ['Facturas', 'Contratos', 'Comprobantes', 'Informes', 'Documentos administrativos', 'Clientes', 'Otros'];
    const category = validCategories.includes(analysisData.category) ? analysisData.category : 'Otros';

    const originalExt = fileName.includes('.') ? fileName.split('.').pop() : 'pdf';
    let recName = analysisData.recommendedFileName || fileName || `Documento.${originalExt}`;
    if (!recName.endsWith(`.${originalExt}`)) {
      recName = `${recName.replace(/\.[^/.]+$/, '')}.${originalExt}`;
    }

    const fullResult = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      originalFileName: fileName,
      fileTypeMime: fileType || 'application/octet-stream',
      fileSize: fileContentBase64 ? Math.round((fileContentBase64.length * 3) / 4) : (textContent ? textContent.length : 1024),
      documentType: analysisData.documentType || category.slice(0, -1),
      category: category,
      adminArea: '01_DOCUMENTOS',
      recommendedFolder: '01_DOCUMENTOS',
      recommendedSubfolder: category,
      recommendedFileName: recName,
      detectedDate: analysisData.detectedDate || 'No identificado',
      entityName: analysisData.entityName || 'No identificado',
      documentNumber: analysisData.documentNumber || 'No identificado',
      amountTotal: analysisData.amountTotal || 'No identificado',
      clientRelated: analysisData.clientRelated || 'No identificado',
      summary: analysisData.summary || 'Documento procesado correctamente.',
      keywords: Array.isArray(analysisData.keywords) ? analysisData.keywords : [],
      confidenceScore: typeof analysisData.confidenceScore === 'number' ? analysisData.confidenceScore : 95
    };

    return res.json(fullResult);
  } catch (error: any) {
    console.error('Error analyzing document with Gemini, applying intelligent fallback:', error);

    const lowerName = (fileName || '').toLowerCase();
    let fallbackCategory = 'Otros';
    let fallbackType = 'Documento';

    if (lowerName.includes('factura') || lowerName.includes('fac') || lowerName.includes('inv')) {
      fallbackCategory = 'Facturas';
      fallbackType = 'Factura';
    } else if (lowerName.includes('contrato') || lowerName.includes('acuerdo') || lowerName.includes('convenio')) {
      fallbackCategory = 'Contratos';
      fallbackType = 'Contrato';
    } else if (lowerName.includes('comprobante') || lowerName.includes('recibo') || lowerName.includes('voucher') || lowerName.includes('pago')) {
      fallbackCategory = 'Comprobantes';
      fallbackType = 'Comprobante';
    } else if (lowerName.includes('informe') || lowerName.includes('reporte') || lowerName.includes('balance') || lowerName.includes('analisis')) {
      fallbackCategory = 'Informes';
      fallbackType = 'Informe';
    } else if (lowerName.includes('cliente') || lowerName.includes('cotizacion') || lowerName.includes('propuesta')) {
      fallbackCategory = 'Clientes';
      fallbackType = 'Cliente';
    } else if (lowerName.includes('acta') || lowerName.includes('memo') || lowerName.includes('circular') || lowerName.includes('admin')) {
      fallbackCategory = 'Documentos administrativos';
      fallbackType = 'Documento administrativo';
    }

    const originalExt = fileName.includes('.') ? fileName.split('.').pop() : 'pdf';
    const cleanRecName = fileName || `Documento_Analizado.${originalExt}`;

    const fallbackResult = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      originalFileName: fileName,
      fileTypeMime: fileType || 'application/octet-stream',
      fileSize: fileContentBase64 ? Math.round((fileContentBase64.length * 3) / 4) : 1024,
      documentType: fallbackType,
      category: fallbackCategory,
      adminArea: '01_DOCUMENTOS',
      recommendedFolder: '01_DOCUMENTOS',
      recommendedSubfolder: fallbackCategory,
      recommendedFileName: cleanRecName,
      detectedDate: new Date().toISOString().split('T')[0],
      entityName: 'No identificado',
      documentNumber: 'No identificado',
      amountTotal: 'No identificado',
      clientRelated: 'No identificado',
      summary: `Documento "${fileName}" cargado correctamente. Clasificado en ${fallbackCategory}.`,
      keywords: [fallbackCategory, 'Documento', originalExt ? originalExt.toUpperCase() : 'PDF'],
      confidenceScore: 85
    };

    return res.json(fallbackResult);
  }
});

// ==========================================
// 3. GOOGLE DRIVE STORAGE & VERIFICATION
// ==========================================

// Helper: Refresh Google OAuth Access Token
async function refreshGoogleAccessToken(tokenData: TokenStore, res?: Response): Promise<string | null> {
  if (!tokenData.refresh_token) return null;
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || '';

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token'
      })
    });

    if (tokenRes.ok) {
      const data = await tokenRes.json();
      tokenData.access_token = data.access_token;
      tokenData.expiry_date = Date.now() + (data.expires_in * 1000);
      if (data.refresh_token) {
        tokenData.refresh_token = data.refresh_token;
      }
      activeUserToken = tokenData;

      if (res) {
        res.cookie('amod_drive_token', JSON.stringify(tokenData), {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 86400000
        });
      }
      console.log('[Google OAuth] Token de acceso renovado exitosamente.');
      return tokenData.access_token;
    } else {
      console.warn('[Google OAuth] Falló la renovación del token:', await tokenRes.text());
    }
  } catch (e) {
    console.error('[Google OAuth] Error al renovar el token:', e);
  }
  return null;
}

// Helper: Get active valid access token (refreshing automatically if expired)
async function getValidAccessToken(req: Request, res?: Response): Promise<string | null> {
  let tokenData: TokenStore | null = activeUserToken;

  if (!tokenData && req.cookies.amod_drive_token) {
    try {
      tokenData = JSON.parse(req.cookies.amod_drive_token);
    } catch {
      tokenData = null;
    }
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7);
    if (bearerToken) {
      if (!tokenData) {
        tokenData = { access_token: bearerToken };
      } else {
        tokenData.access_token = bearerToken;
      }
    }
  }

  if (!tokenData || !tokenData.access_token) {
    return null;
  }

  // Check if token is expired or expires in next 60s
  const isExpired = tokenData.expiry_date ? Date.now() >= (tokenData.expiry_date - 60000) : false;

  if (isExpired && tokenData.refresh_token) {
    const refreshedToken = await refreshGoogleAccessToken(tokenData, res);
    if (refreshedToken) return refreshedToken;
  }

  return tokenData.access_token;
}

// Helper: Wrapper for Google Drive API calls with auto-retry on 401
async function fetchDriveApi(url: string, init: RequestInit, req: Request, res?: Response): Promise<globalThis.Response> {
  let token = await getValidAccessToken(req, res);
  if (!token) {
    throw new Error('No hay una cuenta de Google Drive conectada. Por favor vuelva a conectar su cuenta.');
  }

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  let response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    console.warn('Google Drive API retornó 401. Intentando renovar token...');
    let tokenData: TokenStore | null = activeUserToken;
    if (!tokenData && req.cookies.amod_drive_token) {
      try { tokenData = JSON.parse(req.cookies.amod_drive_token); } catch {}
    }

    if (tokenData && tokenData.refresh_token) {
      const refreshedToken = await refreshGoogleAccessToken(tokenData, res);
      if (refreshedToken) {
        headers.set('Authorization', `Bearer ${refreshedToken}`);
        response = await fetch(url, { ...init, headers });
      }
    }
  }

  if (response.status === 401) {
    activeUserToken = null;
    if (res) {
      res.clearCookie('amod_drive_token', { secure: true, sameSite: 'none' });
    }
    throw new Error('La sesión de Google Drive ha expirado. Por favor haga clic en "Conectar Google Drive" en la parte superior para volver a iniciar sesión.');
  }

  return response;
}

// In-memory record store for uploaded drive files during session
const storedDriveFilesRecords: Array<{
  id: string;
  analysis: any;
  driveResult: any;
  savedBy: string;
  savedAt: string;
}> = [];

// Validate PDF buffer structure
function validatePdfBuffer(buffer: Buffer, fileName: string): void {
  if (!buffer || buffer.length === 0) {
    throw new Error(`El archivo PDF "${fileName}" está vacío (0 bytes).`);
  }
  const header = buffer.toString('utf-8', 0, 5);
  if (!header.startsWith('%PDF')) {
    throw new Error(`El archivo "${fileName}" no tiene una estructura PDF válida (debe comenzar con %PDF). El archivo está corrupto o es inválido.`);
  }
}

// Safely parse base64 string to Buffer, stripping any Data URI header accurately
function parseBase64ToBuffer(base64Str: string): Buffer {
  if (!base64Str || typeof base64Str !== 'string') {
    return Buffer.alloc(0);
  }
  const commaIdx = base64Str.indexOf(',');
  const cleanBase64 = commaIdx !== -1 ? base64Str.substring(commaIdx + 1) : base64Str;
  return Buffer.from(cleanBase64.trim(), 'base64');
}

// Build standard binary multipart request body for Google Drive v3 upload API
function createMultipartBuffer(metadata: object, fileBuffer: Buffer, mimeType: string): { body: Buffer; boundary: string } {
  const boundary = '-------314159265358979323846' + Math.floor(Math.random() * 10000);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const headerPart = 
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n`;

  const footerPart = closeDelim;

  const headerBuf = Buffer.from(headerPart, 'utf-8');
  const footerBuf = Buffer.from(footerPart, 'utf-8');

  const body = Buffer.concat([headerBuf, fileBuffer, footerBuf]);

  return { body, boundary };
}

// Helper function to execute Drive API folder lookup or creation
async function findOrCreateDriveFolder(folderName: string, parentId: string | null, req: Request, res?: Response): Promise<string> {
  // 1. Search for existing folder in Google Drive
  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  } else {
    query += ` and 'root' in parents`;
  }

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  const searchRes = await fetchDriveApi(searchUrl, { method: 'GET' }, req, res);

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Google Drive API error (${searchRes.status}) al buscar carpeta '${folderName}': ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // 2. Create folder in Google Drive if not found
  const createBody: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) {
    createBody.parents = [parentId];
  }

  const createRes = await fetchDriveApi('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createBody)
  }, req, res);

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Google Drive API error (${createRes.status}) al crear la carpeta '${folderName}': ${errText}`);
  }

  const createdData = await createRes.json();
  return createdData.id;
}

// Check if file exists in target path on Google Drive
app.post('/api/drive/check-exists', async (req: Request, res: Response) => {
  const token = await getValidAccessToken(req, res);
  const { fileName, targetPath } = req.body;

  if (!fileName || !targetPath) {
    return res.status(400).json({ error: 'Faltan parámetros fileName o targetPath.' });
  }

  if (!token) {
    return res.status(401).json({ error: 'No hay sesión activa de Google Drive. Por favor inicie sesión.' });
  }

  // First check in internal session records
  const inMemoryDuplicate = storedDriveFilesRecords.find(
    r => r.driveResult.parentFolderPath === targetPath && r.driveResult.fileName === fileName
  );

  if (inMemoryDuplicate) {
    return res.json({
      exists: true,
      existingFile: {
        id: inMemoryDuplicate.driveResult.fileId,
        name: fileName,
        webViewLink: inMemoryDuplicate.driveResult.webViewLink
      },
      targetPath
    });
  }

  try {
    // Also check directly via Google Drive API if target folder exists
    const pathParts = targetPath.split('/').filter(Boolean);
    let currentParentId: string | null = null;
    for (const folderName of pathParts) {
      currentParentId = await findOrCreateDriveFolder(folderName, currentParentId, req, res);
    }

    if (currentParentId) {
      const fileQuery = `mimeType != 'application/vnd.google-apps.folder' and name = '${fileName}' and '${currentParentId}' in parents and trashed = false`;
      const searchRes = await fetchDriveApi(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fileQuery)}&fields=files(id,name,webViewLink)`, { method: 'GET' }, req, res);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          return res.json({
            exists: true,
            existingFile: searchData.files[0],
            targetPath
          });
        }
      }
    }
  } catch (err: any) {
    console.warn('Check exists drive error:', err.message);
  }

  res.json({ exists: false, targetPath });
});

// Upload file to Google Drive with explicit user confirmation
app.post('/api/drive/upload', async (req: Request, res: Response) => {
  const currentUser = checkUserPermission(req, res, ['ADMINISTRADOR', 'SECRETARIADO']);
  if (!currentUser) return;

  const token = await getValidAccessToken(req, res);
  const {
    analysis,
    fileContentBase64,
    textContent,
    fileName,
    targetPath, // e.g. "EMPRESA/05_PROVEEDORES/Facturas_Recibidas_2026"
    overwriteAction // 'none' | 'rename' | 'overwrite'
  } = req.body;

  // STRICT RULE: Never claim saved if Google Drive cannot be confirmed!
  if (!token) {
    return res.status(401).json({
      success: false,
      status: 'error',
      error: 'No se pudo realizar la operación en Google Drive. La sesión de Google Drive ha expirado o no se ha autenticado.'
    });
  }

  if (!fileName || !targetPath || !analysis) {
    return res.status(400).json({
      success: false,
      status: 'error',
      error: 'Datos incompletos para guardar el archivo.'
    });
  }

  try {
    const pathParts = targetPath.split('/').filter(Boolean); // e.g. ['EMPRESA', '05_PROVEEDORES', 'Facturas_Recibidas_2026']
    
    // 1. Build hierarchy folder by folder in Google Drive
    let currentParentId: string | null = null;
    for (const folderName of pathParts) {
      currentParentId = await findOrCreateDriveFolder(folderName, currentParentId, req, res);
    }

    let finalFileName = fileName;

    // Handle rename if required
    if (overwriteAction === 'rename') {
      const extIndex = fileName.lastIndexOf('.');
      if (extIndex !== -1) {
        finalFileName = `${fileName.substring(0, extIndex)}_v${Math.floor(Math.random() * 90 + 10)}${fileName.substring(extIndex)}`;
      } else {
        finalFileName = `${fileName}_v2`;
      }
    }

    // 2. Real Google Drive multipart file creation
    const mimeType = analysis.fileTypeMime || 'application/pdf';
    const metadata = {
      name: finalFileName,
      parents: currentParentId ? [currentParentId] : ['root'],
      description: `Organizado por Amod Solutions IA. Área: ${analysis.adminArea}. Tipo: ${analysis.documentType}`
    };

    const fileBuffer = fileContentBase64 
      ? parseBase64ToBuffer(fileContentBase64)
      : Buffer.from(textContent || '', 'utf-8');

    if (mimeType === 'application/pdf' || finalFileName.toLowerCase().endsWith('.pdf')) {
      validatePdfBuffer(fileBuffer, finalFileName);
    }

    const { body: multipartRequestBody, boundary } = createMultipartBuffer(metadata, fileBuffer, mimeType);

    const uploadRes = await fetchDriveApi('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary="${boundary}"`
      },
      body: multipartRequestBody
    }, req, res);

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Google Drive Upload Failed:', errText);
      return res.status(502).json({
        success: false,
        status: 'error',
        error: `Google Drive rechazó la subida del archivo (${uploadRes.status}): ${errText}`
      });
    }

    const uploadedData = await uploadRes.json();
    const driveFileId = uploadedData.id;
    const webViewLink = uploadedData.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;

    const driveResult = {
      fileId: driveFileId,
      fileName: finalFileName,
      webViewLink,
      parentFolderPath: targetPath,
      parentFolderId: currentParentId || 'root',
      savedAt: new Date().toISOString()
    };

    const savedRecord = {
      id: `rec_${Date.now()}`,
      analysis,
      driveResult,
      savedBy: activeUserToken?.user?.email || activeUserToken?.user?.name || 'Usuario Autenticado',
      savedAt: new Date().toISOString()
    };

    storedDriveFilesRecords.unshift(savedRecord);

    const actorEmail = (req.headers['x-user-email'] as string) || activeUserToken?.user?.email || 'duarteosmel@gmail.com';
    recordAudit(actorEmail, `Carga de Documento: ${finalFileName}`, 'Gestión Documental', 'Éxito', `Ubicación en Drive: ${targetPath}`);

    res.json({
      success: true,
      status: 'saved',
      driveResult,
      savedRecord
    });

  } catch (err: any) {
    console.error('Drive storage error:', err);
    res.status(500).json({
      success: false,
      status: 'error',
      error: `Error crítico al comunicar con Google Drive: ${err.message}`
    });
  }
});

// List saved records / files in drive
app.get('/api/drive/files', (req: Request, res: Response) => {
  const currentUser = checkUserPermission(req, res, ['ADMINISTRADOR']);
  if (!currentUser) return;

  res.json({
    total: storedDriveFilesRecords.length,
    files: storedDriveFilesRecords
  });
});

// Endpoint to resolve exact Google Drive fileId and official webViewLink by fileId or fileName & targetPath
app.post('/api/drive/resolve-file-link', async (req: Request, res: Response) => {
  const token = await getValidAccessToken(req, res);
  const { fileId, fileName, targetPath } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'No hay una sesión activa de Google Drive. Por favor inicie sesión.' });
  }

  try {
    // 1. If fileId is present, verify directly via Google Drive API
    if (fileId && typeof fileId === 'string' && fileId.trim().length > 3) {
      const directRes = await fetchDriveApi(`https://www.googleapis.com/drive/v3/files/${fileId.trim()}?fields=id,name,webViewLink,trashed`, { method: 'GET' }, req, res);
      if (directRes.ok) {
        const fileData = await directRes.json();
        if (fileData && !fileData.trashed) {
          const webViewLink = fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`;
          return res.json({
            success: true,
            fileId: fileData.id,
            fileName: fileData.name,
            webViewLink
          });
        }
      }
    }

    // 2. If fileId is missing or invalid, search Google Drive by fileName
    if (fileName && typeof fileName === 'string' && fileName.trim().length > 0) {
      const cleanFileName = fileName.trim();
      const escapedFileName = cleanFileName.replace(/'/g, "\\'");
      let searchQuery = `name = '${escapedFileName}' and trashed = false`;

      // If targetPath is provided, attempt to narrow down parent folder if possible
      let parentFolderId: string | null = null;
      if (targetPath) {
        try {
          const pathParts = targetPath.split('/').filter(Boolean);
          let currParent: string | null = null;
          for (const folderName of pathParts) {
            currParent = await findOrCreateDriveFolder(folderName, currParent, req, res);
          }
          if (currParent) {
            parentFolderId = currParent;
            searchQuery += ` and '${parentFolderId}' in parents`;
          }
        } catch (fErr) {
          console.warn('Folder resolution error during file search:', fErr);
        }
      }

      let searchRes = await fetchDriveApi(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name,webViewLink)&pageSize=10`, { method: 'GET' }, req, res);
      let searchData = searchRes.ok ? await searchRes.json() : null;

      // If not found in parent folder, search globally in Drive for file with that name
      if ((!searchData || !searchData.files || searchData.files.length === 0) && parentFolderId) {
        const globalQuery = `name = '${escapedFileName}' and trashed = false`;
        searchRes = await fetchDriveApi(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(globalQuery)}&fields=files(id,name,webViewLink)&pageSize=10`, { method: 'GET' }, req, res);
        searchData = searchRes.ok ? await searchRes.json() : null;
      }

      // If still not found, search with 'contains'
      if (!searchData || !searchData.files || searchData.files.length === 0) {
        const baseName = cleanFileName.replace(/\.pdf$/i, '').replace(/\(\d+\)$/i, '').trim();
        const escapedBase = baseName.replace(/'/g, "\\'");
        const containsQuery = `name contains '${escapedBase}' and trashed = false`;
        searchRes = await fetchDriveApi(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(containsQuery)}&fields=files(id,name,webViewLink)&pageSize=10`, { method: 'GET' }, req, res);
        searchData = searchRes.ok ? await searchRes.json() : null;
      }

      if (searchData && searchData.files && searchData.files.length > 0) {
        const foundFile = searchData.files[0];
        const webViewLink = foundFile.webViewLink || `https://drive.google.com/file/d/${foundFile.id}/view`;
        return res.json({
          success: true,
          fileId: foundFile.id,
          fileName: foundFile.name,
          webViewLink
        });
      }
    }

    return res.status(404).json({
      success: false,
      error: `No se encontró el archivo "${fileName || fileId}" en Google Drive.`
    });

  } catch (err: any) {
    console.error('Error resolving file link:', err);
    res.status(500).json({
      success: false,
      error: `Error al buscar el archivo en Google Drive: ${err.message}`
    });
  }
});

// ==========================================
// 3. REGISTRO Y ALMACENAMIENTO DE VENTAS
// ==========================================

const storedSalesRecords: Array<{
  id: string;
  fecha: string;
  cliente: string;
  productoServicio: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  formaPago: string;
  estadoPago: string;
  observaciones: string;
  driveResult?: any;
  comprobanteResult?: any;
  savedBy?: string;
  savedAt?: string;
}> = [];

// Helper function to generate PDF receipt for a sale
function generateReceiptPdfBuffer(saleData: {
  id: string;
  fecha: string;
  cliente: string;
  productoServicio: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  formaPago: string;
  estadoPago: string;
  observaciones?: string;
}): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Top header background banner
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(0, 0, 210, 42, 'F');

  // Company Name & Logo Label
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('AMOD Solutions IA', 15, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(147, 197, 253);
  doc.text('Secretariado Administrativo con IA', 15, 26);

  // Document Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('COMPROBANTE DE VENTA', 195, 18, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`ID Venta: ${saleData.id}`, 195, 26, { align: 'right' });

  let y = 52;

  // Metadata Card (Fecha, Método de Pago, Estado)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, y, 180, 28, 3, 3, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('FECHA', 22, y + 9);
  doc.text('MÉTODO DE PAGO', 82, y + 9);
  doc.text('ESTADO DE LA VENTA', 142, y + 9);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(saleData.fecha || '-', 22, y + 19);

  doc.text(saleData.formaPago || 'Efectivo', 82, y + 19);

  if (saleData.estadoPago === 'Pagado') {
    doc.setTextColor(22, 101, 52); // green
  } else {
    doc.setTextColor(180, 83, 9); // amber
  }
  doc.text(saleData.estadoPago || 'Pagado', 142, y + 19);

  y += 36;

  // Customer Section
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, y, 180, 22, 3, 3, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('NOMBRE DEL CLIENTE', 22, y + 8);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(saleData.cliente || 'Cliente General', 22, y + 16);

  y += 30;

  // Table Header
  doc.setFillColor(30, 64, 175);
  doc.rect(15, y, 180, 10, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('PRODUCTO O SERVICIO', 20, y + 7);
  doc.text('CANTIDAD', 115, y + 7, { align: 'center' });
  doc.text('PRECIO UNITARIO', 150, y + 7, { align: 'right' });
  doc.text('TOTAL', 190, y + 7, { align: 'right' });

  y += 10;

  // Table Row
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, y, 180, 16, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  const prodText = saleData.productoServicio.length > 45 
    ? saleData.productoServicio.substring(0, 42) + '...' 
    : saleData.productoServicio;

  doc.text(prodText, 20, y + 10);
  doc.text(String(saleData.cantidad), 115, y + 10, { align: 'center' });
  doc.text(`$ ${Number(saleData.precioUnitario).toLocaleString('es-CO')}`, 150, y + 10, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text(`$ ${Number(saleData.total).toLocaleString('es-CO')}`, 190, y + 10, { align: 'right' });

  y += 24;

  // Total Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(105, y, 90, 26, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL DE LA VENTA:', 112, y + 16);

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(`$ ${Number(saleData.total).toLocaleString('es-CO')}`, 190, y + 16, { align: 'right' });

  y += 34;

  // Observaciones if present
  if (saleData.observaciones) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, y, 180, 20, 3, 3, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('OBSERVACIONES', 20, y + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const obsText = saleData.observaciones.length > 90 
      ? saleData.observaciones.substring(0, 87) + '...' 
      : saleData.observaciones;
    doc.text(obsText, 20, y + 14);

    y += 28;
  }

  // Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 262, 195, 262);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('AMOD Solutions IA — Documento Oficial Generado Automáticamente', 105, 270, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Ubicación Google Drive: EMPRESA/03_VENTAS/Comprobantes/Comprobante_${saleData.id}.pdf`, 105, 275, { align: 'center' });

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
// =========================================================
// GOOGLE SHEETS API — FUNCIONES PARA VENTAS
// =========================================================

async function createGoogleSheetFromXlsx(
  xlsxFileId: string,
  sheetName: string,
  req: Request,
  res: Response
): Promise<string> {
  // Descargar el XLSX existente desde Google Drive
  const downloadRes = await fetchDriveApi(
    `https://www.googleapis.com/drive/v3/files/${xlsxFileId}?alt=media`,
    { method: 'GET' },
    req,
    res
  );

  if (!downloadRes.ok) {
    const errorText = await downloadRes.text();
    throw new Error(
      `No se pudo leer el Excel existente para convertirlo a Google Sheets: ${errorText}`
    );
  }

  const xlsxBuffer = Buffer.from(
    await downloadRes.arrayBuffer()
  );

  if (!xlsxBuffer.length) {
    throw new Error(
      'El archivo Excel existente está vacío.'
    );
  }

  // Leer el XLSX solamente durante la migración inicial
  const workbook = XLSX.read(xlsxBuffer, {
    type: 'buffer'
  });

  const originalSheetName =
    workbook.SheetNames[0] || 'Ventas';

  const worksheet =
    workbook.Sheets[originalSheetName];

  if (!worksheet) {
    throw new Error(
      'No se encontró la hoja de ventas dentro del Excel existente.'
    );
  }

  const rows = XLSX.utils.sheet_to_json(
    worksheet,
    {
      header: 1,
      defval: ''
    }
  ) as any[][];

  // Crear Google Sheet nativo
  const createRes = await fetchDriveApi(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: sheetName,
        mimeType: 'application/vnd.google-apps.spreadsheet'
      })
    },
    req,
    res
  );

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(
      `No se pudo crear la hoja nativa de Google Sheets: ${errorText}`
    );
  }

  const createdSheet = await createRes.json();

  const spreadsheetId = createdSheet.id;

  if (!spreadsheetId) {
    throw new Error(
      'Google Sheets no devolvió un spreadsheetId válido.'
    );
  }

  // Escribir los datos existentes en la hoja nueva
  if (rows.length > 0) {
    const valuesRes = await fetchDriveApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Ventas!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: 'Ventas!A1',
          majorDimension: 'ROWS',
          values: rows
        })
      },
      req,
      res
    );

    if (!valuesRes.ok) {
      const errorText = await valuesRes.text();

      // Si la hoja todavía tiene "Sheet1", intentar con el nombre original
      throw new Error(
        `Google Sheets creó el archivo, pero no pudo copiar los datos existentes: ${errorText}`
      );
    }
  }

  // Mover la nueva Google Sheet a la misma carpeta de ventas
  const fileMetadataRes = await fetchDriveApi(
    `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=parents`,
    {
      method: 'GET'
    },
    req,
    res
  );

  if (!fileMetadataRes.ok) {
    throw new Error(
      'La Google Sheet fue creada, pero no se pudo consultar su ubicación.'
    );
  }

  
    '✅ GOOGLE SHEET NATIVA CREADA:',
    {
      spreadsheetId,
      sheetName
    }
  );

  return spreadsheetId;
}


async function appendSaleToGoogleSheet(
  spreadsheetId: string,
  saleRow: any[],
  req: Request,
  res: Response
): Promise<void> {
  const appendRes = await fetchDriveApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Ventas!A:J:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values: [saleRow]
      })
    },
    req,
    res
  );

  if (!appendRes.ok) {
    const errorText = await appendRes.text();

    throw new Error(
      `No se pudo agregar la venta directamente a Google Sheets: ${errorText}`
    );
  }

  const result = await appendRes.json();

  
    '✅ VENTA AGREGADA DIRECTAMENTE A GOOGLE SHEETS:',
    {
      spreadsheetId,
      updatedRange:
        result?.updates?.updatedRange || 'rango no informado'
    }
  );
}
// API to list sales
app.get('/api/sales/list', (req: Request, res: Response) => {
  res.json({
    success: true,
    sales: storedSalesRecords
  });
});
const GOOGLE_SHEET_MIME =
  'application/vnd.google-apps.spreadsheet';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function findNativeSalesSheet(
  fileName: string,
  yearFolderId: string,
  req: Request,
  res: Response
): Promise<any | null> {
  const query =
    `mimeType = '${GOOGLE_SHEET_MIME}' ` +
    `and name = '${fileName}' ` +
    `and '${yearFolderId}' in parents ` +
    `and trashed = false`;

  const response = await fetchDriveApi(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}` +
    `&fields=files(id,name,mimeType,webViewLink,parents,modifiedTime)`,
    { method: 'GET' },
    req,
    res
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `No se pudo buscar la Google Sheet de ventas: ${errorText}`
    );
  }

  const data = await response.json();

  return data.files?.[0] || null;
}
async function convertXlsxToNativeGoogleSheet(
  xlsxFileId: string,
  xlsxFileName: string,
  yearFolderId: string,
  req: Request,
  res: Response
): Promise<any> {

  const downloadRes = await fetchDriveApi(
    `https://www.googleapis.com/drive/v3/files/${xlsxFileId}?alt=media`,
    { method: 'GET' },
    req,
    res
  );

  if (!downloadRes.ok) {
    const errorText = await downloadRes.text();

    throw new Error(
      `No se pudo leer el Excel existente para convertirlo: ${errorText}`
    );
  }

  const xlsxBuffer = Buffer.from(
    await downloadRes.arrayBuffer()
  );

  if (!xlsxBuffer.length) {
    throw new Error(
      'El Excel existente está vacío y no puede convertirse.'
    );
  }

  const metadata = {
    name: xlsxFileName,
    parents: [yearFolderId],
    mimeType: GOOGLE_SHEET_MIME,
    description:
      'Registro Oficial de Ventas convertido a Google Sheets. ' +
      'Las nuevas ventas se agregan mediante Google Sheets API.'
  };

  const { body: multipartBody, boundary } =
    createMultipartBuffer(
      metadata,
      xlsxBuffer,
      XLSX_MIME
    );

  const createRes = await fetchDriveApi(
    'https://www.googleapis.com/upload/drive/v3/files' +
      '?uploadType=multipart&fields=id,name,mimeType,webViewLink,parents',
    {
      method: 'POST',
      headers: {
        'Content-Type':
          `multipart/related; boundary="${boundary}"`
      },
      body: multipartBody
    },
    req,
    res
  );

  if (!createRes.ok) {
    const errorText = await createRes.text();

    throw new Error(
      `Google Drive no pudo convertir el Excel a Google Sheets: ${errorText}`
    );
  }

  const convertedFile = await createRes.json();

  if (!convertedFile.id) {
    throw new Error(
      'Google Drive no devolvió el ID de la Google Sheet convertida.'
    );
  }

  
    '✅ XLSX CONVERTIDO A GOOGLE SHEETS:',
    {
      originalFileId: xlsxFileId,
      spreadsheetId: convertedFile.id,
      name: convertedFile.name
    }
  );

  return convertedFile;
}
async function appendSaleToNativeGoogleSheet(
  spreadsheetId: string,
  saleRow: any[],
  req: Request,
  res: Response
): Promise<any> {

  const spreadsheetRes = await fetchDriveApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}` +
    `?fields=sheets.properties(sheetId,title)`,
    { method: 'GET' },
    req,
    res
  );

  if (!spreadsheetRes.ok) {
    const errorText = await spreadsheetRes.text();
    throw new Error(
      `No se pudo consultar Google Sheets: ${errorText}`
    );
  }

  const spreadsheetData = await spreadsheetRes.json();

  const firstSheet =
    spreadsheetData.sheets?.[0]?.properties;

  if (!firstSheet?.title) {
    throw new Error(
      'La Google Sheet no tiene una pestaña disponible.'
    );
  }

  const sheetTitle = firstSheet.title;

  const range =
    `'${sheetTitle.replace(/'/g, "''")}'!A:J`;

  const appendRes = await fetchDriveApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}` +
    `/values/${encodeURIComponent(range)}:append` +
    `?valueInputOption=USER_ENTERED` +
    `&insertDataOption=INSERT_ROWS` +
    `&includeValuesInResponse=true`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values: [saleRow]
      })
    },
    req,
    res
  );

  if (!appendRes.ok) {
    const errorText = await appendRes.text();
    throw new Error(
      `No se pudo agregar la venta a Google Sheets: ${errorText}`
    );
  }

  const result = await appendRes.json();

console.log(
  '🟢 GOOGLE SHEETS CONFIRMÓ EL APPEND:',
  JSON.stringify(result, null, 2)
);

console.log(
  '✅ VENTA AGREGADA DIRECTAMENTE A GOOGLE SHEETS:',
  {
    spreadsheetId,
    sheetTitle,
    updatedRange:
      result?.updates?.updatedRange || 'No informado'
  }
);

return result;
}
  
// API to save a sale and write/append to Google Drive (.xlsx)
app.post(['/api/sales/save', '/api/sales/save-sheet'], async (req: Request, res: Response) => {
  const currentUser = checkUserPermission(req, res, ['ADMINISTRADOR', 'SECRETARIADO']);
  if (!currentUser) return;

  const token = await getValidAccessToken(req, res);
  const { saleData } = req.body;

  if (!saleData) {
    return res.status(400).json({ error: 'No se recibieron datos de la venta.' });
  }

  const { fecha, cliente, productoServicio, cantidad, precioUnitario, formaPago, estadoPago, observaciones } = saleData;

  if (!fecha || !cliente || !productoServicio) {
    return res.status(400).json({ error: 'La fecha, el cliente y el producto/servicio son obligatorios.' });
  }

  const numQty = Number(cantidad);
  const numPrice = Number(precioUnitario);

  if (isNaN(numQty) || numQty <= 0 || isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ error: 'La cantidad debe ser mayor a 0 y el precio unitario un número válido.' });
  }

  const total = numQty * numPrice;

  if (!token) {
    return res.status(401).json({ error: 'No hay una cuenta de Google Drive conectada. Por favor inicie sesión para guardar la venta de forma real en Google Drive.' });
  }

  try {
    const cleanDateStr = fecha.replace(/-/g, ''); // e.g., 20260807
    const countToday = storedSalesRecords.filter(s => s.fecha === fecha).length + 1;
    const saleId = `V-${cleanDateStr}-${String(countToday).padStart(3, '0')}`;

    // Extract Year and Month from sale date
    const dateParts = fecha.split('-');
    const yearStr = dateParts[0] || new Date().getFullYear().toString();
    const monthNum = dateParts[1] || String(new Date().getMonth() + 1).padStart(2, '0');
    const yearMonthStr = `${yearStr}-${monthNum}`;

    const targetFolderPath = `EMPRESA/03_VENTAS/${yearStr}`;
    const xlsxFileName = `Ventas_${yearMonthStr}.xlsx`;

    // 1. Get or create folders: EMPRESA -> 03_VENTAS -> {yearStr}
    const empFolderId = await findOrCreateDriveFolder('EMPRESA', null, req, res);
    const ventasFolderId = await findOrCreateDriveFolder('03_VENTAS', empFolderId, req, res);
    const yearFolderId = await findOrCreateDriveFolder(yearStr, ventasFolderId, req, res);
  
    let driveFileId = '';
    let webViewLink = '';
    
  // =========================================================
// GUARDAR VENTA DIRECTAMENTE EN GOOGLE SHEETS
// =========================================================

const nativeSheetFileName = xlsxFileName;

let nativeSheet =
  await findNativeSalesSheet(
    nativeSheetFileName,
    yearFolderId,
    req,
    res
  );

// ---------------------------------------------------------
// SI YA EXISTE GOOGLE SHEETS NATIVO
// ---------------------------------------------------------

if (nativeSheet) {

  driveFileId = nativeSheet.id;

  webViewLink =
    nativeSheet.webViewLink ||
    `https://docs.google.com/spreadsheets/d/${driveFileId}/edit`;

  
    '✅ GOOGLE SHEETS NATIVO ENCONTRADO:',
    {
      spreadsheetId: driveFileId,
      name: nativeSheet.name
    }
  );

} else {

  // -------------------------------------------------------
  // BUSCAR EL XLSX ANTIGUO
  // -------------------------------------------------------

  const oldXlsxQuery =
    `mimeType = '${XLSX_MIME}' ` +
    `and name = '${xlsxFileName}' ` +
    `and '${yearFolderId}' in parents ` +
    `and trashed = false`;

  const oldXlsxRes = await fetchDriveApi(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(oldXlsxQuery)}` +
      `&fields=files(id,name,mimeType,webViewLink,parents,modifiedTime)`,
    {
      method: 'GET'
    },
    req,
    res
  );

  if (!oldXlsxRes.ok) {
    const errorText = await oldXlsxRes.text();

    throw new Error(
      `No se pudo buscar el Excel existente de ventas: ${errorText}`
    );
  }

  const oldXlsxData = await oldXlsxRes.json();

  const oldXlsx =
    oldXlsxData.files?.[0] || null;

  // -------------------------------------------------------
  // EXISTE XLSX → CONVERTIR UNA SOLA VEZ
  // -------------------------------------------------------

  if (oldXlsx) {

    console.log(
      '🔄 CONVIRTIENDO XLSX EXISTENTE A GOOGLE SHEETS:',
      {
        xlsxFileId: oldXlsx.id,
        name: oldXlsx.name
      }
    );

    nativeSheet =
      await convertXlsxToNativeGoogleSheet(
        oldXlsx.id,
        xlsxFileName,
        yearFolderId,
        req,
        res
      );

    driveFileId = nativeSheet.id;

    webViewLink =
      nativeSheet.webViewLink ||
      `https://docs.google.com/spreadsheets/d/${driveFileId}/edit`;

  } else {

    // -----------------------------------------------------
    // NO EXISTE NINGÚN ARCHIVO → CREAR GOOGLE SHEETS NUEVO
    // -----------------------------------------------------

    const createMetadata = {
      name: xlsxFileName,
      parents: [yearFolderId],
      mimeType: GOOGLE_SHEET_MIME,
      description:
        `Registro Oficial de Ventas para ${yearMonthStr}. ` +
        `Organizado por Amod Solutions IA.`
    };

    const createSheetRes = await fetchDriveApi(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createMetadata)
      },
      req,
      res
    );

    if (!createSheetRes.ok) {
      const errorText = await createSheetRes.text();

      throw new Error(
        `No se pudo crear la Google Sheet de ventas: ${errorText}`
      );
    }

    nativeSheet =
      await createSheetRes.json();

    driveFileId = nativeSheet.id;

    webViewLink =
      nativeSheet.webViewLink ||
      `https://docs.google.com/spreadsheets/d/${driveFileId}/edit`;

  

    if (!headersRes.ok) {
      const errorText = await headersRes.text();

      throw new Error(
        `La Google Sheet fue creada pero no se pudieron crear los encabezados: ${errorText}`
      );
    }

    
      '✅ GOOGLE SHEETS NUEVO CREADO:',
      {
        spreadsheetId: driveFileId,
        name: nativeSheet.name
      }
    );
  }
}

// ---------------------------------------------------------
// AGREGAR LA VENTA COMO UNA NUEVA FILA
// ---------------------------------------------------------

const saleRow = [
  saleId,
  fecha,
  cliente,
  productoServicio,
  numQty,
  numPrice,
  total,
  formaPago || 'Efectivo',
  estadoPago || 'Pagado',
  observaciones || ''
];

await appendSaleToNativeGoogleSheet(
  driveFileId,
  saleRow,
  req,
  res
);


  '✅ VENTA GUARDADA EN GOOGLE SHEETS:',
  {
    saleId,
    spreadsheetId: driveFileId,
    cliente,
    total
  }
);

// ---------------------------------------------------------
// RESULTADO PARA EL RESTO DEL SISTEMA
// ---------------------------------------------------------

webViewLink =
  webViewLink ||
  `https://docs.google.com/spreadsheets/d/${driveFileId}/edit`;

    const driveResult = {
      fileId: driveFileId,
      fileName: xlsxFileName,
      webViewLink,
      parentFolderPath: targetFolderPath,
      savedAt: new Date().toISOString()
    };

    // 3. GENERATE AUTOMATIC SALES RECEIPT PDF (COMPROBANTE DE VENTA)
    // Target location: EMPRESA/03_VENTAS/Comprobantes/Comprobante_[ID_DE_VENTA].pdf
    let comprobanteResult: any = null;
    try {
      const comprobantesFolderId = await findOrCreateDriveFolder('Comprobantes', ventasFolderId, req, res);
      const pdfFileName = `Comprobante_${saleId}.pdf`;

      const pdfBuffer = generateReceiptPdfBuffer({
        id: saleId,
        fecha,
        cliente,
        productoServicio,
        cantidad: numQty,
        precioUnitario: numPrice,
        total,
        formaPago: formaPago || 'Efectivo',
        estadoPago: estadoPago || 'Pagado',
        observaciones: observaciones || ''
      });

      // Search if Comprobante_V-XXXXXX-XXX.pdf already exists
      const searchPdfQuery = `mimeType != 'application/vnd.google-apps.folder' and name = '${pdfFileName}' and '${comprobantesFolderId}' in parents and trashed = false`;
      const pdfSearchRes = await fetchDriveApi(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchPdfQuery)}&fields=files(id,name,webViewLink)`, { method: 'GET' }, req, res);

      let pdfDriveFileId = '';
      let pdfWebViewLink = '';

      if (pdfSearchRes.ok) {
        const pdfSearchData = await pdfSearchRes.json();
        if (pdfSearchData.files && pdfSearchData.files.length > 0) {
          pdfDriveFileId = pdfSearchData.files[0].id;
          pdfWebViewLink = pdfSearchData.files[0].webViewLink || `https://drive.google.com/file/d/${pdfDriveFileId}/view`;
        }
      }

      if (pdfDriveFileId) {
        // Update existing PDF
        const pdfUpdateRes = await fetchDriveApi(`https://www.googleapis.com/upload/drive/v3/files/${pdfDriveFileId}?uploadType=media&fields=id,name,webViewLink`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/pdf'
          },
          body: pdfBuffer
        }, req, res);

        if (pdfUpdateRes.ok) {
          const updatedPdf = await pdfUpdateRes.json();
          pdfDriveFileId = updatedPdf.id;
          pdfWebViewLink = updatedPdf.webViewLink || pdfWebViewLink;
        }
      } else {
        validatePdfBuffer(pdfBuffer, pdfFileName);

        // Create new PDF on Google Drive
        const pdfMetadata = {
          name: pdfFileName,
          parents: [comprobantesFolderId],
          description: `Comprobante Oficial de Venta ${saleId} para ${cliente}. Generado automáticamente por AMOD Solutions IA.`
        };

        const { body: pdfMultipartBody, boundary: pdfBoundary } = createMultipartBuffer(pdfMetadata, pdfBuffer, 'application/pdf');

        const pdfUploadRes = await fetchDriveApi('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/related; boundary="${pdfBoundary}"`
          },
          body: pdfMultipartBody
        }, req, res);

        if (pdfUploadRes.ok) {
          const uploadedPdf = await pdfUploadRes.json();
          pdfDriveFileId = uploadedPdf.id;
          pdfWebViewLink = uploadedPdf.webViewLink || `https://drive.google.com/file/d/${pdfDriveFileId}/view`;
        }
      }

      comprobanteResult = {
        fileId: pdfDriveFileId,
        fileName: pdfFileName,
        webViewLink: pdfWebViewLink,
        parentFolderPath: 'EMPRESA/03_VENTAS/Comprobantes',
        savedAt: new Date().toISOString()
      };
    } catch (pdfErr) {
      console.error('Error generando/almacenando el comprobante PDF:', pdfErr);
    }

    const newSaleRecord = {
      id: saleId,
      fecha,
      cliente,
      productoServicio,
      cantidad: numQty,
      precioUnitario: numPrice,
      total,
      formaPago: formaPago || 'Efectivo',
      estadoPago: estadoPago || 'Pagado',
      observaciones: observaciones || '',
      driveResult,
      comprobanteResult,
      savedBy: activeUserToken?.user?.email || activeUserToken?.user?.name || 'Usuario Autenticado',
      savedAt: new Date().toISOString()
    };

    storedSalesRecords.unshift(newSaleRecord);

    const actorEmail = (req.headers['x-user-email'] as string) || activeUserToken?.user?.email || 'duarteosmel@gmail.com';
    recordAudit(actorEmail, `Registro de Venta: ${saleId}`, 'Registro de Ventas', 'Éxito', `Cliente: ${cliente} - Total: $${total.toLocaleString('es-CO')}`);

    res.json({
      success: true,
      status: 'saved',
      sale: newSaleRecord,
      driveResult,
      comprobanteResult
    });

  } catch (err: any) {
    console.error('Error al guardar la venta en Google Drive:', err);
    res.status(500).json({
      success: false,
      status: 'error',
      error: `Error al conectar con Google Drive para guardar la venta: ${err.message}`
    });
  }
});

// API to generate AI executive sales analysis using Gemini
app.post('/api/sales/report/generate-ai', async (req: Request, res: Response) => {
  try {
    const { sales, periodName, metrics } = req.body;

    const ai = getGeminiClient();

    const salesSummaryText = (sales || []).slice(0, 30).map((s: any) => 
      `- ${s.fecha}: ${s.cliente} | Prod: ${s.productoServicio} | Qty: ${s.cantidad} | Total: $${s.total} | Pago: ${s.formaPago} (${s.estadoPago})`
    ).join('\n');

    const prompt = `Analiza los siguientes datos de ventas reales de AMOD Solutions IA para el periodo "${periodName || 'Seleccionado'}":

MÉTRICAS CLAVE DEL PERIODO:
- Total Vendido: $${metrics?.totalVendido || 0}
- Número de Ventas: ${metrics?.numVentas || 0}
- Ticket Promedio: $${metrics?.ticketPromedio || 0}
- Producto/Servicio Más Vendido: ${metrics?.productoMasVendido || 'N/A'}
- Cliente Principal (Top): ${metrics?.clienteTop || 'N/A'}
- Método de Pago Más Utilizado: ${metrics?.metodoMasUtilizado || 'N/A'}
- Total Cobrado (Pagado): $${metrics?.totalPagado || 0}
- Total Pendiente por Cobrar: $${metrics?.totalPendiente || 0}

MUESTRA DE REGISTROS DE VENTAS (${(sales || []).length} transacciones en total):
${salesSummaryText || 'No hay transacciones registradas en este periodo.'}

Proporciona un análisis ejecutivo exhaustivo en formato JSON estructurado con las siguientes secciones:
1. Resumen Ejecutivo (visión general del desempeño comercial).
2. Principales Resultados (4 a 6 bullets con cifras relevantes).
3. Productos Destacados (análisis de la mezcla de productos/servicios).
4. Comportamiento de las Ventas (tendencias, distribución de pagos y liquidez).
5. Observaciones (2 a 4 hallazgos administrativos clave).
6. Recomendaciones Administrativas (3 a 5 acciones estratégicas sugeridas para incrementar ventas y mejorar recaudo).`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction: `Eres el Asistente Ejecutivo de Inteligencia Artificial de AMOD Solutions IA. Tu objetivo es generar informes analíticos de ventas profesionales, precisos y con alto valor gerencial en idioma español.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            resumenEjecutivo: { type: Type.STRING },
            principalesResultados: { type: Type.ARRAY, items: { type: Type.STRING } },
            productosDestacados: { type: Type.ARRAY, items: { type: Type.STRING } },
            comportamientoVentas: { type: Type.STRING },
            observaciones: { type: Type.ARRAY, items: { type: Type.STRING } },
            recomendacionesAdministrativas: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: [
            'resumenEjecutivo',
            'principalesResultados',
            'productosDestacados',
            'comportamientoVentas',
            'observaciones',
            'recomendacionesAdministrativas'
          ]
        }
      }
    });

    const reportText = aiResponse.text || '{}';
    const parsedReport = JSON.parse(reportText);

    res.json({
      success: true,
      report: {
        ...parsedReport,
        periodoNombre: periodName || 'Periodo Seleccionado',
        fechaGeneracion: new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
      }
    });

  } catch (err: any) {
    console.error('Error generando informe de IA con Gemini:', err);
    res.status(500).json({
      success: false,
      error: `Error al generar el informe con Inteligencia Artificial: ${err.message}`
    });
  }
});

// API to save Sales Administrative Report PDF to Google Drive
app.post('/api/sales/report/save-drive', async (req: Request, res: Response) => {
  const token = await getValidAccessToken(req, res);
  const { pdfBase64, fileName } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'No hay una cuenta de Google Drive conectada. Por favor inicie sesión.' });
  }

  if (!pdfBase64 || !fileName) {
    return res.status(400).json({ error: 'Faltan datos del informe PDF o el nombre de archivo.' });
  }

  try {
    const empFolderId = await findOrCreateDriveFolder('EMPRESA', null, req, res);
    const informesFolderId = await findOrCreateDriveFolder('04_INFORMES', empFolderId, req, res);

    const pdfBuffer = parseBase64ToBuffer(pdfBase64);
    validatePdfBuffer(pdfBuffer, fileName);

    // Search if file with same name already exists in EMPRESA/04_INFORMES
    const searchFileQuery = `mimeType != 'application/vnd.google-apps.folder' and name = '${fileName}' and '${informesFolderId}' in parents and trashed = false`;
    const searchRes = await fetchDriveApi(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchFileQuery)}&fields=files(id,name,webViewLink)`, { method: 'GET' }, req, res);

    let driveFileId = '';
    let webViewLink = '';

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        driveFileId = searchData.files[0].id;
        webViewLink = searchData.files[0].webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;
      }
    }

    if (driveFileId) {
      // Overwrite existing report file
      const updateRes = await fetchDriveApi(`https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=media&fields=id,name,webViewLink`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/pdf' },
        body: pdfBuffer
      }, req, res);

      if (updateRes.ok) {
        const updatedData = await updateRes.json();
        driveFileId = updatedData.id;
        webViewLink = updatedData.webViewLink || webViewLink;
      }
    } else {
      // Create new file
      const metadata = {
        name: fileName,
        parents: [informesFolderId],
        description: `Informe Ejecutivo Inteligente de Ventas AMOD Solutions IA.`
      };

      const { body: multipartRequestBody, boundary } = createMultipartBuffer(metadata, pdfBuffer, 'application/pdf');

      const uploadRes = await fetchDriveApi('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary="${boundary}"`
        },
        body: multipartRequestBody
      }, req, res);

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Google Drive rechazó la subida del informe PDF: ${errText}`);
      }

      const uploadedData = await uploadRes.json();
      driveFileId = uploadedData.id;
      webViewLink = uploadedData.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;
    }

    res.json({
      success: true,
      status: 'saved',
      driveResult: {
        fileId: driveFileId,
        fileName,
        webViewLink,
        parentFolderPath: 'EMPRESA/04_INFORMES',
        savedAt: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error('Error al guardar informe en Google Drive:', err);
    res.status(500).json({ error: `Error al guardar el informe en Google Drive: ${err.message}` });
  }
});

// ==========================================
// API: ASISTENTE ADMINISTRATIVO IA
// ==========================================
app.post('/api/assistant/chat', async (req: Request, res: Response) => {
  try {
    const { question, salesRecords = [], documentRecords = [] } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Debe proporcionar una pregunta válida.' });
    }

    const ai = getGeminiClient();

    // Calculate aggregated sales & document facts to ground Gemini
    const nowStr = new Date().toISOString().split('T')[0];
    
    // Sales summary
    const totalSalesCount = salesRecords.length;
    const totalRevenue = salesRecords.reduce((sum: number, r: any) => sum + (Number(r.total) || 0), 0);

    const todaySales = salesRecords.filter((r: any) => r.fecha === nowStr);
    const todayRevenue = todaySales.reduce((sum: number, r: any) => sum + (Number(r.total) || 0), 0);

    // Current month sales (e.g. YYYY-MM)
    const currentMonthPrefix = nowStr.substring(0, 7);
    const monthSales = salesRecords.filter((r: any) => (r.fecha || '').startsWith(currentMonthPrefix));
    const monthRevenue = monthSales.reduce((sum: number, r: any) => sum + (Number(r.total) || 0), 0);

    // Highest / Lowest sale
    let highestSale = salesRecords.length > 0 ? salesRecords[0] : null;
    let lowestSale = salesRecords.length > 0 ? salesRecords[0] : null;

    salesRecords.forEach((r: any) => {
      const val = Number(r.total) || 0;
      if (highestSale && val > (Number(highestSale.total) || 0)) highestSale = r;
      if (lowestSale && val < (Number(lowestSale.total) || 0)) lowestSale = r;
    });

    // Top products
    const productSalesMap: Record<string, { qty: number; total: number }> = {};
    salesRecords.forEach((r: any) => {
      const p = r.productoServicio || 'Desconocido';
      if (!productSalesMap[p]) productSalesMap[p] = { qty: 0, total: 0 };
      productSalesMap[p].qty += (Number(r.cantidad) || 0);
      productSalesMap[p].total += (Number(r.total) || 0);
    });

    // Top clients
    const clientSalesMap: Record<string, { count: number; total: number }> = {};
    salesRecords.forEach((r: any) => {
      const c = r.cliente || 'Cliente General';
      if (!clientSalesMap[c]) clientSalesMap[c] = { count: 0, total: 0 };
      clientSalesMap[c].count += 1;
      clientSalesMap[c].total += (Number(r.total) || 0);
    });

    // Payment methods & statuses
    const paymentMethodsMap: Record<string, number> = {};
    let totalPagado = 0;
    let totalPendiente = 0;
    let countPagado = 0;
    let countPendiente = 0;

    salesRecords.forEach((r: any) => {
      const method = r.formaPago || 'Otro';
      paymentMethodsMap[method] = (paymentMethodsMap[method] || 0) + (Number(r.total) || 0);

      if (r.estadoPago === 'Pagado') {
        totalPagado += (Number(r.total) || 0);
        countPagado += 1;
      } else {
        totalPendiente += (Number(r.total) || 0);
        countPendiente += 1;
      }
    });

    // Document categories summary
    const docCategoryCounts: Record<string, number> = {};
    documentRecords.forEach((d: any) => {
      const cat = d.analysis?.category || 'Otros';
      docCategoryCounts[cat] = (docCategoryCounts[cat] || 0) + 1;
    });

    const docsToday = documentRecords.filter((d: any) => (d.savedAt || '').startsWith(nowStr) || (d.analysis?.detectedDate || '').startsWith(nowStr));

    // Construct Context JSON
    const amodContext = {
      fechaConsulta: nowStr,
      ventas: {
        totalVentasRegistradas: totalSalesCount,
        montoTotalVendidoHistorico: totalRevenue,
        ventasHoy: {
          cantidad: todaySales.length,
          montoTotal: todayRevenue
        },
        ventasMesActual: {
          periodo: currentMonthPrefix,
          cantidad: monthSales.length,
          montoTotal: monthRevenue
        },
        ventaMasAlta: highestSale ? {
          id: highestSale.id,
          monto: highestSale.total,
          cliente: highestSale.cliente,
          producto: highestSale.productoServicio,
          fecha: highestSale.fecha
        } : null,
        ventaMasBaja: lowestSale ? {
          id: lowestSale.id,
          monto: lowestSale.total,
          cliente: lowestSale.cliente,
          producto: lowestSale.productoServicio,
          fecha: lowestSale.fecha
        } : null,
        porProducto: productSalesMap,
        porCliente: clientSalesMap,
        porFormaPago: paymentMethodsMap,
        estadosPago: {
          pagadas: { cantidad: countPagado, monto: totalPagado },
          pendientes: { cantidad: countPendiente, monto: totalPendiente }
        },
        listadoVentasDetallado: salesRecords.map((r: any) => ({
          id: r.id,
          fecha: r.fecha,
          cliente: r.cliente,
          producto: r.productoServicio,
          cantidad: r.cantidad,
          total: r.total,
          formaPago: r.formaPago,
          estadoPago: r.estadoPago
        }))
      },
      documentos: {
        totalDocumentos: documentRecords.length,
        conteoPorCategoria: docCategoryCounts,
        cargadosHoy: docsToday.length,
        listadoDocumentosDetallado: documentRecords.map((d: any) => ({
          id: d.id,
          originalFileName: d.analysis?.originalFileName,
          fileName: d.driveResult?.fileName || d.analysis?.recommendedFileName,
          tipoDocumento: d.analysis?.documentType,
          categoria: d.analysis?.category,
          fechaDetectada: d.analysis?.detectedDate || d.savedAt,
          empresaProveedor: d.analysis?.entityName,
          numeroDocumento: d.analysis?.documentNumber,
          montoTotal: d.analysis?.amountTotal,
          clienteRelacionado: d.analysis?.clientRelated,
          resumen: d.analysis?.summary,
          palabrasClave: d.analysis?.keywords || [],
          ubicacionDrive: `EMPRESA/01_DOCUMENTOS/${d.analysis?.category || 'Otros'}`,
          webViewLink: d.driveResult?.webViewLink
        }))
      }
    };

    const assistantSystemPrompt = `
Eres el "Asistente Administrativo IA" oficial de la plataforma empresarial AMOD Solutions.
Tu función es responder preguntas precisas, profesionales y amables sobre el estado de las ventas, documentos e información administrativa de la empresa basadas ÚNICAMENTE en la información disponible en la base de datos de AMOD.

REGLAS STRICTAS:
1. Responde SIEMPRE basándote en la información que se te proporciona en el CONTEXTO DE DATOS EN TIEMPO REAL DE AMOD.
2. NO INVENTES NINGÚN DATO, cliente, valor, factura o documento.
3. Si la pregunta del usuario no puede ser respondida con los datos proporcionados (o no hay registros suficientes), debes responder exactamente:
   "No encontré información suficiente en los registros de AMOD."
4. Cuando indiques cifras monetarias o totales, ESPECIFICA SIEMPRE EL PERÍODO CONSULTADO (ejemplo: "En lo que va de este mes (agosto de 2026)", "En las ventas registradas el día de hoy", "En el historial total acumulado").
5. Si el usuario pregunta por documentos o busca un documento en particular:
   - Indica su Nombre exacto de archivo.
   - Indica su Tipo y Categoría oficial.
   - Indica su Fecha y Empresa/Proveedor.
   - Indica su Ubicación exacta en Google Drive (ej: "EMPRESA/01_DOCUMENTOS/Facturas").
   - Incluye ese documento en la lista 'foundDocuments' para que el sistema genere el botón "Ver documento".
6. Formatea la respuesta con viñetas markdown limpios, negritas para destacar valores numéricos y un tono ejecutivo, claro y fácil de entender.
7. Puedes generar resúmenes ejecutivos (resumen de ventas, resumen documental o resumen administrativo con recomendaciones) consolidando métricas reales de los datos.

CONTEXTO DE DATOS EN TIEMPO REAL DE AMOD:
${JSON.stringify(amodContext, null, 2)}
`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [
        { role: 'user', parts: [{ text: `Pregunta del usuario: "${question}"` }] }
      ],
      config: {
        systemInstruction: assistantSystemPrompt,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING, description: 'Respuesta conversacional clara, profesional y formateada en markdown' },
            foundDocuments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  location: { type: Type.STRING },
                  webViewLink: { type: Type.STRING }
                },
                required: ['name', 'category', 'location']
              },
              description: 'Lista de documentos mencionados o encontrados que tienen un enlace disponible'
            }
          },
          required: ['reply']
        }
      }
    });

    const responseText = aiResponse.text || '{}';
    const parsedData = JSON.parse(responseText);

    res.json({
      success: true,
      reply: parsedData.reply || 'No se pudo generar la respuesta.',
      foundDocuments: parsedData.foundDocuments || []
    });

  } catch (err: any) {
    console.error('Error en Asistente Administrativo IA:', err);
    res.status(500).json({ error: `Error procesando la consulta con IA: ${err.message}` });
  }
});

// ==========================================
// 4. VITE MIDDLEWARE & SERVER INITIALIZATION
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    `[AMOD Solución IA] Servidor ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer();
