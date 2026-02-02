import React, { useState, useMemo } from 'react';
import { Play, Copy, Terminal, Plus, Send, X, Star } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';

interface MarkdownRendererProps {
  content: string;
  onRunCommand?: (command: string) => Promise<string>;
  onInputUpdate?: (text: string) => void;
  onSendMessage?: (text: string) => void;
  onFavorite?: (command: string) => void;
}

export const CodeBlock: React.FC<{
  language: string;
  code: string;
  onRunCommand?: (command: string) => Promise<string>;
  onInputUpdate?: (text: string) => void;
  onSendMessage?: (text: string) => void;
  onFavorite?: (command: string) => void;
}> = ({ language, code, onRunCommand, onInputUpdate, onSendMessage, onFavorite }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  const handleRun = async () => {
    if (!onRunCommand) return;
    setIsExecuting(true);
    setOutput(null);
    try {
      const result = await onRunCommand(code.trim());
      setOutput(result);
    } catch (e) {
      setOutput("Error executing command");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAddToChat = () => {
    if (output && onInputUpdate) {
      const responseText = `\n\n\`\`\`text\n${output}\n\`\`\`\n\n`;
      onInputUpdate(responseText);
      setOutput(null);
    }
  };

  const handleSendImmediately = () => {
    if (output && onSendMessage) {
      const responseText = `\`\`\`text\n${output}\n\`\`\``;
      onSendMessage(responseText);
      setOutput(null);
    }
  };

  const isExecutable = ['bash', 'sh', 'shell', 'zsh', 'docker'].includes(language.toLowerCase()) || 
                       (language === 'text' && (code.trim().startsWith('docker') || code.trim().startsWith('npm')));

  const highlightedCode = useMemo(() => {
    const grammar = Prism.languages[language] || Prism.languages.text || Prism.languages.javascript;
    if (!grammar) return code.trim();
    return Prism.highlight(code.trim(), grammar, language);
  }, [code, language]);

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-white/5 bg-[#09090b] shadow-sm group ring-1 ring-white/5">
      <div className="bg-[#121214] px-3 py-2 text-xs text-slate-400 border-b border-white/5 flex justify-between items-center">
        <span className="font-mono lowercase text-blue-300 font-semibold flex items-center gap-1.5">
           <Terminal size={12} className="opacity-50" />
           {language}
        </span>
        
        <div className="flex items-center gap-2">
            {isExecutable && onFavorite && (
                <button
                    onClick={() => onFavorite(code.trim())}
                    className="hover:text-yellow-400 transition-colors cursor-pointer flex items-center gap-1 p-1 hover:bg-white/5 rounded"
                    title="Favoritar comando"
                >
                    <Star size={12} />
                </button>
            )}

            {isExecutable && onRunCommand && !output && !isExecuting && (
                <button
                    onClick={handleRun}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all hover:scale-105"
                    title="Executar no terminal"
                >
                    <Play size={10} fill="currentColor" />
                    <span className="font-semibold text-[10px] uppercase tracking-wide">Executar</span>
                </button>
            )}

            <button 
                onClick={() => navigator.clipboard.writeText(code.trim())}
                className="hover:text-white transition-colors cursor-pointer flex items-center gap-1 p-1 hover:bg-white/5 rounded"
                title="Copiar código"
            >
                <Copy size={12} />
                <span className="text-[10px]">Copiar</span>
            </button>
        </div>
      </div>
      <div className="bg-[#09090b] relative group-hover:bg-[#0c0c0e] transition-colors">
        <pre className="p-3 overflow-x-auto custom-scrollbar">
            <code 
              className={`font-mono text-slate-200 text-xs whitespace-pre leading-5 language-${language}`}
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
        </pre>
      </div>

      {/* Inline Terminal Output */}
      {(output || isExecuting) && (
        <div className="border-t border-white/10 bg-black/40 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-400 font-mono border-b border-white/5 pb-2">
             <span className="text-emerald-500 font-bold">➜</span>
             <span className="text-blue-400 font-bold">~</span>
             <span className="opacity-75">Console Output</span>
             <div className="ml-auto flex items-center gap-2">
               <button 
                  onClick={() => output && navigator.clipboard.writeText(output)} 
                  className="hover:text-white p-1 rounded hover:bg-white/10"
                  title="Copiar saída"
               >
                  <Copy size={12} />
               </button>
               <button onClick={() => setOutput(null)} className="hover:text-white p-1 rounded hover:bg-white/10">
                  <X size={12} />
               </button>
             </div>
          </div>
          
          <div className="font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-[200px] overflow-y-auto custom-scrollbar mb-3 select-text selection:bg-blue-500/30">
             {isExecuting ? <span className="animate-pulse text-slate-500">Executando comando...</span> : output}
          </div>

          {!isExecuting && output && (
             <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button 
                   onClick={handleAddToChat}
                   className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-200 bg-[#1e1e20] hover:bg-[#27272a] rounded transition-colors border border-white/10"
                >
                   <Plus size={12} />
                   Adicionar ao Prompt
                </button>
                <button 
                   onClick={handleSendImmediately}
                   className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors shadow-lg shadow-blue-900/20"
                >
                   <Send size={12} />
                   Enviar Agora
                </button>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onRunCommand, onInputUpdate, onSendMessage, onFavorite }) => {
  const parts = content.split(/```/);

  return (
    <div className="text-sm leading-7 space-y-4">
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          const firstLineBreak = part.indexOf('\n');
          let language = "text";
          let code = part;

          if (firstLineBreak > -1) {
            const possibleLang = part.substring(0, firstLineBreak).trim();
            if (possibleLang && !possibleLang.includes(' ')) {
                language = possibleLang;
                code = part.substring(firstLineBreak + 1);
            }
          }

          // Heuristic to detect bash/shell if language is text
          if (language === 'text') {
             const trimmed = code.trim();
             const commonShellCommands = ['git', 'docker', 'npm', 'yarn', 'pnpm', 'ls', 'cd', 'cat', 'grep', 'sudo', 'echo', 'brew', 'apt', 'curl', 'wget', 'ssh'];
             const firstWord = trimmed.split(' ')[0];
             if (commonShellCommands.includes(firstWord)) {
                language = 'bash';
             }
          }

          return (
            <CodeBlock 
                key={index} 
                language={language} 
                code={code} 
                onRunCommand={onRunCommand}
                onInputUpdate={onInputUpdate}
                onSendMessage={onSendMessage}
                onFavorite={onFavorite}
            />
          );
        } else {
          return (
            <div key={index} className="whitespace-pre-wrap text-slate-300">
                {part.split('\n').filter(line => line.trim() !== '').map((line, i) => {
                    const isHeader = line.trim().startsWith('#');
                    return (
                        <p key={i} className={`
                            ${isHeader ? 'font-bold text-base text-white mt-4 mb-2' : 'mb-2'}
                        `}>
                            {line}
                        </p>
                    );
                })}
            </div>
          );
        }
      })}
    </div>
  );
};

export default MarkdownRenderer;
