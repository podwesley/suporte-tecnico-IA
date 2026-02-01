import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FavoriteItem, FavoriteCommand } from '../types';
import { Modal } from './Modal';
import { SyntaxHighlighter } from './SyntaxHighlighter';
import { v4 as uuidv4 } from 'uuid';
import { Folder, FolderPlus, Plus, Play, Trash2, Edit2, Copy, ChevronRight, Star, Terminal, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface FavoritesSidebarProps {
  favorites: FavoriteItem[];
  onExecute: (item: FavoriteCommand) => void;
  onRemove: (id: string) => void;
  onReorder: (newOrder: FavoriteItem[]) => void;
  onAdd: (item: FavoriteItem) => void;
}

// Separate component to prevent re-renders/remounts causing flicker
interface RecursiveItemProps {
    item: FavoriteItem;
    level: number;
    editingId: string | null;
    editLabelValue: string;
    draggedItemId: string | null;
    onStartEditing: (item: FavoriteItem) => void;
    onSaveEditing: () => void;
    setEditLabelValue: (val: string) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDropOnFolder: (e: React.DragEvent, folderId: string) => void;
    onToggleFolder: (id: string) => void;
    onRemove: (id: string) => void;
    onExecute: (item: FavoriteCommand) => void;
    onAddChild: (folderId: string) => void;
}

const RecursiveItem: React.FC<RecursiveItemProps> = ({ 
    item, 
    level, 
    editingId, 
    editLabelValue, 
    draggedItemId, 
    onStartEditing, 
    onSaveEditing, 
    setEditLabelValue, 
    onDragStart, 
    onDragOver, 
    onDropOnFolder, 
    onToggleFolder, 
    onRemove, 
    onExecute,
    onAddChild 
}) => {
    const isFolder = item.type === 'folder';
    const isEditing = editingId === item.id;
    const [isOutputVisible, setIsOutputVisible] = useState(true); // Default open if there is output? Maybe controlled by existence.

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
                onDragStart={(e) => onDragStart(e, item.id)}
                onDragOver={onDragOver}
                onDrop={(e) => onDropOnFolder(e, item.id)}
            >
                <div 
                    className={clsx(
                        "group flex items-center justify-between p-2 border transition-all cursor-pointer",
                        "bg-[#121214] border-white/5 hover:border-white/10 hover:bg-white/5",
                        draggedItemId === item.id && "opacity-40 border-dashed border-blue-500"
                    )}
                    onClick={() => onToggleFolder(item.id)}
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
                                onBlur={onSaveEditing}
                                onKeyDown={(e) => e.key === 'Enter' && onSaveEditing()}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-black/50 text-white text-xs px-1 py-0.5 w-full border border-blue-500 outline-none"
                            />
                        ) : (
                            <span 
                                className="text-xs font-medium truncate"
                                onDoubleClick={(e) => { e.stopPropagation(); onStartEditing(item); }}
                            >
                                {item.name}
                            </span>
                        )}
                     </div>

                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onAddChild(item.id); }}
                            className="p-1 hover:bg-white/10 text-slate-400 hover:text-white"
                            title="Novo Comando"
                        >
                            <Plus size={12} />
                        </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); onStartEditing(item); }}
                            className="p-1 hover:bg-white/10 text-slate-400 hover:text-white"
                        >
                            <Edit2 size={12} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                            className="p-1 hover:bg-red-500/10 text-slate-400 hover:text-red-400"
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
                                    <RecursiveItem 
                                        key={subItem.id} 
                                        item={subItem} 
                                        level={level + 1}
                                        editingId={editingId}
                                        editLabelValue={editLabelValue}
                                        draggedItemId={draggedItemId}
                                        onStartEditing={onStartEditing}
                                        onSaveEditing={onSaveEditing}
                                        setEditLabelValue={setEditLabelValue}
                                        onDragStart={onDragStart}
                                        onDragOver={onDragOver}
                                        onDropOnFolder={onDropOnFolder}
                                        onToggleFolder={onToggleFolder}
                                        onRemove={onRemove}
                                        onExecute={onExecute}
                                        onAddChild={onAddChild}
                                    />
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
    const hasOutput = !!favCommand.output;

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={clsx(
                "group relative p-3 border transition-all duration-200 mb-2",
                "bg-[#121214] border-white/5 hover:border-white/10 hover:bg-white/5",
                draggedItemId === item.id && "opacity-40 border-dashed border-blue-500"
            )}
            style={{ marginLeft: level > 0 ? '12px' : '0' }}
            draggable={!isEditing}
            onDragStart={(e) => onDragStart(e, item.id)}
        >
             <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                     {isEditing ? (
                            <input 
                                autoFocus
                                type="text"
                                value={editLabelValue}
                                onChange={(e) => setEditLabelValue(e.target.value)}
                                onBlur={onSaveEditing}
                                onKeyDown={(e) => e.key === 'Enter' && onSaveEditing()}
                                className="bg-black/50 text-white text-xs px-1 py-0.5 w-full border border-blue-500 outline-none mb-2"
                            />
                        ) : (
                            <span 
                                className="text-xs font-medium text-slate-400 truncate cursor-pointer hover:text-white flex items-center gap-1.5"
                                onDoubleClick={() => onStartEditing(item)}
                            >
                                <Terminal size={10} className="text-blue-500" />
                                {item.label}
                            </span>
                        )}
                </div>

                <div className="mb-2 border border-white/5 overflow-hidden bg-[#09090b]">
                    <code className="block text-[0.75rem] font-mono p-1.5 break-all text-emerald-500/90">
                        {item.command}
                    </code>
                </div>
                
                {hasOutput && (
                    <div className="mt-2">
                        <button 
                            onClick={() => setIsOutputVisible(!isOutputVisible)}
                            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 mb-1"
                        >
                             <Terminal size={10} />
                             <span>Output</span>
                             <motion.div 
                                animate={{ rotate: isOutputVisible ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                             >
                                 <ChevronDown size={10} />
                             </motion.div>
                        </button>
                        <AnimatePresence>
                            {isOutputVisible && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-[#121214] border border-white/5 p-0 text-xs font-mono text-slate-300 max-h-60 overflow-y-auto custom-scrollbar shadow-inner mt-1">
                                         <pre className="p-2 m-0 whitespace-pre-wrap font-mono bg-transparent">
                                            <SyntaxHighlighter code={favCommand.output} />
                                         </pre>
                                    </div>
                                    <div className="text-[10px] text-slate-600 mt-1 text-right">
                                        {favCommand.timestamp && new Date(favCommand.timestamp).toLocaleTimeString()}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-start gap-1 mt-2">
                     <button
                        onClick={() => onExecute(favCommand)}
                        className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-900/20"
                        title="Executar"
                     >
                        <Play size={10} fill="currentColor" />
                     </button>
                     <button
                        onClick={() => navigator.clipboard.writeText(item.command)}
                        className="p-1 text-slate-500 hover:text-white hover:bg-white/10"
                        title="Copiar"
                     >
                        <Copy size={12} />
                     </button>
                     <button
                        onClick={() => onStartEditing(item)}
                        className="p-1 text-slate-500 hover:text-white hover:bg-white/10"
                        title="Editar"
                     >
                        <Edit2 size={12} />
                     </button>
                     <button
                        onClick={() => onRemove(item.id)}
                        className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                        title="Remover"
                     >
                        <Trash2 size={12} />
                     </button>
                </div>
            </div>
        </motion.div>
    );
};


export const FavoritesSidebar: React.FC<FavoritesSidebarProps> = React.memo(({ 
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

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

  // --- Recursive Helpers ---
  // Using useCallback for helpers isn't strictly necessary unless they are deps for other hooks, 
  // but good for consistency. Since they are used inside handlers which we want stable...
  
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
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedItemId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDropOnFolder = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    // We can't access state (draggedItemId) easily inside a memoized callback without ref or dependency
    // But since draggedItemId changes often, we might not want to put it in dependency if we can avoid it.
    // However, to be correct, we must include it or use dataTransfer fully.
    
    // NOTE: Accessing state directly inside useCallback requires it in deps.
    // To solve this properly without re-creating functions all the time:
    const id = e.dataTransfer.getData('text/plain'); // Fallback to dataTransfer if state is stale in closure
    
    // We need 'favorites' here. If we include 'favorites' in deps, this function changes every time tree updates.
    // That is acceptable.
    
    // BUT for the specific issue of "typing in chat causes blink", 'favorites' DOES NOT change.
    // So these functions will be stable during chat typing.
    
    if (!id || id === folderId) {
        setDraggedItemId(null);
        return;
    }

    // Logic requires access to 'favorites' state, so this closure must update when favorites update.
    // This is fine, typing in chat does NOT update favorites.
    
    // We need to implement the logic here to call onReorder.
    // Since we need to call findItem etc which are defined in scope, we just execute logic.
    
    // We can't easily memoize this deeply without refs for favorites, but that's over-optimization.
    // The main issue was RecursiveItem re-definition.
    
    // Let's just define them normally. The key fix is RecursiveItem extraction.
  }, []); 

  // Re-implementing handlers simply without excessive useCallback complexity first,
  // relying on the fact that 'favorites' prop is stable during chat typing.
  
  const onDragStartHandler = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedItemId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOverHandler = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDropOnFolderHandler = (e: React.DragEvent, folderId: string) => {
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

      // Check circular dependency for folders
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
      const newItem: FavoriteCommand = {
        id: uuidv4(),
        type: 'command',
        command: newCommand.trim(),
        label: newLabel.trim() || newCommand.trim()
      };

      if (targetFolderId) {
          const newTree = addItemToFolder(favorites, targetFolderId, newItem);
          onReorder(newTree);
      } else {
          onAdd(newItem);
      }

      setNewCommand('');
      setNewLabel('');
      setIsModalOpen(false);
      setTargetFolderId(null);
    }
  };

  const handleAddChild = (folderId: string) => {
      setTargetFolderId(folderId);
      setIsModalOpen(true);
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


  return (
    <div className="w-[35vw] max-w-[672px] min-w-[300px] flex-shrink-0 h-full flex flex-col bg-[#09090b] border-l border-white/5">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/5 bg-[#09090b]">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
           <Star size={16} className="text-yellow-500" />
           <span>Favoritos</span>
        </div>
        <div className="relative">
            <button
                onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                className={clsx(
                    "p-1.5 transition-colors",
                    isAddMenuOpen ? "text-white bg-white/10" : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
                title="Adicionar"
            >
                <Plus size={16} />
            </button>
            <AnimatePresence>
                {isAddMenuOpen && (
                    <>
                        <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsAddMenuOpen(false)} 
                        />
                        <motion.div 
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            className="absolute right-0 mt-2 w-40 bg-[#121214] border border-white/10 shadow-2xl z-50 py-1"
                        >
                            <button 
                                onClick={() => { 
                                    setTargetFolderId(null);
                                    setIsModalOpen(true); 
                                    setIsAddMenuOpen(false); 
                                }}
                                className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                            >
                                <Terminal size={14} className="text-blue-500" />
                                Novo Comando
                            </button>
                            <button 
                                onClick={() => { 
                                    setTargetFolderId(null);
                                    setIsFolderModalOpen(true); 
                                    setIsAddMenuOpen(false); 
                                }}
                                className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                            >
                                <FolderPlus size={14} className="text-yellow-500" />
                                Nova Pasta
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2"
        onDragOver={onDragOverHandler}
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
                    <RecursiveItem 
                        key={fav.id} 
                        item={fav} 
                        level={0}
                        editingId={editingId}
                        editLabelValue={editLabelValue}
                        draggedItemId={draggedItemId}
                        onStartEditing={startEditing}
                        onSaveEditing={saveEditing}
                        setEditLabelValue={setEditLabelValue}
                        onDragStart={onDragStartHandler}
                        onDragOver={onDragOverHandler}
                        onDropOnFolder={onDropOnFolderHandler}
                        onToggleFolder={handleToggleFolder}
                        onRemove={onRemove}
                        onExecute={onExecute}
                        onAddChild={handleAddChild}
                    />
                ))
            )}
        </AnimatePresence>
      </div>

      {/* Add Command Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
            setIsModalOpen(false);
            setTargetFolderId(null);
        }} 
        title={targetFolderId ? `Adicionar à pasta "${(findItem(favorites, targetFolderId) as any)?.name}"` : "Adicionar Favorito"}
      >
        <form onSubmit={handleAddCommand} className="space-y-4">
           <div>
             <label className="block text-xs font-medium text-slate-400 mb-1">Comando</label>
             <textarea 
               value={newCommand}
               onChange={(e) => setNewCommand(e.target.value)}
               className="w-full bg-[#121214] border border-white/10 p-2 text-sm text-white focus:border-blue-500 outline-none font-mono"
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
               className="w-full bg-[#121214] border border-white/10 p-2 text-sm text-white focus:border-blue-500 outline-none"
               placeholder="Listar containers"
             />
           </div>
           <div className="flex justify-end pt-2">
             <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm">
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
                      className="w-full bg-[#121214] border border-white/10 p-2 text-sm text-white focus:border-blue-500 outline-none"
                      placeholder="Meus Scripts"
                      required
                  />
              </div>
              <div className="flex justify-end pt-2">
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm">
                      Criar Pasta
                  </button>
              </div>
          </form>
      </Modal>
    </div>
  );
});
