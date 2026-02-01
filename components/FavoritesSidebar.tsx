import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FavoriteItem, FavoriteCommand } from '../types';
import { Modal } from './Modal';
import { v4 as uuidv4 } from 'uuid';
import { Folder, FolderPlus, Plus, Play, Trash2, Edit2, Copy, ChevronRight, Star } from 'lucide-react';
import { clsx } from 'clsx';

interface FavoritesSidebarProps {
  favorites: FavoriteItem[];
  onExecute: (item: FavoriteCommand) => void;
  onRemove: (id: string) => void;
  onReorder: (newOrder: FavoriteItem[]) => void;
  onAdd: (item: FavoriteItem) => void;
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
  
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState('');

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // --- Recursive Helpers ---
  const findItem = (items: FavoriteItem[], id: string): FavoriteItem | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.type === 'folder') {
        const found = findItem(item.items, id);
        if (found) return found;
      }
    }
    return null;
  };

  const removeItem = (items: FavoriteItem[], id: string): FavoriteItem[] => {
    return items.filter(i => i.id !== id).map(i => {
      if (i.type === 'folder') {
        return { ...i, items: removeItem(i.items, id) };
      }
      return i;
    });
  };

  const addItemToFolder = (items: FavoriteItem[], folderId: string, itemToAdd: FavoriteItem): FavoriteItem[] => {
    return items.map(i => {
      if (i.id === folderId && i.type === 'folder') {
        return { ...i, items: [...i.items, itemToAdd] };
      }
      if (i.type === 'folder') {
        return { ...i, items: addItemToFolder(i.items, folderId, itemToAdd) };
      }
      return i;
    });
  };

  const updateItemLabel = (items: FavoriteItem[], id: string, newLabel: string): FavoriteItem[] => {
      return items.map(i => {
          if (i.id === id) {
              if (i.type === 'folder') return { ...i, name: newLabel };
              return { ...i, label: newLabel };
          }
          if (i.type === 'folder') {
              return { ...i, items: updateItemLabel(i.items, id, newLabel) };
          }
          return i;
      });
  };
  
  const toggleFolderOpen = (items: FavoriteItem[], id: string): FavoriteItem[] => {
      return items.map(i => {
          if (i.id === id && i.type === 'folder') {
              return { ...i, isOpen: !i.isOpen };
          }
          if (i.type === 'folder') {
              return { ...i, items: toggleFolderOpen(i.items, id) };
          }
          return i;
      });
  };

  // --- Handlers ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedItemId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData('text/plain') || draggedItemId; 
    
    if (!id || id === folderId) {
        setDraggedItemId(null);
        return;
    }

    const draggedItem = findItem(favorites, id);
    if (!draggedItem) {
        setDraggedItemId(null);
        return;
    }

    if (draggedItem.type === 'folder') {
        const isTargetDescendant = findItem(draggedItem.items, folderId);
        if (isTargetDescendant) {
            setDraggedItemId(null);
            return;
        }
    }

    const tempTree = removeItem(favorites, id);
    const newTree = addItemToFolder(tempTree, folderId, draggedItem);
    
    onReorder(newTree);
    setDraggedItemId(null);
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain') || draggedItemId;

      if (!id) {
          setDraggedItemId(null);
          return;
      }

      const isInRoot = favorites.some(i => i.id === id);
      if (isInRoot) {
          setDraggedItemId(null);
          return;
      }

      const draggedItem = findItem(favorites, id);
      if (!draggedItem) {
          setDraggedItemId(null);
          return;
      }

      const tempTree = removeItem(favorites, id);
      const newTree = [...tempTree, draggedItem];

      onReorder(newTree);
      setDraggedItemId(null);
  };

  const handleAddCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCommand.trim()) {
      onAdd({
        id: uuidv4(),
        type: 'command',
        command: newCommand.trim(),
        label: newLabel.trim() || newCommand.trim()
      });
      setNewCommand('');
      setNewLabel('');
      setIsModalOpen(false);
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
      e.preventDefault();
      if (newFolderName.trim()) {
          onAdd({
              id: uuidv4(),
              type: 'folder',
              name: newFolderName.trim(),
              isOpen: true,
              items: []
          });
          setNewFolderName('');
          setIsFolderModalOpen(false);
      }
  };

  const startEditing = (item: FavoriteItem) => {
      setEditingId(item.id);
      setEditLabelValue(item.type === 'folder' ? item.name : item.label);
  };

  const saveEditing = () => {
      if (editingId && editLabelValue.trim()) {
          const newTree = updateItemLabel(favorites, editingId, editLabelValue.trim());
          onReorder(newTree);
      }
      setEditingId(null);
      setEditLabelValue('');
  };
  
  const handleToggleFolder = (id: string) => {
      onReorder(toggleFolderOpen(favorites, id));
  };


  // --- Render Component ---

  const RecursiveItem: React.FC<{ item: FavoriteItem; level: number }> = ({ item, level }) => {
    const isFolder = item.type === 'folder';
    const isEditing = editingId === item.id;
    
    if (isFolder) {
        return (
            <motion.div 
                layout
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-1 select-none"
                style={{ marginLeft: level > 0 ? '12px' : '0' }}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnFolder(e, item.id)}
            >
                <div 
                    className={clsx(
                        "group flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer",
                        "bg-[#121214] border-white/5 hover:border-white/10 hover:bg-white/5",
                        draggedItemId === item.id && "opacity-40 border-dashed border-blue-500"
                    )}
                    onClick={() => handleToggleFolder(item.id)}
                >
                     <div className="flex items-center gap-2 flex-1 overflow-hidden text-slate-300 group-hover:text-white transition-colors">
                        <motion.div 
                            initial={false}
                            animate={{ rotate: item.isOpen ? 90 : 0 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                        >
                             <ChevronRight size={14} />
                        </motion.div>
                        <Folder size={14} className="text-yellow-500/80" />
                        
                        {isEditing ? (
                            <input 
                                autoFocus
                                type="text"
                                value={editLabelValue}
                                onChange={(e) => setEditLabelValue(e.target.value)}
                                onBlur={saveEditing}
                                onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-black/50 text-white text-xs px-1 py-0.5 rounded w-full border border-blue-500 outline-none"
                            />
                        ) : (
                            <span 
                                className="text-xs font-medium truncate"
                                onDoubleClick={(e) => { e.stopPropagation(); startEditing(item); }}
                            >
                                {item.name}
                            </span>
                        )}
                     </div>

                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={(e) => { e.stopPropagation(); startEditing(item); }}
                            className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded"
                        >
                            <Edit2 size={12} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                            className="p-1 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded"
                        >
                            <Trash2 size={12} />
                        </button>
                     </div>
                </div>

                <AnimatePresence>
                    {item.isOpen && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden pl-2 border-l border-white/5 ml-2 mt-1"
                        >
                            {item.items.length > 0 ? (
                                 item.items.map(subItem => (
                                    <RecursiveItem key={subItem.id} item={subItem} level={level + 1} />
                                ))
                            ) : (
                                 <div className="text-[10px] text-slate-600 ml-6 py-2 italic">
                                    Pasta vazia
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    }

    const favCommand = item as FavoriteCommand;
    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={clsx(
                "group relative p-3 rounded-lg border transition-all duration-200 mb-2",
                "bg-[#121214] border-white/5 hover:border-white/10 hover:bg-white/5",
                draggedItemId === item.id && "opacity-40 border-dashed border-blue-500"
            )}
            style={{ marginLeft: level > 0 ? '12px' : '0' }}
            draggable={!isEditing}
            onDragStart={(e) => handleDragStart(e, item.id)}
        >
             <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                     {isEditing ? (
                            <input 
                                autoFocus
                                type="text"
                                value={editLabelValue}
                                onChange={(e) => setEditLabelValue(e.target.value)}
                                onBlur={saveEditing}
                                onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                                className="bg-black/50 text-white text-xs px-1 py-0.5 rounded w-full border border-blue-500 outline-none mb-2"
                            />
                        ) : (
                            <span 
                                className="text-xs font-medium text-slate-200 truncate cursor-pointer hover:text-white flex items-center gap-1.5"
                                onDoubleClick={() => startEditing(item)}
                            >
                                <Star size={10} className="text-yellow-500" fill="currentColor" />
                                {item.label}
                            </span>
                        )}
                </div>

                <code className="block text-xs font-mono text-emerald-400 break-all mb-2 bg-black/20 p-1.5 rounded border border-white/5">
                    {item.command}
                </code>
                
                {/* Actions */}
                <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                     <button
                        onClick={() => navigator.clipboard.writeText(item.command)}
                        className="p-1 text-slate-500 hover:text-white hover:bg-white/10 rounded"
                        title="Copiar"
                     >
                        <Copy size={12} />
                     </button>
                     <button
                        onClick={() => startEditing(item)}
                        className="p-1 text-slate-500 hover:text-white hover:bg-white/10 rounded"
                        title="Editar"
                     >
                        <Edit2 size={12} />
                     </button>
                     <button
                        onClick={() => onRemove(item.id)}
                        className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                        title="Remover"
                     >
                        <Trash2 size={12} />
                     </button>
                     <button
                        onClick={() => onExecute(favCommand)}
                        className="flex items-center gap-1.5 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded transition-colors ml-1 shadow-lg shadow-blue-900/20"
                     >
                        <Play size={10} fill="currentColor" />
                        Run
                     </button>
                </div>
            </div>
        </motion.div>
    );
  };

  return (
    <div className="w-[672px] flex-shrink-0 h-full flex flex-col bg-[#09090b] border-l border-white/5">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/5 bg-[#09090b]">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
           <Star size={16} className="text-yellow-500" fill="currentColor" />
           <span>Favoritos</span>
        </div>
        <div className="flex gap-1">
            <button
                onClick={() => setIsFolderModalOpen(true)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                title="Nova Pasta"
            >
                <FolderPlus size={16} />
            </button>
            <button
                onClick={() => setIsModalOpen(true)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                title="Novo Comando"
            >
                <Plus size={16} />
            </button>
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2"
        onDragOver={handleDragOver}
        onDrop={handleDropOnRoot}
      >
        <AnimatePresence mode='popLayout'>
            {favorites.length === 0 ? (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-40 text-slate-500 text-xs text-center px-6"
            >
                <Star size={24} className="mb-2 opacity-20" />
                <p>Arraste comandos aqui para salvar.</p>
            </motion.div>
            ) : (
                favorites.map((fav) => (
                    <RecursiveItem key={fav.id} item={fav} level={0} />
                ))
            )}
        </AnimatePresence>
      </div>

      {/* Add Command Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Adicionar Favorito">
        <form onSubmit={handleAddCommand} className="space-y-4">
           <div>
             <label className="block text-xs font-medium text-slate-400 mb-1">Comando</label>
             <textarea 
               value={newCommand}
               onChange={(e) => setNewCommand(e.target.value)}
               className="w-full bg-[#121214] border border-white/10 rounded p-2 text-sm text-white focus:border-blue-500 outline-none font-mono"
               rows={3}
               placeholder="docker ps -a"
               required
             />
           </div>
           <div>
             <label className="block text-xs font-medium text-slate-400 mb-1">Nome/Label</label>
             <input 
               type="text"
               value={newLabel}
               onChange={(e) => setNewLabel(e.target.value)}
               className="w-full bg-[#121214] border border-white/10 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
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

      {/* Create Folder Modal */}
      <Modal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} title="Nova Pasta">
          <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Nome da Pasta</label>
                  <input 
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="w-full bg-[#121214] border border-white/10 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                      placeholder="Meus Scripts"
                      required
                  />
              </div>
              <div className="flex justify-end pt-2">
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-sm">
                      Criar Pasta
                  </button>
              </div>
          </form>
      </Modal>
    </div>
  );
};