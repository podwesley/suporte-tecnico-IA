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
import { APP_NAME } from './constants';

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
             const { output, ...rest } = item as FavoriteCommand;
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
          return { ...item, output };
      }
      // Handle legacy items without type
      if (item.id === commandId && !item.type) {
         return { ...item, output };
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
  
  const [inputValue, setInputValue] = useState('');
  const [currentWorkingDirectory, setCurrentWorkingDirectory] = useState<string | null>(null);
  const [selectedOS, setSelectedOS] = useState<string | null>(null);
  const [commandQueue, setCommandQueue] = useState<CommandHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isBackendOnline, setIsBackendOnline] = useState(true);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

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
      const result = await commandExecutor.execute(command, currentWorkingDirectory);
      return result.output;
    } catch (e) {
      return "Erro ao executar comando: " + e;
    }
  };

  const handleInputUpdate = (text: string) => {
      setInputValue(prev => prev + (prev ? "\n\n" : "") + text);
  };

  const handleExecuteFromSidebar = async (item: CommandHistoryItem) => {
      const output = await handleRunCommand(item.command, false);
      
      setCommandQueue(prev => prev.map(c => 
          c.id === item.id 
              ? { ...c, output: output, timestamp: Date.now() } 
              : c
      ));
  };

  const handleDeleteCommands = (ids: string[]) => {
      setCommandQueue(prev => prev.filter(c => !ids.includes(c.id)));
  };

  // Favorites Handlers
  const handleAddToFavorites = (command: string) => {
      const exists = favorites.some(f => f.type === 'command' && f.command === command);
      if (!exists) {
          const newFav: FavoriteCommand = {
              id: uuidv4(),
              type: 'command',
              command,
              label: command
          };
          setFavorites(prev => [...prev, newFav]);
      }
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0f1e] to-black flex flex-col font-sans text-slate-200 overflow-hidden">
      
      <HistorySidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/70 backdrop-blur-xl border-b border-white/5 z-20 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Histórico"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
          </button>
          
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-white hidden sm:block">{APP_NAME}</h1>
            
            {/* OS Buttons */}
            <div className="flex items-center gap-1 ml-4 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                {[ 
                    { id: 'macos', label: 'MACOS', icon: '🍎' },
                    { id: 'windows', label: 'WINDOWS', icon: '🪟' },
                    { id: 'linux', label: 'LINUX', icon: '🐧' }
                ].map(os => (
                    <button
                        key={os.id}
                        onClick={() => handleOSSelect(os.id)}
                        className={`
                            px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5
                            ${selectedOS === os.id 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }
                        `}
                    >
                        <span>{os.icon}</span>
                        <span className="hidden lg:inline">{os.label}</span>
                    </button>
                ))}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="relative group">
                <button
                    onClick={handleSelectDirectory}
                    className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/50 hover:bg-slate-700 border border-slate-700/50 rounded-lg transition-all"
                    title={currentWorkingDirectory || "Selecionar pasta de trabalho"}
                >
                    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                    <span className="px-1 hidden sm:inline whitespace-nowrap">
                        {currentWorkingDirectory ? (
                            <>
                                <span className="opacity-50 mr-1">PWD:</span>
                                {currentWorkingDirectory === '/' ? '/' : currentWorkingDirectory.replace(/\/$/, '').split('/').pop()}
                            </>
                        ) : 'Abrir'}
                    </span>
                </button>
                {currentWorkingDirectory && (
                    <button 
                        onClick={handleClearDirectory}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                        title="Resetar diretório"
                    >
                        ✕
                    </button>
                )}
            </div>

            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border ${isBackendOnline ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <span className="relative flex h-2 w-2">
                  {isBackendOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isBackendOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </span>
                <span className={`${isBackendOnline ? 'text-emerald-400' : 'text-red-400'} text-xs font-medium tracking-wide`}>
                    {isBackendOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
            </div>
            
            <button 
                onClick={handleNewChat}
                className="group flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg transition-all active:scale-95"
                title="Iniciar nova conversa"
            >
                <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="hidden sm:inline">Nova</span>
            </button>
        </div>
      </header>

      {/* Content Container (Three Columns) */}
      <div className="flex flex-1 pt-16 overflow-hidden">
          {/* Left Column: Command Queue */}
          <CommandSidebar 
            commands={commandQueue} 
            onExecute={handleExecuteFromSidebar}
            onDelete={handleDeleteCommands}
            onFavorite={handleAddToFavorites}
          />

          {/* Middle Column: Chat Area */}
          <div className="flex-1 flex flex-col relative min-w-0">
            <main className="flex-1 w-full max-w-5xl mx-auto pb-40 px-4 overflow-y-auto custom-scrollbar">
                {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-12 text-center opacity-0 animate-[fadeIn_0.8s_ease-out_forwards]">
                    
                    <div className="relative mb-8 group cursor-default">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 animate-gradient-x"></div>
                        <div className="relative w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 shadow-2xl">
                            <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                        Como posso ajudar hoje?
                    </h2>
                    <p className="text-slate-400 max-w-lg text-sm md:text-base leading-relaxed mb-10">
                    Sou seu agente especializado em suporte técnico. 
                    Posso ajudar com Docker, Configurações de Ambiente, Debugging e Tutoriais passo-a-passo.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                        {[ 
                            { label: "Meu container Docker está falhando", icon: "🐳" },
                            { label: "Como instalo MySQL no Ubuntu?", icon: "🐧" },
                            { label: "Erro de variável de ambiente no Node", icon: "🟢" },
                            { label: "Permissão negada na porta 80", icon: "🛡️" }
                        ].map((item, i) => (
                            <button 
                                key={i}
                                onClick={() => handleSendMessage(item.label)}
                                className="group flex items-center gap-4 text-sm bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-blue-500/50 text-slate-300 p-4 rounded-xl text-left transition-all hover:translate-x-1"
                            >
                                <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
                                <span className="font-medium group-hover:text-blue-200 transition-colors">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                ) : (
                <div className="space-y-6 pt-6">
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
            <div className="absolute bottom-0 left-0 right-0 z-10">
                <InputArea onSend={handleSendMessage} isLoading={isLoading} value={inputValue} onChange={setInputValue} />
            </div>
          </div>
          
          {/* Right Column: Favorites */}
          <FavoritesSidebar 
            favorites={favorites}
            onExecute={handleExecuteFavorite}
            onRemove={handleRemoveFavorite}
            onReorder={handleReorderFavorites}
            onAdd={handleManualAddFavorite}
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
    </div>
  );
};

export default App;
