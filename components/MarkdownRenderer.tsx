import React from 'react';

interface MarkdownRendererProps {
  content: string;
  onRunCommand?: (command: string) => void;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onRunCommand }) => {
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

          // Check if the language suggests an executable command
          const isExecutable = ['bash', 'sh', 'shell', 'zsh', 'docker'].includes(language.toLowerCase()) || 
                               (language === 'text' && (code.trim().startsWith('docker') || code.trim().startsWith('npm')));

          return (
            <div key={index} className="my-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shadow-sm group">
              <div className="bg-slate-800 px-3 py-1.5 text-xs text-slate-400 border-b border-slate-700 flex justify-between items-center">
                <span className="font-mono lowercase text-blue-300 font-semibold">{language}</span>
                
                <div className="flex items-center gap-2">
                    {/* Run Button */}
                    {isExecutable && onRunCommand && (
                        <button
                            onClick={() => onRunCommand(code.trim())}
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
            </div>
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
