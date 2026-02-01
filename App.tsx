import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { geminiService } from './services/geminiService';
import { commandExecutor } from './services/commandExecutor';
import { Message, Role, ChatSession, CommandHistoryItem, FavoriteCommand, FavoriteItem } from './types';
import { ChatBubble } from './components/ChatBubble';
import { InputArea } from './components/InputArea';
import { HistorySidebar } from './components/HistorySidebar';
import { CommandSidebar } from './components/CommandSidebar';
import { FavoritesSidebar } from './components/FavoritesSidebar';
import { Modal } from './components/Modal';
import { APP_NAME } from './agents';
import { motion, AnimatePresence } from 'framer-motion';
import { History, FolderOpen, Plus, X, Server, Terminal, Box, Shield, Cpu, PanelLeft } from 'lucide-react';

const STORAGE_KEY = 'techsupport_ai_sessions';
const FAVORITES_KEY = 'techsupport_ai_favorites';

// Helper functions for recursive updates
const clearOutputsRecursive = (items: FavoriteItem[]): FavoriteItem[] => {
    return items.map((item: FavoriteItem) => {
        if (item.type === 'folder') {
            return { ...item, items: clearOutputsRecursive(item.items) };
        }
        // It's a command
        if ('output' in item) {
             const { output, timestamp, ...rest } = item as FavoriteCommand;
             return rest as FavoriteCommand;
        }
        return item;
    });
};

const updateCommandInTree = (items: FavoriteItem[], commandId: string, output: string): FavoriteItem[] => {
  return items.map(item => {
      if (item.type === 'folder') {
          return { ...item, items: updateCommandInTree(item.items, commandId, output) };
      }
      if (item.id === commandId && item.type === 'command') {
          return { ...item, output, timestamp: Date.now() };
      }
      // Handle legacy items without type
      if (item.id === commandId && !item.type) {
         return { ...item, output, timestamp: Date.now() };
      }
      return item;
  });
};

