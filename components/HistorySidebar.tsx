import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatSession } from '../types';
import { Clock, MessageSquare, Trash2, X, Pencil, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (e: React.MouseEvent, sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const startEditing = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title || 'Nova Conversa');
  };

  const saveEditing = (e: React.MouseEvent | React.KeyboardEvent, sessionId: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
        onRenameSession(sessionId, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, sessionId: string) => {
      if (e.key === 'Enter') {
          saveEditing(e, sessionId);
      } else if (e.key === 'Escape') {
          setEditingId(null);
      }
  };

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
                    <MessageSquare size={16} className={clsx("flex-shrink-0", currentSessionId === session.id ? "text-blue-500" : "text-slate-600")} />
                    
                    <div className="flex-1 min-w-0">
                      {editingId === session.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input 
                                autoFocus
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, session.id)}
                                onBlur={() => setEditingId(null)}
                                className="w-full bg-[#121214] border border-blue-500/50 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                              />
                          </div>
                      ) : (
                        <>
                          <p className="text-xs font-medium truncate pr-8">
                            {session.title || 'Nova Conversa'}
                          </p>
                          <p className="text-[10px] opacity-50 truncate mt-0.5">
                            {new Date(session.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </>
                      )}
                    </div>
                    
                    {editingId !== session.id && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#09090b] shadow-[-10px_0_10px_#09090b]">
                            <button
                                onClick={(e) => startEditing(e, session)}
                                className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded transition-all"
                                title="Renomear"
                            >
                                <Pencil size={12} />
                            </button>
                            <button
                                onClick={(e) => onDeleteSession(e, session.id)}
                                className="p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-all"
                                title="Excluir"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    )}
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
