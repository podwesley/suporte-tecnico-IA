import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CornerDownRight, Send, Terminal } from 'lucide-react';

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-3xl bg-[#1e1e1e] rounded-xl shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[80vh]"
          >
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-black">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex items-center gap-1.5 ml-2 opacity-60">
                    <Terminal size={12} />
                    <span className="text-xs text-gray-300 font-mono">root@server: ~</span>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Terminal Content */}
            <div 
              ref={contentRef}
              className="flex-1 p-4 font-mono text-sm text-gray-300 overflow-y-auto min-h-[300px] bg-[#1e1e1e] selection:bg-white/20"
            >
              <div className="mb-2">
                <span className="text-green-500 font-bold">➜</span> <span className="text-blue-400 font-bold">~</span> <span className="text-white">{command}</span>
              </div>

              {isExecuting ? (
                <div className="mt-2 text-gray-500 flex items-center gap-2">
                  <span className="animate-spin">⠋</span> Executando...
                </div>
              ) : (
                output && (
                  <div className="mt-2 whitespace-pre-wrap text-gray-300 leading-relaxed">
                    {output}
                  </div>
                )
              )}
              
              {!isExecuting && output && (
                 <div className="mt-2">
                    <span className="text-green-500 font-bold">➜</span> <span className="text-blue-400 font-bold">~</span> <span className="animate-pulse">_</span>
                 </div>
              )}
            </div>

            {/* Action Footer */}
            {!isExecuting && output && (
              <div className="p-3 bg-[#252526] border-t border-black flex justify-end gap-3">
                 <button 
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
                 >
                    Fechar
                 </button>
                 
                 <button 
                    onClick={() => onAddToChat(output)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors border border-slate-600"
                    title="Adicionar ao chat para encadear comandos"
                 >
                    <CornerDownRight size={14} />
                    Adicionar ao Contexto
                 </button>

                 <button 
                    onClick={() => onSendImmediately(output)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors shadow-lg shadow-green-900/20"
                    title="Enviar resposta imediatamente"
                 >
                    <Send size={14} />
                    Enviar Agora
                 </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
