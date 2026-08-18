import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { Server, Socket } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { cleanText, normalizeRoomId, PROTOCOL_LIMITS } from './shared/protocol';

interface RoomPeer {
  id: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'browser';
  name: string;
  originalName?: string;
  status: 'connected';
  joinedAt: number;
  isAdmin: boolean;
}

interface PinCredential {
  hash: Buffer;
  salt: string;
}

interface RoomInfo {
  id: string;
  createdAt: number;
  pinCredential: PinCredential | null;
  adminTokens: Set<string>;
  socketAdminTokens: Map<string, string>;
  peers: Map<string, RoomPeer>;
}

interface FileMetaPayload {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  senderName?: string;
}

const rooms = new Map<string, RoomInfo>();
const DEFAULT_PORT = 3000;
const ROOM_TTL_MS = 10 * 60 * 1000;
const SOCKET_BUFFER_LIMIT = 2 * 1024 * 1024;

function createAdminToken(): string {
  return randomBytes(32).toString('base64url');
}

function createPinCredential(pin: string): PinCredential {
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: scryptSync(pin, salt, 64) };
}

function isValidPin(pin: string, credential: PinCredential): boolean {
  return timingSafeEqual(scryptSync(pin, credential.salt, 64), credential.hash);
}

function parsePort(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : DEFAULT_PORT;
}

