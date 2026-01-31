import React, { useEffect, useRef, useState } from 'react';

interface TerminalWindowProps {
  isOpen: boolean;
  command: string;
  output: string | null;
  isExecuting: boolean;
  onClose: () => void;
  onAddToChat: (output: string) => void;
  onSendImmediately: (output: string) => void;
}

export const TerminalWindow: React.FC<TerminalWindowProps> = ({
  isOpen,
  command,
  output,
  isExecuting,
  onClose,
  onAddToChat,
  onSendImmediately
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [output, isExecuting, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-3xl bg-[#1e1e1e] rounded-lg shadow-2xl overflow-hidden border border-slate-700 flex flex-col max-h-[80vh]">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-black">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer" onClick={onClose} />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="ml-3 text-xs text-gray-400 font-mono">root@server: ~</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Terminal Content */}
        <div 
          ref={contentRef}
          className="flex-1 p-4 font-mono text-sm text-gray-300 overflow-y-auto min-h-[300px]"
        >
          <div className="mb-2">
            <span className="text-green-500">➜</span> <span className="text-blue-400">~</span> <span className="text-white">{command}</span>
          </div>

          {isExecuting ? (
            <div className="mt-2 animate-pulse text-gray-500">
              Executando...
            </div>
          ) : (
            output && (
              <div className="mt-2 whitespace-pre-wrap text-gray-300">
                {output}
              </div>
            )
          )}
          
          {!isExecuting && output && (
             <div className="mt-2">
                <span className="text-green-500">➜</span> <span className="text-blue-400">~</span> <span className="animate-pulse">_</span>
             </div>
          )}
        </div>

        {/* Action Footer */}
        {!isExecuting && output && (
          <div className="p-4 bg-[#252526] border-t border-black flex justify-end gap-3">
             <button 
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-gray-300 hover:bg-[#333] rounded transition-colors"
             >
                Fechar
             </button>
             
             <button 
                onClick={() => onAddToChat(output)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-200 bg-slate-700 hover:bg-slate-600 rounded transition-colors border border-slate-600"
                title="Adicionar ao chat para encadear comandos"
             >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Adicionar
             </button>

             <button 
                onClick={() => onSendImmediately(output)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-colors shadow-lg shadow-green-900/20"
                title="Enviar resposta imediatamente"
             >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                Enviar Agora
             </button>
          </div>
        )}
      </div>
    </div>
  );
};
