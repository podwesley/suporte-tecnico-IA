import React from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Terminal } from 'lucide-react';
import { Message, Role } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={clsx(
        "flex w-full mb-8 group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={clsx(
        "flex max-w-[85%] md:max-w-[75%] gap-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className={clsx(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg mt-1",
          isUser 
            ? "bg-blue-600 text-white" 
            : "bg-emerald-600 text-white"
        )}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Bubble Content */}
        <div className={clsx(
          "relative rounded-2xl shadow-sm border",
          isUser 
            ? "bg-blue-600 text-white border-blue-500 rounded-tr-sm px-2.5 py-1.5" 
            : "bg-slate-900/50 backdrop-blur-sm text-slate-200 border-white/10 rounded-tl-sm px-6 py-4"
        )}>
          {/* Header (Role Name) */}
          <div className={clsx(
            "flex items-center gap-2 opacity-50 text-[9px] font-bold tracking-widest uppercase",
            isUser ? "mb-0.5" : "mb-2"
          )}>
            {isUser ? "Você" : "Tech Support AI"}
          </div>
          
          <div className={clsx(
            isUser ? "leading-tight text-[11px] md:text-xs text-blue-50 font-medium" : "leading-7 text-sm md:text-base text-slate-300"
          )}>
              {isUser ? (
                  <p className="whitespace-pre-wrap">{message.text}</p>
              ) : (
                  <MarkdownRenderer 
                      content={message.text} 
                      onRunCommand={onRunCommand}
                      onInputUpdate={onInputUpdate}
                      onSendMessage={onSendMessage}
                  />
              )}
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
