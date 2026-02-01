import React, { useState } from 'react';
import { FavoriteCommand } from '../types';
import { Modal } from './Modal';
import { v4 as uuidv4 } from 'uuid';

interface FavoritesSidebarProps {
  favorites: FavoriteCommand[];
  onExecute: (item: FavoriteCommand) => void;
  onRemove: (id: string) => void;
  onReorder: (newOrder: FavoriteCommand[]) => void;
  onAdd: (command: FavoriteCommand) => void;
}

export const FavoritesSidebar: React.FC<FavoritesSidebarProps> = ({ 
  favorites, 
  onExecute, 
  onRemove, 
  onReorder,
  onAdd 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCommand, setNewCommand] = useState('');
  const [newLabel, setNewLabel] = useState('');

  // ... existing state and handlers ...

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newFavorites = [...favorites];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newFavorites.length) {
      [newFavorites[index], newFavorites[targetIndex]] = [newFavorites[targetIndex], newFavorites[index]];
      onReorder(newFavorites);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCommand.trim()) {
      onAdd({
        id: uuidv4(),
        command: newCommand.trim(),
        label: newLabel.trim() || newCommand.trim()
      });
      setNewCommand('');
      setNewLabel('');
      setIsModalOpen(false);
    }
  };

  return (
    <div className="w-[640px] bg-[#0d1117] border-l border-slate-800 flex flex-col h-full animate-[slideInLeft_0.3s_ease-out]">
      <div className="p-4 border-b border-slate-800 bg-[#161b22] flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Favoritos
        </h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
          title="Adicionar comando manual"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {favorites.length === 0 ? (
           <div className="text-center mt-10 text-slate-600 text-xs px-4">
              Adicione comandos favoritos para acesso rápido.
           </div>
        ) : (
          favorites.map((fav, index) => (
            <div 
              key={fav.id}
              className="group bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 rounded-lg p-3 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-medium text-xs text-blue-200 truncate pr-2" title={fav.label}>
                  {fav.label}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={() => navigator.clipboard.writeText(fav.command)}
                     className="p-0.5 hover:text-blue-400 text-slate-500 mr-1"
                     title="Copiar"
                   >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                   </button>
                   <button 
                     onClick={() => handleMove(index, 'up')}
                     disabled={index === 0}
                     className="p-0.5 hover:text-white text-slate-500 disabled:opacity-30"
                   >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                   </button>
                   <button 
                     onClick={() => handleMove(index, 'down')}
                     disabled={index === favorites.length - 1}
                     className="p-0.5 hover:text-white text-slate-500 disabled:opacity-30"
                   >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                   </button>
                   <button 
                     onClick={() => onRemove(fav.id)}
                     className="p-0.5 hover:text-red-400 text-slate-500 ml-1"
                   >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                </div>
              </div>

              <code className="block text-[10px] font-mono text-emerald-400 truncate mb-2 bg-black/30 p-1 rounded" title={fav.command}>
                {fav.command}
              </code>

              {/* Output Display */}
              {fav.output && (
                  <div className="mt-2 bg-black/50 rounded p-2 border border-slate-700 overflow-x-auto mb-2">
                      <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap">
                          {fav.output}
                      </pre>
                  </div>
              )}

              <button
                onClick={() => onExecute(fav)}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-slate-700 hover:bg-blue-600 text-white text-[10px] font-bold rounded transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Executar
              </button>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Adicionar Favorito">
        <form onSubmit={handleSubmit} className="space-y-4">
           <div>
             <label className="block text-xs font-medium text-slate-400 mb-1">Comando</label>
             <textarea 
               value={newCommand}
               onChange={(e) => setNewCommand(e.target.value)}
               className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-blue-500 outline-none font-mono"
               rows={3}
               placeholder="docker ps -a"
               required
             />
           </div>
           <div>
             <label className="block text-xs font-medium text-slate-400 mb-1">Nome/Label (Opcional)</label>
             <input 
               type="text"
               value={newLabel}
               onChange={(e) => setNewLabel(e.target.value)}
               className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
               placeholder="Listar containers"
             />
           </div>
           <div className="flex justify-end pt-2">
             <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-sm">
               Salvar
             </button>
           </div>
        </form>
      </Modal>
    </div>
  );
};
