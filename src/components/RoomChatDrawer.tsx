import React, { useEffect, useRef, useState } from 'react';
import { TextShareItem } from '../types';
import {
  MessageSquare,
  Send,
  X,
  Copy,
  Check,
  ExternalLink,
  Radio,
  User,
  Trash2,
} from 'lucide-react';

interface RoomChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: TextShareItem[];
  onSendMessage: (text: string, alias?: string) => void;
  onClearMessages?: () => void;
  myDeviceName: string;
  myOriginalDeviceName?: string;
  onRenameDevice?: (newName: string) => void;
  peerCount: number;
  roomId: string;
  onGenerateOfflineQR?: (payload: string) => void;
}

export const RoomChatDrawer: React.FC<RoomChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  onClearMessages,
  myDeviceName,
  peerCount,
  roomId,
}) => {
  const [inputText, setInputText] = useState('');
  const [alias, setAlias] = useState(myDeviceName);
  const [showAliasInput, setShowAliasInput] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Sync alias when myDeviceName changes
  useEffect(() => {
    setAlias(myDeviceName);
  }, [myDeviceName]);

  // Auto-scroll to bottom on new messages or when drawer is opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, messages.length]);

  // Click outside to close chat automatically on desktop
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const toggleButton = document.getElementById('floating-room-chat-button');
      if (
        drawerRef.current &&
        !drawerRef.current.contains(target) &&
        (!toggleButton || !toggleButton.contains(target)) &&
        window.innerWidth >= 640
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed, alias.trim() || undefined);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isUrl = (str: string) => {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay for mobile & tablets */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      />

      {/* Mobile Full Bottom Sheet / Desktop Floating Panel */}
      <div
        ref={drawerRef}
        id="room-chat-panel"
        className="fixed inset-x-0 bottom-0 top-14 sm:top-auto sm:bottom-14 sm:right-6 sm:left-auto z-50 sm:w-[420px] max-w-full sm:h-[560px] max-h-[100dvh] sm:max-h-[calc(100vh-6rem)] bg-[#0c0c0e]/98 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-[0_10px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
      >
        {/* Drag handle for mobile */}
        <div className="sm:hidden w-full flex items-center justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#08080b]/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white tracking-tight">Chat de la Sala</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-cyan-400" />
                  {roomId}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {peerCount} {peerCount === 1 ? 'dispositivo conectado' : 'dispositivos conectados'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && onClearMessages && (
              <button
                onClick={onClearMessages}
                className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-white/5 transition-colors"
                title="Limpiar mensajes"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors"
              title="Cerrar chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alias Bar */}
        <div className="px-4 py-2 bg-[#050507] border-b border-white/5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-slate-400">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px]">Enviando como:</span>
            {showAliasInput ? (
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                onBlur={() => setShowAliasInput(false)}
                onKeyDown={(e) => e.key === 'Enter' && setShowAliasInput(false)}
                autoFocus
                placeholder="Tu apodo..."
                className="px-2 py-0.5 bg-[#0c0c0e] border border-cyan-500/50 rounded text-cyan-300 font-semibold text-[11px] focus:outline-none w-28"
              />
            ) : (
              <span
                onClick={() => setShowAliasInput(true)}
                className="font-bold text-cyan-300 hover:underline cursor-pointer text-[11px]"
                title="Toca para cambiar nombre en el chat"
              >
                {alias || myDeviceName} ✏️
              </span>
            )}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center text-cyan-500/60 mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-300">No hay mensajes aún en la sala</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                Escribe un mensaje, notas o enlaces en tiempo real con los dispositivos conectados.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => onSendMessage('👋 ¡Hola a todos en la sala!', alias.trim() || undefined)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 hover:text-cyan-300 text-slate-300 text-xs border border-white/5 transition-colors active:scale-95"
                >
                  👋 ¡Hola a todos!
                </button>
                <button
                  onClick={() => onSendMessage('📋 Listo para transferir archivos', alias.trim() || undefined)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 hover:text-cyan-300 text-slate-300 text-xs border border-white/5 transition-colors active:scale-95"
                >
                  📋 Listo para transferir
                </button>
              </div>
            </div>
          ) : (
            messages.map((item) => {
              const isMe = item.direction === 'sent';
              const textIsUrl = isUrl(item.text);

              return (
                <div
                  key={item.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                >
                  {/* Sender & Timestamp */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1 font-mono">
                    <span className={`font-semibold ${isMe ? 'text-cyan-300' : 'text-indigo-300'}`}>
                      {isMe ? 'Tú' : item.senderName}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`relative max-w-[90%] p-3 rounded-2xl transition-all shadow-sm ${
                      isMe
                        ? 'bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-indigo-600/20 border border-cyan-500/30 text-white rounded-tr-sm'
                        : 'bg-[#050507] border border-white/10 text-slate-200 rounded-tl-sm'
                    }`}
                  >
                    <p className="text-xs leading-relaxed font-sans whitespace-pre-wrap break-words select-text">
                      {item.text}
                    </p>

                    {/* Action Bar (Copy / Link) */}
                    <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-end gap-1.5">
                      {textIsUrl && (
                        <a
                          href={item.text}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-semibold flex items-center gap-1 transition-colors border border-cyan-500/20"
                        >
                          <ExternalLink className="w-3 h-3" /> Abrir enlace
                        </a>
                      )}

                      <button
                        onClick={() => handleCopy(item.id, item.text)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] flex items-center gap-1 transition-colors border border-white/5 active:scale-95"
                        title="Copiar texto"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copiar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer Form - Sticky bottom */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-white/5 bg-[#08080b]/95 flex items-center gap-2 shrink-0"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-3.5 py-2.5 bg-[#050507] border border-white/10 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-colors min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="min-w-[44px] min-h-[44px] rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all active:scale-95"
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4 text-slate-950" />
          </button>
        </form>
      </div>
    </>
  );
};
