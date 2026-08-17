import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";

interface RoomPeer {
  id: string;
  deviceType: string;
  name: string;
  originalName?: string;
  isAdmin?: boolean;
}

interface RoomInfo {
  id: string;
  createdAt: number;
  pin?: string | null;
  creatorSocketId?: string;
  adminSocketIds: Set<string>;
  peers: Map<string, RoomPeer>;
}

const rooms = new Map<string, RoomInfo>();

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    maxHttpBufferSize: 1e8, // 100MB buffer for fallback WebSocket direct binary transfer
  });

  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", activeRooms: rooms.size, timestamp: Date.now() });
  });

  app.get("/api/rooms/:roomId", (req, res) => {
    const room = rooms.get(req.params.roomId.toUpperCase());
    if (!room) {
      res.status(404).json({ exists: false, peerCount: 0, hasPin: false });
      return;
    }
    res.json({
      exists: true,
      hasPin: !!room.pin,
      peerCount: room.peers.size,
      peers: Array.from(room.peers.values()),
    });
  });

  // Socket.IO WebRTC Signaling & Room Management
  io.on("connection", (socket) => {
    let currentRoomId: string | null = null;

    socket.on("join-room", (data: { roomId: string; deviceName?: string; originalName?: string; deviceType?: string; pin?: string | null; isCreator?: boolean }) => {
      const roomId = data.roomId.toUpperCase();

      let room = rooms.get(roomId);
      const isNewRoom = !room;

      if (!room) {
        room = {
          id: roomId,
          createdAt: Date.now(),
          pin: data.pin && String(data.pin).trim() ? String(data.pin).trim() : null,
          creatorSocketId: socket.id,
          adminSocketIds: new Set([socket.id]),
          peers: new Map(),
        };
        rooms.set(roomId, room);
      } else {
        // If room has PIN set and it's not the already authorized creator
        if (room.pin && room.pin.length > 0) {
          const providedPin = data.pin ? String(data.pin).trim() : "";
          const isKnownAdmin = room.adminSocketIds.has(socket.id);

          if (!isKnownAdmin && providedPin !== room.pin) {
            // Reject join due to missing or invalid PIN
            socket.emit("join-failed", {
              roomId,
              reason: providedPin ? "INVALID_PIN" : "PIN_REQUIRED",
              message: providedPin
                ? "El PIN de acceso introducido es incorrecto."
                : "Esta sala requiere un PIN de acceso establecido por el administrador.",
            });
            return;
          }
        }
      }

      currentRoomId = roomId;
      socket.join(roomId);

      // If user created this room or is in admin list, mark admin
      const isUserAdmin = isNewRoom || data.isCreator || room.adminSocketIds.has(socket.id);
      if (isUserAdmin) {
        room.adminSocketIds.add(socket.id);
      }

      const peerInfo: RoomPeer = {
        id: socket.id,
        name: data.deviceName || "Dispositivo Remoto",
        originalName: data.originalName,
        deviceType: data.deviceType || "browser",
        isAdmin: isUserAdmin,
      };

      room.peers.set(socket.id, peerInfo);

      // Notify others in room that a new peer joined
      socket.to(roomId).emit("peer-joined", {
        peerId: socket.id,
        peer: peerInfo,
        totalPeers: room.peers.size,
      });

      // Send existing peers list to the newly joined peer
      const existingPeers = Array.from(room.peers.values()).filter((p) => p.id !== socket.id);
      socket.emit("room-joined", {
        roomId,
        peerId: socket.id,
        isAdmin: isUserAdmin,
        hasPin: !!room.pin,
        pin: isUserAdmin ? room.pin : null,
        existingPeers,
        totalPeers: room.peers.size,
      });
    });

    // Rename Device / Update Alias
    socket.on("rename-device", (data: { roomId?: string; newName: string; originalName?: string }) => {
      const roomId = (data.roomId || currentRoomId)?.toUpperCase();
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const peer = room.peers.get(socket.id);
      if (peer) {
        peer.name = data.newName;
        if (data.originalName) peer.originalName = data.originalName;
        io.to(roomId).emit("peer-renamed", {
          peerId: socket.id,
          name: data.newName,
          originalName: peer.originalName,
        });
      }
    });

    // Update Room Security / PIN (Admin only)
    socket.on("update-room-security", (data: { roomId: string; pin?: string | null }) => {
      const roomId = (data.roomId || currentRoomId)?.toUpperCase();
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      if (!room.adminSocketIds.has(socket.id)) {
        socket.emit("error-message", { message: "No tienes permisos de administrador para cambiar la seguridad de la sala." });
        return;
      }

      const newPin = data.pin && String(data.pin).trim() ? String(data.pin).trim() : null;
      room.pin = newPin;

      // Broadcast security update to everyone in room
      io.to(roomId).emit("room-security-updated", {
        roomId,
        hasPin: !!room.pin,
        pin: newPin, // sent to participants for local state sync
      });
    });

    // Set Peer Admin status (Admin only)
    socket.on("set-peer-admin", (data: { roomId: string; targetPeerId: string; isAdmin: boolean }) => {
      const roomId = (data.roomId || currentRoomId)?.toUpperCase();
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      if (!room.adminSocketIds.has(socket.id)) {
        socket.emit("error-message", { message: "Solo los administradores pueden otorgar o revocar privilegios." });
        return;
      }

      if (data.isAdmin) {
        room.adminSocketIds.add(data.targetPeerId);
      } else {
        room.adminSocketIds.delete(data.targetPeerId);
      }

      const targetPeer = room.peers.get(data.targetPeerId);
      if (targetPeer) {
        targetPeer.isAdmin = data.isAdmin;
      }

      io.to(roomId).emit("room-admins-updated", {
        roomId,
        adminPeerIds: Array.from(room.adminSocketIds),
        targetPeerId: data.targetPeerId,
        isAdmin: data.isAdmin,
      });
    });

    // WebRTC Signaling (Offers, Answers, ICE Candidates)
    socket.on("signal", (data: { targetPeerId?: string; signal: any; roomId?: string }) => {
      const roomId = data.roomId || currentRoomId;
      if (!roomId) return;

      if (data.targetPeerId) {
        // Direct signaling to specific peer
        io.to(data.targetPeerId).emit("signal", {
          senderPeerId: socket.id,
          signal: data.signal,
        });
      } else {
        // Broadcast signal to other peers in room
        socket.to(roomId).emit("signal", {
          senderPeerId: socket.id,
          signal: data.signal,
        });
      }
    });

    // File metadata notification
    socket.on("file-meta", (data: { roomId: string; fileMeta: any; targetPeerId?: string }) => {
      const roomId = data.roomId || currentRoomId;
      if (!roomId) return;

      if (data.targetPeerId) {
        io.to(data.targetPeerId).emit("file-meta", {
          senderPeerId: socket.id,
          fileMeta: data.fileMeta,
        });
      } else {
        socket.to(roomId).emit("file-meta", {
          senderPeerId: socket.id,
          fileMeta: data.fileMeta,
        });
      }
    });

    // Fallback socket direct chunk streaming (if WebRTC P2P fails due to restrictive firewall)
    socket.on("file-chunk-fallback", (data: { roomId: string; chunk: any; chunkIndex: number; totalChunks: number; fileId: string }) => {
      socket.to(data.roomId).emit("file-chunk-fallback", {
        senderPeerId: socket.id,
        chunk: data.chunk,
        chunkIndex: data.chunkIndex,
        totalChunks: data.totalChunks,
        fileId: data.fileId,
      });
    });

    // Instant Text Transfer
    socket.on("share-text", (data: { roomId: string; text: string; senderName?: string }) => {
      const roomId = data.roomId || currentRoomId;
      if (!roomId) return;
      socket.to(roomId).emit("text-received", {
        senderPeerId: socket.id,
        senderName: data.senderName || "Dispositivo",
        text: data.text,
        timestamp: Date.now(),
      });
    });

    socket.on("share-chat", (data: { roomId: string; text: string; senderName?: string }) => {
      const roomId = data.roomId || currentRoomId;
      if (!roomId) return;
      socket.to(roomId).emit("chat-received", {
        senderPeerId: socket.id,
        senderName: data.senderName || "Dispositivo",
        text: data.text,
        timestamp: Date.now(),
      });
    });

    // Disconnect handling
    socket.on("disconnect", () => {
      if (currentRoomId && rooms.has(currentRoomId)) {
        const room = rooms.get(currentRoomId)!;
        room.peers.delete(socket.id);

        io.to(currentRoomId).emit("peer-left", {
          peerId: socket.id,
          totalPeers: room.peers.size,
        });

        if (room.peers.size === 0) {
          // Clean up empty room after 10 minutes
          setTimeout(() => {
            const r = rooms.get(currentRoomId!);
            if (r && r.peers.size === 0) {
              rooms.delete(currentRoomId!);
            }
          }, 600000);
        }
      }
    });
  });

  // Vite development server setup or Production Static server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 QR Drop Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
