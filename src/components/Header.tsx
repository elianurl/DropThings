import { lazy, Suspense } from 'react';
import type { FC } from 'react';
import { ShieldCheck, Scan, Plus } from 'lucide-react';
import { PeerDevice } from '../types';
import { SavedRoom } from '../utils/roomsStorage';
import { BRAND } from '../config/brand';
import { BrandMark } from './BrandMark';

const NetworkRoomDropdown = lazy(() =>
  import('./NetworkRoomDropdown').then((module) => ({ default: module.NetworkRoomDropdown }))
);

interface HeaderProps {
  roomId: string | null;
  isConnected: boolean;
  peers: PeerDevice[];
  myDeviceName: string;
  myOriginalDeviceName?: string;
  myDeviceType: string;
  savedRooms: SavedRoom[];
  isAdmin?: boolean;
  roomPin?: string | null;
  onUpdatePin?: (newPin: string | null) => void;
  onSetPeerAdmin?: (targetPeerId: string, isAdmin: boolean) => void;
  onOpenQRModal: () => void;
  onOpenScannerModal: () => void;
  onRenameDevice: (newName: string) => void;
  onCreateNewRoom: () => void;
  onLeaveRoom?: () => void;
}

export const Header: FC<HeaderProps> = ({
  roomId,
  isConnected,
  peers,
  myDeviceName,
  myOriginalDeviceName,
  myDeviceType,
  savedRooms,
  isAdmin = false,
  roomPin = null,
  onUpdatePin,
  onSetPeerAdmin,
  onOpenQRModal,
  onOpenScannerModal,
  onRenameDevice,
  onCreateNewRoom,
  onLeaveRoom,
}) => {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0c0c0e]/90 border-b border-white/5 text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Name */}
        <button
          type="button"
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none min-w-0 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          onClick={onLeaveRoom || onOpenQRModal}
          title={roomId ? 'Ir al inicio / Ver todas las salas' : BRAND.name}
        >
          <div className="relative shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#050507] rounded-[10px] flex items-center justify-center">
                <BrandMark className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#050507]" />
          </div>

          <div className="min-w-0 truncate">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-extrabold bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent tracking-tight">
                {BRAND.name}
              </h1>
              <span className="hidden xs:inline-flex px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" /> P2P
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block truncate">
              {BRAND.tagline}
            </p>
          </div>
        </button>

        {/* Right Aligned Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* QR Camera Scan Button */}
          <button
            onClick={onOpenScannerModal}
            className="min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.15)] active:scale-95"
            title="Escanear QR con Cámara"
          >
            <Scan className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Escanear QR</span>
          </button>

          {/* If inside an active room -> Unified Split Button for Active Session */}
          {roomId ? (
            <Suspense fallback={<span className="text-xs text-slate-500">Cargando sala…</span>}>
              <NetworkRoomDropdown
                roomId={roomId}
                isConnected={isConnected}
                peers={peers}
                myDeviceName={myDeviceName}
                myOriginalDeviceName={myOriginalDeviceName}
                myDeviceType={myDeviceType}
                savedRooms={savedRooms}
                isAdmin={isAdmin}
                roomPin={roomPin}
                onUpdatePin={onUpdatePin}
                onSetPeerAdmin={onSetPeerAdmin}
                onRenameDevice={onRenameDevice}
                onOpenQRModal={onOpenQRModal}
                onLeaveRoom={onLeaveRoom}
              />
            </Suspense>
          ) : (
            /* If on Landing -> Quick Create Room button */
            <button
              onClick={onCreateNewRoom}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/10 hover:border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
              title="Crear una sala nueva"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xs:inline">Crear sala</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
