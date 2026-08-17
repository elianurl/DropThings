import React, { useState, useEffect, useRef } from 'react';
import { Lock, KeyRound, ShieldAlert, ArrowRight, X, Eye, EyeOff, Sparkles } from 'lucide-react';
import { ThinkingOrb } from 'thinking-orbs';

interface RoomPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onSubmitPin: (pin: string) => void;
  errorMessage?: string | null;
  isLoading?: boolean;
}

export const RoomPinModal: React.FC<RoomPinModalProps> = ({
  isOpen,
  onClose,
  roomId,
  onSubmitPin,
  errorMessage,
  isLoading = false,
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim()) {
      onSubmitPin(pin.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-[#0c0c0e]/95 border border-cyan-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] backdrop-blur-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-indigo-500/20 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Lock className="w-7 h-7 text-cyan-400 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-900 border border-cyan-500/40 text-cyan-300">
              <KeyRound className="w-3 h-3" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[11px] font-mono font-bold border border-cyan-500/30 mb-2">
            <span>SALA:</span>
            <span className="text-white">{roomId}</span>
          </div>

          <h3 className="text-xl font-extrabold text-white tracking-tight">
            Sala Protegida con PIN
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            El creador o administrador ha bloqueado el acceso. Introduce el PIN de seguridad para ingresar.
          </p>
        </div>

        {/* PIN Entry Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
              <span>PIN o Clave de Acceso</span>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPin ? 'Ocultar' : 'Mostrar'}</span>
              </button>
            </label>

            <div className="relative">
              <input
                ref={inputRef}
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Introduce el PIN de la sala..."
                maxLength={32}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-[#050507] border border-white/15 focus:border-cyan-400 rounded-2xl text-center text-lg font-mono tracking-widest text-white placeholder:text-slate-600 placeholder:text-sm placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-300 animate-in shake duration-200">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!pin.trim() || isLoading}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <ThinkingOrb state="working" size={20} theme="auto" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Desbloquear y Entrar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
