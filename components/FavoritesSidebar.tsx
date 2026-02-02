import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FavoriteItem, FavoriteCommand, FavoriteFolder } from '../types';
import { Modal } from './Modal';
import { SyntaxHighlighter } from './SyntaxHighlighter';
import { v4 as uuidv4 } from 'uuid';
import { Folder, FolderPlus, Plus, Play, Trash2, Edit2, Copy, ChevronRight, Star, Terminal, ChevronDown, Loader2, Save } from 'lucide-react';
import { clsx } from 'clsx';

interface FavoritesSidebarProps {
  favorites: FavoriteItem[];
  onExecute: (item: FavoriteCommand) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<FavoriteItem>) => void;
  onReorder: (newOrder: FavoriteItem[]) => void;
  onAdd: (item: FavoriteItem) => void;
  width?: number;
  onResizeStart?: () => void;
  executingFavoriteId?: string | null;
  isHelpMode: boolean;
}

type DropPosition = 'before' | 'after' | 'inside' | null;

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
  onToggleFolder: (id: string) => void;
  onRemove: (id: string) => void;
  onExecute: (item: FavoriteCommand) => void;
  onUpdate: (id: string, updates: Partial<FavoriteItem>) => void;
  onAddChild: (folderId: string) => void;
  onDropAtPosition: (draggedId: string, targetId: string, position: DropPosition) => void;
  executingFavoriteId?: string | null;
  isHelpMode: boolean;
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
  onToggleFolder,
  onRemove,
  onExecute,
  onUpdate,
  onAddChild,
  onDropAtPosition,
  executingFavoriteId,
  isHelpMode
}) => {
  const isFolder = item.type === 'folder';
  const isEditing = editingId === item.id;
  const isExecuting = executingFavoriteId === item.id;
  const [isOutputVisible, setIsOutputVisible] = useState(true);
  const [dropIndicator, setDropIndicator] = useState<DropPosition>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Edit State for Commands
  const [editCommandValue, setEditCommandValue] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Initialize edit values when modal opens
  useEffect(() => {
      if (isEditModalOpen && !isFolder) {
          setEditLabelValue((item as FavoriteCommand).label || '');
          setEditCommandValue((item as FavoriteCommand).command || '');
      }
  }, [isEditModalOpen, item, isFolder, setEditLabelValue]);

  const handleEditClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isFolder) {
          onStartEditing(item);
      } else {
          setIsEditModalOpen(true);
      }
  };

  const handleSaveCommandEdit = (e: React.FormEvent) => {
      e.preventDefault();
      onUpdate(item.id, { 
          label: editLabelValue,
          command: editCommandValue 
      } as Partial<FavoriteCommand>);
      setIsEditModalOpen(false);
  };

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [isExecuting, (item as FavoriteCommand).output]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItemId === item.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const threshold = rect.height / 4;

    if (isFolder) {
      if (y < threshold) setDropIndicator('before');
      else if (y > rect.height - threshold) setDropIndicator('after');
      else setDropIndicator('inside');
    } else {
      if (y < rect.height / 2) setDropIndicator('before');
      else setDropIndicator('after');
    }
  };

  const handleDragLeave = () => setDropIndicator(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const activeId = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (activeId && activeId !== item.id && dropIndicator) {
      onDropAtPosition(activeId, item.id, dropIndicator);
    }
    setDropIndicator(null);
  };

  const containerClasses = clsx(
    "group relative border transition-all duration-200 mb-1",
    "bg-bg-surface border-border-main",
    draggedItemId === item.id ? "opacity-40 border-dashed border-blue-500" : "hover:border-white/10 hover:bg-white/5",
    dropIndicator === 'inside' && isFolder && "ring-1 ring-blue-500 bg-blue-500/10"
  );

  const indicatorLine = (pos: 'before' | 'after') => (
    <div className={clsx(
      "absolute left-0 right-0 h-0.5 bg-blue-500 z-20 pointer-events-none",
      pos === 'before' ? "-top-[1px]" : "-bottom-[1px]"
    )} />
  );

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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={containerClasses} onClick={() => onToggleFolder(item.id)}>
          {dropIndicator === 'before' && indicatorLine('before')}
          {dropIndicator === 'after' && indicatorLine('after')}
          <div className="flex items-center justify-between p-2 cursor-pointer">
            <div className="flex items-center gap-2 flex-1 overflow-hidden text-slate-300 group-hover:text-white transition-colors">
              <motion.div animate={{ rotate: item.isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight size={14} />
              </motion.div>
              <Folder size={14} className={isHelpMode ? 'text-purple-500/80' : 'text-blue-500/80'} />
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
                <span className={`text-xs font-medium truncate ${isHelpMode ? 'text-purple-300 group-hover:text-purple-200' : 'text-blue-300 group-hover:text-blue-200'}`} onDoubleClick={(e) => { e.stopPropagation(); onStartEditing(item); }}>
                  {item.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={(e) => { e.stopPropagation(); onAddChild(item.id); }} className="p-1 hover:bg-white/10 text-slate-400 hover:text-white" title="Novo Comando"><Plus size={12} /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); onStartEditing(item); }} className="p-1 hover:bg-white/10 text-slate-400 hover:text-white"><Edit2 size={12} /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(item.id); }} className="p-1 hover:bg-red-500/10 text-slate-400 hover:text-red-400"><Trash2 size={12} /></button>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {item.isOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-2 border-l border-white/5 ml-2 mt-1">
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
                    onToggleFolder={onToggleFolder}
                    onRemove={onRemove}
                    onExecute={onExecute}
                    onUpdate={onUpdate}
                    onAddChild={onAddChild}
                    onDropAtPosition={onDropAtPosition}
                    executingFavoriteId={executingFavoriteId}
                    isHelpMode={isHelpMode}
                  />
                ))
              ) : (
                <div className="text-[10px] text-white ml-6 py-2 italic">Pasta vazia</div>
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
    <>
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={containerClasses}
      style={{ marginLeft: level > 0 ? '12px' : '0' }}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dropIndicator === 'before' && indicatorLine('before')}
      {dropIndicator === 'after' && indicatorLine('after')}
      <div className="p-3">
        <div className="flex justify-between items-start mb-1">
            <span className={`text-xs font-medium truncate cursor-pointer hover:opacity-80 flex items-center gap-1.5 ${isHelpMode ? 'text-purple-400' : 'text-blue-400'}`} onDoubleClick={handleEditClick}>
              <Terminal size={10} className={isHelpMode ? 'text-purple-500' : 'text-blue-500'} />
              {item.label}
            </span>
        </div>
        <div className="mb-2 border border-border-main overflow-hidden bg-bg-main/50">
          <code className="block text-[0.75rem] font-mono p-1.5 break-all text-emerald-500/90">{item.command}</code>
        </div>
        {(hasOutput || isExecuting) && (
          <div className="mt-2">
            <button onClick={() => setIsOutputVisible(!isOutputVisible)} className="flex items-center gap-1 text-[10px] text-white hover:text-slate-300 mb-1">
              <Terminal size={10} />
              <span>Output</span>
              <motion.div animate={{ rotate: isOutputVisible ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={10} /></motion.div>
            </button>
            <AnimatePresence>
              {isOutputVisible && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div ref={outputRef} className="bg-bg-main/50 border border-border-main p-0 text-xs font-mono text-slate-300 max-h-60 overflow-y-auto custom-scrollbar shadow-inner mt-1 select-text">
                    <pre className="p-2 m-0 whitespace-pre-wrap font-mono bg-transparent min-h-[20px]">
                      {favCommand.output ? (
                        <SyntaxHighlighter code={favCommand.output} />
                      ) : isExecuting ? (
                        <span className="text-white animate-pulse italic">Aguardando saída...</span>
                      ) : null}
                    </pre>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-1 text-right">{favCommand.timestamp && new Date(favCommand.timestamp).toLocaleTimeString()}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <div className="flex justify-start gap-1 mt-2">
          <button
            type="button"
            disabled={isExecuting}
            onClick={(e) => { e.stopPropagation(); onExecute(favCommand); }}
            className={`p-1.5 text-white transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed min-w-[26px] flex items-center justify-center ${isHelpMode ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'}`}
            title="Executar"
          >
            {isExecuting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Loader2 size={10} />
              </motion.div>
            ) : (
              <Play size={10} fill="currentColor" />
            )}
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.command); }} className="p-1 text-slate-500 hover:text-white hover:bg-white/10" title="Copiar"><Copy size={12} /></button>
          <button type="button" onClick={handleEditClick} className="p-1 text-slate-500 hover:text-white hover:bg-white/10" title="Editar"><Edit2 size={12} /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(item.id); }} className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10" title="Remover"><Trash2 size={12} /></button>
        </div>
      </div>
    </motion.div>
    
    <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Favorito">
        <form onSubmit={handleSaveCommandEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Comando</label>
            <textarea value={editCommandValue} onChange={(e) => setEditCommandValue(e.target.value)} className="w-full bg-bg-main border border-border-main p-2 text-sm text-white focus:border-blue-500 outline-none font-mono" rows={3} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Nome/Label</label>
            <input type="text" value={editLabelValue} onChange={(e) => setEditLabelValue(e.target.value)} className="w-full bg-bg-main border border-border-main p-2 text-sm text-white focus:border-blue-500 outline-none" />
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center gap-2">
                <Save size={14} /> Salvar
            </button>
          </div>
        </form>
    </Modal>
    </>
  );
};

