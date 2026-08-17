import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  X,
  Camera,
  Upload,
  AlertCircle,
  CheckCircle2,
  Scan,
  SwitchCamera,
  Sparkles,
} from 'lucide-react';

interface QRCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (scannedText: string) => void;
}

export const QRCameraScannerModal: React.FC<QRCameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannedSuccess, setScannedSuccess] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    setScannedSuccess(null);
    setErrorMsg(null);
    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        setHasPermission(true);
        requestAnimationFrame(tickScan);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setHasPermission(false);
      setErrorMsg('No se pudo acceder a la cámara. Permite el acceso o sube una captura con el código QR.');
    }
  };

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleDetectedCode = (codeData: string) => {
    const trimmed = codeData.trim();
    if (!trimmed) return;
    setScannedSuccess(trimmed);
    stopCamera();

    setTimeout(() => {
      onScanResult(trimmed);
      onClose();
    }, 600);
  };

  const tickScan = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          handleDetectedCode(code.data);
          return;
        }
      }
    }

    animFrameIdRef.current = requestAnimationFrame(tickScan);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data) {
        handleDetectedCode(code.data);
      } else {
        setErrorMsg('No se detectó ningún código QR legible en la imagen seleccionada.');
      }
    };
    img.src = URL.createObjectURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-[#050507]/95 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full h-full sm:h-auto sm:max-w-xl bg-[#0c0c0e] sm:border border-white/10 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5 bg-[#050507] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-wide">Escanear Código QR</h3>
              <p className="text-xs text-slate-400">Apunta al código para unirte o vincularte a la sala</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasPermission && (
              <button
                onClick={toggleFacingMode}
                className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors"
                title="Cambiar cámara"
              >
                <SwitchCamera className="w-4 h-4 text-cyan-400" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors active:scale-95"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Camera Viewport */}
        <div className="relative flex-1 sm:aspect-[4/3] w-full bg-black overflow-hidden flex items-center justify-center">
          <video ref={videoRef} className="w-full h-full object-cover sm:object-contain" />
          <canvas ref={canvasRef} className="hidden" />

          {/* Viewfinder Target Box Overlay */}
          {hasPermission && !scannedSuccess && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
              <div className="w-64 sm:w-72 aspect-square border-2 border-cyan-400/50 rounded-3xl relative shadow-[0_0_40px_rgba(6,182,212,0.15)]">
                {/* Corner Accents */}
                <span className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl" />
                <span className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl" />
                <span className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl" />
                <span className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-cyan-400 rounded-br-xl" />
                {/* Animated Scanner Laser */}
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee] animate-bounce mt-[50%]" />
              </div>
            </div>
          )}

          {/* Success Alert Overlay */}
          {scannedSuccess && (
            <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-30 animate-in fade-in duration-200">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-3 animate-bounce shadow-[0_0_30px_#34d399]" />
              <h4 className="font-bold text-white text-lg sm:text-xl">¡Código Detectado con Éxito!</h4>
              <p className="text-xs sm:text-sm text-emerald-200 font-mono mt-1 max-w-sm truncate">
                {scannedSuccess}
              </p>
              <p className="text-xs text-emerald-400/80 mt-3 font-mono">Conectando a la sala...</p>
            </div>
          )}

          {/* Camera Permission Pending/Denied State */}
          {hasPermission === false && (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center max-w-md">
              <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
              <h4 className="text-white font-bold mb-1">Permiso de Cámara Requerido</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Upload Image Alternative Footer */}
        <div className="p-4 sm:p-5 bg-[#050507] border-t border-white/5 shrink-0">
          <label className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs sm:text-sm font-semibold border border-white/10 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95">
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Cargar Foto de QR desde la Galería</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
