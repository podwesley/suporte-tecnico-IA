import React, { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  onRunCommand?: (command: string) => Promise<string>;
  onInputUpdate?: (text: string) => void;
  onSendMessage?: (text: string) => void;
}

const CodeBlock: React.FC<{
  language: string;
  code: string;
  onRunCommand?: (command: string) => Promise<string>;
  onInputUpdate?: (text: string) => void;
  onSendMessage?: (text: string) => void;
}> = ({ language, code, onRunCommand, onInputUpdate, onSendMessage }) => {
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
      setOutput(null); // Close terminal after action
    }
  };

  const handleSendImmediately = () => {
    if (output && onSendMessage) {
      const responseText = `\n\n\`\`\`${output}\n\`\`\`\n\n`;
      onSendMessage(responseText); // This assumes the parent handles appending to current input if needed, or we send just this. 
      // Based on previous App.tsx logic, onSendMessage sends the text.
      // If we want to append to existing input first, we might need to read it, but here we just send the result.
      // Ideally, the user wants to "append to chat input AND send".
      // Since we don't have access to current input value here easily without prop drilling it, 
      // we will rely on onSendMessage sending what we give it. 
      // NOTE: App.tsx handleSendTerminalOutput logic did: fullText = inputValue + ... + responseText.
      // We only have onSendMessage. Let's assume onSendMessage sends the text provided.
      // To replicate "Submit Automatically" which includes pending input, we might need a way to get pending input.
      // However, usually "Submit Automatically" implies sending the current context.
      // For now, we will send the response text directly.
      onSendMessage(responseText);
      setOutput(null);
    }
  };

  // Check if the language suggests an executable command
  const isExecutable = ['bash', 'sh', 'shell', 'zsh', 'docker'].includes(language.toLowerCase()) || 
                       (language === 'text' && (code.trim().startsWith('docker') || code.trim().startsWith('npm')));

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shadow-sm group">
      <div className="bg-slate-800 px-3 py-1.5 text-xs text-slate-400 border-b border-slate-700 flex justify-between items-center">
        <span className="font-mono lowercase text-blue-300 font-semibold">{language}</span>
        
        <div className="flex items-center gap-2">
            {/* Run Button */}
            {isExecutable && onRunCommand && !output && !isExecuting && (
                <button
                    onClick={handleRun}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all hover:scale-105"
                    title="Executar no terminal"
                >
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    <span className="font-semibold">Executar</span>
                </button>
            )}

            <button 
                onClick={() => navigator.clipboard.writeText(code.trim())}
                className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                title="Copiar código"
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                <span>Copiar</span>
            </button>
        </div>
      </div>
      <pre className="p-3 overflow-x-auto">
        <code className="font-mono text-slate-200 text-xs whitespace-pre">{code.trim()}</code>
      </pre>

      {/* Inline Terminal Output */}
      {(output || isExecuting) && (
        <div className="border-t border-slate-700 bg-black/50 p-3 animate-fadeIn">
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-400 font-mono border-b border-slate-800 pb-2">
             <span className="text-green-500">➜</span>
             <span className="text-blue-400">~</span>
             <span className="opacity-75">Output do Terminal</span>
             <button onClick={() => setOutput(null)} className="ml-auto hover:text-white">✕</button>
          </div>
          
          <div className="font-mono text-xs text-gray-300 whitespace-pre-wrap max-h-[200px] overflow-y-auto mb-3">
             {isExecuting ? <span className="animate-pulse">Executando comando...</span> : output}
          </div>

          {!isExecuting && output && (
             <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button 
                   onClick={handleAddToChat}
                   className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-200 bg-slate-700 hover:bg-slate-600 rounded transition-colors border border-slate-600"
                >
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                   Adicionar (+2 linhas)
                </button>
                <button 
                   onClick={handleSendImmediately}
                   className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-colors shadow-lg shadow-green-900/20"
                >
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                   Enviar Agora
                </button>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onRunCommand, onInputUpdate, onSendMessage }) => {
  // Simple parser to separate code blocks from text
  // This splits by ``` to find code blocks
  const parts = content.split(/```/);

  return (
    <div className="text-sm leading-relaxed space-y-2">
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          // This is a code block
          // Extract language if present (e.g. "bash\n...")
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

          return (
            <CodeBlock 
                key={index} 
                language={language} 
                code={code} 
                onRunCommand={onRunCommand}
                onInputUpdate={onInputUpdate}
                onSendMessage={onSendMessage}
            />
          );
        } else {
          // Normal text
          return (
            <div key={index} className="whitespace-pre-wrap">
                {part.split('\n').map((line, i) => (
                    <p key={i} className={`min-h-[1em] ${line.trim().startsWith('#') ? 'font-bold text-lg mt-2 mb-1 text-blue-200' : ''}`}>
                         {line}
                    </p>
                ))}
            </div>
          );
        }
      })}
    </div>
  );
};

export default MarkdownRenderer;
