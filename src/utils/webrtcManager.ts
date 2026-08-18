import { io, Socket } from 'socket.io-client';
import { FileTransferMeta, PeerDevice, SignalingPayload } from '../types';

const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk
const BUFFER_THRESHOLD = 256 * 1024; // 256 KB flow control buffer threshold
const DEFAULT_ICE_SERVER = 'stun:stun.cloudflare.com:3478';

function getIceServers(): RTCIceServer[] {
  const configuredUrls = import.meta.env.VITE_ICE_SERVERS?.split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  return (configuredUrls?.length ? configuredUrls : [DEFAULT_ICE_SERVER]).map((urls) => ({ urls }));
}

export interface WebRTCEvents {
  onPeerJoined: (peer: PeerDevice) => void;
  onPeerRenamed?: (peerId: string, name: string, originalName?: string) => void;
  onPeerLeft: (peerId: string) => void;
  onRoomJoined: (roomId: string, myPeerId: string, peers: PeerDevice[], isAdmin?: boolean, hasPin?: boolean, adminToken?: string) => void;
  onJoinFailed?: (reason: 'PIN_REQUIRED' | 'INVALID_PIN' | 'INVALID_ROOM', message: string, roomId: string) => void;
  onRoomSecurityUpdated?: (hasPin: boolean, pin?: string | null) => void;
  onRoomAdminsUpdated?: (adminPeerIds: string[], targetPeerId: string, isAdmin: boolean) => void;
  onAdminTokenIssued?: (roomId: string, adminToken: string) => void;
  onAdminTokenRevoked?: (roomId: string) => void;
  onFileMetaReceived: (fileMeta: FileTransferMeta, senderPeerId: string) => void;
  onFileProgress: (fileId: string, progress: number, bytesReceived: number, speed: number, eta: number) => void;
  onFileComplete: (fileId: string, blob: Blob, meta: FileTransferMeta) => void;
  onTextReceived: (text: string, senderName: string, timestamp: number) => void;
  onChatReceived: (text: string, senderName: string, timestamp: number) => void;
  onFilesOffered: (filesMeta: FileTransferMeta[], senderPeerId: string, senderName: string) => void;
  onFileRequested: (fileId: string, requesterPeerId: string) => void;
  onConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected') => void;
  onError: (msg: string) => void;
}

export class WebRTCManager {
  private socket: Socket | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private knownPeerIds = new Set<string>();
  private events: WebRTCEvents;
  private adminToken?: string;

  public roomId: string = '';
  public myPeerId: string = '';
  public deviceName: string = '';
  public originalName: string = '';
  public deviceType: string = 'browser';
  public isAdmin: boolean = false;
  public roomPin: string | null = null;

  // Receiving state: fileId -> { meta, chunks: [], bytesReceived, startTime, lastTime, lastBytes }
  private receivingFiles: Map<string, {
    meta: FileTransferMeta;
    chunks: ArrayBuffer[];
    bytesReceived: number;
    startTime: number;
    lastTime: number;
    lastBytes: number;
  }> = new Map();

  // Active sending transfers for cancellation/pausing
  private activeSending: Map<string, { canceled: boolean; paused: boolean }> = new Map();

  constructor(events: WebRTCEvents) {
    this.events = events;
  }

  public connect(roomId: string, deviceName: string, deviceType: string, pin?: string | null, adminToken?: string, originalName?: string) {
    this.roomId = roomId.toUpperCase();
    this.deviceName = deviceName;
    this.originalName = originalName || deviceName;
    this.deviceType = deviceType;
    this.roomPin = pin || null;
    this.adminToken = adminToken;

    if (this.socket) {
      this.socket.disconnect();
    }

    this.events.onConnectionStatus('connecting');

    const signalingUrl = import.meta.env.VITE_SIGNALING_URL?.trim() || undefined;
    this.socket = io(signalingUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      this.socket?.emit('join-room', {
        roomId: this.roomId,
        deviceName: this.deviceName,
        originalName: this.originalName,
        deviceType: this.deviceType,
        pin: this.roomPin,
        adminToken: this.adminToken,
      });
    });

    this.socket.on('disconnect', () => {
      this.events.onConnectionStatus('disconnected');
    });

