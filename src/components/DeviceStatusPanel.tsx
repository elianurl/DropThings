import React from 'react';
import { PeerDevice } from '../types';
import { Laptop, Smartphone, Tablet, Radio, QrCode } from 'lucide-react';
import { ThinkingOrb } from 'thinking-orbs';

interface DeviceStatusPanelProps {
  myDeviceName: string;
  myOriginalDeviceName?: string;
  myDeviceType: string;
  roomId: string;
  peers: PeerDevice[];
  isConnected: boolean;
  onOpenQR: () => void;
  onRenameDevice: (newName: string) => void;
}

export const DeviceStatusPanel: React.FC<DeviceStatusPanelProps> = ({
  myDeviceName,
  myOriginalDeviceName,
  myDeviceType,
  roomId,
  peers,
  isConnected,
  onOpenQR,
  onRenameDevice,
}) => {
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-cyan-400" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-blue-400" />;
      default:
        return <Laptop className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="bg-[#0c0c0e]/90 border border-white/5 rounded-2xl p-4 text-slate-100 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2 tracking-wide">
              Red P2P Local
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'}`} />
            </h3>
            <p className="text-[11px] text-slate-400">Sala: <strong className="text-cyan-300 font-mono">{roomId}</strong></p>
          </div>
        </div>

        <button
          onClick={onOpenQR}
          className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
        >
          <QrCode className="w-3.5 h-3.5 text-cyan-400" />
          <span>Vincular a sala</span>
        </button>
      </div>

      {/* Devices List Grid */}
      <div className="space-y-2">
        {/* Local Device */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#050507] border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.1)]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#0c0c0e] border border-white/5">
              {getDeviceIcon(myDeviceType)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={myDeviceName}
                  onChange={(e) => onRenameDevice(e.target.value)}
                  className="bg-transparent text-xs font-bold text-cyan-300 border-b border-transparent hover:border-slate-700 focus:border-cyan-400 focus:outline-none px-0 py-0.5"
                  title="Haz clic para editar tu alias de dispositivo"
                />
                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">TÚ</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Dispositivo: <span className="text-slate-300">{myOriginalDeviceName || myDeviceName}</span> • Local
              </p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        </div>

        {/* Remote Peers */}
        {peers.length > 0 ? (
          peers.map((peer) => (
            <div key={peer.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#050507]/60 border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#0c0c0e] border border-white/5">
                  {getDeviceIcon(peer.deviceType)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">{peer.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Dispositivo: <span className="text-slate-300">{peer.originalName || peer.name}</span> • P2P
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                <span>Listo</span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-3.5 text-center flex flex-col items-center rounded-xl bg-[#050507]/40 border border-dashed border-white/10 text-xs text-slate-400">
            <div className="mb-2 opacity-70">
              <ThinkingOrb state="searching" size={20} theme="auto" />
            </div>
            <p className="font-medium text-slate-300">Esperando otros dispositivos...</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Escanea el QR con tu teléfono</p>
          </div>
        )}
      </div>
    </div>
  );
};
