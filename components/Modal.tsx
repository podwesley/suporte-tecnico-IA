import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Info, Square } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  type?: 'error' | 'info';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, type = 'info' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Content */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "circOut" }}
            className="relative bg-[#09090b] border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.5)] w-full max-w-5xl overflow-hidden"
          >
            {/* Tech Header Line */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />

            <div className={clsx(
                "p-4 border-b border-white/10 flex items-center justify-between",
                type === 'error' ? 'bg-red-900/10' : 'bg-[#121214]'
            )}>
              <div className="flex items-center gap-3">
                 <div className={clsx(
                     "w-1 h-4",
                     type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                 )} />
                 <h3 className={clsx(
                     "font-mono font-bold tracking-wider text-sm uppercase",
                     type === 'error' ? 'text-red-400' : 'text-slate-200'
                 )}>
                    {title}
                 </h3>
              </div>
              <button 
                onClick={onClose}
                className="p-1 text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 text-slate-300 text-sm leading-relaxed font-mono">
              {children}
            </div>

            <div className="p-4 border-t border-white/10 bg-[#0c0c0e] flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-transparent hover:bg-white/5 text-slate-400 hover:text-white border border-white/10 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Cancelar
              </button>
            </div>
            
            {/* Corner Accents */}
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/20" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white/20" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