    this.socket.on('join-failed', (data: { reason: 'PIN_REQUIRED' | 'INVALID_PIN' | 'INVALID_ROOM'; message: string; roomId: string }) => {
      this.events.onConnectionStatus('disconnected');
      if (this.events.onJoinFailed) {
        this.events.onJoinFailed(data.reason, data.message, data.roomId);
      } else {
        this.events.onError(data.message);
      }
    });

    this.socket.on('room-joined', (data: { roomId: string; peerId: string; existingPeers: PeerDevice[]; isAdmin?: boolean; hasPin?: boolean; adminToken?: string }) => {
      this.myPeerId = data.peerId;
      this.isAdmin = !!data.isAdmin;
      this.adminToken = data.adminToken ?? this.adminToken;
      this.knownPeerIds = new Set(data.existingPeers.map((peer) => peer.id));
      this.events.onConnectionStatus('connected');
      this.events.onRoomJoined(data.roomId, data.peerId, data.existingPeers, data.isAdmin, data.hasPin, data.adminToken);

      // Create WebRTC offer for existing peers in room
      data.existingPeers.forEach((peer) => {
        this.createPeerConnection(peer.id, true);
      });
    });

    this.socket.on('room-security-updated', (data: { roomId: string; hasPin: boolean; pin?: string | null }) => {
      if (data.pin !== undefined) {
        this.roomPin = data.pin;
      }
      if (this.events.onRoomSecurityUpdated) {
        this.events.onRoomSecurityUpdated(data.hasPin, data.pin);
      }
    });

    this.socket.on('room-admins-updated', (data: { roomId: string; adminPeerIds: string[]; targetPeerId: string; isAdmin: boolean }) => {
      if (data.targetPeerId === this.myPeerId) {
        this.isAdmin = data.isAdmin;
      }
      if (this.events.onRoomAdminsUpdated) {
        this.events.onRoomAdminsUpdated(data.adminPeerIds, data.targetPeerId, data.isAdmin);
      }
    });

    this.socket.on('admin-token-issued', (data: { roomId: string; adminToken: string }) => {
      this.isAdmin = true;
      this.adminToken = data.adminToken;
      this.events.onAdminTokenIssued?.(data.roomId, data.adminToken);
    });

    this.socket.on('admin-token-revoked', (data: { roomId: string }) => {
      this.isAdmin = false;
      this.adminToken = undefined;
      this.events.onAdminTokenRevoked?.(data.roomId);
    });

    this.socket.on('error-message', (data: { message: string }) => {
      this.events.onError(data.message);
    });

    this.socket.on('peer-joined', (data: { peerId: string; peer: PeerDevice }) => {
      this.knownPeerIds.add(data.peerId);
      this.events.onPeerJoined(data.peer);
    });

    this.socket.on('peer-renamed', (data: { peerId: string; name: string; originalName?: string }) => {
      if (this.events.onPeerRenamed) {
        this.events.onPeerRenamed(data.peerId, data.name, data.originalName);
      }
    });

    this.socket.on('peer-left', (data: { peerId: string }) => {
      this.knownPeerIds.delete(data.peerId);
      this.closePeer(data.peerId);
      this.events.onPeerLeft(data.peerId);
    });

    this.socket.on('signal', (data: { senderPeerId: string; signal: SignalingPayload }) => {
      this.handleSignal(data.senderPeerId, data.signal).catch(() => {
        this.events.onError('No se pudo establecer el canal P2P con otro dispositivo.');
      });
    });

    this.socket.on('file-meta', (data: { senderPeerId: string; fileMeta: FileTransferMeta }) => {
      this.receivingFiles.set(data.fileMeta.id, {
        meta: data.fileMeta,
        chunks: [],
        bytesReceived: 0,
        startTime: Date.now(),
        lastTime: Date.now(),
        lastBytes: 0,
      });
      this.events.onFileMetaReceived(data.fileMeta, data.senderPeerId);
    });

    this.socket.on('file-chunk-fallback', (data: { senderPeerId: string; chunk: ArrayBuffer; chunkIndex: number; totalChunks: number; fileId: string }) => {
      this.handleChunkReceived(data.fileId, data.chunk);
    });

    this.socket.on('text-received', (data: { senderPeerId: string; senderName: string; text: string; timestamp: number }) => {
      this.events.onTextReceived(data.text, data.senderName, data.timestamp);
    });

    this.socket.on('chat-received', (data: { senderPeerId: string; senderName: string; text: string; timestamp: number }) => {
      this.events.onChatReceived(data.text, data.senderName, data.timestamp);
    });

