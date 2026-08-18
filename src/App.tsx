import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Toaster, sileo } from 'sileo';
import { Header } from './components/Header';
import { FileTransferZone } from './components/FileTransferZone';
import { ActiveTransfersList } from './components/ActiveTransfersList';
import { RoomChatDrawer } from './components/RoomChatDrawer';
import { FloatingChatButton } from './components/FloatingChatButton';
import { HistorySection } from './components/HistorySection';
import { LandingRoomsView } from './components/LandingRoomsView';

import { OfferedFile, PeerDevice, TextShareItem, TransferHistoryItem, TransferItem } from './types';
import { detectDeviceName, generateRoomId } from './utils/formatters';
import { addHistoryItem, clearHistory, deleteHistoryItem, getHistory } from './utils/storage';
import {
  getSavedRooms,
  upsertSavedRoom,
  appendRoomMessage,
  saveRoomMessages,
  deleteSavedRoom,
  setRoomPin as persistRoomPin,
  setRoomAdmin as persistRoomAdmin,
  setRoomAdminToken,
  clearRoomAdminToken,
  SavedRoom,
} from './utils/roomsStorage';
import { WebRTCManager } from './utils/webrtcManager';
import { playChatNotificationSound } from './utils/audioNotify';

import { Shield, Zap, Radio } from 'lucide-react';
import { normalizeRoomId } from '../shared/protocol';

const QRDisplayModal = lazy(() =>
  import('./components/QRDisplayModal').then((module) => ({ default: module.QRDisplayModal }))
);
const QRCameraScannerModal = lazy(() =>
  import('./components/QRCameraScannerModal').then((module) => ({ default: module.QRCameraScannerModal }))
);
const RoomPinModal = lazy(() =>
  import('./components/RoomPinModal').then((module) => ({ default: module.RoomPinModal }))
);

