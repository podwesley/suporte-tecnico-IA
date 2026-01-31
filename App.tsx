import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { geminiService } from './services/geminiService';
import { commandExecutor } from './services/commandExecutor';
import { Message, Role, ChatSession } from './types';
import { ChatBubble } from './components/ChatBubble';
import { InputArea } from './components/InputArea';
import { HistorySidebar } from './components/HistorySidebar';
import { TerminalWindow } from './components/TerminalWindow';
import { APP_NAME } from './constants';

const STORAGE_KEY = 'techsupport_ai_sessions';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Terminal State
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [currentCommand, setCurrentCommand] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string | null>(null);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Load sessions from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedSessions: ChatSession[] = JSON.parse(saved);
        setSessions(parsedSessions);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
    // Initialize default service
    try {
        geminiService.initializeChat();
    } catch (e) {
        console.error("Service init failed", e);
    }
  }, []);

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
          messages: messages
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
  }, [messages, currentSessionId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(uuidv4());
    setIsLoading(false);
    geminiService.resetSession();
    setIsSidebarOpen(false);
  };

  const handleSelectSession = async (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
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

  const handleRunCommand = async (command: string) => {
    setTerminalOpen(true);
    setCurrentCommand(command);
    setTerminalOutput(null);
    setIsExecutingCommand(true);

    try {
      const result = await commandExecutor.execute(command);
      setTerminalOutput(result.output);
    } catch (e) {
      setTerminalOutput("Erro ao executar comando: " + e);
    } finally {
      setIsExecutingCommand(false);
    }
  };

  const handleTerminalResponse = (output: string) => {
    setTerminalOpen(false);
    const responseText = `Executei o comando \`${currentCommand}\` e o resultado foi:\n\n\`\`\`text\n${output}\n\`\`\`\n\nQual o próximo passo?`;
    handleSendMessage(responseText);
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0f1e] to-black flex flex-col font-sans text-slate-200">
      
      <HistorySidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />

      <TerminalWindow 
        isOpen={terminalOpen}
        command={currentCommand}
        output={terminalOutput}
        isExecuting={isExecutingCommand}
        onClose={() => setTerminalOpen(false)}
        onSendResponse={handleTerminalResponse}
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
            <div className="relative group hidden sm:block">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-400 rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-200"></div>
                <div className="relative w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-700">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </div>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">{APP_NAME}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 text-xs font-medium tracking-wide">ONLINE</span>
            </div>
            
            <button 
                onClick={handleNewChat}
                className="group flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg transition-all active:scale-95"
                title="Iniciar nova conversa"
            >
                <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="hidden sm:inline">Nova Conversa</span>
            </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto pt-28 pb-40 px-4">
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
          <div className="space-y-6">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} onRunCommand={handleRunCommand} />
            ))}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </main>

      {/* Sticky Input */}
      <InputArea onSend={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default App;
