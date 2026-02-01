import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  type?: 'error' | 'info';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, type = 'info' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s]"
        onClick={onClose}
      />
      
      {/* Content */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-[scaleIn_0.2s]">
        <div className={`p-4 border-b border-slate-700/50 flex items-center justify-between ${type === 'error' ? 'bg-red-500/10' : 'bg-slate-800/50'}`}>
          <h3 className={`font-bold ${type === 'error' ? 'text-red-400' : 'text-white'}`}>
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6 text-slate-300">
          {children}
        </div>

        <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
