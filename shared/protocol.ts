export const PROTOCOL_LIMITS = {
  roomId: 25,
  displayName: 64,
  pin: 32,
  text: 10_000,
  fileName: 255,
  fileId: 128,
  fileSize: 10 * 1024 * 1024 * 1024,
} as const;

const ROOM_ID_PATTERN = /^[A-Z0-9]{3,12}(?:-[A-Z0-9]{3,12})?$/;

export function normalizeRoomId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return normalized.length <= PROTOCOL_LIMITS.roomId && ROOM_ID_PATTERN.test(normalized)
    ? normalized
    : null;
}

export function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned && cleaned.length <= maxLength ? cleaned : null;
}

