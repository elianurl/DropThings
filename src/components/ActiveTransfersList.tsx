import React from 'react';
import { TransferItem } from '../types';
import { formatBytes, formatSpeed, formatTime } from '../utils/formatters';
import { Download, Pause, Play, XCircle, CheckCircle2, ArrowUpRight, ArrowDownLeft, FileText, AlertCircle, Eye } from 'lucide-react';

interface ActiveTransfersListProps {
  transfers: TransferItem[];
  onPauseResume: (fileId: string) => void;
  onCancel: (fileId: string) => void;
  onClearCompleted: () => void;
}

export const ActiveTransfersList: React.FC<ActiveTransfersListProps> = ({
  transfers,
  onPauseResume,
  onCancel,
  onClearCompleted,
}) => {
  if (transfers.length === 0) return null;

  return (
    <div className="bg-[#0c0c0e]/90 border border-white/5 rounded-3xl p-5 shadow-2xl backdrop-blur-md text-slate-100 mt-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2 tracking-wide">
          <span>Transferencias de la Sesión</span>
          <span className="px-2 py-0.5 text-xs bg-cyan-500/10 text-cyan-300 rounded-full font-mono border border-cyan-500/20">
            {transfers.length}
          </span>
        </h3>

        {transfers.some((t) => t.status === 'completed') && (
          <button
            onClick={onClearCompleted}
            className="text-xs text-slate-400 hover:text-cyan-300 transition-colors"
          >
            Limpiar Completados
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
        {transfers.map((item) => {
          const isSent = item.direction === 'sent';
          const isTransferring = item.status === 'transferring';
          const isCompleted = item.status === 'completed';
          const isPaused = item.status === 'paused';

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all ${
                isCompleted
                  ? 'bg-[#050507]/60 border-white/5'
                  : isTransferring
                  ? 'bg-[#050507] border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                  : 'bg-[#050507]/40 border-white/5'
              }`}
            >
              {/* Header Info */}
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 truncate">
                  <div className={`p-1.5 rounded-lg shrink-0 ${isSent ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {isSent ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-slate-100 truncate">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {formatBytes(item.size)} • {isSent ? 'Enviando' : 'Recibiendo'} {item.peerName ? `a ${item.peerName}` : ''}
                    </p>
                  </div>
                </div>

                {/* Status Badge / Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {isTransferring && (
                    <button
                      onClick={() => onPauseResume(item.id)}
                      className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 transition-colors"
                      title={isPaused ? 'Reanudar' : 'Pausar'}
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {isTransferring && (
                    <button
                      onClick={() => onCancel(item.id)}
                      className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      title="Cancelar"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isCompleted && item.blobUrl && (
                    <a
                      href={item.blobUrl}
                      download={item.name}
                      className="py-1 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar
                    </a>
                  )}

                  {isCompleted && !item.blobUrl && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold font-mono">
                      <CheckCircle2 className="w-4 h-4" /> Completado
                    </span>
                  )}
                </div>
              </div>

              {/* Text content preview if text transfer */}
              {item.isText && item.textContent && (
                <div className="my-2 p-2.5 rounded-xl bg-[#08080c] border border-white/5 text-xs text-slate-200 font-mono break-all max-h-20 overflow-y-auto">
                  {item.textContent}
                </div>
              )}

              {/* Progress Bar & Gauges */}
              {!item.isText && (
                <div className="space-y-1.5">
                  <div className="w-full h-2 bg-[#08080c] rounded-full overflow-hidden p-0.5 border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted
                          ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                          : isPaused
                          ? 'bg-amber-400'
                          : 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{item.progress}% ({formatBytes(item.bytesTransferred)} de {formatBytes(item.size)})</span>
                    {isTransferring && !isPaused && (
                      <span className="text-cyan-300 font-semibold">
                        {formatSpeed(item.speed)} • Quedan {formatTime(item.eta)}
                      </span>
                    )}
                    {isPaused && <span className="text-amber-400 font-semibold">En Pausa</span>}
                    {isCompleted && <span className="text-emerald-400 font-semibold">¡100% Transferido!</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
