import React, { useRef, useState } from 'react';
import { formatBytes, getFileTypeCategory } from '../utils/formatters';
import {
  Upload,
  File,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  Code,
  Trash2,
  Send,
  Plus,
  ShieldCheck,
  Smartphone,
  Share2,
} from 'lucide-react';

interface FileTransferZoneProps {
  onSendFiles: (files: File[]) => void;
  onSendText: (text: string) => void;
  isConnected: boolean;
  peerCount: number;
}

export const FileTransferZone: React.FC<FileTransferZoneProps> = ({
  onSendFiles,
  onSendText,
  isConnected,
  peerCount,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'text'>('files');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllSelected = () => {
    setSelectedFiles([]);
  };

  const handleSendBatch = () => {
    if (selectedFiles.length === 0) return;
    onSendFiles(selectedFiles);
    setSelectedFiles([]);
  };

  const handleSendTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onSendText(textInput);
    setTextInput('');
  };

  const renderCategoryIcon = (file: File) => {
    const cat = getFileTypeCategory(file.type, file.name);
    switch (cat) {
      case 'image':
        return <Image className="w-5 h-5 text-cyan-400" />;
      case 'video':
        return <Film className="w-5 h-5 text-purple-400" />;
      case 'audio':
        return <Music className="w-5 h-5 text-emerald-400" />;
      case 'archive':
        return <Archive className="w-5 h-5 text-amber-400" />;
      case 'code':
        return <Code className="w-5 h-5 text-blue-400" />;
      case 'document':
      default:
        return <FileText className="w-5 h-5 text-indigo-400" />;
    }
  };

  const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="bg-[#0c0c0e]/90 border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-md text-slate-100 transition-all">
      {/* Tab Selectors - Mobile-Optimized Segmented Control */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-white/5 pb-3.5 mb-4 gap-3">
        <div className="grid grid-cols-2 p-1 bg-[#050507] rounded-xl sm:rounded-2xl border border-white/5 text-xs font-semibold w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('files')}
            className={`py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center select-none ${
              activeTab === 'files'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span className="truncate">Archivos {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}</span>
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center select-none ${
              activeTab === 'text'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">Texto / Notas</span>
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>P2P Directo • Cifrado</span>
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10 sm:hidden">
            {peerCount} {peerCount === 1 ? 'nodo' : 'nodos'}
          </span>
        </div>
      </div>

      {activeTab === 'files' ? (
        <div>
          {/* Drop Zone Box - Highly responsive for touch & desktop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-5 sm:p-8 text-center cursor-pointer transition-all duration-200 group active:scale-[0.99] select-none ${
              isDragging
                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01] shadow-[0_0_25px_rgba(6,182,212,0.25)]'
                : 'border-white/10 hover:border-cyan-500/50 bg-[#050507]/60 hover:bg-[#050507]/90 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform mb-2.5 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <Upload className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-cyan-300 transition-colors">
                Toca o arrastra para seleccionar archivos
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed px-2">
                Videos pesados, fotos HD, documentos, carpetas o ZIPs sin límite de tamaño.
              </p>
              <div className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-cyan-500 hover:text-slate-950 border border-white/10 text-xs font-semibold text-slate-200 transition-all shadow-sm">
                <Plus className="w-3.5 h-3.5 text-cyan-400 group-hover:text-slate-950" />
                <span>Explorar Archivos del Dispositivo</span>
              </div>
            </div>
          </div>

          {/* Selected Files Preview List */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 sm:mt-5 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                <span className="font-semibold">
                  {selectedFiles.length} {selectedFiles.length === 1 ? 'archivo' : 'archivos'} ({formatBytes(totalBytes)})
                </span>
                <button
                  onClick={clearAllSelected}
                  className="text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors text-xs py-1 px-2 rounded-lg hover:bg-white/5 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar todo</span>
                </button>
              </div>

              <div className="max-h-56 sm:max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-[#050507] border border-white/5 hover:border-white/10 transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-[#0c0c0e] border border-white/5 shrink-0">
                        {renderCategoryIcon(file)}
                      </div>
                      <div className="truncate min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{formatBytes(file.size)}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFile(idx)}
                      className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-[#0c0c0e] transition-colors shrink-0 active:scale-95"
                      title="Eliminar de la lista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Notice if lonely in room */}
              {peerCount === 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs p-3 rounded-xl flex items-start gap-2 leading-relaxed">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    <strong>Esperando dispositivos en la sala.</strong> Al preparar los archivos quedarán listos para transferirse automáticamente en cuanto se conecte un par.
                  </span>
                </div>
              )}

              {/* Main Action Send Button */}
              <button
                onClick={handleSendBatch}
                className="w-full min-h-[48px] py-3.5 px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-sm sm:text-base shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Send className="w-4 h-4" />
                <span>
                  {peerCount > 0 ? `Enviar ${selectedFiles.length} ${selectedFiles.length === 1 ? 'Archivo' : 'Archivos'}` : 'Preparar Archivos en la Sala'}
                </span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Instant Text Share Tab */
        <form onSubmit={handleSendTextSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Escribe o pega texto, notas o enlaces para compartir:
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Escribe mensajes, enlaces URL, contraseñas o notas para enviar a la sala..."
              rows={4}
              className="w-full p-3.5 bg-[#050507] border border-white/10 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-colors resize-none leading-relaxed"
            />
          </div>

          {peerCount === 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs p-3 rounded-xl flex items-start gap-2 leading-relaxed">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                <strong>Nadie en la sala todavía.</strong> El texto quedará guardado para enviarse al instante a quien ingrese.
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={!textInput.trim()}
            className="w-full min-h-[48px] py-3.5 px-6 rounded-xl sm:rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-400 text-slate-950 font-extrabold text-sm sm:text-base shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Send className="w-4 h-4 text-slate-950" />
            <span>{peerCount > 0 ? 'Enviar Texto a la Sala' : 'Preparar Texto en la Sala'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
