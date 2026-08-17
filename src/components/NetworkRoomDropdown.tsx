import React, { useState, useRef, useEffect } from 'react';
import { PeerDevice } from '../types';
import { SavedRoom, canDeleteRoom } from '../utils/roomsStorage';
import {
  Radio,
  ChevronDown,
  QrCode,
  Laptop,
  Smartphone,
  Tablet,
  Users,
  Check,
  Copy,
  Plus,
  Trash2,
  Lock,
  Unlock,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Crown,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  UserPlus,
  X,
  Sparkles,
} from 'lucide-react';
import { ThinkingOrb } from 'thinking-orbs';

interface NetworkRoomDropdownProps {
  roomId: string;
  isConnected: boolean;
  peers: PeerDevice[];
  myDeviceName: string;
  myOriginalDeviceName?: string;
  myDeviceType: string;
  savedRooms?: SavedRoom[];
  isAdmin?: boolean;
  roomPin?: string | null;
  onUpdatePin?: (newPin: string | null) => void;
  onSetPeerAdmin?: (targetPeerId: string, isAdmin: boolean) => void;
  onRenameDevice: (newName: string) => void;
  onOpenQRModal: () => void;
  onLeaveRoom?: () => void;
}

export const NetworkRoomDropdown: React.FC<NetworkRoomDropdownProps> = ({
  roomId,
  isConnected,
  peers,
  myDeviceName,
  myOriginalDeviceName,
  myDeviceType,
  savedRooms = [],
  isAdmin = false,
  roomPin = null,
  onUpdatePin,
  onSetPeerAdmin,
  onRenameDevice,
  onOpenQRModal,
  onLeaveRoom,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  
  // Device name edit state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(myDeviceName);
  const [nameSavedFeedback, setNameSavedFeedback] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Admin PIN management state
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinValue, setShowPinValue] = useState(false);
  const [pinSavedFeedback, setPinSavedFeedback] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Keep nameInput in sync with myDeviceName
  useEffect(() => {
    setNameInput(myDeviceName);
  }, [myDeviceName]);

  // Sync pinInput with current roomPin when opening edit
  useEffect(() => {
    if (roomPin) {
      setPinInput(roomPin);
    } else {
      setPinInput('');
    }
  }, [roomPin, isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditingPin(false);
        setIsEditingName(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleNameSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = nameInput.trim();
    if (clean) {
      onRenameDevice(clean);
      setNameSavedFeedback(true);
      setTimeout(() => setNameSavedFeedback(false), 1500);
    } else {
      setNameInput(myDeviceName);
    }
    setIsEditingName(false);
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5 text-cyan-400" />;
      case 'tablet':
        return <Tablet className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <Laptop className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  const handleCopyRoom = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedRoom(true);
    setTimeout(() => setCopiedRoom(false), 2000);
  };

  const handleCopyPin = () => {
    if (roomPin) {
      navigator.clipboard.writeText(roomPin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdatePin) {
      const cleanPin = pinInput.trim();
      onUpdatePin(cleanPin || null);
      setPinSavedFeedback(true);
      setTimeout(() => {
        setPinSavedFeedback(false);
        setIsEditingPin(false);
      }, 1200);
    }
  };

  const handleRemovePin = () => {
    if (onUpdatePin) {
      onUpdatePin(null);
      setPinInput('');
      setIsEditingPin(false);
    }
  };

  const currentSavedRoom = savedRooms?.find((r) => r.id.toUpperCase() === roomId.toUpperCase());
  const effectiveIsAdmin = isAdmin || !!currentSavedRoom?.isCreator || !!currentSavedRoom?.isAdmin;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Split/Segmented Trigger Button: Left for Room Dropdown, Right for QR Vinculación */}
      <div
        className={`flex items-center rounded-xl border transition-all ${
          isOpen
            ? 'bg-[#15151a] border-cyan-500/80 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]'
            : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border-white/10 hover:border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
        }`}
      >
        {/* Left Segment: Active Room Info & Dropdown Toggle */}
        <button
          id="network-room-dropdown-button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 pl-3 pr-2 py-1.5 text-xs font-medium transition-all active:scale-[0.98] rounded-l-xl"
          title="Ver Red P2P Local, Sala Activa, Seguridad y Nodos"
        >
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span
                className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </div>
            <span className="text-slate-400 hidden sm:inline">Sala:</span>
            <span className="font-mono font-bold text-cyan-300 tracking-wide">{roomId}</span>
          </div>

          {/* PIN Lock Indicator on Trigger */}
          {roomPin && (
            <span
              className="p-0.5 text-amber-400"
              title="Sala protegida con PIN"
            >
              <Lock className="w-3 h-3" />
            </span>
          )}

          {/* Admin badge icon if user has admin rights */}
          {effectiveIsAdmin && (
            <span
              className="p-0.5 text-amber-400"
              title="Eres Administrador de esta sala"
            >
              <Crown className="w-3 h-3" />
            </span>
          )}

          {/* Peer Count Badge (Including local device: min 1) */}
          <span className="px-1.5 py-0.2 text-[10px] bg-cyan-500/15 text-cyan-300 rounded-md font-mono border border-cyan-500/30">
            {peers.length + 1} {peers.length + 1 === 1 ? 'nodo' : 'nodos'}
          </span>

          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-cyan-400' : ''
            }`}
          />
        </button>

        {/* Subtle Vertical Divider */}
        <div className="w-[1px] h-4 bg-white/15" />

        {/* Right Segment: QR Vinculación Modal Trigger */}
        <button
          id="header-room-qr-button"
          onClick={onOpenQRModal}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-cyan-300 hover:text-white hover:bg-cyan-500/20 transition-all rounded-r-xl active:scale-95 group"
          title="Vincular a esta sala (Mostrar Código QR)"
        >
          <QrCode className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="hidden md:inline text-[11px]">Vincular</span>
        </button>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[350px] sm:w-[400px] max-w-[calc(100vw-1.5rem)] bg-[#0c0c0e]/98 border border-white/10 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-200">
          {/* Header */}
          <div className="px-4 py-3 bg-[#08080b] border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white tracking-wide flex items-center gap-1.5">
                  Red P2P Local
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400'
                    }`}
                  />
                </h4>
                <p className="text-[10px] text-slate-400">Directo sin servidores intermediarios</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {effectiveIsAdmin && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                  <Crown className="w-2.5 h-2.5 text-amber-400" /> Admin
                </span>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-3.5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* Active Room Card */}
            <div className="p-3 rounded-xl bg-[#050507] border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.1)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Sala Actual
                </span>
                <div className="flex items-center gap-1">
                  {roomPin && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Con PIN
                    </span>
                  )}
                  {currentSavedRoom?.isCreator && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                      Creador
                    </span>
                  )}
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    Activa
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm font-extrabold text-cyan-300 tracking-wider">
                    {roomId}
                  </span>
                  <button
                    onClick={handleCopyRoom}
                    className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Copiar código de sala"
                  >
                    {copiedRoom ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                <button
                  onClick={() => {
                    onOpenQRModal();
                    setIsOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold flex items-center gap-1 transition-all"
                >
                  <QrCode className="w-3 h-3 text-cyan-400" />
                  <span>Vincular a sala</span>
                </button>
              </div>
            </div>

            {/* ADMIN EXCLUSIVE PANEL: Security & PIN Access Control */}
            {effectiveIsAdmin ? (
              <div className="p-3 rounded-xl bg-gradient-to-b from-[#111118] to-[#07070b] border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.08)]">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded-md bg-amber-500/10 text-amber-400">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold text-amber-200">
                      Seguridad y Control de Acceso (Admin)
                    </span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                    SOLO ADMINS
                  </span>
                </div>

                {/* PIN Status & Toggle */}
                {!isEditingPin ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#050507] border border-white/5 text-xs">
                      <div className="flex items-center gap-2">
                        {roomPin ? (
                          <div className="p-1 rounded-md bg-amber-500/20 text-amber-300">
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1 rounded-md bg-white/5 text-slate-400">
                            <Unlock className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <p className="text-[11px] font-bold text-slate-200">
                            {roomPin ? 'Sala Bloqueada con PIN' : 'Acceso Libre (Sin PIN)'}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            {roomPin
                              ? 'Solo usuarios con el PIN pueden acceder'
                              : 'Cualquiera con el código o QR puede entrar'}
                          </p>
                        </div>
                      </div>

                      {roomPin && (
                        <div className="flex items-center gap-1 font-mono text-xs">
                          <span className="px-2 py-0.5 bg-black/50 border border-amber-500/30 rounded text-amber-300 font-bold">
                            {showPinValue ? roomPin : '••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowPinValue(!showPinValue)}
                            className="p-1 text-slate-400 hover:text-white rounded"
                            title={showPinValue ? 'Ocultar PIN' : 'Ver PIN'}
                          >
                            {showPinValue ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyPin}
                            className="p-1 text-slate-400 hover:text-white rounded"
                            title="Copiar PIN"
                          >
                            {copiedPin ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Edit PIN Action Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setPinInput(roomPin || '');
                        setIsEditingPin(true);
                      }}
                      className="w-full py-1.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>{roomPin ? 'Editar o Quitar PIN de Acceso' : 'Proteger Sala con PIN'}</span>
                    </button>
                  </div>
                ) : (
                  /* In-Place PIN Editor */
                  <form onSubmit={handleSavePin} className="space-y-2.5 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-1">
                        Establecer Clave o PIN de Acceso:
                      </label>
                      <div className="relative">
                        <input
                          type={showPinValue ? 'text' : 'password'}
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value)}
                          placeholder="Ej: 1234 o CLAVE-SECRET"
                          maxLength={32}
                          autoFocus
                          className="w-full px-3 py-1.5 bg-[#050507] border border-amber-500/50 focus:border-amber-400 rounded-lg text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPinValue(!showPinValue)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                        >
                          {showPinValue ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1">
                        Los nuevos usuarios deberán introducir este PIN tras escanear el QR o ingresar el código.
                      </p>
                    </div>

                    {pinSavedFeedback && (
                      <div className="p-1.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>¡PIN guardado y aplicado a la sala!</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={!pinInput.trim()}
                        className="flex-1 py-1.5 px-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        <span>Guardar PIN</span>
                      </button>

                      {roomPin && (
                        <button
                          type="button"
                          onClick={handleRemovePin}
                          className="py-1.5 px-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-semibold transition-colors"
                          title="Desactivar PIN y dejar acceso libre"
                        >
                          Quitar Bloqueo
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setIsEditingPin(false)}
                        className="py-1.5 px-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* Non-admin view of PIN status */
              roomPin && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
                  <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <div className="text-[10px]">
                    <span className="font-bold">Sala protegida con PIN.</span> Administrada por el creador.
                  </div>
                </div>
              )
            )}

            {/* People / Nodes in the Current Room (Always includes local device + remote peers) */}
            <div>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Gente en esta sala</span>
                  <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded font-mono text-[10px] border border-cyan-500/30">
                    {peers.length + 1}
                  </span>
                </span>
                {effectiveIsAdmin && peers.length > 0 && (
                  <span className="text-[9px] text-amber-400 font-semibold">
                    Puedes nombrar admins
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {/* Local Device (Member #1 in the room) */}
                <div className="p-2.5 rounded-xl bg-[#050507] border border-cyan-500/30 text-xs shadow-[0_0_12px_rgba(6,182,212,0.08)] group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                      <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0">
                        {getDeviceIcon(myDeviceType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isEditingName ? (
                            <form onSubmit={handleNameSubmit} className="flex items-center gap-1">
                              <input
                                ref={nameInputRef}
                                type="text"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleNameSubmit();
                                  } else if (e.key === 'Escape') {
                                    setNameInput(myDeviceName);
                                    setIsEditingName(false);
                                  }
                                }}
                                onBlur={() => handleNameSubmit()}
                                autoFocus
                                className="bg-[#08080c] text-xs font-bold text-cyan-300 border border-cyan-400 rounded px-1.5 py-0.5 max-w-[130px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                placeholder="Tu alias"
                                maxLength={24}
                              />
                              <button
                                type="submit"
                                onMouseDown={(e) => e.preventDefault()}
                                className="p-1 rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                                title="Guardar alias"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </form>
                          ) : (
                            <div
                              onClick={() => setIsEditingName(true)}
                              className="flex items-center gap-1 cursor-pointer group/name hover:opacity-90 max-w-[150px] truncate"
                              title="Haz clic para editar tu alias / nombre principal"
                            >
                              <span className="text-xs font-bold text-cyan-300 truncate underline decoration-dotted decoration-cyan-500/50 underline-offset-2">
                                {myDeviceName}
                              </span>
                              {nameSavedFeedback && (
                                <span className="text-[9px] text-emerald-400 flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </div>
                          )}

                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 shrink-0">
                            TÚ
                          </span>
                          {effectiveIsAdmin && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 flex items-center gap-0.5 shrink-0">
                              <Crown className="w-2.5 h-2.5" /> ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-[9.5px] text-slate-400 font-mono flex items-center gap-1 truncate mt-0.5">
                          <span className="text-slate-400">Dispositivo:</span>
                          <span className="text-slate-300 font-medium">{myOriginalDeviceName || myDeviceName}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">Local</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                      <span className="text-[10px] font-medium">En línea</span>
                    </div>
                  </div>
                </div>

                {/* Remote Peers in the Room */}
                {peers.map((peer) => (
                  <div
                    key={peer.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#050507] border border-white/5 text-xs group hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                      <div className="p-1.5 rounded-lg bg-[#0c0c0e] border border-white/5 text-slate-300 shrink-0">
                        {getDeviceIcon(peer.deviceType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-100 text-xs truncate">{peer.name}</p>
                          {peer.isAdmin && (
                            <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-0.5 shrink-0">
                              <Crown className="w-2 h-2" /> Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[9.5px] text-slate-400 font-mono flex items-center gap-1 truncate mt-0.5">
                          <span className="text-slate-400">Dispositivo:</span>
                          <span className="text-slate-300 font-medium">{peer.originalName || peer.name}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">P2P</span>
                        </p>
                      </div>
                    </div>

                    {/* Right controls: Admin Delegation or Status */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Admin Action: Delegate / Revoke Admin */}
                      {effectiveIsAdmin && onSetPeerAdmin && (
                        peer.isAdmin ? (
                          <button
                            type="button"
                            onClick={() => onSetPeerAdmin(peer.id, false)}
                            className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-red-500/20 text-amber-300 hover:text-red-300 border border-amber-500/20 hover:border-red-500/30 text-[9px] font-semibold transition-colors"
                            title="Revocar privilegios de administrador"
                          >
                            Quitar Admin
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSetPeerAdmin(peer.id, true)}
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-white/5 hover:border-amber-500/30 text-[9px] font-semibold flex items-center gap-1 transition-colors"
                            title="Hacer Administrador de la sala"
                          >
                            <Crown className="w-2.5 h-2.5 text-amber-400" />
                            <span>Hacer Admin</span>
                          </button>
                        )
                      )}

                      <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="hidden sm:inline">Listo</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Subtle helper when only user is in the room */}
                {peers.length === 0 && (
                  <div className="p-2.5 text-center flex items-center justify-center gap-2 rounded-xl bg-[#050507]/40 border border-dashed border-white/10 text-xs text-slate-400">
                    <ThinkingOrb state="searching" size={20} theme="auto" />
                    <span className="text-[10.5px] text-slate-400">
                      Esperando que otros dispositivos se vinculen a la sala...
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Exit Room / View All Rooms in Landing */}
            {onLeaveRoom && (
              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLeaveRoom();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition-all group"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                  <span>Ver Pantalla Principal / Cambiar Sala</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