const removeItemFromTree = (items: FavoriteItem[], id: string): FavoriteItem[] => {
  return items.filter(item => item.id !== id).map(item => {
      if (item.type === 'folder') {
          return { ...item, items: removeItemFromTree(item.items, id) };
      }
      return item;
  });
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandSidebarVisible, setIsCommandSidebarVisible] = useState(false);
  
  const [inputValue, setInputValue] = useState('');
  const [currentWorkingDirectory, setCurrentWorkingDirectory] = useState<string | null>(null);
  const [defaultDirectory, setDefaultDirectory] = useState<string | null>(null);
  const [selectedOS, setSelectedOS] = useState<string | null>(null);
  const [commandQueue, setCommandQueue] = useState<CommandHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoritesWidth, setFavoritesWidth] = useState(() => {
    const saved = localStorage.getItem('techsupport_ai_favorites_width');
    return saved ? parseInt(saved, 10) : 450; // Default to ~35vw equivalent in px
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(true);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isOSModalOpen, setIsOSModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Fetch default directory on load/connect
  useEffect(() => {
      if (isBackendOnline && !defaultDirectory) {
          commandExecutor.execute("echo $HOME")
            .then(res => {
                if (res.success && res.output) {
                    const home = res.output.trim();
                    setDefaultDirectory(home);
                }
            })
            .catch(console.error);
      }
  }, [isBackendOnline]);

  // Load data on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedSessions: ChatSession[] = JSON.parse(saved);
        setSessions(parsedSessions);
      }
      
      const savedFavs = localStorage.getItem(FAVORITES_KEY);
      if (savedFavs) {
          const loaded = JSON.parse(savedFavs);
          // Clear outputs on load
          setFavorites(clearOutputsRecursive(loaded));
      }

    } catch (e) {
      console.error("Failed to load local storage data", e);
    }
    // Initialize default service
    try {
        geminiService.initializeChat();
    } catch (e) {
        console.error("Service init failed", e);
    }
  }, []);

  // Save favorites when changed
  useEffect(() => {
     if (!isFirstRender.current) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
     }
  }, [favorites]);

  // Save current session whenever messages change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!currentSessionId && messages.length > 0) {
       const newId = uuidv4();
       setCurrentSessionId(newId);
    }

    if (currentSessionId && messages.length > 0) {
      setSessions(prevSessions => {
        const existingIndex = prevSessions.findIndex(s => s.id === currentSessionId);
        const title = messages[0].text.substring(0, 40) + (messages[0].text.length > 40 ? '...' : '');
        
        const updatedSession: ChatSession = {
          id: currentSessionId,
          title: existingIndex !== -1 ? prevSessions[existingIndex].title || title : title,
          timestamp: Date.now(),
          messages: messages,
          commandQueue: commandQueue // Save queue
        };

        let newSessions;
        if (existingIndex !== -1) {
          newSessions = [...prevSessions];
          newSessions[existingIndex] = updatedSession;
        } else {
          newSessions = [updatedSession, ...prevSessions];
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
        return newSessions;
      });
    }
  }, [messages, currentSessionId, commandQueue]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Backend Ping
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('http://localhost:8509/health');
        setIsBackendOnline(res.ok);
      } catch (e) {
        setIsBackendOnline(false);
      }
    };
    
    const interval = setInterval(checkStatus, 5000);
    checkStatus(); // Initial check
    return () => clearInterval(interval);
  }, []);

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(uuidv4());
    setIsLoading(false);
    setCommandQueue([]); // Clear queue
    geminiService.resetSession();
    setIsSidebarOpen(false);
    setIsOSModalOpen(true);
  };

  const handleSelectSession = async (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setCommandQueue(session.commandQueue || []); // Restore queue
    setIsLoading(false);
    setIsSidebarOpen(false);
    
    // Resume context in Gemini Service
    await geminiService.resumeSession(session.messages);
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));

    if (currentSessionId === sessionId) {
      handleNewChat();
    }
  };

  const handleRenameSession = (sessionId: string, newTitle: string) => {
      setSessions(prevSessions => {
          const updatedSessions = prevSessions.map(session => 
              session.id === sessionId ? { ...session, title: newTitle } : session
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
          return updatedSessions;
      });
  };

  const handleSelectDirectory = async () => {
    if (!isBackendOnline) {
      setErrorMessage("Não é possível selecionar diretório: O servidor backend está OFFLINE.");
      setErrorModalOpen(true);
      return;
    }
    
    try {
        const path = await commandExecutor.selectDirectory();
        if (path) {
          setCurrentWorkingDirectory(path);
        }
    } catch (e) {
        setErrorMessage("Falha ao abrir seletor de diretório. Verifique se o backend está rodando.");
        setErrorModalOpen(true);
    }
  };

  const handleClearDirectory = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentWorkingDirectory(null);
  };

  const handleOSSelect = (osId: string) => {
      setSelectedOS(osId);
      setIsOSModalOpen(false);
      handleSendMessage(`${osId.toUpperCase()}`);
  };

  const handleRunCommand = async (command: string, addToQueue = true): Promise<string> => {
    // Add to queue only if requested
    if (addToQueue) {
        setCommandQueue(prev => [{
            id: uuidv4(),
            command,
            timestamp: Date.now()
        }, ...prev]);
    }

    try {
      const result = await commandExecutor.execute(command, currentWorkingDirectory ?? defaultDirectory ?? null);
      return result.output;
    } catch (e) {
      return "Erro ao executar comando: " + e;
    }
  };

  const handleInputUpdate = (text: string) => {
      setInputValue(prev => prev + (prev ? "\n\n" : "") + text);
  };

  const handleDeleteCommands = (ids: string[]) => {
      setCommandQueue(prev => prev.filter(c => !ids.includes(c.id)));
  };

  // Favorites Handlers
  const favoriteCommands = React.useMemo(() => {
      const cmds = new Set<string>();
      const traverse = (items: FavoriteItem[]) => {
          items.forEach(item => {
              if (item.type === 'folder') {
                  traverse(item.items);
              } else if (item.command) {
                  cmds.add(item.command);
              }
          });
      };
      traverse(favorites);
      return cmds;
  }, [favorites]);

  const handleAddToFavorites = (command: string) => {
      setFavorites(prev => {
          const isCommandInFavorites = (items: FavoriteItem[], cmd: string): boolean => {
              return items.some(item => {
                  if (item.type === 'folder') {
                      return isCommandInFavorites(item.items, cmd);
                  }
                  return (item as FavoriteCommand).command === cmd;
              });
          };

          if (isCommandInFavorites(prev, command)) {
              // Remove if already exists (Toggle)
              const removeRecursive = (items: FavoriteItem[], cmd: string): FavoriteItem[] => {
                  return items
                      .filter(item => {
                          if (item.type === 'folder') return true;
                          return (item as FavoriteCommand).command !== cmd;
                      })
                      .map(item => {
                          if (item.type === 'folder') {
                              return { ...item, items: removeRecursive(item.items, cmd) };
                          }
                          return item;
                      });
              };
              return removeRecursive(prev, command);
          }

          return [{
              id: uuidv4(),
              type: 'command',
              command,
              label: command
          }, ...prev];
      });
  };

  const handleExecuteFavorite = async (item: FavoriteCommand) => {
      const output = await handleRunCommand(item.command, false);
      setFavorites(prev => updateCommandInTree(prev, item.id, output));
  };

  const handleRemoveFavorite = (id: string) => {
      setFavorites(prev => removeItemFromTree(prev, id));
  };

  const handleReorderFavorites = (newOrder: FavoriteItem[]) => {
      setFavorites(newOrder);
  };
  
  const handleManualAddFavorite = (fav: FavoriteItem) => {
      setFavorites(prev => [...prev, fav]);
  };

  const startResizing = React.useCallback(() => {
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const resize = React.useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < window.innerWidth * 0.6) {
        setFavoritesWidth(newWidth);
        localStorage.setItem('techsupport_ai_favorites_width', newWidth.toString());
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const handleSendMessage = async (text: string) => {
    if (!currentSessionId) {
        setCurrentSessionId(uuidv4());
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: Role.USER,
      text: text,
    };

    const aiMessageId = uuidv4();
    const aiPlaceholderMessage: Message = {
      id: aiMessageId,
      role: Role.MODEL,
      text: '', // Start empty
      isStreaming: true
    };

    setMessages((prev) => [...prev, userMessage, aiPlaceholderMessage]);
    setIsLoading(true);

    try {
      await geminiService.sendMessageStream(text, (chunk) => {
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === aiMessageId 
              ? { ...msg, text: msg.text + chunk } 
              : msg
          )
        );
      });
    } catch (error) {
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === aiMessageId 
            ? { ...msg, text: "Erro: Não foi possível conectar ao Suporte AI. Verifique sua chave de API." } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === aiMessageId 
            ? { ...msg, isStreaming: false } 
            : msg
        )
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col font-sans text-slate-200 overflow-hidden">
      
      <HistorySidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5 z-20 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Histórico de Conversas"
            >
                <History size={20} />
            </button>
            
            <button 
                onClick={() => setIsCommandSidebarVisible(!isCommandSidebarVisible)}
                className={`p-2 transition-colors ${isCommandSidebarVisible ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                title={isCommandSidebarVisible ? "Ocultar Fila de Comandos" : "Mostrar Fila de Comandos"}
            >
                <PanelLeft size={20} />
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                    <Cpu size={18} fill="currentColor" />
                </div>
                <h1 className="text-sm font-bold tracking-tight text-white hidden sm:block">{APP_NAME}</h1>
            </div>
            
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="relative group">
                <button
                    onClick={handleSelectDirectory}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#121214] hover:bg-white/5 border border-white/5 transition-all"
                    title={currentWorkingDirectory || defaultDirectory || "Selecionar pasta de trabalho"}
                >
                    <FolderOpen size={14} className="text-yellow-500" />
                    <span className="hidden sm:inline whitespace-nowrap max-w-[150px] truncate">
                        {(currentWorkingDirectory || defaultDirectory) ? (
                            (currentWorkingDirectory || defaultDirectory) === '/' ? '/' : (currentWorkingDirectory || defaultDirectory)?.replace(/\/$/, '').split('/').pop()
                        ) : 'Abrir Pasta'}
                    </span>
                </button>
                {currentWorkingDirectory && (
                    <button 
                        onClick={handleClearDirectory}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                        title="Resetar diretório"
                    >
                        <X size={10} />
                    </button>
                )}
            </div>

            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 border ${isBackendOnline ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <span className="relative flex h-2 w-2">
                  {isBackendOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isBackendOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </span>
                <span className={`${isBackendOnline ? 'text-emerald-400' : 'text-red-400'} text-[10px] font-bold tracking-wide uppercase`}>
                    {isBackendOnline ? 'Online' : 'Offline'}
                </span>
            </div>
            
            <button 
                onClick={handleNewChat}
                className="group flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                title="Iniciar nova conversa"
            >
                <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                <span className="hidden sm:inline">Novo</span>
            </button>
        </div>
      </header>

      {/* Content Container */}
      <div className="flex flex-1 pt-16 overflow-hidden">
          {/* Left Column: Command Queue */}
          <AnimatePresence mode="wait" initial={false}>
            {isCommandSidebarVisible && (
                <motion.div
                    key="command-sidebar"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden h-full flex-shrink-1"
                >
                     <CommandSidebar 
                        commands={commandQueue} 
                        favoriteCommands={favoriteCommands}
                        onDelete={handleDeleteCommands}
                        onFavorite={handleAddToFavorites}
                    />
                </motion.div>
            )}
          </AnimatePresence>

          {/* Middle Column: Chat Area */}
          <div className="flex-1 flex flex-col relative min-w-0 bg-gradient-to-b from-[#09090b] to-black">
            <main className="flex-1 w-full mx-auto pb-40 px-6 overflow-y-auto custom-scrollbar pt-6">
                {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-20 text-center opacity-0 animate-[fadeIn_0.8s_ease-out_forwards]">
                    
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="relative mb-8"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 rounded-full blur-xl opacity-20 animate-pulse"></div>
                        <div className="relative w-24 h-24 bg-[#121214] rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl">
                            <Cpu size={48} className="text-blue-500" fill="currentColor" />
                        </div>
                    </motion.div>

                    <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
                        Como posso ajudar?
                    </h2>
                    <p className="text-slate-500 max-w-md text-sm leading-relaxed mb-12">
                        Especialista em Docker, Kubernetes, Linux e Debugging.
                        Selecione uma opção abaixo ou descreva seu problema.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                        {[ 
                            { label: "Erro no Docker Container", icon: <Box size={18} className="text-blue-400" /> },
                            { label: "Instalar MySQL no Ubuntu", icon: <Server size={18} className="text-emerald-400" /> },
                            { label: "Variaveis de Ambiente Node", icon: <Terminal size={18} className="text-yellow-400" /> },
                            { label: "Permissão Negada (Porta 80)", icon: <Shield size={18} className="text-red-400" /> }
                        ].map((item, i) => (
                            <motion.button 
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + (i * 0.1) }}
                                onClick={() => handleSendMessage(item.label)}
                                className="group flex items-center gap-4 text-sm bg-[#121214] hover:bg-[#1a1a1e] border border-white/5 hover:border-blue-500/30 text-slate-300 p-4 rounded-xl text-left transition-all"
                            >
                                <div className="p-2 bg-black/50 rounded-lg group-hover:scale-110 transition-transform">
                                    {item.icon}
                                </div>
                                <span className="font-medium group-hover:text-blue-200 transition-colors">{item.label}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
                ) : (
                <div className="space-y-2">
                    {messages.map((msg) => (
                    <ChatBubble 
                        key={msg.id} 
                        message={msg} 
                        onRunCommand={handleRunCommand}
                        onInputUpdate={handleInputUpdate}
                        onSendMessage={handleSendMessage}
                    />
                    ))}
                    {/* Invisible element to scroll to */}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
                )}
            </main>

            {/* Input Area (Restricted Width) */}
            <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
                <InputArea 
                    onSend={handleSendMessage} 
                    isLoading={isLoading} 
                    value={inputValue} 
                    onChange={setInputValue} 
                    disabled={messages.length === 0}
                    placeholder={messages.length === 0 ? "Clique em 'Novo' para iniciar..." : undefined}
                />
            </div>
          </div>
          
          {/* Right Column: Favorites */}
          <FavoritesSidebar 
            favorites={favorites}
            onExecute={handleExecuteFavorite}
            onRemove={handleRemoveFavorite}
            onReorder={handleReorderFavorites}
            onAdd={handleManualAddFavorite}
            width={favoritesWidth}
            onResizeStart={startResizing}
          />
      </div>
      
      <Modal 
          isOpen={errorModalOpen} 
          onClose={() => setErrorModalOpen(false)} 
          title="Erro de Conexão" 
          type="error"
      >
          <p>{errorMessage}</p>
      </Modal>

      <Modal 
          isOpen={isOSModalOpen} 
          onClose={() => setIsOSModalOpen(false)} 
          title="Selecione o Sistema Operacional" 
          type="info"
      >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[ 
                  { id: 'macos', label: 'MACOS', icon: '🍎', description: 'Apple Ecosystem' },
                  { id: 'windows', label: 'WINDOWS', icon: '🪟', description: 'Microsoft Ecosystem' },
                  { id: 'linux', label: 'LINUX', icon: '🐧', description: 'Open Source Power' }
              ].map(os => (
                  <button
                      key={os.id}
                      onClick={() => handleOSSelect(os.id)}
                      className="group flex flex-col items-center gap-3 p-6 bg-[#121214] border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300"
                  >
                      <span className="text-4xl filter grayscale group-hover:grayscale-0 transition-all duration-300 transform group-hover:scale-110">{os.icon}</span>
                      <div className="text-center">
                          <span className="block font-bold text-slate-200 group-hover:text-blue-400">{os.label}</span>
                          <span className="text-xs text-slate-500 mt-1">{os.description}</span>
                      </div>
                  </button>
              ))}
          </div>
      </Modal>
    </div>
  );
};

export default App;