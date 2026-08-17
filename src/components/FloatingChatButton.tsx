import React from 'react';
import { MessageSquare } from 'lucide-react';

interface FloatingChatButtonProps {
  isOpen: boolean;
  unreadCount: number;
  onToggle: () => void;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
  isOpen,
  unreadCount,
  onToggle,
}) => {
  return (
    <button
      id="floating-room-chat-button"
      onClick={onToggle}
      className={`fixed bottom-12 sm:bottom-14 right-3 sm:right-6 z-40 flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.7)] border transition-all duration-200 active:scale-95 group select-none min-h-[44px] ${
        isOpen
          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)]'
          : unreadCount > 0
          ? 'bg-[#0c0c0e]/98 text-cyan-300 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-bounce'
          : 'bg-[#0c0c0e]/95 hover:bg-[#121217] text-slate-200 border-white/10 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]'
      }`}
      title={isOpen ? 'Cerrar Chat de la Sala' : 'Abrir Chat de la Sala'}
    >
      <div className="relative">
        <MessageSquare
          className={`w-4 h-4 transition-transform group-hover:scale-110 ${
            isOpen ? 'text-slate-950' : 'text-cyan-400'
          }`}
        />
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-[#0c0c0e] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      <span className="text-xs font-semibold tracking-wide">
        {isOpen ? 'Cerrar Chat' : 'Chat'}
      </span>

      {!isOpen && unreadCount > 0 && (
        <span className="px-1.5 py-0.2 text-[9px] font-bold bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/40">
          {unreadCount}
        </span>
      )}
    </button>
  );
};