function getAllowedOrigins(): Set<string> {
  const configured = process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? [];
  const defaults = [
    process.env.PUBLIC_APP_URL,
    'https://dropthings.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter((origin): origin is string => Boolean(origin));
  return new Set([...configured, ...defaults]);
}

function isAllowedOrigin(origin: string | undefined, allowedOrigins: Set<string>): boolean {
  if (!origin || allowedOrigins.has(origin)) return true;
  return process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

function parseDeviceType(value: unknown): RoomPeer['deviceType'] {
  return value === 'mobile' || value === 'desktop' || value === 'tablet' ? value : 'browser';
}

function parseFileMeta(value: unknown): FileMetaPayload | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const id = cleanText(candidate.id, PROTOCOL_LIMITS.fileId);
  const name = cleanText(candidate.name, PROTOCOL_LIMITS.fileName);
  const type = cleanText(candidate.type, 128) ?? 'application/octet-stream';
  const size = Number(candidate.size);
  if (!id || !name || !Number.isSafeInteger(size) || size < 0 || size > PROTOCOL_LIMITS.fileSize) return null;

  return {
    id,
    name,
    size,
    type,
    lastModified: typeof candidate.lastModified === 'number' ? candidate.lastModified : undefined,
    senderName: cleanText(candidate.senderName, PROTOCOL_LIMITS.displayName) ?? undefined,
  };
}

function emitError(socket: Socket, message: string): void {
  socket.emit('error-message', { message });
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const allowedOrigins = getAllowedOrigins();
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin, allowedOrigins)),
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: SOCKET_BUFFER_LIMIT,
  });
  const port = parsePort(process.env.PORT);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', activeRooms: rooms.size, timestamp: Date.now() });
  });

  app.get('/api/rooms/:roomId', (request, response) => {
    const roomId = normalizeRoomId(request.params.roomId);
    const room = roomId ? rooms.get(roomId) : undefined;
    if (!room) {
      response.status(404).json({ exists: false, peerCount: 0, hasPin: false });
      return;
    }
    response.json({ exists: true, hasPin: Boolean(room.pinCredential), peerCount: room.peers.size });
  });

  io.on('connection', (socket) => {
    let currentRoomId: string | null = null;

    const leaveCurrentRoom = () => {
      if (!currentRoomId) return;
      const roomId = currentRoomId;
      const room = rooms.get(roomId);
      currentRoomId = null;
      socket.leave(roomId);
      if (!room) return;

      room.peers.delete(socket.id);
      room.socketAdminTokens.delete(socket.id);
      io.to(roomId).emit('peer-left', { peerId: socket.id, totalPeers: room.peers.size });

      if (room.peers.size === 0) {
        setTimeout(() => {
          const staleRoom = rooms.get(roomId);
          if (staleRoom?.peers.size === 0) rooms.delete(roomId);
        }, ROOM_TTL_MS);
      }
    };

    const getCurrentRoom = (requestedRoomId?: unknown): RoomInfo | null => {
      const roomId = normalizeRoomId(requestedRoomId ?? currentRoomId);
      if (!roomId || roomId !== currentRoomId) return null;
      const room = rooms.get(roomId);
      return room?.peers.has(socket.id) ? room : null;
    };

    socket.on('join-room', (rawData: unknown) => {
      const data = rawData && typeof rawData === 'object' ? rawData as Record<string, unknown> : {};
      const roomId = normalizeRoomId(data.roomId);
      if (!roomId) {
        socket.emit('join-failed', { roomId: '', reason: 'INVALID_ROOM', message: 'El código de sala no es válido.' });
        return;
      }

      if (currentRoomId && currentRoomId !== roomId) leaveCurrentRoom();

      let room = rooms.get(roomId);
      const isNewRoom = !room;
      let adminToken = cleanText(data.adminToken, 128);

      if (!room) {
        adminToken = createAdminToken();
        room = {
          id: roomId,
          createdAt: Date.now(),
          pinCredential: null,
          adminTokens: new Set([adminToken]),
          socketAdminTokens: new Map(),
          peers: new Map(),
        };
        const initialPin = cleanText(data.pin, PROTOCOL_LIMITS.pin);
        if (initialPin) room.pinCredential = createPinCredential(initialPin);
        rooms.set(roomId, room);
      }

      const hasValidAdminToken = Boolean(adminToken && room.adminTokens.has(adminToken));
      if (room.pinCredential && !hasValidAdminToken) {
        const providedPin = cleanText(data.pin, PROTOCOL_LIMITS.pin);
        if (!providedPin || !isValidPin(providedPin, room.pinCredential)) {
          socket.emit('join-failed', {
            roomId,
            reason: providedPin ? 'INVALID_PIN' : 'PIN_REQUIRED',
            message: providedPin ? 'El PIN de acceso introducido es incorrecto.' : 'Esta sala requiere un PIN de acceso.',
          });
          return;
        }
      }

      currentRoomId = roomId;
      socket.join(roomId);
      if (hasValidAdminToken && adminToken) room.socketAdminTokens.set(socket.id, adminToken);

      const peer: RoomPeer = {
        id: socket.id,
        name: cleanText(data.deviceName, PROTOCOL_LIMITS.displayName) ?? 'Dispositivo remoto',
        originalName: cleanText(data.originalName, PROTOCOL_LIMITS.displayName) ?? undefined,
        deviceType: parseDeviceType(data.deviceType),
        status: 'connected',
        joinedAt: Date.now(),
        isAdmin: hasValidAdminToken,
      };
      room.peers.set(socket.id, peer);

      socket.to(roomId).emit('peer-joined', { peerId: socket.id, peer, totalPeers: room.peers.size });
      socket.emit('room-joined', {
        roomId,
        peerId: socket.id,
        isAdmin: peer.isAdmin,
        adminToken: peer.isAdmin ? adminToken : undefined,
        hasPin: Boolean(room.pinCredential),
        existingPeers: Array.from(room.peers.values()).filter((candidate) => candidate.id !== socket.id),
        totalPeers: room.peers.size,
      });

      if (isNewRoom) socket.emit('room-created', { roomId });
    });

    socket.on('rename-device', (rawData: unknown) => {
      const data = rawData && typeof rawData === 'object' ? rawData as Record<string, unknown> : {};
      const room = getCurrentRoom(data.roomId);
      const newName = cleanText(data.newName, PROTOCOL_LIMITS.displayName);
      if (!room || !newName) return;
      const peer = room.peers.get(socket.id);
      if (!peer) return;
      peer.name = newName;
      peer.originalName = cleanText(data.originalName, PROTOCOL_LIMITS.displayName) ?? peer.originalName;
      io.to(room.id).emit('peer-renamed', { peerId: socket.id, name: peer.name, originalName: peer.originalName });
    });

    socket.on('update-room-security', (rawData: unknown) => {
      const data = rawData && typeof rawData === 'object' ? rawData as Record<string, unknown> : {};
      const room = getCurrentRoom(data.roomId);
      if (!room || !room.socketAdminTokens.has(socket.id)) {
        emitError(socket, 'No tienes permisos para cambiar la seguridad de la sala.');
        return;
      }
      const pin = cleanText(data.pin, PROTOCOL_LIMITS.pin);
      room.pinCredential = pin ? createPinCredential(pin) : null;
      io.to(room.id).emit('room-security-updated', { roomId: room.id, hasPin: Boolean(pin) });
    });

    socket.on('set-peer-admin', (rawData: unknown) => {
      const data = rawData && typeof rawData === 'object' ? rawData as Record<string, unknown> : {};
      const room = getCurrentRoom(data.roomId);
      const targetPeerId = cleanText(data.targetPeerId, 128);
      if (!room || !room.socketAdminTokens.has(socket.id) || !targetPeerId || !room.peers.has(targetPeerId)) {
        emitError(socket, 'No se pudo actualizar el administrador solicitado.');
        return;
      }

      const isAdmin = data.isAdmin === true;
      const targetPeer = room.peers.get(targetPeerId)!;
      if (isAdmin) {
        const token = room.socketAdminTokens.get(targetPeerId) ?? createAdminToken();
        room.adminTokens.add(token);
        room.socketAdminTokens.set(targetPeerId, token);
        io.to(targetPeerId).emit('admin-token-issued', { roomId: room.id, adminToken: token });
      } else {
        const activeAdmins = Array.from(room.peers.keys()).filter((peerId) => room.socketAdminTokens.has(peerId));
        if (activeAdmins.length === 1 && activeAdmins[0] === targetPeerId) {
          emitError(socket, 'La sala debe conservar al menos un administrador activo.');
          return;
        }
        const token = room.socketAdminTokens.get(targetPeerId);
        if (token) room.adminTokens.delete(token);
        room.socketAdminTokens.delete(targetPeerId);
        io.to(targetPeerId).emit('admin-token-revoked', { roomId: room.id });
      }
      targetPeer.isAdmin = isAdmin;
      io.to(room.id).emit('room-admins-updated', {
        roomId: room.id,
        adminPeerIds: Array.from(room.socketAdminTokens.keys()),
        targetPeerId,
        isAdmin,
      });
    });

    socket.on('signal', (rawData: unknown) => {
      const data = rawData && typeof rawData === 'object' ? rawData as Record<string, unknown> : {};
      const room = getCurrentRoom(data.roomId);
      const targetPeerId = cleanText(data.targetPeerId, 128);
      if (!room || !targetPeerId || !room.peers.has(targetPeerId) || !data.signal) return;
      io.to(targetPeerId).emit('signal', { senderPeerId: socket.id, signal: data.signal });
    });

    socket.on('file-meta', (rawData: unknown) => {
      const data = rawData && typeof rawData === 'object' ? rawData as Record<string, unknown> : {};
      const room = getCurrentRoom(data.roomId);
      const targetPeerId = cleanText(data.targetPeerId, 128);
      const fileMeta = parseFileMeta(data.fileMeta);
      if (!room || !targetPeerId || !room.peers.has(targetPeerId) || !fileMeta) return;
      io.to(targetPeerId).emit('file-meta', { senderPeerId: socket.id, fileMeta });
    });

    socket.on('offer-files', (rawData: unknown) => {
      const data = rawData && typeof rawData === 'object' ? rawData as Record<string, unknown> : {};
      const room = getCurrentRoom(data.roomId);
      const targetPeerId = cleanText(data.targetPeerId, 128);
      const parsedFiles = Array.isArray(data.files) ? data.files.slice(0, 50).map(parseFileMeta) : [];
      if (!room || !targetPeerId || !room.peers.has(targetPeerId) || parsedFiles.length === 0 || parsedFiles.some((file) => !file)) return;
      const files = parsedFiles as FileMetaPayload[];
      io.to(targetPeerId).emit('files-offered', {
        senderPeerId: socket.id,
        senderName: cleanText(data.senderName, PROTOCOL_LIMITS.displayName) ?? 'Dispositivo',
        files,
      });
    });

    socket.on('request-file', (rawData: unknown) => {
      const data = rawData && typeof rawData === 'object' ? rawData as Record<string, unknown> : {};
      const room = getCurrentRoom(data.roomId);
      const targetPeerId = cleanText(data.targetPeerId, 128);
      const fileId = cleanText(data.fileId, PROTOCOL_LIMITS.fileId);
      if (!room || !targetPeerId || !room.peers.has(targetPeerId) || !fileId) return;
      io.to(targetPeerId).emit('file-requested', { requesterPeerId: socket.id, fileId });
    });

    socket.on('file-chunk-fallback', (rawData: unknown) => {
      const data = rawData && typeof rawData === 'object' ? rawData as Record<string, unknown> : {};
      const room = getCurrentRoom(data.roomId);
      const targetPeerId = cleanText(data.targetPeerId, 128);
      const fileId = cleanText(data.fileId, PROTOCOL_LIMITS.fileId);
      if (!room || !targetPeerId || !room.peers.has(targetPeerId) || !fileId || !data.chunk) return;
      io.to(targetPeerId).emit('file-chunk-fallback', { senderPeerId: socket.id, chunk: data.chunk, fileId });
    });

    const relayText = (incomingEvent: 'share-text' | 'share-chat', outgoingEvent: 'text-received' | 'chat-received') => {
      socket.on(incomingEvent, (rawData: unknown) => {
        const data = rawData && typeof rawData === 'object' ? rawData as Record<string, unknown> : {};
        const room = getCurrentRoom(data.roomId);
        const text = cleanText(data.text, PROTOCOL_LIMITS.text);
        if (!room || !text) return;
        const targetPeerId = cleanText(data.targetPeerId, 128);
        if (data.targetPeerId !== undefined && (!targetPeerId || !room.peers.has(targetPeerId))) return;
        const destination = targetPeerId && room.peers.has(targetPeerId) ? io.to(targetPeerId) : socket.to(room.id);
        destination.emit(outgoingEvent, {
          senderPeerId: socket.id,
          senderName: cleanText(data.senderName, PROTOCOL_LIMITS.displayName) ?? 'Dispositivo',
          text,
          timestamp: Date.now(),
          messageId: randomUUID(),
        });
      });
    };

    relayText('share-text', 'text-received');
    relayText('share-chat', 'chat-received');
    socket.on('disconnect', leaveCurrentRoom);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '1h' }));
    app.get('*', (_request, response) => response.sendFile(path.join(distPath, 'index.html')));
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`DropThings signaling server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error('DropThings failed to start.', error);
  process.exitCode = 1;
});
