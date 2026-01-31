import React from 'react';
import { Message, Role } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatBubbleProps {
  message: Message;
  onRunCommand?: (command: string) => Promise<string>;
  onInputUpdate?: (text: string) => void;
  onSendMessage?: (text: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onRunCommand, onInputUpdate, onSendMessage }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.3s_ease-out]`}>
      <div
        className={`
          relative max-w-[85%] md:max-w-[75%] rounded-2xl px-6 py-5 shadow-xl border
          ${isUser 
            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm border-blue-500/50' 
            : 'bg-slate-800/80 backdrop-blur-sm text-slate-200 border-slate-700/50 rounded-bl-sm'
          }
        `}
      >
        <div className={`flex items-center gap-2 mb-3 text-xs font-bold tracking-widest uppercase ${isUser ? 'text-blue-200' : 'text-emerald-400'}`}>
          {isUser ? (
            <>
              <span>Você</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              <span>Suporte Técnico AI</span>
            </>
          )}
        </div>
        
        <div className={`leading-relaxed ${isUser ? "text-blue-50" : "text-slate-300"}`}>
            {isUser ? (
                <p className="whitespace-pre-wrap font-medium">{message.text}</p>
            ) : (
                <MarkdownRenderer 
                    content={message.text} 
                    onRunCommand={onRunCommand}
                    onInputUpdate={onInputUpdate}
                    onSendMessage={onSendMessage}
                />
            )}
        </div>
      </div>
    </div>
  );
};
