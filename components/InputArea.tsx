import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface InputAreaProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isHelpMode: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({ 
  onSend, 
  isLoading, 
  value, 
  onChange,
  disabled = false,
  placeholder = "Descreva seu problema técnico...",
  isHelpMode
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (value.trim() && !isLoading && !disabled) {
      onSend(value);
      onChange('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
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
    <div className="w-full px-4 pb-6 flex justify-center pointer-events-none">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full max-w-3xl pointer-events-auto ${disabled ? 'opacity-60 grayscale' : ''}`}
      >
        <div 
            className={`
                relative flex items-end gap-2 bg-bg-input backdrop-blur-xl p-2 rounded-[24px] 
                border transition-all duration-300 shadow-2xl
                ${isFocused && !disabled 
                    ? (isHelpMode ? 'border-purple-500/50 ring-1 ring-purple-500/20' : 'border-blue-500/50 ring-1 ring-blue-500/20') 
                    : 'border-border-main ring-1 ring-white/5'}
            `}
        >
          <div className="flex-1 min-w-0 relative">
             <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`w-full bg-transparent text-slate-100 placeholder-slate-500 border-none px-4 py-3 focus:outline-none focus:ring-0 resize-none overflow-y-auto max-h-[150px] min-h-[48px] text-sm md:text-base ${disabled ? 'cursor-not-allowed' : ''}`}
                rows={1}
                disabled={isLoading || disabled}
              />
          </div>
          
          <motion.button
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            onClick={() => handleSubmit()}
            disabled={!value.trim() || isLoading || disabled}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 mb-1 mr-1
              ${!value.trim() || isLoading || disabled
                ? 'bg-slate-800 text-slate-500' 
                : (isHelpMode ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20')
              }
            `}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 ml-0.5" />
            )}
          </motion.button>
        </div>
        
        <div className="text-center mt-2 flex items-center justify-center gap-2 opacity-50">
            <Sparkles className={`w-3 h-3 ${isHelpMode ? 'text-purple-400' : 'text-blue-400'}`} />
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
             {isHelpMode ? 'AI Agent Mode • Converse com o Agente' : 'AI Tech Support • Verifique os comandos'}
            </p>
        </div>
      </motion.div>
    </div>
  );
};