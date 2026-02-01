import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandHistoryItem } from '../types';
import { Trash2, Play, Copy, Star, CheckSquare, Square, Terminal, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface CommandSidebarProps {
  commands: CommandHistoryItem[];
  onExecute: (item: CommandHistoryItem) => void;
  onDelete: (ids: string[]) => void;
  onFavorite: (command: string) => void;
}

export const CommandSidebar: React.FC<CommandSidebarProps> = ({ commands, onExecute, onDelete, onFavorite }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    <div className="w-80 h-full flex flex-col bg-[#09090b] border-r border-white/10">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-[#0c0c0e]">
        <div className="flex items-center gap-2 text-xs font-bold font-mono tracking-wider text-slate-300 uppercase">
           <Terminal size={14} className="text-blue-500" />
           <span>CMD_QUEUE</span>
        </div>
        
        {commands.length > 0 && (
            <div className="flex items-center gap-1">
                <button 
                    onClick={toggleSelectAll}
                    className="p-1.5 text-slate-500 hover:text-white transition-colors"
                    title="Selecionar Tudo"
                >
                    {selectedIds.size === commands.length ? <CheckSquare size={14} /> : <Square size={14} />}
                </button>
                {selectedIds.size > 0 && (
                    <button 
                        onClick={handleDeleteSelected}
                        className="p-1.5 text-red-500 hover:text-red-400 transition-colors"
                        title="Excluir Selecionados"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-0 space-y-0">
        <AnimatePresence initial={false}>
            {commands.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-40 text-slate-600 text-[10px] font-mono text-center px-6"
                >
                    <Terminal size={24} className="mb-3 opacity-20" />
                    <p>AWAITING INPUT...</p>
                </motion.div>
            ) : (
                commands.map((item) => (
                <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10, height: 0 }}
                    className={clsx(
                        "group relative p-3 border-b border-white/5 transition-all duration-200",
                        selectedIds.has(item.id) 
                            ? "bg-blue-500/5" 
                            : "hover:bg-white/5 bg-[#09090b]"
                    )}
                >
                    {selectedIds.has(item.id) && (
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500" />
                    )}

                    <div className="flex items-start gap-3">
                        <button 
                            onClick={() => toggleSelect(item.id)}
                            className="mt-1 text-slate-600 hover:text-blue-500 transition-colors"
                        >
                            {selectedIds.has(item.id) ? <CheckSquare size={14} className="text-blue-500" /> : <Square size={14} />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                                <ChevronRight size={10} className="text-emerald-500" />
                                <code className="block text-xs font-mono text-slate-200 break-all leading-relaxed">
                                    {item.command}
                                </code>
                            </div>
                            <div className="text-[10px] text-slate-600 font-mono pl-3.5">
                                {new Date(item.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>

                    {/* Actions (Visible on hover or focused) */}
                    <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button
                            onClick={() => navigator.clipboard.writeText(item.command)}
                            className="p-1 text-slate-500 hover:text-white transition-colors"
                            title="Copiar"
                         >
                            <Copy size={12} />
                         </button>
                         <button
                            onClick={() => onFavorite(item.command)}
                            className="p-1 text-slate-500 hover:text-yellow-500 transition-colors"
                            title="Favoritar"
                         >
                            <Star size={12} />
                         </button>
                         <button
                            onClick={() => onExecute(item)}
                            className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold font-mono uppercase tracking-wider transition-colors ml-2"
                         >
                            <Play size={8} fill="currentColor" />
                            Run
                         </button>
                    </div>
                </motion.div>
                ))
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};
