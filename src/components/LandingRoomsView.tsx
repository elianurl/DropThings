import React, { useState } from 'react';
import { SavedRoom, canDeleteRoom } from '../utils/roomsStorage';
import {
  Scan,
  Plus,
  Radio,
  QrCode,
  ArrowRight,
  Trash2,
  Lock,
  Clock,
  MessageSquare,
  ShieldCheck,
  Zap,
  Sparkles,
  Layers,
} from 'lucide-react';
import { BRAND } from '../config/brand';

interface LandingRoomsViewProps {
  savedRooms: SavedRoom[];
  onOpenScanner: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string) => void;
}

export const LandingRoomsView: React.FC<LandingRoomsViewProps> = ({
  savedRooms,
  onOpenScanner,
  onCreateRoom,
  onJoinRoom,
  onDeleteRoom,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = codeInput.trim().toUpperCase();
    if (clean) {
      onJoinRoom(clean);
      setCodeInput('');
    }
  };

  const hasRooms = savedRooms.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-3.5 sm:px-6 py-6 sm:py-10 animate-in fade-in duration-300">
      {/* Brand Hero Greeting */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-3 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{BRAND.name} · P2P directo y cifrado</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2.5">
          {BRAND.tagline}
        </h2>
        <p className="text-xs sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed px-2">
          Comparte archivos y mensajes directamente entre dispositivos mediante WebRTC, sin subirlos a la nube.
        </p>
      </div>

      {!hasRooms ? (
        /* CASE 1: First time / No existing rooms -> Scan QR + Create Room */
        <div className="space-y-4 sm:space-y-6">
          <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#0c0c0e]/90 border border-white/10 shadow-[0_15px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl text-center relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center max-w-md mx-auto space-y-3.5 sm:space-y-4">
              {/* Giant Scan Button */}
              <button
                id="landing-big-scan-button"
                onClick={onOpenScanner}
                className="w-full min-h-[56px] py-4 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-base sm:text-lg flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] active:scale-[0.98] transition-all cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-slate-950/15 group-hover:scale-110 transition-transform">
                  <Scan className="w-6 h-6 text-slate-950" />
                </div>
                <span>Escanear QR para vincular</span>
              </button>

              {/* Secondary Create Room Button */}
              <button
                id="landing-secondary-create-button"
                onClick={onCreateRoom}
                className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-cyan-500/40 text-slate-200 hover:text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,0,0,0.3)] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Crear una sala nueva</span>
              </button>

              {/* Quick Code Join Input */}
              <form onSubmit={handleCodeSubmit} className="w-full pt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="O ingresa código (ej. ALFA-789)"
                  className="flex-1 px-3.5 py-2.5 sm:py-3 bg-[#050507] border border-white/10 rounded-xl text-xs sm:text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-colors min-h-[44px]"
                />
                <button
                  type="submit"
                  disabled={!codeInput.trim()}
                  className="min-h-[44px] px-4 py-2.5 sm:py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.25)] active:scale-95"
                >
                  Entrar
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* CASE 2: Existing rooms in history -> Action Row & Active Rooms History List */
        <div className="space-y-4 sm:space-y-6">
          {/* Top Actions Card */}
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#0c0c0e]/90 border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-3.5">
              {/* Scan QR Button */}
              <button
                id="landing-compact-scan-button"
                onClick={onOpenScanner}
                className="min-h-[48px] py-3 px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Scan className="w-4 h-4 text-slate-950 shrink-0" />
                <span>Escanear QR</span>
              </button>

              {/* Create Room Button */}
              <button
                id="landing-create-room-button"
                onClick={onCreateRoom}
                className="min-h-[48px] py-3 px-4 rounded-xl sm:rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-cyan-500/40 text-slate-200 hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Crear una sala</span>
              </button>
            </div>

            {/* Quick Room Code Input */}
            <form onSubmit={handleCodeSubmit} className="flex items-center gap-2 pt-2.5 border-t border-white/5">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Código de sala (ej. BETA-9X1)..."
                className="flex-1 px-3.5 py-2 sm:py-2.5 bg-[#050507] border border-white/10 rounded-xl text-xs sm:text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-colors min-h-[40px]"
              />
              <button
                type="submit"
                disabled={!codeInput.trim()}
                className="min-h-[40px] px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 disabled:opacity-40 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 active:scale-95"
              >
                Unirse
              </button>
            </form>
          </div>

          {/* Historial de Salas Activas Section */}
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#0c0c0e]/90 border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                  <Layers className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                    Historial de Salas
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                    Selecciona para reanudar sesión y mensajes
                  </p>
                </div>
              </div>
              <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 shrink-0">
                {savedRooms.length} {savedRooms.length === 1 ? 'sala' : 'salas'}
              </span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {savedRooms.map((room) => {
                const deletable = canDeleteRoom(room, false, 0);
                const isConfirming = deleteConfirmId === room.id;

                return (
                  <div
                    key={room.id}
                    className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#050507] hover:bg-[#07070a] border border-white/5 hover:border-cyan-500/30 transition-all flex items-center justify-between gap-2.5 group"
                  >
                    {/* Room Info */}
                    <div
                      className="flex-1 cursor-pointer min-w-0"
                      onClick={() => onJoinRoom(room.id)}
                    >
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="font-mono text-xs sm:text-sm font-extrabold text-cyan-300 tracking-wider">
                          {room.id}
                        </span>
                        {room.pin && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> PIN
                          </span>
                        )}
                        {room.isCreator && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Creador
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 truncate">
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                          {new Date(room.lastActive).toLocaleDateString()}
                        </span>
                        {room.messages && room.messages.length > 0 && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <MessageSquare className="w-3 h-3 text-cyan-400 shrink-0" />
                            {room.messages.length} msg
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onJoinRoom(room.id)}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 text-xs font-semibold border border-cyan-500/20 flex items-center gap-1 transition-all group-hover:bg-cyan-500 group-hover:text-slate-950 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95"
                      >
                        <span>Entrar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {deletable && (
                        <div className="relative">
                          {isConfirming ? (
                            <div className="flex items-center gap-1 bg-red-950/90 border border-red-500/40 rounded-xl p-1 animate-in fade-in duration-150">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteRoom(room.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-1 bg-red-500 hover:bg-red-400 text-white rounded-lg text-[10px] font-bold"
                              >
                                Sí
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg text-[10px]"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(room.id);
                              }}
                              className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                              title="Eliminar sala"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
