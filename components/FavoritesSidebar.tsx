import React, { useState, useRef } from 'react';
import { FavoriteItem, FavoriteCommand, FavoriteFolder } from '../types';
import { Modal } from './Modal';
import { v4 as uuidv4 } from 'uuid';

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
  
  // Folder Creation State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Edit Label State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState('');

  // Drag and Drop State
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
    const id = e.dataTransfer.getData('text/plain') || draggedItemId; // Fallback to state if dataTransfer is empty (some browsers)
    
    if (!id || id === folderId) {
        setDraggedItemId(null);
        return;
    }

    const draggedItem = findItem(favorites, id);
    if (!draggedItem) {
        setDraggedItemId(null);
        return;
    }

    // Prevent dragging a folder into its own descendant
    if (draggedItem.type === 'folder') {
        const isTargetDescendant = findItem(draggedItem.items, folderId);
        if (isTargetDescendant) {
            setDraggedItemId(null);
            return;
        }
    }

    // Remove from old location
    const tempTree = removeItem(favorites, id);
    
    // Add to new location
    const newTree = addItemToFolder(tempTree, folderId, draggedItem);
    
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
    
    // Icons
    const FolderIcon = () => (
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
    );
    const FolderOpenIcon = () => (
        <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
    );
    const CommandIcon = () => (
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    );

    return (
        <div 
            className={`
                relative
                ${isFolder ? 'mb-1' : 'mb-2'}
            `}
            draggable={!isEditing}
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragOver={isFolder ? handleDragOver : undefined}
            onDrop={isFolder ? (e) => handleDropOnFolder(e, item.id) : undefined}
        >
            <div 
                className={`
                    group flex items-center justify-between p-2 rounded-lg border transition-all
                    ${isFolder 
                        ? 'bg-slate-800/60 border-slate-700 hover:border-slate-500' 
                        : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                    }
                    ${draggedItemId === item.id ? 'opacity-40 border-dashed border-blue-500' : ''}
                `}
                style={{ marginLeft: level > 0 ? '12px' : '0' }}
            >
                {/* Left Side: Icon & Name/Input */}
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    {isFolder && (
                        <button onClick={() => handleToggleFolder(item.id)} className="text-slate-400 hover:text-white transition-transform">
                             <svg className={`w-3 h-3 transition-transform ${item.isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    )}

                    {isEditing ? (
                        <input 
                            autoFocus
                            type="text"
                            value={editLabelValue}
                            onChange={(e) => setEditLabelValue(e.target.value)}
                            onBlur={saveEditing}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                            className="bg-black/50 text-white text-xs px-1 py-0.5 rounded w-full border border-blue-500 outline-none"
                        />
                    ) : (
                        <div className="flex flex-col overflow-hidden w-full">
                             <span 
                                className={`text-xs font-medium truncate cursor-pointer hover:text-blue-300 ${isFolder ? 'text-slate-200' : 'text-blue-200'}`}
                                onDoubleClick={() => startEditing(item)}
                                title="Double click to rename"
                             >
                                {isFolder ? item.name : item.label}
                             </span>
                             {!isFolder && (item.type === 'command' || !item.type) && (
                                 <code className="text-[9px] text-slate-500 truncate font-mono">
                                     {item.command}
                                 </code>
                             )}
                        </div>
                    )}
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isFolder && (
                         <button 
                            onClick={() => onExecute(item as FavoriteCommand)}
                            className="p-1 hover:bg-green-600/20 text-green-400 rounded"
                            title="Executar"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                    )}
                     <button 
                        onClick={() => startEditing(item)}
                        className="p-1 hover:bg-blue-600/20 text-blue-400 rounded"
                        title="Renomear"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button 
                        onClick={() => onRemove(item.id)}
                        className="p-1 hover:bg-red-600/20 text-red-400 rounded"
                        title="Remover"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            {/* Folder Contents */}
            {isFolder && item.isOpen && item.items.length > 0 && (
                <div className="mt-1 pl-2 border-l border-slate-700 ml-2">
                    {item.items.map(subItem => (
                        <RecursiveItem key={subItem.id} item={subItem} level={level + 1} />
                    ))}
                </div>
            )}
            
             {isFolder && item.isOpen && item.items.length === 0 && (
                <div className="text-[10px] text-slate-600 ml-6 py-1 italic">
                    (Vazio - arraste itens para cá)
                </div>
            )}
            
             {/* Output Display for Commands */}
             {!isFolder && (item as FavoriteCommand).output && (
                  <div className="mt-1 bg-black/50 rounded p-2 border border-slate-700 overflow-x-auto mb-2 ml-2">
                      <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap">
                          {(item as FavoriteCommand).output}
                      </pre>
                  </div>
              )}
        </div>
    );
  };

  return (
    <div className="w-[640px] bg-[#0d1117] border-l border-slate-800 flex flex-col h-full animate-[slideInLeft_0.3s_ease-out]">
      <div className="p-4 border-b border-slate-800 bg-[#161b22] flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Favoritos
        </h3>
        <div className="flex gap-2">
            <button
            onClick={() => setIsFolderModalOpen(true)}
            className="p-1 hover:bg-slate-700 rounded text-yellow-400 hover:text-white transition-colors"
            title="Criar Pasta"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v6m3-3H9" /></svg>
            </button>
            <button
            onClick={() => setIsModalOpen(true)}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
            title="Adicionar comando manual"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {favorites.length === 0 ? (
           <div className="text-center mt-10 text-slate-600 text-xs px-4">
              Crie pastas ou adicione comandos.<br/>
              Arraste comandos para dentro de pastas para organizar.
           </div>
        ) : (
          favorites.map((fav) => (
            <RecursiveItem key={fav.id} item={fav} level={0} />
          ))
        )}
      </div>

      {/* Add Command Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Adicionar Favorito">
        <form onSubmit={handleAddCommand} className="space-y-4">
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

      {/* Create Folder Modal */}
      <Modal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} title="Nova Pasta">
          <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Nome da Pasta</label>
                  <input 
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
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
