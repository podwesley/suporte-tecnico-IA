import React from 'react';
import { ChatSession } from '../types';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (e: React.MouseEvent, sessionId: string) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession
}) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div 
        className={`fixed top-0 left-0 h-full w-80 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 z-40 transform transition-transform duration-300 ease-in-out shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">Histórico</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {sessions.length === 0 ? (
              <div className="text-center text-slate-500 mt-10">
                <p className="text-sm">Nenhuma conversa salva.</p>
              </div>
            ) : (
              sessions.sort((a, b) => b.timestamp - a.timestamp).map((session) => (
                <div 
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  className={`
                    group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border
                    ${currentSessionId === session.id 
                      ? 'bg-blue-600/10 border-blue-500/30 text-white' 
                      : 'bg-transparent border-transparent hover:bg-slate-800 text-slate-300 hover:text-white'
                    }
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.title || 'Nova Conversa'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {new Date(session.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  <button
                    onClick={(e) => onDeleteSession(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                    title="Excluir"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-slate-700/50">
             <div className="text-[10px] text-slate-500 text-center">
                Armazenado localmente no seu navegador
             </div>
          </div>
        </div>
      </div>
    </>
  );
};
