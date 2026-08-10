import React, { useState, useRef, useEffect } from 'react';
import { SaleRecord, SavedDocumentRecord, AssistantMessage } from '../types';
import { openGoogleDriveDocument } from '../utils/driveViewer';
import { 
  Bot, 
  Send, 
  Sparkles, 
  RefreshCw, 
  ExternalLink, 
  FileText, 
  ShoppingBag, 
  BarChart3, 
  HelpCircle,
  FolderTree,
  User,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AIAssistantModuleProps {
  salesRecords: SaleRecord[];
  savedRecords: SavedDocumentRecord[];
}

const SUGGESTED_QUERIES = [
  '¿Cuánto vendimos este mes?',
  '¿Cuál fue nuestro producto más vendido?',
  '¿Cuántas facturas tenemos?',
  'Genera un resumen administrativo.'
];

export const AIAssistantModule: React.FC<AIAssistantModuleProps> = ({
  salesRecords,
  savedRecords
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'assistant',
      text: '¡Hola! Soy tu **Asistente Administrativo IA**. Estoy aquí para responder tus dudas sobre el registro de ventas, documentos clasificados y el estado general de tu empresa en AMOD. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendQuery = async (queryText?: string) => {
    const textToQuery = (queryText || inputQuery).trim();
    if (!textToQuery || isLoading) return;

    const userMsg: AssistantMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToQuery,
          salesRecords,
          documentRecords: savedRecords
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Error al comunicarse con el Asistente Administrativo IA.');
      }

      const data = await res.json();

      const assistantMsg: AssistantMessage = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'No se encontró información suficiente en los registros de AMOD.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        foundDocuments: data.foundDocuments
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Assistant query error:', err);
      const errorMsg: AssistantMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: 'Ocurrió un inconveniente al procesar tu consulta. ' + (err.message || 'Por favor intenta nuevamente.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to format basic markdown (bold, lists, code) into styled JSX
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2 text-xs leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;

          // Process bullet points
          const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
          const lineContent = isBullet ? trimmed.substring(2) : line;

          // Simple bold formatting replacement **text**
          const parts = lineContent.split(/(\*\*.*?\*\*)/g);
          const formattedParts = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-slate-900 bg-slate-100/80 px-1 rounded">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          });

          if (isBullet) {
            return (
              <div key={idx} className="flex items-start space-x-2 pl-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <div className="flex-1">{formattedParts}</div>
              </div>
            );
          }

          return <p key={idx}>{formattedParts}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>FASE 7: ASISTENTE ADMINISTRATIVO IA</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>🤖</span>
              <span>Asistente Administrativo IA</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Pregúntame sobre las ventas, documentos e información administrativa de tu empresa.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 text-xs self-start md:self-auto">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Conectado a AMOD</span>
            </div>
            <span className="text-slate-400">|</span>
            <span className="text-slate-200 font-semibold">{salesRecords.length} Ventas • {savedRecords.length} Docs</span>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
        
        {/* Chat Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Consulta Inteligente AMOD
              </h2>
              <p className="text-[11px] text-slate-500">
                Responde en tiempo real basándose en los registros de ventas y expedientes documentales.
              </p>
            </div>
          </div>

          <button
            onClick={() => setMessages([
              {
                id: `msg_${Date.now()}`,
                sender: 'assistant',
                text: 'Conversación reiniciada. ¿En qué otra consulta puedo colaborarte sobre AMOD?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ])}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1"
            title="Limpiar conversación"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reiniciar chat</span>
          </button>
        </div>

        {/* Suggested Queries Chips */}
        <div className="px-6 py-3 bg-indigo-50/60 border-b border-indigo-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-indigo-900 flex items-center space-x-1 mr-1">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Preguntas sugeridas:</span>
          </span>
          {SUGGESTED_QUERIES.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuery(q)}
              disabled={isLoading}
              className="px-3 py-1 bg-white hover:bg-indigo-600 hover:text-white text-indigo-950 font-semibold text-xs rounded-xl border border-indigo-200 shadow-2xs transition-all disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                  isUser ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4.5 h-4.5" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-xs ${
                  isUser 
                    ? 'bg-slate-900 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                }`}>
                  <div className="flex items-center justify-between gap-4 mb-1.5 border-b border-slate-100 pb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      isUser ? 'text-slate-400' : 'text-blue-600'
                    }`}>
                      {isUser ? 'Tú' : 'Asistente Administrativo IA'}
                    </span>
                    <span className={`text-[10px] ${isUser ? 'text-slate-400' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Message Text */}
                  {isUser ? (
                    <p className="text-xs font-medium leading-relaxed">{msg.text}</p>
                  ) : (
                    renderFormattedText(msg.text)
                  )}

                  {/* Found Documents Cards / Buttons */}
                  {msg.foundDocuments && msg.foundDocuments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        📄 Documentos relacionados encontrados:
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {msg.foundDocuments.map((doc, dIdx) => (
                          <div key={dIdx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                            <div>
                              <span className="font-bold text-slate-900 block truncate max-w-[200px]" title={doc.name}>
                                {doc.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Ubicación: {doc.location}
                              </span>
                            </div>

                            <button
                              onClick={(e) => openGoogleDriveDocument({
                                fileId: doc.fileId,
                                fileName: doc.name,
                                targetPath: doc.location,
                                webViewLink: doc.webViewLink
                              })}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors flex-shrink-0 cursor-pointer"
                            >
                              <span>Ver documento</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-xs text-xs text-slate-600 flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="font-medium">Consultando registros y analizando datos con Gemini...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Escribe tu pregunta sobre ventas, documentos o gestión..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
            />

            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="inline-flex items-center space-x-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex-shrink-0"
            >
              <span>Consultar</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
