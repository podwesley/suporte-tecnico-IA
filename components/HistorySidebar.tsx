import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatSession } from '../types';
import { Clock, MessageSquare, Trash2, X } from 'lucide-react';
import { clsx } from 'clsx';

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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Sidebar Panel */}
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 h-full w-80 bg-[#09090b] border-r border-white/10 z-50 flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200">
                <Clock size={18} />
                <h2 className="text-sm font-bold tracking-tight">Histórico</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {sessions.length === 0 ? (
                <div className="text-center text-slate-500 mt-20 flex flex-col items-center">
                  <MessageSquare size={32} className="mb-3 opacity-20" />
                  <p className="text-xs">Nenhuma conversa salva.</p>
                </div>
              ) : (
                sessions.sort((a, b) => b.timestamp - a.timestamp).map((session) => (
                  <motion.div 
                    key={session.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => onSelectSession(session)}
                    className={clsx(
                      "group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border",
                      currentSessionId === session.id 
                        ? "bg-blue-600/10 border-blue-500/30 text-white" 
                        : "bg-transparent border-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <MessageSquare size={16} className={currentSessionId === session.id ? "text-blue-500" : "text-slate-600"} />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.title || 'Nova Conversa'}
                      </p>
                      <p className="text-[10px] opacity-50 truncate mt-0.5">
                        {new Date(session.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    
                    <button
                      onClick={(e) => onDeleteSession(e, session.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-white/5">
               <div className="text-[10px] text-slate-600 text-center">
                  Armazenado localmente no navegador
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
