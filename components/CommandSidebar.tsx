import React, { useState } from 'react';
import { CommandHistoryItem } from '../types';

interface CommandSidebarProps {
  commands: CommandHistoryItem[];
  onExecute: (item: CommandHistoryItem) => void;
  onDelete: (ids: string[]) => void;
  onFavorite: (command: string) => void;
}

export const CommandSidebar: React.FC<CommandSidebarProps> = ({ commands, onExecute, onDelete, onFavorite }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // ... existing code ...

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === commands.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(commands.map(c => c.id)));
    }
  };

  const handleDeleteSelected = () => {
    onDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="w-[640px] bg-[#0d1117] border-r border-slate-800 flex flex-col h-full animate-[slideInRight_0.3s_ease-out]">
      <div className="p-4 border-b border-slate-800 bg-[#161b22]">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3">
            Fila de Comandos
        </h3>
        
        <div className="flex items-center justify-between gap-2">
            <button 
                onClick={toggleSelectAll}
                className="text-[10px] font-medium text-slate-400 hover:text-white flex items-center gap-1"
            >
                <div className={`w-3 h-3 border rounded-sm ${selectedIds.size === commands.length && commands.length > 0 ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}></div>
                Selecionar Tudo
            </button>
            
            {selectedIds.size > 0 && (
                <button 
                    onClick={handleDeleteSelected}
                    className="text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-1 rounded"
                >
                    Excluir ({selectedIds.size})
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {commands.length === 0 ? (
            <div className="text-center mt-10 text-slate-600 text-xs px-4">
                Comandos executados aparecerão aqui para reutilização.
            </div>
        ) : (
            commands.map((item) => (
            <div 
                key={item.id} 
                className={`
                    group relative p-3 rounded-lg border transition-all duration-200
                    ${selectedIds.has(item.id) 
                        ? 'bg-blue-900/20 border-blue-500/30' 
                        : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                    }
                `}
            >
                <div className="flex items-start gap-3">
                    <input 
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="mt-1 rounded border-slate-600 bg-slate-700/50 text-blue-500 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                    />
                    
                    <div className="flex-1 min-w-0">
                        <code className="block text-xs font-mono text-emerald-400 break-all mb-1" title={item.command}>
                            {item.command}
                        </code>
                        <div className="text-[10px] text-slate-500 flex justify-between">
                            <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                        </div>

                        {/* Output Display */}
                        {item.output && (
                            <div className="mt-3 bg-black/50 rounded p-2 border border-slate-700 overflow-x-auto">
                                <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap">
                                    {item.output}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>

            {/* Action Buttons (Always Visible) */}
            <div className="flex justify-end gap-2 mt-2">
                     <button
                        onClick={() => {
                            navigator.clipboard.writeText(item.command);
                        }}
                        className="p-1 text-slate-500 hover:text-blue-400 transition-colors"
                        title="Copiar"
                     >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                     </button>
                     <button
                        onClick={() => onFavorite(item.command)}
                        className="p-1 text-slate-500 hover:text-yellow-400 transition-colors"
                        title="Favoritar"
                     >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                     </button>
                     <button
                        onClick={() => onDelete([item.id])}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Remover"
                     >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                     <button
                        onClick={() => onExecute(item)}
                        className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                        title="Executar novamente"
                     >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Executar
                     </button>
                </div>
            </div>
            ))
        )}
      </div>
    </div>
  );
};
