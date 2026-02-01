import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Terminal, Copy, Check } from 'lucide-react';
import { Message, Role } from '../types';
import MarkdownRenderer, { CodeBlock } from './MarkdownRenderer';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ChatBubbleProps {
  message: Message;
  onRunCommand?: (command: string) => Promise<string>;
  onInputUpdate?: (text: string) => void;
  onSendMessage?: (text: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ 
  message, 
  onRunCommand, 
  onInputUpdate, 
  onSendMessage 
}) => {
  const isUser = message.role === Role.USER;
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (isUser) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex w-full mb-8 justify-end"
      >
        <div className="max-w-[85%] md:max-w-[75%] w-full flex justify-end">
            <div className="relative rounded-2xl shadow-sm border bg-blue-600/10 backdrop-blur-sm text-slate-200 border-blue-500/30 rounded-tr-sm px-6 py-4">
                <MarkdownRenderer 
                    content={message.text}
                    onRunCommand={onRunCommand}
                    onInputUpdate={onInputUpdate}
                    onSendMessage={onSendMessage}
                />
            </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex w-full mb-8 group justify-start"
    >
      <div className="flex max-w-[85%] md:max-w-[75%] gap-4 flex-row">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg mt-1 bg-emerald-600 text-white">
          <Bot size={16} />
        </div>

        {/* Bubble Content */}
        <div className="relative rounded-2xl shadow-sm border bg-bg-surface/50 backdrop-blur-sm text-slate-200 border-border-main rounded-tl-sm px-6 py-4">
          {/* Header (Role Name) */}
          <div className="flex items-center justify-between gap-2 opacity-50 text-[9px] font-bold tracking-widest uppercase mb-2">
            <span>Tech Support AI</span>
            <button 
              onClick={handleCopy}
              className="hover:opacity-100 transition-opacity cursor-pointer p-1 rounded hover:bg-white/10"
              title="Copiar markdown"
            >
              {isCopied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
          
          <div className="leading-7 text-sm md:text-base text-slate-300">
              <MarkdownRenderer 
                  content={message.text} 
                  onRunCommand={onRunCommand}
                  onInputUpdate={onInputUpdate}
                  onSendMessage={onSendMessage}
              />
          </div>

          {/* Timestamp or Status (Optional) */}
          {message.isStreaming && (
             <motion.span 
                animate={{ opacity: [0.4, 1, 0.4] }} 
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="inline-block w-2 h-2 bg-emerald-500 rounded-full ml-2" 
             />
          )}
        </div>
      </div>
    </motion.div>
  );
};
