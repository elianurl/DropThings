import { TextShareItem } from '../types';

export interface SavedRoom {
  id: string;
  name?: string;
  createdAt: number;
  lastActive: number;
  isCreator: boolean;
  isAdmin?: boolean;
  adminToken?: string;
  creatorDeviceId?: string;
  pin?: string | null;
  adminDeviceNames?: string[];
  messages: TextShareItem[];
}

const ROOMS_KEY = 'dropthings.savedRooms.v1';
const LEGACY_ROOMS_KEYS = ['dropthing.savedRooms.v1', 'qrdrop_saved_rooms_v2'];

function readStoredRooms(): string | null {
  const current = localStorage.getItem(ROOMS_KEY);
  if (current) return current;

  for (const legacyKey of LEGACY_ROOMS_KEYS) {
    const legacy = localStorage.getItem(legacyKey);
    if (!legacy) continue;

    localStorage.setItem(ROOMS_KEY, legacy);
    LEGACY_ROOMS_KEYS.forEach((key) => localStorage.removeItem(key));
    return legacy;
  }
  return null;
}

export function getSavedRooms(): SavedRoom[] {
  try {
    const data = readStoredRooms();
    if (!data) return [];
    const parsed: unknown = JSON.parse(data);
    return Array.isArray(parsed) ? (parsed as SavedRoom[]) : [];
  } catch (err) {
    console.error('Error reading saved rooms from storage:', err);
    return [];
  }
}

export function saveRooms(rooms: SavedRoom[]): void {
  try {
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms.slice(0, 50)));
  } catch (err) {
    console.error('Error saving rooms to storage:', err);
  }
}

export function getSavedRoom(roomId: string): SavedRoom | undefined {
  const rooms = getSavedRooms();
  return rooms.find((r) => r.id.toUpperCase() === roomId.toUpperCase());
}

export function upsertSavedRoom(
  roomId: string,
  options: {
    isCreator?: boolean;
    isAdmin?: boolean;
    creatorDeviceId?: string;
    adminToken?: string;
    name?: string;
    pin?: string | null;
  } = {}
): SavedRoom {
  const rooms = getSavedRooms();
  const normalizedId = roomId.toUpperCase();
  const index = rooms.findIndex((r) => r.id === normalizedId);

  const now = Date.now();

  if (index >= 0) {
    const existing = rooms[index];
    const updated: SavedRoom = {
      ...existing,
      lastActive: now,
      isCreator: options.isCreator !== undefined ? options.isCreator : existing.isCreator,
      isAdmin: options.isAdmin !== undefined ? options.isAdmin : (existing.isAdmin || (options.isCreator ?? existing.isCreator)),
      creatorDeviceId: options.creatorDeviceId || existing.creatorDeviceId,
      adminToken: options.adminToken || existing.adminToken,
      name: options.name || existing.name,
      pin: options.pin !== undefined ? options.pin : existing.pin,
    };
    rooms[index] = updated;
    // Move to front (most recently used)
    rooms.sort((a, b) => b.lastActive - a.lastActive);
    saveRooms(rooms);
    return updated;
  } else {
    const isCreator = options.isCreator ?? true;
    const newRoom: SavedRoom = {
      id: normalizedId,
      name: options.name || `Sala ${normalizedId}`,
      createdAt: now,
      lastActive: now,
      isCreator,
      isAdmin: options.isAdmin !== undefined ? options.isAdmin : isCreator,
      creatorDeviceId: options.creatorDeviceId,
      adminToken: options.adminToken,
      pin: options.pin || null,
      messages: [],
    };
    rooms.unshift(newRoom);
    saveRooms(rooms);
    return newRoom;
  }
}

export function setRoomPin(roomId: string, pin: string | null): SavedRoom | undefined {
  const rooms = getSavedRooms();
  const normalizedId = roomId.toUpperCase();
  const room = rooms.find((r) => r.id === normalizedId);
  if (room) {
    room.pin = pin && pin.trim() ? pin.trim() : null;
    room.lastActive = Date.now();
    saveRooms(rooms);
    return room;
  }
  return undefined;
}

export function setRoomAdmin(roomId: string, isAdmin: boolean): SavedRoom | undefined {
  const rooms = getSavedRooms();
  const normalizedId = roomId.toUpperCase();
  const room = rooms.find((r) => r.id === normalizedId);
  if (room) {
    room.isAdmin = isAdmin;
    room.lastActive = Date.now();
    saveRooms(rooms);
    return room;
  }
  return undefined;
}

export function setRoomAdminToken(roomId: string, adminToken: string): SavedRoom | undefined {
  const rooms = getSavedRooms();
  const normalizedId = roomId.toUpperCase();
  const room = rooms.find((candidate) => candidate.id === normalizedId);
  if (!room) return undefined;

  room.adminToken = adminToken;
  room.isAdmin = true;
  room.lastActive = Date.now();
  saveRooms(rooms);
  return room;
}

export function clearRoomAdminToken(roomId: string): SavedRoom | undefined {
  const rooms = getSavedRooms();
  const normalizedId = roomId.toUpperCase();
  const room = rooms.find((candidate) => candidate.id === normalizedId);
  if (!room) return undefined;

  delete room.adminToken;
  room.isAdmin = false;
  room.lastActive = Date.now();
  saveRooms(rooms);
  return room;
}

export function saveRoomMessages(roomId: string, messages: TextShareItem[]): void {
  const rooms = getSavedRooms();
  const normalizedId = roomId.toUpperCase();
  const room = rooms.find((r) => r.id === normalizedId);
  if (room) {
    room.messages = messages.slice(-100); // Keep last 100 messages per room
    room.lastActive = Date.now();
    saveRooms(rooms);
  }
}

export function appendRoomMessage(roomId: string, message: TextShareItem): void {
  const rooms = getSavedRooms();
  const normalizedId = roomId.toUpperCase();
  let room = rooms.find((r) => r.id === normalizedId);
  if (!room) {
    room = upsertSavedRoom(normalizedId, { isCreator: false });
  }
  if (!room.messages.some((m) => m.id === message.id)) {
    room.messages.push(message);
    if (room.messages.length > 100) {
      room.messages = room.messages.slice(-100);
    }
  }
  room.lastActive = Date.now();
  saveRooms(rooms);
}

export function canDeleteRoom(
  room: SavedRoom,
  isCurrentRoom: boolean,
  activePeersInCurrentRoom: number
): boolean {
  // Permission rule:
  // 1. The original creator who generated the room or room admin can delete it.
  // 2. OR if it's the last active person in the room (e.g. peer count is 0).
  if (room.isCreator || room.isAdmin) return true;
  if (isCurrentRoom && activePeersInCurrentRoom === 0) return true;
  return false;
}

export function deleteSavedRoom(roomId: string): SavedRoom[] {
  const rooms = getSavedRooms().filter((r) => r.id.toUpperCase() !== roomId.toUpperCase());
  saveRooms(rooms);
  return rooms;
}
