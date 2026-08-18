import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  Download,
  RefreshCw,
  QrCode,
  Lock,
  Link,
  FileText,
  Share2,
} from 'lucide-react';

interface QRDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onRefreshRoomId: () => void;
  peerCount: number;
  offlinePayload?: string | null;
  pin?: string | null;
}

export const QRDisplayModal: React.FC<QRDisplayModalProps> = ({
  isOpen,
  onClose,
  roomId,
  onRefreshRoomId,
  peerCount,
  pin,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'room' | 'custom-text'>('room');
  const [customText, setCustomText] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  const fullUrl = `${window.location.origin}${window.location.pathname}#room=${roomId}`;

  useEffect(() => {
    if (!isOpen) return;

    const targetText = mode === 'custom-text' ? (customText || fullUrl) : fullUrl;

    try {
      const qrc = QRCode.create(targetText, { errorCorrectionLevel: 'M' });
      QRCode.toDataURL(targetText, {
        width: 380,
        margin: 2,
        color: { dark: '#050507', light: '#ffffff' },
      })
        .then((url) => setQrDataUrl(url))
        .catch(console.error);

      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, targetText, {
          width: 280,
          margin: 2,
          color: { dark: '#050507', light: '#ffffff' },
        }).catch(console.error);
      }
    } catch (e) {
      console.error(e);
    }
  }, [isOpen, roomId, fullUrl, mode, customText]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const textToCopy = mode === 'room' ? fullUrl : customText;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `dropthings-room-${roomId}.png`;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#050507]/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] max-h-[92vh] overflow-y-auto bg-[#0c0c0e]/98 border border-cyan-500/30 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] backdrop-blur-2xl text-slate-100 flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white tracking-wide">
                Código QR de la Sala
              </h3>
              <p className="text-[11px] text-slate-400">Escanea para conectar al instante</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors active:scale-95"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Mode Selector */}
        <div className="grid grid-cols-2 p-1 bg-[#050507] rounded-xl border border-white/5 text-xs font-semibold my-3">
          <button
            onClick={() => setMode('room')}
            className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'room'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Enlace de Sala</span>
          </button>
          <button
            onClick={() => setMode('custom-text')}
            className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'custom-text'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Texto Personalizado</span>
          </button>
        </div>

        {/* QR Code Canvas Card */}
        <div className="flex flex-col items-center justify-center my-2">
          <div className="relative p-3.5 sm:p-4 bg-white rounded-2xl sm:rounded-3xl shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center justify-center max-w-[260px] sm:max-w-[290px] aspect-square">
            <canvas ref={canvasRef} className="w-full h-full object-contain rounded-xl" />
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl border-2 border-cyan-400/30 pointer-events-none" />
          </div>

          {/* Info details */}
          {mode === 'room' ? (
            <div className="mt-3 text-center w-full space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs text-slate-300 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping" />
                <span>Sala:</span>
                <strong className="text-cyan-300 font-mono text-sm tracking-wider">{roomId}</strong>
              </div>

              {pin && (
                <div className="block">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>PIN:</span>
                    <strong className="text-white font-bold tracking-wider">{pin}</strong>
                  </span>
                </div>
              )}

              <p className="text-xs text-slate-400 max-w-xs mx-auto pt-1 leading-relaxed">
                Apunta con la cámara de tu smartphone para unirte a la sala y transferir archivos directamente.
              </p>
            </div>
          ) : (
            <div className="mt-3 w-full">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Escribe o pega el texto para codificar en el QR:
              </label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Escribe enlace, clave WiFi, contraseña o nota..."
                rows={2}
                className="w-full px-3 py-2 bg-[#050507] border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500/80 resize-none"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-white/5">
          <button
            onClick={handleCopy}
            className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-xs font-semibold border border-white/10 transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '¡Copiado!' : mode === 'room' ? 'Copiar Enlace' : 'Copiar Texto'}</span>
          </button>

          <button
            onClick={handleDownloadQR}
            className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Guardar QR</span>
          </button>
        </div>

        {/* Room Refresh Option */}
        {mode === 'room' && (
          <div className="mt-2.5 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span>¿Cambiar a otra sala?</span>
            <button
              onClick={onRefreshRoomId}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors py-1 px-2 rounded-lg hover:bg-white/5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Nueva Sala
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