export const FavoritesSidebar: React.FC<FavoritesSidebarProps> = React.memo(({
  favorites,
  onExecute,
  onRemove,
  onUpdate,
  onReorder,
  onAdd,
  width = 450,
  onResizeStart,
  executingFavoriteId,
  isHelpMode
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

  const removeItemRecursive = (items: FavoriteItem[], id: string): { cleaned: FavoriteItem[], removed: FavoriteItem | null } => {
    let removed: FavoriteItem | null = null;
    const clean = (list: FavoriteItem[]): FavoriteItem[] => {
      return list.filter(i => {
        if (i.id === id) {
          removed = i;
          return false;
        }
        return true;
      }).map(i => i.type === 'folder' ? { ...i, items: clean(i.items) } : i);
    };
    return { cleaned: clean(items), removed };
  };

  const addItemToFolder = (items: FavoriteItem[], folderId: string, itemToAdd: FavoriteItem): FavoriteItem[] => {
    return items.map(i => {
      if (i.id === folderId && i.type === 'folder') {
        return { ...i, items: [...i.items, itemToAdd], isOpen: true };
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
      if (i.type === 'folder') return { ...i, items: updateItemLabel(i.items, id, newLabel) };
      return i;
    });
  };

  const toggleFolderOpen = (items: FavoriteItem[], id: string): FavoriteItem[] => {
    return items.map(i => {
      if (i.id === id && i.type === 'folder') return { ...i, isOpen: !i.isOpen };
      if (i.type === 'folder') return { ...i, items: toggleFolderOpen(i.items, id) };
      return i;
    });
  };

  const moveItem = (activeId: string, overId: string, placement: DropPosition): FavoriteItem[] => {
    if (!placement) return favorites;
    const { cleaned, removed } = removeItemRecursive(favorites, activeId);
    if (!removed) return favorites;

    if (removed.type === 'folder') {
      const isDescendant = (folder: FavoriteFolder, targetId: string): boolean => {
        return folder.items.some(i => i.id === targetId || (i.type === 'folder' && isDescendant(i, targetId)));
      };
      if (overId === activeId || isDescendant(removed, overId)) return favorites;
    }

    const insert = (list: FavoriteItem[]): FavoriteItem[] => {
      const index = list.findIndex(i => i.id === overId);
      if (index !== -1) {
        if (placement === 'inside' && list[index].type === 'folder') {
          const newList = [...list];
          const folder = newList[index] as FavoriteFolder;
          newList[index] = { ...folder, items: [...folder.items, removed!], isOpen: true };
          return newList;
        }
        const newList = [...list];
        newList.splice(placement === 'before' ? index : index + 1, 0, removed!);
        return newList;
      }
      return list.map(i => i.type === 'folder' ? { ...i, items: insert(i.items) } : i);
    };
    return insert(cleaned);
  };

  const onDragStartHandler = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedItemId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDropAtPositionHandler = (draggedId: string, targetId: string, position: DropPosition) => {
    onReorder(moveItem(draggedId, targetId, position));
    setDraggedItemId(null);
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (!id) return setDraggedItemId(null);
    const { cleaned, removed } = removeItemRecursive(favorites, id);
    if (removed) onReorder([...cleaned, removed]);
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
      if (targetFolderId) onReorder(addItemToFolder(favorites, targetFolderId, newItem));
      else onAdd(newItem);
      setNewCommand(''); setNewLabel(''); setIsModalOpen(false); setTargetFolderId(null);
    }
  };

  const handleAddChild = (folderId: string) => {
    setTargetFolderId(folderId);
    setIsModalOpen(true);
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onAdd({ id: uuidv4(), type: 'folder', name: newFolderName.trim(), isOpen: true, items: [] });
      setNewFolderName(''); setIsFolderModalOpen(false);
    }
  };

  const startEditing = (item: FavoriteItem) => {
    setEditingId(item.id);
    setEditLabelValue(item.type === 'folder' ? item.name : item.label);
  };

  const saveEditing = () => {
    if (editingId && editLabelValue.trim()) onReorder(updateItemLabel(favorites, editingId, editLabelValue.trim()));
    setEditingId(null); setEditLabelValue('');
  };

  const handleToggleFolder = (id: string) => onReorder(toggleFolderOpen(favorites, id));

  return (
    <div className="relative flex-shrink-0 h-full flex flex-col bg-bg-sidebar border-l border-border-main group/sidebar" style={{ width: `${width}px` }}>
      <div className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-50" onMouseDown={onResizeStart} />
      <div className="h-14 px-4 flex items-center justify-between border-b border-border-main bg-bg-sidebar">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Star size={16} className="text-yellow-500" />
          <span>Favoritos</span>
        </div>
        <div className="relative">
          <button type="button" onClick={() => setIsAddMenuOpen(!isAddMenuOpen)} className={clsx("p-1.5 transition-colors", isAddMenuOpen ? "text-white bg-white/10" : "text-slate-400 hover:text-white hover:bg-white/5")} title="Adicionar"><Plus size={16} /></button>
          <AnimatePresence>
            {isAddMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsAddMenuOpen(false)} />
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} className="absolute right-0 mt-2 w-40 bg-bg-surface border border-border-main shadow-2xl z-50 py-1">
                  <button type="button" onClick={() => { setTargetFolderId(null); setIsModalOpen(true); setIsAddMenuOpen(false); }} className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                    <Terminal size={14} className={isHelpMode ? "text-purple-500" : "text-blue-500"} /> Novo Comando
                  </button>
                  <button type="button" onClick={() => { setTargetFolderId(null); setIsFolderModalOpen(true); setIsAddMenuOpen(false); }} className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                    <FolderPlus size={14} className="text-white" /> Nova Pasta
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2" onDragOver={(e) => e.preventDefault()} onDrop={handleDropOnRoot}>
        <AnimatePresence mode='popLayout'>
          {favorites.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-40 text-slate-500 text-xs text-center px-6">
              <Star size={24} className="mb-2 opacity-20 text-yellow-500" />
              <p>Arraste comandos aqui para salvar.</p>
            </motion.div>
          ) : (
            favorites.map((fav) => (
              <RecursiveItem key={fav.id} item={fav} level={0} editingId={editingId} editLabelValue={editLabelValue} draggedItemId={draggedItemId} onStartEditing={startEditing} onSaveEditing={saveEditing} setEditLabelValue={setEditLabelValue} onDragStart={onDragStartHandler} onToggleFolder={handleToggleFolder} onRemove={onRemove} onExecute={onExecute} onUpdate={onUpdate} onAddChild={handleAddChild} onDropAtPosition={onDropAtPositionHandler} executingFavoriteId={executingFavoriteId} isHelpMode={isHelpMode} />
            ))
          )}
        </AnimatePresence>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setTargetFolderId(null); }} title={targetFolderId ? `Adicionar à pasta "${(findItem(favorites, targetFolderId) as any)?.name}"` : "Adicionar Favorito"}>
        <form onSubmit={handleAddCommand} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Comando</label>
            <textarea value={newCommand} onChange={(e) => setNewCommand(e.target.value)} className="w-full bg-bg-main border border-border-main p-2 text-sm text-white focus:border-blue-500 outline-none font-mono" rows={3} placeholder="docker ps -a" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Nome/Label</label>
            <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="w-full bg-bg-main border border-border-main p-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="Listar containers" />
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm">Salvar</button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} title="Nova Pasta">
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Nome da Pasta</label>
            <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full bg-bg-main border border-border-main p-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="Meus Scripts" required />
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm">Criar Pasta</button>
          </div>
        </form>
      </Modal>
    </div>
  );
});