function getRoomIdFromHash(): string | null {
  const match = window.location.hash.match(/#room=([^&]+)/i);
  return normalizeRoomId(match?.[1]);
}

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(() => {
    // Check if URL hash has #room=CODE
    return getRoomIdFromHash();
  });

  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>(() => getSavedRooms());
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [roomPin, setRoomPin] = useState<string | null>(null);

  // PIN Access Modal State for protected rooms
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pendingPinRoomId, setPendingPinRoomId] = useState<string | null>(null);
  const [pinModalError, setPinModalError] = useState<string | null>(null);
  const [pinModalLoading, setPinModalLoading] = useState(false);

  const [deviceInfo, setDeviceInfo] = useState(() => detectDeviceName());
  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState<PeerDevice[]>([]);
  const [activeTransfers, setActiveTransfers] = useState<TransferItem[]>([]);
  
  const [textItems, setTextItems] = useState<TextShareItem[]>(() => {
    const initialId = getRoomIdFromHash() ?? undefined;
    const initialRoom = initialId ? getSavedRooms().find((r) => r.id === initialId) : undefined;
    return initialRoom?.messages || [];
  });

  const [history, setHistory] = useState<TransferHistoryItem[]>(() => getHistory());
  const [offeredFiles, setOfferedFiles] = useState<OfferedFile[]>([]);

  // Room Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const isChatOpenRef = useRef(false);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    if (isChatOpen) {
      setUnreadChatCount(0);
    }
  }, [isChatOpen]);

  // Sync room in savedRooms
  useEffect(() => {
    if (!roomId) {
      if (window.location.hash) {
        window.location.hash = '';
      }
      setIsAdmin(false);
      setRoomPin(null);
      return;
    }
    const isUrlRoom = window.location.hash.includes('room=');
    const existing = getSavedRooms().find((r) => r.id.toUpperCase() === roomId.toUpperCase());
    const room = upsertSavedRoom(roomId, {
      isCreator: existing ? existing.isCreator : !isUrlRoom,
      creatorDeviceId: deviceInfo.name,
    });
    setSavedRooms(getSavedRooms());
    if (room && room.messages) {
      setTextItems(room.messages);
    }
    if (room?.pin) {
      setRoomPin(room.pin);
    }
    setIsAdmin(Boolean(room?.adminToken));
  }, [roomId]);

  const localFilesRef = useRef<Map<string, File>>(new Map());

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [offlinePayload, setOfflinePayload] = useState<string | null>(null);

  const rtcManagerRef = useRef<WebRTCManager | null>(null);

  useEffect(() => {
    if (!roomId) {
      setIsConnected(false);
      setPeers([]);
      return;
    }

    // Sync URL hash
    window.location.hash = `#room=${roomId}`;

    // Get the current room's persisted access credentials.
    const currentSaved = getSavedRooms().find((r) => r.id.toUpperCase() === roomId.toUpperCase());
    const initialPin = currentSaved?.pin || roomPin;

    // Initialize WebRTC Manager
    const manager = new WebRTCManager({
      onConnectionStatus: (status) => {
        setIsConnected(status === 'connected');
      },
      onJoinFailed: (reason, message, targetRoomId) => {
        setIsConnected(false);
        if (reason === 'INVALID_ROOM') {
          sileo.error({ title: message });
          setRoomId(null);
          window.location.hash = '';
          return;
        }
        setPendingPinRoomId(targetRoomId);
        setPinModalError(
          reason === 'INVALID_PIN'
            ? 'PIN incorrecto. Por favor, verifica el PIN e inténtalo de nuevo.'
            : 'Esta sala requiere un PIN de seguridad para ingresar.'
        );
        setPinModalLoading(false);
        setPinModalOpen(true);
      },
      onRoomJoined: (joinedRoomId, _myPeerId, existingPeers, isAdminUser, hasPin, adminToken) => {
        setPeers(existingPeers);
        setIsAdmin(!!isAdminUser);
        if (adminToken) {
          setRoomAdminToken(joinedRoomId, adminToken);
        } else if (!isAdminUser) {
          clearRoomAdminToken(joinedRoomId);
        }
        if (!hasPin) {
          setRoomPin(null);
          persistRoomPin(joinedRoomId, null);
        }
        persistRoomAdmin(joinedRoomId, !!isAdminUser);
        setSavedRooms(getSavedRooms());
        setPinModalOpen(false);
        setPinModalLoading(false);
        setPinModalError(null);
      },
      onRoomSecurityUpdated: (hasPin) => {
        if (!hasPin) {
          setRoomPin(null);
          if (roomId) persistRoomPin(roomId, null);
        }
        setSavedRooms(getSavedRooms());
        if (hasPin) {
          sileo.info({ title: `Seguridad de la sala actualizada: PIN activado` });
        } else {
          sileo.info({ title: `PIN de la sala desactivado (Acceso libre)` });
        }
      },
      onAdminTokenIssued: (targetRoomId, adminToken) => {
        setRoomAdminToken(targetRoomId, adminToken);
        setIsAdmin(true);
        setSavedRooms(getSavedRooms());
      },
      onAdminTokenRevoked: (targetRoomId) => {
        clearRoomAdminToken(targetRoomId);
        setIsAdmin(false);
        setSavedRooms(getSavedRooms());
      },
      onRoomAdminsUpdated: (_adminPeerIds, targetPeerId, targetIsAdmin) => {
        // Update peers list
        setPeers((prev) =>
          prev.map((p) => (p.id === targetPeerId ? { ...p, isAdmin: targetIsAdmin } : p))
        );

        if (targetPeerId === rtcManagerRef.current?.myPeerId) {
          setIsAdmin(targetIsAdmin);
          if (roomId) {
            persistRoomAdmin(roomId, targetIsAdmin);
            setSavedRooms(getSavedRooms());
          }
          if (targetIsAdmin) {
            sileo.success({ title: '👑 ¡Has sido nombrado Administrador de la sala!' });
          } else {
            sileo.info({ title: 'Tus permisos de Administrador han sido revocados.' });
          }
        }
      },
      onPeerJoined: (peer) => {
        setPeers((prev) => {
          if (prev.some((p) => p.id === peer.id)) return prev;
          return [...prev, peer];
        });
        sileo.success({ title: `Dispositivo conectado: ${peer.name}` });
      },
      onPeerRenamed: (peerId, name, originalName) => {
        setPeers((prev) =>
          prev.map((p) => (p.id === peerId ? { ...p, name, originalName: originalName || p.originalName } : p))
        );
        sileo.info({ title: `Dispositivo renombrado a "${name}"` });
      },
      onPeerLeft: (peerId) => {
        setPeers((prev) => prev.filter((p) => p.id !== peerId));
        sileo.error({ title: `Un dispositivo se ha desconectado` });
      },
      onFileMetaReceived: (fileMeta, senderPeerId) => {
        const newItem: TransferItem = {
          id: fileMeta.id,
          name: fileMeta.name,
          size: fileMeta.size,
          type: fileMeta.type,
          status: 'transferring',
          progress: 0,
          bytesTransferred: 0,
          speed: 0,
          eta: 0,
          direction: 'received',
          timestamp: Date.now(),
        };
        setActiveTransfers((prev) => [newItem, ...prev]);
      },
      onFileProgress: (fileId, progress, bytesReceived, speed, eta) => {
        setActiveTransfers((prev) =>
          prev.map((t) =>
            t.id === fileId
              ? {
                  ...t,
                  progress,
                  bytesTransferred: bytesReceived,
                  speed,
                  eta,
                  status: progress >= 100 ? 'completed' : 'transferring',
                }
              : t
          )
        );
      },
      onFileComplete: (fileId, blob, meta) => {
        const blobUrl = URL.createObjectURL(blob);

        setActiveTransfers((prev) =>
          prev.map((t) =>
            t.id === fileId
              ? {
                  ...t,
                  status: 'completed',
                  progress: 100,
                  blobUrl,
                }
              : t
          )
        );

        // Add to history
        const histItem = addHistoryItem({
          name: meta.name,
          size: meta.size,
          type: meta.type,
          direction: 'received',
          senderName: meta.senderName || 'Dispositivo P2P',
          speed: 0,
          timeTaken: 0,
          status: 'completed',
          timestamp: Date.now(),
          blobUrl,
        });

        setHistory((prev) => [histItem, ...prev]);
        sileo.success({ title: `¡Archivo recibido con éxito: ${meta.name}!` });

        // Trigger automatic browser download
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = meta.name;
        a.click();
      },
      onTextReceived: (text, senderName, timestamp) => {
        const newText: TextShareItem = {
          id: `txt-${crypto.randomUUID()}`,
          text,
          senderName,
          timestamp,
          direction: 'received',
        };
        setTextItems((prev) => [...prev, newText]);
        appendRoomMessage(roomId, newText);
        setSavedRooms(getSavedRooms());

        // Add to history
        const histItem = addHistoryItem({
          name: text.length > 30 ? text.substring(0, 30) + '...' : text,
          size: new TextEncoder().encode(text).length,
          type: 'text/plain',
          direction: 'received',
          senderName: senderName || 'Dispositivo P2P',
          speed: 0,
          timeTaken: 0,
          status: 'completed',
          timestamp,
          textContent: text,
          isText: true,
        });
        setHistory((prev) => [histItem, ...prev]);

        if (!isChatOpenRef.current) {
          setUnreadChatCount((prev) => prev + 1);
          playChatNotificationSound();
          sileo.info({
            title: `Mensaje de ${senderName}`,
            description: text.length > 50 ? text.substring(0, 50) + '...' : text,
          });
        }
      },
      onChatReceived: (text, senderName, timestamp) => {
        const newText: TextShareItem = {
          id: `txt-${crypto.randomUUID()}`,
          text,
          senderName,
          timestamp,
          direction: 'received',
        };
        setTextItems((prev) => [...prev, newText]);
        appendRoomMessage(roomId, newText);
        setSavedRooms(getSavedRooms());

        if (!isChatOpenRef.current) {
          setUnreadChatCount((prev) => prev + 1);
          playChatNotificationSound();
          sileo.info({
            title: `Mensaje de ${senderName}`,
            description: text.length > 50 ? text.substring(0, 50) + '...' : text,
          });
        }
      },
      onFilesOffered: (filesMeta, senderPeerId, senderName) => {
        setOfferedFiles((prev) => {
          const newOffers: OfferedFile[] = filesMeta.map((fileMeta) => ({
            ...fileMeta,
            senderPeerId,
            senderName,
          }));
          return [...newOffers, ...prev];
        });
        sileo.info({ title: `${senderName} precargó archivos en la sala.` });
      },
      onFileRequested: (fileId, requesterPeerId) => {
        startActualFileTransfer(fileId, requesterPeerId);
      },
      onError: (msg) => {
        sileo.error({ title: `Error: ${msg}` });
      },
    });

    rtcManagerRef.current = manager;
    manager.connect(roomId, deviceInfo.name, deviceInfo.type, initialPin, currentSaved?.adminToken, deviceInfo.originalName);

    return () => {
      manager.disconnect();
    };
  }, [roomId]);

  const handleRenameDevice = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setDeviceInfo((prev) => {
      try {
        localStorage.setItem('dropthing.deviceAlias', trimmed);
      } catch {
        // Device aliases are optional when browser storage is unavailable.
      }
      return { ...prev, name: trimmed };
    });
    if (rtcManagerRef.current) {
      rtcManagerRef.current.updateDeviceName(trimmed, deviceInfo.originalName);
    }
  };

  // Admin PIN management handler
  const handleUpdateRoomPin = (newPin: string | null) => {
    const clean = newPin && newPin.trim() ? newPin.trim() : null;
    rtcManagerRef.current?.updateRoomPin(clean);
    setRoomPin(clean);
    if (roomId) {
      persistRoomPin(roomId, clean);
      setSavedRooms(getSavedRooms());
    }
  };

  // Admin Peer delegation handler
  const handleSetPeerAdmin = (targetPeerId: string, makeAdmin: boolean) => {
    rtcManagerRef.current?.setPeerAdmin(targetPeerId, makeAdmin);
    setPeers((prev) =>
      prev.map((p) => (p.id === targetPeerId ? { ...p, isAdmin: makeAdmin } : p))
    );
    const peerName = peers.find((p) => p.id === targetPeerId)?.name || 'Dispositivo';
    if (makeAdmin) {
      sileo.success({ title: `${peerName} ahora es Administrador` });
    } else {
      sileo.info({ title: `Se quitaron permisos de Admin a ${peerName}` });
    }
  };

  // Submit PIN for room locked
  const handlePinSubmit = (enteredPin: string) => {
    const target = pendingPinRoomId || roomId;
    if (!target) return;
    setPinModalLoading(true);
    setPinModalError(null);

    // Save PIN locally for this room
    persistRoomPin(target, enteredPin);
    setRoomPin(enteredPin);
    setSavedRooms(getSavedRooms());

    if (rtcManagerRef.current) {
      const adminToken = getSavedRooms().find((room) => room.id === target.toUpperCase())?.adminToken;
      rtcManagerRef.current.connect(target, deviceInfo.name, deviceInfo.type, enteredPin, adminToken, deviceInfo.originalName);
    }
  };

  const handleClosePinModal = () => {
    setPinModalOpen(false);
    setPendingPinRoomId(null);
    setPinModalError(null);
    setPinModalLoading(false);
    // If not connected to a room, clear roomId
    if (!isConnected) {
      setRoomId(null);
      window.location.hash = '';
    }
  };

  const handleRefreshRoom = () => {
    handleCreateNewRoom();
  };

  const handleLeaveRoom = () => {
    setRoomId(null);
    window.location.hash = '';
    setPeers([]);
    setIsConnected(false);
    setOfferedFiles([]);
    setSavedRooms(getSavedRooms());
  };

  const handleSwitchRoom = (newRoomId: string) => {
    const clean = normalizeRoomId(newRoomId);
    if (!clean) {
      sileo.error({ title: 'El código de sala no es válido.' });
      return;
    }
    const targetRoom = upsertSavedRoom(clean, { isCreator: false });
    setRoomId(clean);
    setTextItems(targetRoom.messages || []);
    setOfferedFiles([]);
    setPeers([]);
    setSavedRooms(getSavedRooms());
    sileo.success({ title: `Conectado a sala: ${clean}` });
  };

  const handleCreateNewRoom = () => {
    const newRoom = generateRoomId();
    upsertSavedRoom(newRoom, {
      isCreator: true,
      creatorDeviceId: deviceInfo.name,
    });
    setRoomId(newRoom);
    setTextItems([]);
    setOfferedFiles([]);
    setPeers([]);
    setSavedRooms(getSavedRooms());
    sileo.success({ title: `Nueva sala creada: ${newRoom}` });
  };

  const handleDeleteRoom = (targetRoomId: string) => {
    const upper = targetRoomId.toUpperCase();
    const remaining = deleteSavedRoom(upper);
    setSavedRooms(remaining);

    if (roomId && upper === roomId.toUpperCase()) {
      handleLeaveRoom();
    }
    sileo.success({ title: `Sala ${upper} eliminada` });
  };

  const handleSendFiles = (files: File[]) => {
    if (!rtcManagerRef.current) return;

    const filesMeta = files.map((file) => {
      const fileId = `file-${crypto.randomUUID()}`;
      localFilesRef.current.set(fileId, file);
      return {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
      };
    });

    if (rtcManagerRef.current.offerFiles(filesMeta)) {
      sileo.success({ title: 'Archivos precargados en la sala', description: 'Los otros dispositivos ahora pueden descargarlos.' });
    } else {
      sileo.error({ title: 'No hay otros dispositivos conectados para recibir la oferta.' });
    }
  };

  const startActualFileTransfer = (fileId: string, peerId: string) => {
    const file = localFilesRef.current.get(fileId);
    if (!file || !rtcManagerRef.current) return;

    const startTime = Date.now();

    const newTransferItem: TransferItem = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      status: 'transferring',
      progress: 0,
      bytesTransferred: 0,
      speed: 0,
      eta: 0,
      direction: 'sent',
      timestamp: startTime,
    };

    setActiveTransfers((prev) => [newTransferItem, ...prev]);

    rtcManagerRef.current?.sendFile(
      file,
      fileId,
      peerId,
      (progress, bytesSent, speed, eta) => {
        setActiveTransfers((prev) =>
          prev.map((t) =>
            t.id === fileId
              ? {
                  ...t,
                  progress,
                  bytesTransferred: bytesSent,
                  speed,
                  eta,
                  status: progress >= 100 ? 'completed' : 'transferring',
                }
              : t
          )
        );
      },
      () => {
        const timeTaken = (Date.now() - startTime) / 1000;
        const histItem = addHistoryItem({
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          direction: 'sent',
          senderName: deviceInfo.name || 'Tú',
          speed: file.size / (timeTaken || 1),
          timeTaken,
          status: 'completed',
          timestamp: Date.now(),
        });

        setHistory((prev) => [histItem, ...prev]);
        sileo.success({ title: `¡Archivo enviado con éxito: ${file.name}!` });
      },
      (err) => {
        setActiveTransfers((prev) =>
          prev.map((t) => (t.id === fileId ? { ...t, status: 'error', error: err } : t))
        );
        sileo.error({ title: `Error al enviar: ${err}` });
      }
    );
  };

  const handleSendText = (text: string) => {
    handleSendChat(text);
    sileo.success({ title: 'Mensaje enviado a la sala' });
  };

  const handleSendChat = (text: string, alias?: string) => {
    if (!rtcManagerRef.current) return;

    rtcManagerRef.current.sendChat(text, alias);

    const newTextItem: TextShareItem = {
      id: `txt-${crypto.randomUUID()}`,
      text,
      senderName: alias || deviceInfo.name,
      timestamp: Date.now(),
      direction: 'sent',
    };

    setTextItems((prev) => [...prev, newTextItem]);
    if (roomId) appendRoomMessage(roomId, newTextItem);
    setSavedRooms(getSavedRooms());

    // Save to history
    const histItem = addHistoryItem({
      name: text.length > 30 ? text.substring(0, 30) + '...' : text,
      size: new TextEncoder().encode(text).length,
      type: 'text/plain',
      direction: 'sent',
      senderName: alias || deviceInfo.name || 'Tú',
      speed: 0,
      timeTaken: 0,
      status: 'completed',
      timestamp: Date.now(),
      textContent: text,
      isText: true,
    });
    setHistory((prev) => [histItem, ...prev]);
  };

  const handleScanResult = (scannedText: string) => {
    if (scannedText.startsWith('OFFLINE_RESULT:')) {
      const data = scannedText.substring(15);
      try {
        const parsed: unknown = JSON.parse(data);
        const processFile = (value: unknown) => {
           if (!value || typeof value !== 'object') return;
           const fileObj = value as Record<string, unknown>;
           if (typeof fileObj.t === 'string' && typeof fileObj.n === 'string' && typeof fileObj.d === 'string') {
             const fileType = fileObj.t;
             const fileName = fileObj.n;
             const fileData = fileObj.d;
             fetch(`data:${fileType};base64,${fileData}`).then(r => r.blob()).then(blob => {
               const blobUrl = URL.createObjectURL(blob);
               const histItem = addHistoryItem({
                 name: fileName,
                 size: blob.size,
                 type: fileType,
                 direction: 'received',
                 speed: 0,
                 timeTaken: 0,
                 status: 'completed',
                 timestamp: Date.now(),
                 blobUrl,
               });
               setHistory((prev) => [histItem, ...prev]);
               sileo.success({ title: `Archivo offline recibido: ${fileName}` });
               const a = document.createElement('a');
               a.href = blobUrl;
               a.download = fileName;
               a.click();
             });
           }
        };

        if (Array.isArray(parsed)) {
           parsed.forEach(processFile);
        } else if (parsed && typeof parsed === 'object' && 't' in parsed && 'n' in parsed && 'd' in parsed) {
           processFile(parsed);
        } else {
           throw new Error('Not a file object');
        }
        return;
      } catch {
        // Just text
        const newTextItem: TextShareItem = {
          id: `txt-${crypto.randomUUID()}`,
          text: data,
          senderName: 'Dispositivo Offline (QR)',
          timestamp: Date.now(),
          direction: 'received',
        };
        setTextItems((prev) => [...prev, newTextItem]);
        if (roomId) appendRoomMessage(roomId, newTextItem);
        setSavedRooms(getSavedRooms());
        
        const histItem = addHistoryItem({
          name: data.length > 30 ? data.substring(0, 30) + '...' : data,
          size: new TextEncoder().encode(data).length,
          type: 'text/plain',
          direction: 'received',
          speed: 0,
          timeTaken: 0,
          status: 'completed',
          timestamp: Date.now(),
          textContent: data,
          isText: true,
        });
        setHistory((prev) => [histItem, ...prev]);
        sileo.success({ title: 'Texto offline recibido en el chat' });
      }
      return;
    }

    const match = scannedText.match(/#room=([^&]+)/i);
    const scannedRoomId = normalizeRoomId(match?.[1]);
    if (scannedRoomId) {
      const newRoom = scannedRoomId;
      handleSwitchRoom(newRoom);
      sileo.success({ title: `Te has unido a la sala: ${newRoom}` });
    } else if (normalizeRoomId(scannedText)) {
      const newRoom = normalizeRoomId(scannedText)!;
      handleSwitchRoom(newRoom);
      sileo.success({ title: `Te has unido a la sala: ${newRoom}` });
    } else {
      // Scanned custom text/URL
      navigator.clipboard.writeText(scannedText);
      sileo.success({ title: 'QR escaneado: Texto copiado al portapapeles' });
      if (roomId) {
        handleSendText(scannedText);
      }
    }
  };

  const handleGenerateOfflineQR = (payload: string) => {
    setOfflinePayload(payload);
    setQrModalOpen(true);
  };

  const handlePauseResume = (fileId: string) => {
    if (rtcManagerRef.current) {
      const isPaused = rtcManagerRef.current.togglePauseSending(fileId);
      setActiveTransfers((prev) =>
        prev.map((t) => (t.id === fileId ? { ...t, status: isPaused ? 'paused' : 'transferring' } : t))
      );
    }
  };

  const handleCancelTransfer = (fileId: string) => {
    if (rtcManagerRef.current) {
      rtcManagerRef.current.cancelSending(fileId);
      setActiveTransfers((prev) => prev.filter((t) => t.id !== fileId));
    }
  };

  const handleClearCompletedActive = () => {
    setActiveTransfers((prev) => prev.filter((t) => t.status !== 'completed'));
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = deleteHistoryItem(id);
    setHistory(updated);
  };

  const handleClearHistoryAll = () => {
    clearHistory();
    setHistory([]);
    sileo.success({ title: 'Historial borrado completamente' });
  };

  const toggleChat = () => {
    setIsChatOpen((prev) => {
      if (!prev) setUnreadChatCount(0);
      return !prev;
    });
  };

  return (
    <div className="min-h-screen bg-immersive-radial text-slate-100 transition-colors duration-300 font-sans pb-20">
      <Toaster theme="dark" />
      {/* App Top Bar */}
      <Header
        roomId={roomId}
        isConnected={isConnected}
        peers={peers}
        myDeviceName={deviceInfo.name}
        myOriginalDeviceName={deviceInfo.originalName}
        myDeviceType={deviceInfo.type}
        savedRooms={savedRooms}
        isAdmin={isAdmin}
        roomPin={roomPin}
        onUpdatePin={handleUpdateRoomPin}
        onSetPeerAdmin={handleSetPeerAdmin}
        onOpenQRModal={() => {
          setOfflinePayload(null);
          setQrModalOpen(true);
        }}
        onOpenScannerModal={() => setScannerModalOpen(true)}
        onRenameDevice={handleRenameDevice}
        onCreateNewRoom={handleCreateNewRoom}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Main Content: Landing View (when no room active) vs Workspace (when in active room) */}
      {!roomId ? (
        <LandingRoomsView
          savedRooms={savedRooms}
          onOpenScanner={() => setScannerModalOpen(true)}
          onCreateRoom={handleCreateNewRoom}
          onJoinRoom={handleSwitchRoom}
          onDeleteRoom={handleDeleteRoom}
        />
      ) : (
        <main className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 sm:pb-28">
          <div className="space-y-4 sm:space-y-6">
            {/* File Transfer Upload Hub */}
            <FileTransferZone
              onSendFiles={handleSendFiles}
              onSendText={handleSendText}
              isConnected={isConnected}
              peerCount={peers.length}
            />

            {/* Archivos Precargados Disponibles */}
            {offeredFiles.length > 0 && (
              <div className="bg-[#0c0c0e]/90 border border-emerald-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-md text-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Zap className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-sm tracking-wide">Archivos Disponibles en la Sala</h3>
                </div>
                <div className="space-y-3">
                  {offeredFiles.map((file, idx) => (
                    <div key={`${file.id}-${idx}`} className="flex items-center justify-between p-3 rounded-2xl bg-[#050507] border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">{file.name}</span>
                        <span className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB • De: {file.senderName}</span>
                      </div>
                      <button
                        onClick={() => {
                          if (rtcManagerRef.current) {
                            const requested = rtcManagerRef.current.requestFile(file.id, file.senderPeerId);
                            if (requested) {
                              setOfferedFiles((prev) => prev.filter(f => f.id !== file.id));
                              sileo.info({ title: 'Descarga solicitada', description: `Solicitando ${file.name} a ${file.senderName}...` });
                            } else {
                              sileo.error({ title: 'El dispositivo que ofreció el archivo ya no está disponible.' });
                            }
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-500/30 transition-all"
                      >
                        Descargar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Live Session Transfers */}
            <ActiveTransfersList
              transfers={activeTransfers}
              onPauseResume={handlePauseResume}
              onCancel={handleCancelTransfer}
              onClearCompleted={handleClearCompletedActive}
            />

            {/* History Section */}
            <HistorySection
              history={history}
              onDeleteItem={handleDeleteHistoryItem}
              onClearHistory={handleClearHistoryAll}
            />
          </div>
        </main>
      )}

      {/* Futuristic Immersive UI Mesh Footer Bar (Only when inside active room) */}
      {roomId && (
        <footer className="fixed bottom-0 left-0 right-0 h-9 bg-[#08080c]/90 backdrop-blur-md border-t border-white/5 z-40 px-4 text-[11px] font-mono flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Radio className="w-3 h-3 animate-pulse" />
              <span className="hidden sm:inline">PROTOCOLO:</span> WebRTC Direct P2P
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:flex items-center gap-1 text-slate-400">
              <Shield className="w-3 h-3 text-emerald-400" /> Canal WebRTC cifrado
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400'}`} />
              <span className="font-bold text-slate-200">{isConnected ? 'Malla P2P Activa' : 'Esperando Conexión'}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400 font-bold">{peers.length + 1} {peers.length + 1 === 1 ? 'Nodo' : 'Nodos'}</span>
          </div>
        </footer>
      )}

      {/* Collapsible / Floating Room Chat Drawer (Only when inside active room) */}
      {roomId && (
        <RoomChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={textItems}
          onSendMessage={handleSendChat}
          onClearMessages={() => {
            setTextItems([]);
            if (roomId) {
              saveRoomMessages(roomId, []);
            }
            setSavedRooms(getSavedRooms());
          }}
          myDeviceName={deviceInfo.name}
          myOriginalDeviceName={deviceInfo.originalName}
          onRenameDevice={handleRenameDevice}
          peerCount={peers.length}
          roomId={roomId}
        />
      )}

      {/* Floating Chat Launcher Button with Unread Badge (Only when inside active room) */}
      {roomId && (
        <FloatingChatButton
          isOpen={isChatOpen}
          unreadCount={unreadChatCount}
          onToggle={toggleChat}
        />
      )}

      {/* QR Connection Modal (Only when inside active room) */}
      {roomId && qrModalOpen && (
        <Suspense fallback={null}>
          <QRDisplayModal
            isOpen
            onClose={() => {
              setQrModalOpen(false);
              setTimeout(() => setOfflinePayload(null), 300);
            }}
            roomId={roomId}
            onRefreshRoomId={handleRefreshRoom}
            peerCount={peers.length}
            offlinePayload={offlinePayload}
            pin={roomPin}
          />
        </Suspense>
      )}

      {/* PIN Access Verification Modal for locked rooms */}
      {pinModalOpen && (
        <Suspense fallback={null}>
          <RoomPinModal
            isOpen
            onClose={handleClosePinModal}
            roomId={pendingPinRoomId || roomId || ''}
            onSubmitPin={handlePinSubmit}
            errorMessage={pinModalError}
            isLoading={pinModalLoading}
          />
        </Suspense>
      )}

      {/* QR Camera Scanner Modal */}
      {scannerModalOpen && (
        <Suspense fallback={null}>
          <QRCameraScannerModal
            isOpen
            onClose={() => setScannerModalOpen(false)}
            onScanResult={handleScanResult}
          />
        </Suspense>
      )}
    </div>
  );
}
