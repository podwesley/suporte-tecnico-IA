import React, { useState, useRef, useEffect } from 'react';

interface InputAreaProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  value: string;
  onChange: (value: string) => void;
}

export const InputArea: React.FC<InputAreaProps> = ({ onSend, isLoading, value, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (value.trim() && !isLoading) {
      onSend(value);
      onChange(''); // Clear input via parent
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [value]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-900/95 to-transparent pt-12 pb-6 px-4 z-10">
      <div className="max-w-4xl mx-auto">
        <form 
            onSubmit={handleSubmit} 
            className="relative flex items-end gap-2 bg-slate-800/50 backdrop-blur-md p-2 rounded-2xl border border-slate-700/50 shadow-2xl ring-1 ring-white/5 transition-all focus-within:ring-blue-500/50 focus-within:bg-slate-800/80"
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descreva seu problema técnico (ex: Erro no Docker, Instalação falhou)..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-400 border-none px-4 py-3 focus:outline-none focus:ring-0 resize-none overflow-y-auto max-h-[150px] min-h-[52px]"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            className={`
              p-3 rounded-xl flex-shrink-0 transition-all duration-300 mb-[2px] mr-[2px]
              ${!value.trim() || isLoading 
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:shadow-lg hover:shadow-blue-500/30 active:scale-95'
              }
            `}
          >
            {isLoading ? (
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-500 mt-3 font-medium tracking-wide uppercase">
          A IA pode gerar informações imprecisas. Verifique sempre os comandos antes de executar.
        </p>
      </div>
    </div>
  );
};