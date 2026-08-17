import React, { useState } from 'react';
import { TransferHistoryItem } from '../types';
import { formatBytes } from '../utils/formatters';
import {
  History,
  Search,
  Trash2,
  Download,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  User,
  Clock,
  HardDrive,
} from 'lucide-react';

interface HistorySectionProps {
  history: TransferHistoryItem[];
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  history,
  onDeleteItem,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'files' | 'text'>('all');
  const [filterDirection, setFilterDirection] = useState<'all' | 'sent' | 'received'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  const formatDateTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const dateStr = d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
    const timeStr = d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dateStr}, ${timeStr}`;
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.senderName && item.senderName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.textContent && item.textContent.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      filterCategory === 'all' ||
      (filterCategory === 'files' && !item.isText) ||
      (filterCategory === 'text' && item.isText);

    const matchesDirection =
      filterDirection === 'all' || item.direction === filterDirection;

    return matchesSearch && matchesCategory && matchesDirection;
  });

  const totalTransferredBytes = history.reduce((acc, h) => acc + (h.size || 0), 0);
  const completedCount = history.filter((h) => h.status === 'completed').length;

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-[#0c0c0e]/90 border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-md text-slate-100 mt-4 sm:mt-6">
      {/* Header & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3.5 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
              <History className="w-4 h-4 text-cyan-400" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-white tracking-wide">
              Historial de Transferencias
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Registro guardado en tu navegador ({history.length} {history.length === 1 ? 'registro' : 'registros'})
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="flex items-center gap-3 text-xs font-mono bg-[#050507] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
          <div className="min-w-0">
            <span className="text-slate-500 block text-[9px] uppercase tracking-wider">TOTAL:</span>
            <strong className="text-cyan-400 text-xs sm:text-sm font-bold truncate block">{formatBytes(totalTransferredBytes)}</strong>
          </div>
          <div className="w-px h-5 bg-white/10" />
          <div>
            <span className="text-slate-500 block text-[9px] uppercase tracking-wider">COMPLETADOS:</span>
            <strong className="text-emerald-400 text-xs sm:text-sm font-bold block">{completedCount}</strong>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3.5">
        {/* Search Bar */}
        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en el historial..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#050507] border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-colors min-h-[36px]"
          />
        </div>

        {/* Filter Pills & Clear */}
        <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 bg-[#050507] p-1 rounded-xl border border-white/5 text-[11px] shrink-0">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterCategory === 'all'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterCategory('files')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterCategory === 'files'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Archivos
            </button>
            <button
              onClick={() => setFilterCategory('text')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterCategory === 'text'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Textos
            </button>
          </div>

          {history.length > 0 && (
            <button
              onClick={() => setShowClearConfirmModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1 transition-all shrink-0 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* History Items List */}
      {filteredHistory.length > 0 ? (
        <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredHistory.map((item) => {
            const isSent = item.direction === 'sent';
            const senderDisplay = item.senderName
              ? item.senderName
              : isSent
              ? 'Tú'
              : 'Dispositivo P2P';

            return (
              <div
                key={item.id}
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#050507] border border-white/5 hover:border-cyan-500/30 transition-all shadow-sm group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  {/* Left Column: Icon & Primary Info */}
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isSent
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isSent ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Name & Direction Tag */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate max-w-full" title={item.name}>
                          {item.name}
                        </h4>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold border ${
                            isSent
                              ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {isSent ? 'Enviado' : 'Recibido'}
                        </span>
                      </div>

                      {/* Required Metadata: Peso, Quién lo envió, Fecha y hora */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1.5 pt-1.5 border-t border-white/5 text-[10.5px] font-mono">
                        {/* 1. Peso / Tamaño del archivo */}
                        <div className="flex items-center gap-1 text-slate-300">
                          <HardDrive className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="text-slate-400">Peso:</span>
                          <strong className="text-cyan-300 font-bold truncate">{formatBytes(item.size)}</strong>
                        </div>

                        {/* 2. Quién lo envió */}
                        <div className="flex items-center gap-1 text-slate-300 truncate">
                          <User className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="text-slate-400">De:</span>
                          <strong className="text-slate-100 truncate" title={senderDisplay}>
                            {senderDisplay}
                          </strong>
                        </div>

                        {/* 3. Fecha y hora */}
                        <div className="flex items-center gap-1 text-slate-400 col-span-2 sm:col-span-1">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="text-slate-300 truncate">{formatDateTime(item.timestamp)}</span>
                        </div>
                      </div>

                      {/* Preview for Text content if text share */}
                      {item.isText && item.textContent && (
                        <div className="mt-2 p-2 rounded-lg bg-[#08080c] border border-white/5 text-xs text-slate-300 font-mono break-all max-h-20 overflow-y-auto">
                          {item.textContent}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-end gap-1.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    {item.isText && item.textContent && (
                      <button
                        onClick={() => handleCopyText(item.id, item.textContent!)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors border border-white/5 active:scale-95"
                        title="Copiar texto"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> <span>Copiar</span>
                          </>
                        )}
                      </button>
                    )}

                    {!item.isText && item.blobUrl && (
                      <a
                        href={item.blobUrl}
                        download={item.name}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-colors shadow-[0_0_10px_rgba(6,182,212,0.3)] active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" /> <span>Descargar</span>
                      </a>
                    )}

                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors active:scale-95"
                      title="Eliminar del historial"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center text-slate-500 text-xs bg-[#050507]/40 rounded-xl border border-dashed border-white/10">
          <History className="w-6 h-6 mx-auto text-slate-600 mb-1.5" />
          <p>No se encontraron registros en el historial de transferencias.</p>
        </div>
      )}

      {/* Clear History Confirmation Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050507]/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-5 max-w-sm w-full text-slate-100 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h4 className="text-sm font-bold text-center text-white">¿Limpiar todo el historial?</h4>
            <p className="text-xs text-slate-400 text-center mt-1.5">
              Esta acción eliminará de forma permanente el registro local de transferencias.
            </p>

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold transition-colors border border-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onClearHistory();
                  setShowClearConfirmModal(false);
                }}
                className="py-2 px-3 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-bold transition-colors"
              >
                Sí, Limpiar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