    this.socket.on('files-offered', (data: { senderPeerId: string; senderName: string; files: FileTransferMeta[] }) => {
      this.events.onFilesOffered(data.files, data.senderPeerId, data.senderName);
    });

    this.socket.on('file-requested', (data: { fileId: string; requesterPeerId: string }) => {
      this.events.onFileRequested(data.fileId, data.requesterPeerId);
    });
  }

  public updateDeviceName(newName: string, originalName?: string) {
    this.deviceName = newName;
    if (originalName) this.originalName = originalName;
    this.socket?.emit('rename-device', {
      roomId: this.roomId,
      newName,
      originalName: this.originalName,
    });
  }

  public disconnect() {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.dataChannels.clear();
    this.knownPeerIds.clear();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.events.onConnectionStatus('disconnected');
  }

  private createPeerConnection(targetPeerId: string, isInitiator: boolean): RTCPeerConnection {
    if (this.peerConnections.has(targetPeerId)) {
      return this.peerConnections.get(targetPeerId)!;
    }

    const pc = new RTCPeerConnection({ iceServers: getIceServers() });

    this.peerConnections.set(targetPeerId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('signal', {
          targetPeerId,
          roomId: this.roomId,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    if (isInitiator) {
      const dc = pc.createDataChannel('dropthings-channel', { ordered: true });
      this.setupDataChannel(targetPeerId, dc);

      pc.createOffer().then(async (offer) => {
        await pc.setLocalDescription(offer);
        this.socket?.emit('signal', {
          targetPeerId,
          roomId: this.roomId,
          signal: { type: 'offer', sdp: offer },
        });
      }).catch((err) => console.error('Error creating offer:', err));
    } else {
      pc.ondatachannel = (event) => {
        this.setupDataChannel(targetPeerId, event.channel);
      };
    }

    return pc;
  }

  private setupDataChannel(peerId: string, dc: RTCDataChannel) {
    dc.binaryType = 'arraybuffer';
    dc.bufferedAmountLowThreshold = BUFFER_THRESHOLD;
    this.dataChannels.set(peerId, dc);

    dc.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'file-header') {
            this.receivingFiles.set(parsed.fileMeta.id, {
              meta: parsed.fileMeta,
              chunks: [],
              bytesReceived: 0,
              startTime: Date.now(),
              lastTime: Date.now(),
              lastBytes: 0,
            });
            this.events.onFileMetaReceived(parsed.fileMeta, peerId);
          } else if (parsed.type === 'text') {
            this.events.onTextReceived(parsed.text, parsed.senderName || 'Dispositivo', parsed.timestamp || Date.now());
          } else if (parsed.type === 'chat') {
            this.events.onChatReceived(parsed.text, parsed.senderName || 'Dispositivo', parsed.timestamp || Date.now());
          } else if (parsed.type === 'offer_files') {
            this.events.onFilesOffered(parsed.files, peerId, parsed.senderName || 'Dispositivo');
          } else if (parsed.type === 'request_file') {
            this.events.onFileRequested(parsed.fileId, peerId);
          }
        } catch (e) {
          console.error('Invalid DC text payload:', e);
        }
      } else if (event.data instanceof ArrayBuffer) {
        // Read file chunk header (first 36 bytes = fileId string, rest = payload)
        const view = new Uint8Array(event.data);
        const fileIdLength = view[0];
        const decoder = new TextDecoder();
        const fileId = decoder.decode(view.subarray(1, 1 + fileIdLength));
        const chunkData = event.data.slice(1 + fileIdLength);

        this.handleChunkReceived(fileId, chunkData);
      }
    };
  }

  private async handleSignal(senderPeerId: string, signal: SignalingPayload) {
    let pc = this.peerConnections.get(senderPeerId);
    if (!pc) {
      pc = this.createPeerConnection(senderPeerId, false);
    }

    if (signal.type === 'offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket?.emit('signal', {
        targetPeerId: senderPeerId,
        roomId: this.roomId,
        signal: { type: 'answer', sdp: answer },
      });
    } else if (signal.type === 'answer') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    } else if (signal.type === 'candidate' && signal.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  }

  private handleChunkReceived(fileId: string, chunkData: ArrayBuffer) {
    const fileState = this.receivingFiles.get(fileId);
    if (!fileState) return;

    fileState.chunks.push(chunkData);
    fileState.bytesReceived += chunkData.byteLength;

    const now = Date.now();
    const totalTimeSec = (now - fileState.startTime) / 1000;
    const progress = Math.min(100, Math.round((fileState.bytesReceived / fileState.meta.size) * 100));

    // Calculate speed smoothed
    const timeDiff = (now - fileState.lastTime) / 1000;
    let speed = 0;
    if (timeDiff >= 0.3) {
      const bytesDiff = fileState.bytesReceived - fileState.lastBytes;
      speed = bytesDiff / timeDiff;
      fileState.lastTime = now;
      fileState.lastBytes = fileState.bytesReceived;
    } else {
      speed = fileState.bytesReceived / (totalTimeSec || 1);
    }

    const remainingBytes = fileState.meta.size - fileState.bytesReceived;
    const eta = speed > 0 ? Math.ceil(remainingBytes / speed) : 0;

    this.events.onFileProgress(fileId, progress, fileState.bytesReceived, speed, eta);

    if (fileState.bytesReceived >= fileState.meta.size) {
      const blob = new Blob(fileState.chunks, { type: fileState.meta.type || 'application/octet-stream' });
      this.events.onFileComplete(fileId, blob, fileState.meta);
      this.receivingFiles.delete(fileId);
    }
  }

  public sendText(text: string): boolean {
    const payload = JSON.stringify({
      type: 'text',
      text,
      senderName: this.deviceName,
      timestamp: Date.now(),
    });

    let sentCount = 0;
    this.knownPeerIds.forEach((peerId) => {
      const channel = this.dataChannels.get(peerId);
      if (channel?.readyState === 'open') channel.send(payload);
      else this.socket?.emit('share-text', { roomId: this.roomId, targetPeerId: peerId, text, senderName: this.deviceName });
      sentCount++;
    });

    return sentCount > 0;
  }

  public sendChat(text: string, alias?: string): boolean {
    const sender = alias || this.deviceName;
    const payload = JSON.stringify({
      type: 'chat',
      text,
      senderName: sender,
      timestamp: Date.now(),
    });

    let sentCount = 0;
    this.knownPeerIds.forEach((peerId) => {
      const channel = this.dataChannels.get(peerId);
      if (channel?.readyState === 'open') channel.send(payload);
      else this.socket?.emit('share-chat', { roomId: this.roomId, targetPeerId: peerId, text, senderName: sender });
      sentCount++;
    });

    return sentCount > 0;
  }

  public offerFiles(filesMeta: FileTransferMeta[]): boolean {
    const payload = JSON.stringify({
      type: 'offer_files',
      files: filesMeta,
      senderName: this.deviceName,
    });

    let sentCount = 0;
    this.knownPeerIds.forEach((peerId) => {
      const channel = this.dataChannels.get(peerId);
      if (channel?.readyState === 'open') channel.send(payload);
      else this.socket?.emit('offer-files', { roomId: this.roomId, targetPeerId: peerId, files: filesMeta, senderName: this.deviceName });
      sentCount++;
    });
    return sentCount > 0;
  }

  public requestFile(fileId: string, targetPeerId: string): boolean {
    const dc = this.dataChannels.get(targetPeerId);
    if (dc && dc.readyState === 'open') {
      const payload = JSON.stringify({
        type: 'request_file',
        fileId: fileId,
      });
      dc.send(payload);
      return true;
    }
    if (this.socket && this.knownPeerIds.has(targetPeerId)) {
      this.socket.emit('request-file', { roomId: this.roomId, targetPeerId, fileId });
      return true;
    }
    return false;
  }

  public sendFile(
    file: File,
    fileId: string,
    targetPeerId: string,
    onProgress: (progress: number, bytesSent: number, speed: number, eta: number) => void,
    onComplete: () => void,
    onError: (err: string) => void
  ) {
    const activeState = { canceled: false, paused: false };
    this.activeSending.set(fileId, activeState);

    const meta: FileTransferMeta = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      lastModified: file.lastModified,
      senderName: this.deviceName,
    };

    // Send only to the peer that requested this file.
    const headerStr = JSON.stringify({ type: 'file-header', fileMeta: meta });
    const initialChannel = this.dataChannels.get(targetPeerId);
    if (initialChannel?.readyState === 'open') {
      initialChannel.send(headerStr);
    } else {
      this.socket?.emit('file-meta', { roomId: this.roomId, targetPeerId, fileMeta: meta });
    }

    // Prepare binary chunk header tag (fileId prepended to each chunk)
    const encoder = new TextEncoder();
    const fileIdBytes = encoder.encode(fileId);
    const headerPrefix = new Uint8Array(1 + fileIdBytes.length);
    headerPrefix[0] = fileIdBytes.length;
    headerPrefix.set(fileIdBytes, 1);

    let offset = 0;
    let startTime = Date.now();
    let lastTime = Date.now();
    let lastBytesSent = 0;

    const readAndSend = () => {
      if (activeState.canceled) {
        this.activeSending.delete(fileId);
        onError('Transferencia cancelada');
        return;
      }

      if (activeState.paused) {
        setTimeout(readAndSend, 300);
        return;
      }

      if (offset >= file.size) {
        this.activeSending.delete(fileId);
        onComplete();
        return;
      }

      const targetChannel = this.dataChannels.get(targetPeerId);

      // Check backpressure on open DataChannels
      if (targetChannel?.readyState === 'open' && targetChannel.bufferedAmount > BUFFER_THRESHOLD * 2) {
        setTimeout(readAndSend, 10);
        return;
      }

      const chunkSlice = file.slice(offset, offset + CHUNK_SIZE);
      const reader = new FileReader();

      reader.onload = (e) => {
        if (!e.target?.result) return;
        const rawChunk = e.target.result as ArrayBuffer;

        // Combine prefix tag + chunk payload
        const chunkWithHeader = new Uint8Array(headerPrefix.length + rawChunk.byteLength);
        chunkWithHeader.set(headerPrefix, 0);
        chunkWithHeader.set(new Uint8Array(rawChunk), headerPrefix.length);

        if (targetChannel?.readyState === 'open') {
          targetChannel.send(chunkWithHeader.buffer);
        } else if (this.socket) {
          // Fallback over Socket.io
          this.socket.emit('file-chunk-fallback', {
            roomId: this.roomId,
            targetPeerId,
            chunk: rawChunk,
            fileId,
          });
        }

        offset += rawChunk.byteLength;

        const now = Date.now();
        const progress = Math.min(100, Math.round((offset / file.size) * 100));
        const timeDiff = (now - lastTime) / 1000;

        let speed = 0;
        if (timeDiff >= 0.3) {
          speed = (offset - lastBytesSent) / timeDiff;
          lastTime = now;
          lastBytesSent = offset;
        } else {
          speed = offset / (((now - startTime) / 1000) || 1);
        }

        const eta = speed > 0 ? Math.ceil((file.size - offset) / speed) : 0;
        onProgress(progress, offset, speed, eta);

        // Schedule next chunk read immediately
        if (offset < file.size) {
          setTimeout(readAndSend, 0);
        } else {
          this.activeSending.delete(fileId);
          onComplete();
        }
      };

      reader.onerror = () => {
        this.activeSending.delete(fileId);
        onError('Error al leer el archivo local');
      };

      reader.readAsArrayBuffer(chunkSlice);
    };

    // Start sending chunks
    readAndSend();
  }

  public updateRoomPin(pin: string | null) {
    this.roomPin = pin && pin.trim() ? pin.trim() : null;
    if (this.socket) {
      this.socket.emit('update-room-security', {
        roomId: this.roomId,
        pin: this.roomPin,
      });
    }
  }

  public setPeerAdmin(targetPeerId: string, isAdmin: boolean) {
    if (this.socket) {
      this.socket.emit('set-peer-admin', {
        roomId: this.roomId,
        targetPeerId,
        isAdmin,
      });
    }
  }

  public cancelSending(fileId: string) {
    const sendState = this.activeSending.get(fileId);
    if (sendState) {
      sendState.canceled = true;
    }
  }

  public togglePauseSending(fileId: string): boolean {
    const sendState = this.activeSending.get(fileId);
    if (sendState) {
      sendState.paused = !sendState.paused;
      return sendState.paused;
    }
    return false;
  }

  private closePeer(peerId: string) {
    const dc = this.dataChannels.get(peerId);
    if (dc) dc.close();
    this.dataChannels.delete(peerId);

    const pc = this.peerConnections.get(peerId);
    if (pc) pc.close();
    this.peerConnections.delete(peerId);
  }
}
