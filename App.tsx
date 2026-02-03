import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { geminiService } from './services/geminiService';
import { commandExecutor } from './services/commandExecutor';
import { Message, Role, ChatSession, CommandHistoryItem, FavoriteCommand, FavoriteItem, SavedPrompt } from './types';
import { ChatBubble } from './components/ChatBubble';
import { InputArea } from './components/InputArea';
import { HistorySidebar } from './components/HistorySidebar';
import { CommandSidebar } from './components/CommandSidebar';
import { FavoritesSidebar } from './components/FavoritesSidebar';
import { Modal } from './components/Modal';
import { APP_NAME, SYSTEM_PROMPT_AGENT_TUTOR, SYSTEM_PROMPT_AGENT_SUPPORT } from './agents';
import { motion, AnimatePresence } from 'framer-motion';
import { History, FolderOpen, Plus, X, Server, Terminal, Box, Shield, Cpu, PanelLeft, HelpCircle, Home, LogOut, MessageSquare, HardDrive, Clock, Save, Edit, Trash2, Settings, ArrowLeftRight, Bot, Laptop, Upload, Download, FileJson } from 'lucide-react';
import { FaApple, FaWindows, FaLinux, FaRobot, FaLaptopCode, FaDocker } from 'react-icons/fa';

const STORAGE_KEY = 'techsupport_ai_sessions';
const HELP_STORAGE_KEY = 'techsupport_ai_help_sessions';
const FAVORITES_KEY = 'techsupport_ai_favorites';
const PROMPTS_KEY = 'techsupport_ai_custom_prompts';

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
  
  // Split sessions into support (default) and help
  const [supportSessions, setSupportSessions] = useState<ChatSession[]>([]);
  const [helpSessions, setHelpSessions] = useState<ChatSession[]>([]);
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandSidebarVisible, setIsCommandSidebarVisible] = useState(false);
  
  const [inputValue, setInputValue] = useState('');
  const [currentWorkingDirectory, setCurrentWorkingDirectory] = useState<string | null>(null);
  const [defaultDirectory, setDefaultDirectory] = useState<string | null>(null);
  const [selectedOS, setSelectedOS] = useState<string | null>(null);
  const [commandQueue, setCommandQueue] = useState<CommandHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [executingFavoriteId, setExecutingFavoriteId] = useState<string | null>(null);
  const [favoritesWidth, setFavoritesWidth] = useState(() => {
    const saved = localStorage.getItem('techsupport_ai_favorites_width');
    return saved ? parseInt(saved, 10) : 450; // Default to ~35vw equivalent in px
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(true);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isOSModalOpen, setIsOSModalOpen] = useState(false);
  const [isHelpMode, setIsHelpMode] = useState(false);
  
  // Prompt Library State
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [activePromptTitle, setActivePromptTitle] = useState<string | null>(() => {
      return localStorage.getItem('techsupport_ai_active_prompt');
  });
  const [activePromptContent, setActivePromptContent] = useState<string | null>(() => {
      return localStorage.getItem('techsupport_ai_active_prompt_content');
  });
  const [apiKey, setApiKey] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist active prompt title and content
  useEffect(() => {
      if (activePromptTitle) {
          localStorage.setItem('techsupport_ai_active_prompt', activePromptTitle);
      } else {
          localStorage.removeItem('techsupport_ai_active_prompt');
      }
      
      if (activePromptContent) {
          localStorage.setItem('techsupport_ai_active_prompt_content', activePromptContent);
      } else {
          localStorage.removeItem('techsupport_ai_active_prompt_content');
      }
  }, [activePromptTitle, activePromptContent]);

  const handleExportData = () => {
    try {
        const data = {
            version: 1,
            timestamp: Date.now(),
            prompts: savedPrompts,
            favorites: favorites,
            sessions: {
                support: supportSessions,
                help: helpSessions
            },
            apiKey: apiKey // Optional: User might want to exclude this, but including for full backup
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `techsupport-ai-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Export failed:", e);
        setErrorMessage("Falha ao exportar dados. Verifique o console.");
        setErrorModalOpen(true);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const content = e.target?.result as string;
              const data = JSON.parse(content);

              // Basic validation
              if (!data || typeof data !== 'object') throw new Error("Formato de arquivo inválido");

              // Restore Prompts
              if (Array.isArray(data.prompts)) {
                  setSavedPrompts(data.prompts);
                  localStorage.setItem(PROMPTS_KEY, JSON.stringify(data.prompts));
              }

              // Restore Favorites
              if (Array.isArray(data.favorites)) {
                  setFavorites(data.favorites);
                  localStorage.setItem(FAVORITES_KEY, JSON.stringify(data.favorites));
              }

              // Restore Sessions
              if (data.sessions) {
                  if (Array.isArray(data.sessions.support)) {
                      setSupportSessions(data.sessions.support);
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.sessions.support));
                  }
                  if (Array.isArray(data.sessions.help)) {
                      setHelpSessions(data.sessions.help);
                      localStorage.setItem(HELP_STORAGE_KEY, JSON.stringify(data.sessions.help));
                  }
              }

              // Restore API Key (Optional)
              if (data.apiKey && typeof data.apiKey === 'string') {
                  setApiKey(data.apiKey);
                  localStorage.setItem('techsupport_ai_api_key', data.apiKey);
              }
              
              // Reset file input
              if (fileInputRef.current) fileInputRef.current.value = '';
              
              // Close modal and show success (using prompt title temporarily or just close)
              setIsPromptLibraryOpen(false);
              alert("Dados importados com sucesso!");
              
          } catch (error) {
              console.error("Import failed:", error);
              setErrorMessage("Falha ao importar dados. O arquivo pode estar corrompido ou em formato inválido.");
              setErrorModalOpen(true);
          }
      };
      reader.readAsText(file);
  };
  
  const [currentTime, setCurrentTime] = useState<string>('');
  const [diskSpace, setDiskSpace] = useState<string>('');

  // Computed sessions for current view
  const sessions = isHelpMode ? helpSessions : supportSessions;
  const setSessions = isHelpMode ? setHelpSessions : setSupportSessions;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Time & Disk Space Effects
  useEffect(() => {
    const timer = setInterval(() => {
        const now = new Date();
        setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
      if (isBackendOnline) {
          commandExecutor.execute("df -h . | awk 'NR==2 {print $4}'")
            .then(res => {
                if (res.success && res.output) {
                    setDiskSpace(res.output.trim());
                }
            })
            .catch(console.error);
      }
  }, [isBackendOnline]);

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
      // Load Support Sessions
      const savedSupport = localStorage.getItem(STORAGE_KEY);
      if (savedSupport) {
        setSupportSessions(JSON.parse(savedSupport));
      }

      // Load Help Sessions
      const savedHelp = localStorage.getItem(HELP_STORAGE_KEY);
      if (savedHelp) {
        setHelpSessions(JSON.parse(savedHelp));
      }
      
      const savedFavs = localStorage.getItem(FAVORITES_KEY);
      if (savedFavs) {
          const loaded = JSON.parse(savedFavs);
          // Clear outputs on load
          setFavorites(clearOutputsRecursive(loaded));
      }

      // Load Saved Prompts
      const savedPromptsData = localStorage.getItem(PROMPTS_KEY);
      if (savedPromptsData) {
          setSavedPrompts(JSON.parse(savedPromptsData));
      }

      // Load API Key
      const savedApiKey = localStorage.getItem('techsupport_ai_api_key');
      if (savedApiKey) {
          setApiKey(savedApiKey);
      }

    } catch (e) {
      console.error("Failed to load local storage data", e);
    }
    // Initialize default service
    try {
        geminiService.initializeChat(SYSTEM_PROMPT_AGENT_SUPPORT);
    } catch (e) {
        console.error("Service init failed", e);
    }
  }, []);

  // Update API Key in Service
  useEffect(() => {
      if (apiKey) {
          geminiService.setApiKey(apiKey);
      }
  }, [apiKey]);

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
      const targetSetSessions = isHelpMode ? setHelpSessions : setSupportSessions;
      const storageKey = isHelpMode ? HELP_STORAGE_KEY : STORAGE_KEY;

      targetSetSessions(prevSessions => {
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
        
        localStorage.setItem(storageKey, JSON.stringify(newSessions));
        return newSessions;
      });
    }
  }, [messages, currentSessionId, commandQueue, isHelpMode]);

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
    setActivePromptTitle(null);
    setActivePromptContent(null);
    localStorage.removeItem('techsupport_ai_active_prompt');
    localStorage.removeItem('techsupport_ai_active_prompt_content');
    
    const targetPrompt = isHelpMode ? SYSTEM_PROMPT_AGENT_TUTOR : SYSTEM_PROMPT_AGENT_SUPPORT;
    geminiService.resetSession(targetPrompt);
    setIsSidebarOpen(false);
    
    if (!isHelpMode) {
        setIsOSModalOpen(true);
    }
  };

  const handleHome = () => {
      setIsHelpMode(false);
      setMessages([]);
      setCurrentSessionId(null);
      setIsLoading(false);
      setCommandQueue([]);
      // setActivePromptTitle(null); // Keep persistent
      // setActivePromptContent(null); // Keep persistent for agent mode? Or clear? 
      // User said: "funcionalidade do suporte nao deve ser impactada". Support uses default prompt.
      // But if we switch back to Agent, we might want to resume. 
      // However, handleHome resets to SUPPORT mode.
      
      geminiService.resetSession(SYSTEM_PROMPT_AGENT_SUPPORT);
  };

  const handleHelpMode = () => {
    setIsHelpMode(true);
    setMessages([]);
    setCurrentSessionId(uuidv4());
    setIsLoading(false);
    setCommandQueue([]);
    
    // Use active custom prompt if available
    const targetPrompt = activePromptContent || SYSTEM_PROMPT_AGENT_TUTOR;
    geminiService.resetSession(targetPrompt);
    
    setIsSidebarOpen(false);
    setIsCommandSidebarVisible(false);
    setIsOSModalOpen(false); 
  };

  const handleExitHelpMode = () => {
    handleHome();
  };

  const handleSelectSession = async (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setCommandQueue(session.commandQueue || []); // Restore queue
    setIsLoading(false);
    setIsSidebarOpen(false);
    
    // Resume context in Gemini Service with correct prompt for current mode
    let targetPrompt = isHelpMode ? SYSTEM_PROMPT_AGENT_TUTOR : SYSTEM_PROMPT_AGENT_SUPPORT;
    
    // If in Help Mode and we have an active custom prompt, use it
    if (isHelpMode && activePromptContent) {
        targetPrompt = activePromptContent;
    }
    
    await geminiService.resumeSession(session.messages, targetPrompt);
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const targetSessions = isHelpMode ? helpSessions : supportSessions;
    const targetSetSessions = isHelpMode ? setHelpSessions : setSupportSessions;
    const storageKey = isHelpMode ? HELP_STORAGE_KEY : STORAGE_KEY;

    const updatedSessions = targetSessions.filter(s => s.id !== sessionId);
    targetSetSessions(updatedSessions);
    localStorage.setItem(storageKey, JSON.stringify(updatedSessions));

    if (currentSessionId === sessionId) {
      handleNewChat();
    }
  };

  const handleRenameSession = (sessionId: string, newTitle: string) => {
      const targetSetSessions = isHelpMode ? setHelpSessions : setSupportSessions;
      const storageKey = isHelpMode ? HELP_STORAGE_KEY : STORAGE_KEY;

      targetSetSessions(prevSessions => {
          const updatedSessions = prevSessions.map(session => 
              session.id === sessionId ? { ...session, title: newTitle } : session
          );
          localStorage.setItem(storageKey, JSON.stringify(updatedSessions));
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
      setExecutingFavoriteId(item.id);
      
      // Clear previous output and set initial timestamp
      setFavorites(prev => updateCommandInTree(prev, item.id, ''));

      let fullOutput = '';
      try {
          await commandExecutor.executeStream(
              item.command,
              (chunk) => {
                  fullOutput += chunk;
                  setFavorites(prev => updateCommandInTree(prev, item.id, fullOutput));
              },
              currentWorkingDirectory ?? defaultDirectory ?? null
          );
      } catch (e) {
          const errorMsg = fullOutput + `\nErro ao executar: ${e}`;
          setFavorites(prev => updateCommandInTree(prev, item.id, errorMsg));
      } finally {
          setExecutingFavoriteId(null);
      }
  };

  const handleRemoveFavorite = (id: string) => {
      setFavorites(prev => removeItemFromTree(prev, id));
  };

  const handleUpdateFavorite = (id: string, updates: Partial<FavoriteItem>) => {
      const updateRecursive = (items: FavoriteItem[]): FavoriteItem[] => {
          return items.map(item => {
              if (item.id === id) {
                  return { ...item, ...updates } as FavoriteItem;
              }
              if (item.type === 'folder') {
                  return { ...item, items: updateRecursive(item.items) };
              }
              return item;
          });
      };
      setFavorites(prev => updateRecursive(prev));
  };

  const handleReorderFavorites = (newOrder: FavoriteItem[]) => {
      setFavorites(newOrder);
  };
  
  const handleManualAddFavorite = (fav: FavoriteItem) => {
      setFavorites(prev => [...prev, fav]);
  };

  // Prompt Library Handlers
  const handleOpenPromptLibrary = () => {
      setIsPromptLibraryOpen(true);
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
      e.preventDefault();
      localStorage.setItem('techsupport_ai_api_key', apiKey);
      // Ideally, re-initialize Gemini Service here, but for now just saving.
      // geminiService.updateApiKey(apiKey); // Assuming we might add this method later.
      alert("API Key salva com sucesso!"); // Simple feedback for now
  };

  const handleOpenPromptEditor = (prompt?: SavedPrompt) => {
      if (prompt) {
          setEditingPromptId(prompt.id);
          setPromptTitle(prompt.title);
          setPromptContent(prompt.content);
      } else {
          setEditingPromptId(null);
          setPromptTitle('');
          setPromptContent('');
      }
      setIsPromptEditorOpen(true);
  };

  const handleSavePrompt = (e: React.FormEvent) => {
      e.preventDefault();
      if (!promptTitle.trim() || !promptContent.trim()) return;

      const newPrompt: SavedPrompt = {
          id: editingPromptId || uuidv4(),
          title: promptTitle.trim(),
          content: promptContent.trim()
      };

      setSavedPrompts(prev => {
          let updated;
          if (editingPromptId) {
              updated = prev.map(p => p.id === editingPromptId ? newPrompt : p);
          } else {
              updated = [...prev, newPrompt];
          }
          localStorage.setItem(PROMPTS_KEY, JSON.stringify(updated));
          return updated;
      });

      setIsPromptEditorOpen(false);
      setEditingPromptId(null);
      setPromptTitle('');
      setPromptContent('');
  };

  const handleDeletePrompt = (id: string) => {
      setSavedPrompts(prev => {
          const updated = prev.filter(p => p.id !== id);
          localStorage.setItem(PROMPTS_KEY, JSON.stringify(updated));
          return updated;
      });
  };

  const handleLoadPrompt = (prompt: SavedPrompt) => {
      // setInputValue(prompt.content); // No longer pasting into input
      setActivePromptTitle(prompt.title);
      setActivePromptContent(prompt.content);
      setIsPromptLibraryOpen(false);
      
      // Immediately start a new session with this system prompt
      setMessages([]);
      setCurrentSessionId(uuidv4());
      setIsLoading(false);
      geminiService.resetSession(prompt.content);
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
            ? { ...msg, text: `Erro: O serviço de IA está indisponível no momento. Verifique se o backend está rodando e se sua chave de API está correta.\n\nDetalhes do erro: ${error}` } 
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
    <div className="min-h-screen bg-bg-main flex flex-col font-sans text-slate-200 overflow-hidden relative">
      
      {/* Tech Transition Effects */}
      <AnimatePresence mode="sync">
        <motion.div
          key={isHelpMode ? 'agent-flash' : 'support-flash'}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className={`pointer-events-none fixed inset-0 z-[60] mix-blend-overlay ${isHelpMode ? 'bg-purple-600' : 'bg-blue-600'}`}
        />
        <motion.div
            key={isHelpMode ? 'scan-line-agent' : 'scan-line-support'}
            initial={{ left: isHelpMode ? '-20%' : '120%', opacity: 0 }}
            animate={{ left: isHelpMode ? '120%' : '-20%', opacity: [0, 1, 0] }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className={`pointer-events-none fixed top-0 bottom-0 w-64 z-[60] bg-gradient-to-r ${isHelpMode ? 'from-transparent via-purple-500/50 to-transparent' : 'from-transparent via-blue-500/50 to-transparent'}`}
        />
      </AnimatePresence>

      <HistorySidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        isHelpMode={isHelpMode}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-bg-main/80 backdrop-blur-xl border-b border-border-main z-20 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* Logo and Title */}
            <div className="flex items-center gap-2 mr-2">
                <div className={`w-8 h-8 ${isHelpMode ? 'bg-purple-600/10 border border-purple-500/30' : 'bg-blue-600/10 border border-blue-500/30'} flex items-center justify-center text-white shadow-lg shadow-blue-900/20 rounded-none`}>
                    {isHelpMode ? <Bot size={18} strokeWidth={2} className="text-purple-400" /> : <Laptop size={18} strokeWidth={2} className="text-blue-400" />}
                </div>
                <div className="flex flex-col">
                    <h1 className="text-sm font-bold tracking-tight text-white hidden sm:block">{isHelpMode ? "Modo Agente" : "Modo Suporte"}</h1>
                    <span className={`text-[10px] font-black leading-none tracking-widest uppercase ${isHelpMode ? 'text-purple-400' : 'text-blue-400'}`}>
                        {isHelpMode ? "Modo Agente" : "Modo Suporte"}
                    </span>
                </div>
            </div>

            {/* Mode Button (Toggle) */}
            <button 
                onClick={isHelpMode ? handleHome : handleHelpMode}
                className="flex items-center gap-2 px-2 md:px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter transition-all active:scale-95 border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 rounded-none"
                title={isHelpMode ? "Trocar para Modo Suporte" : "Trocar para Modo Agente"}
            >
                <ArrowLeftRight size={12} className="text-slate-400" />
                <span className="hidden lg:inline">
                    {isHelpMode ? "Mudar para Suporte" : "Mudar para Agente"}
                </span>
            </button>

            {!isHelpMode && (
                <button 
                    onClick={handleNewChat}
                    className="flex items-center gap-2 px-2 md:px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter transition-all active:scale-95 border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 rounded-none"
                    title="Nova Solicitação"
                >
                    <Plus size={14} />
                    <span className="hidden lg:inline">Nova Solicitação</span>
                </button>
            )}
            
            {!isHelpMode && (
                <button 
                    onClick={() => setIsCommandSidebarVisible(!isCommandSidebarVisible)}
                    className={`p-2 transition-colors rounded-none ${isCommandSidebarVisible ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    title={isCommandSidebarVisible ? "Ocultar Fila de Comandos" : "Mostrar Fila de Comandos"}
                >
                    <PanelLeft size={20} />
                </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {isHelpMode && activePromptTitle && (
                <button 
                    onClick={() => setIsPromptLibraryOpen(true)}
                    className="flex items-center gap-2 px-2 md:px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter transition-all active:scale-95 border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 rounded-none animate-in fade-in slide-in-from-left-2"
                    title={`Prompt Ativo: ${activePromptTitle}`}
                >
                    <MessageSquare size={14} className="text-purple-400" />
                    <span className="hidden md:inline max-w-[100px] lg:max-w-[150px] truncate">{activePromptTitle}</span>
                </button>
            )}

            <button 
                onClick={handleOpenPromptLibrary} 
                className="p-1.5 md:p-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors rounded-none"
                title="Configurações do Agente"
            >
                <Settings size={18} className="md:size-5" />
            </button>

            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 md:p-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors rounded-none"
                title="Histórico de Conversas"
            >
                <History size={18} className="md:size-5" />
            </button>

            <div className="relative group">
                <button
                    onClick={handleSelectDirectory}
                    className="flex items-center gap-2 px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-medium text-slate-300 bg-bg-surface hover:bg-white/5 border border-border-main transition-all rounded-none"
                    title={currentWorkingDirectory || defaultDirectory || "Selecionar pasta de trabalho"}
                >
                    <FolderOpen size={14} className="text-yellow-500" />
                    <span className="hidden sm:inline whitespace-nowrap max-w-[80px] md:max-w-[150px] truncate">
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
            
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            {/* System Stats (Home, Time, Path, Disk) */}
            <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-slate-300 bg-black/30 px-4 py-2 rounded-none border border-white/10 shadow-inner">
                {isHelpMode && (
                    <>
                        <button 
                            onClick={handleHome}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
                            title="Página Inicial (Sair do Modo Agente)"
                        >
                            <Home size={14} />
                            <span className="font-bold">HOME</span>
                        </button>
                        <div className="w-px h-4 bg-white/10" />
                    </>
                )}
                <div className="flex items-center gap-2">
                    <Clock size={14} className="text-blue-400" />
                    <span className="font-bold">{currentTime}</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-2 max-w-[200px] truncate" title={currentWorkingDirectory || defaultDirectory || ""}>
                    <FolderOpen size={14} className="text-yellow-500" />
                    <span className="font-medium text-slate-200">
                        {(currentWorkingDirectory || defaultDirectory) ? (
                            (currentWorkingDirectory || defaultDirectory) === '/' ? '/' : (currentWorkingDirectory || defaultDirectory)?.split('/').pop()
                        ) : '...'}
                    </span>
                </div>
                {diskSpace && (
                    <>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-2">
                            <HardDrive size={14} className="text-emerald-400" />
                            <span className="font-bold">{diskSpace} <span className="text-[10px] opacity-50 uppercase ml-0.5">Livre</span></span>
                        </div>
                    </>
                )}
            </div>

            <div className={`hidden md:flex items-center gap-2 px-3 py-2 border rounded-none ${isBackendOnline ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <span className="relative flex h-2 w-2">
                  {isBackendOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isBackendOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </span>
                <span className={`${isBackendOnline ? 'text-emerald-400' : 'text-red-400'} text-[10px] font-bold tracking-wide uppercase`}>
                    {isBackendOnline ? 'Online' : 'Offline'}
                </span>
            </div>
        </div>
      </header>

      {/* Content Container */}
      <div className="flex flex-1 pt-16 overflow-hidden">
          {/* Left Column: Command Queue */}
          <AnimatePresence mode="wait" initial={false}>
            {!isHelpMode && isCommandSidebarVisible && (
                <motion.div
                    key="command-sidebar"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="hidden lg:block overflow-hidden h-full flex-shrink-1"
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
          <div className="flex-1 flex flex-col relative min-w-0 bg-gradient-to-b from-bg-main to-bg-surface/30 h-full">
            <main className="flex-1 w-full mx-auto pb-40 px-4 md:px-6 overflow-y-auto custom-scrollbar pt-6">
                {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-20 text-center opacity-0 animate-[fadeIn_0.8s_ease-out_forwards] px-4">
                    
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="relative mb-8"
                    >
                        <div className={`absolute -inset-1 bg-gradient-to-r ${isHelpMode ? 'from-purple-600 via-pink-500 to-purple-600' : 'from-blue-600 via-emerald-500 to-blue-600'} rounded-full blur-xl opacity-20 animate-pulse`}></div>
                        <div className="relative w-24 h-24 bg-bg-surface rounded-3xl flex items-center justify-center border border-border-main shadow-2xl">
                            {isHelpMode ? <Bot size={56} strokeWidth={1.5} className="text-purple-500" /> : <Laptop size={56} strokeWidth={1.5} className="text-blue-500" />}
                        </div>
                    </motion.div>

                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight px-4">
                        {isHelpMode ? "Modo Tutor Ativado" : "Como posso ajudar?"}
                    </h2>
                    <p className="text-slate-500 max-w-md text-sm leading-relaxed mb-12 px-4">
                        {isHelpMode ? "Estou aqui para tirar suas dúvidas e ensinar sobre o sistema. Pergunte o que quiser!" : "Especialista em Docker, Kubernetes, Linux e Debugging. Selecione uma opção abaixo ou descreva seu problema."}
                    </p>
                    
                    {isHelpMode && (
                        <div className="w-full max-w-2xl mt-4 px-4">
                            {savedPrompts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {savedPrompts.map((prompt) => (
                                        <motion.button 
                                            key={prompt.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                            onClick={() => handleLoadPrompt(prompt)}
                                            className="group flex items-center gap-4 text-sm bg-bg-surface hover:bg-bg-surface/80 border border-border-main hover:border-purple-500/30 text-slate-300 p-4 rounded-xl text-left transition-all"
                                        >
                                            <div className="p-2 bg-purple-500/10 rounded-lg group-hover:scale-110 transition-transform">
                                                <MessageSquare size={18} className="text-purple-400" />
                                            </div>
                                            <span className="font-medium group-hover:text-purple-200 transition-colors">{prompt.title}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex justify-center">
                                    <button 
                                        onClick={handleOpenPromptEditor}
                                        className="flex items-center gap-2 px-6 py-3 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200 rounded-xl transition-all group"
                                    >
                                        <div className="p-1 bg-purple-500/20 rounded-lg group-hover:scale-110 transition-transform">
                                            <Plus size={16} />
                                        </div>
                                        <span className="font-medium">Criar Prompt Personalizado</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {!isHelpMode && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl px-4">
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
                                    className="group flex items-center gap-4 text-sm bg-bg-surface hover:bg-bg-surface/80 border border-border-main hover:border-blue-500/30 text-slate-300 p-4 rounded-xl text-left transition-all"
                                >
                                    <div className="p-2 bg-black/20 rounded-lg group-hover:scale-110 transition-transform">
                                        {item.icon}
                                    </div>
                                    <span className="font-medium group-hover:text-blue-200 transition-colors">{item.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    )}
                </div>
                ) : (
                <div className="space-y-2 max-w-5xl mx-auto">
                    {messages.map((msg) => (
                    <ChatBubble 
                        key={msg.id} 
                        message={msg} 
                        onRunCommand={handleRunCommand}
                        onInputUpdate={handleInputUpdate}
                        onSendMessage={handleSendMessage}
                        onFavorite={handleAddToFavorites}
                        isHelpMode={isHelpMode}
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
                    disabled={messages.length === 0 && !isHelpMode}
                    placeholder={messages.length === 0 ? (isHelpMode ? "Digite sua dúvida para o Tutor..." : "Clique em 'Novo' para iniciar...") : undefined}
                    isHelpMode={isHelpMode}
                />
            </div>
          </div>
          
          {/* Right Column: Favorites */}
          <div className="hidden xl:block h-full flex-shrink-0">
              <FavoritesSidebar 
                favorites={favorites}
                onExecute={handleExecuteFavorite}
                onRemove={handleRemoveFavorite}
                onUpdate={handleUpdateFavorite}
                onReorder={handleReorderFavorites}
                onAdd={handleManualAddFavorite}
                width={favoritesWidth}
                onResizeStart={startResizing}
                executingFavoriteId={executingFavoriteId}
                isHelpMode={isHelpMode}
              />
          </div>
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
          title="Selecione o Ambiente de Trabalho" 
          type="info"
      >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[ 
                  { id: 'macos', label: 'MACOS', icon: <FaApple />, description: 'Apple Ecosystem' },
                  { id: 'windows', label: 'WINDOWS', icon: <FaWindows />, description: 'Microsoft Ecosystem' },
                  { id: 'linux', label: 'LINUX', icon: <FaLinux />, description: 'Open Source Power' },
                  { id: 'docker', label: 'DOCKER', icon: <FaDocker />, description: 'Containerized Environment' }
              ].map(os => (
                  <button
                      key={os.id}
                      onClick={() => handleOSSelect(os.id)}
                      className="group flex flex-col items-center gap-3 p-6 bg-[#121214] border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300"
                  >
                      <span className="text-4xl text-blue-500 transition-all duration-300 transform group-hover:scale-110">{os.icon}</span>
                      <div className="text-center">
                          <span className="block font-bold text-slate-200 group-hover:text-blue-400">{os.label}</span>
                          <span className="text-xs text-slate-500 mt-1">{os.description}</span>
                      </div>
                  </button>
              ))}
          </div>
      </Modal>

      {/* Settings Modal (Formerly Prompt Library) */}
      <Modal 
          isOpen={isPromptLibraryOpen} 
          onClose={() => setIsPromptLibraryOpen(false)} 
          title="Configurações" 
          type="info"
      >
          <div className="space-y-6">
              {/* API Key Section */}
              <div className="bg-bg-main border border-white/5 p-4 rounded-lg">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Shield size={14} className="text-slate-400" />
                      Gemini API
                  </h3>
                  <form onSubmit={handleSaveApiKey} className="flex gap-2">
                      <input 
                          type="password" 
                          value={apiKey} 
                          onChange={(e) => setApiKey(e.target.value)} 
                          className="flex-1 bg-bg-surface border border-white/10 focus:border-white/30 p-2 text-sm text-white outline-none rounded" 
                          placeholder="Cole sua chave API aqui..."
                      />
                      <button 
                          type="submit" 
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded transition-all"
                      >
                          Salvar
                      </button>
                  </form>
              </div>

              {/* Prompts Section */}
              <div>
                  <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <MessageSquare size={14} className="text-slate-400" />
                          Prompts Personalizados
                      </h3>
                      <button 
                          onClick={() => handleOpenPromptEditor()}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded transition-all"
                      >
                          <Plus size={14} /> Prompt de sistema
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1 mb-6">
                      {savedPrompts.length === 0 ? (
                          <p className="text-center text-slate-500 text-xs py-8 italic bg-bg-main border border-white/5 rounded-lg">Nenhum prompt personalizado salvo.</p>
                      ) : (
                          savedPrompts.map(prompt => (
                              <div key={prompt.id} className="group flex items-center justify-between p-3 bg-bg-main border border-white/5 hover:border-white/20 rounded-lg transition-all">
                                  <button 
                                      onClick={() => handleLoadPrompt(prompt)}
                                      className="flex-1 text-left text-sm text-slate-200 hover:text-white transition-colors font-medium truncate"
                                  >
                                      {prompt.title}
                                  </button>
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                          onClick={() => handleOpenPromptEditor(prompt)}
                                          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded"
                                          title="Editar"
                                      >
                                          <Edit size={14} />
                                      </button>
                                      <button 
                                          onClick={() => handleDeletePrompt(prompt.id)}
                                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded"
                                          title="Excluir"
                                      >
                                          <Trash2 size={14} />
                                      </button>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>

              {/* Data Management Section */}
              <div className="bg-bg-main border border-white/5 p-4 rounded-lg">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <FileJson size={14} className="text-slate-400" />
                      Backup & Restauração
                  </h3>
                  <div className="flex gap-2">
                      <button 
                          onClick={handleExportData}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded transition-all"
                      >
                          <Download size={14} /> Exportar Dados
                      </button>
                      <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded transition-all"
                      >
                          <Upload size={14} /> Importar Dados
                      </button>
                      <input 
                          ref={fileInputRef}
                          type="file" 
                          hidden 
                          accept=".json"
                          onChange={handleImportData}
                      />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 text-center">
                      Exporte seus prompts, favoritos e configurações para um arquivo JSON.
                  </p>
              </div>
          </div>
      </Modal>

      {/* Prompt Editor Modal */}
      <Modal
          isOpen={isPromptEditorOpen}
          onClose={() => setIsPromptEditorOpen(false)}
          title={editingPromptId ? "Editar Prompt" : "Novo Prompt"}
          type="info"
      >
          <form onSubmit={handleSavePrompt} className="space-y-4">
              <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Título</label>
                  <input 
                      type="text" 
                      value={promptTitle} 
                      onChange={(e) => setPromptTitle(e.target.value)} 
                      className="w-full bg-bg-main border border-white/10 focus:border-white/30 p-2 text-sm text-white outline-none rounded" 
                      placeholder="Ex: Análise de Logs"
                      required
                  />
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Conteúdo do Prompt</label>
                  <textarea 
                      value={promptContent} 
                      onChange={(e) => setPromptContent(e.target.value)} 
                      className="w-full h-64 bg-bg-main border border-white/10 focus:border-white/30 p-3 text-sm text-slate-200 outline-none rounded font-mono resize-none custom-scrollbar" 
                      placeholder="Digite seu prompt aqui..."
                      required
                  />
              </div>
              <div className="flex justify-end pt-2">
                  <button 
                      type="submit" 
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded transition-all shadow-sm"
                  >
                      <Save size={14} /> Salvar Prompt
                  </button>
              </div>
          </form>
      </Modal>
    </div>
  );
};

export default App;