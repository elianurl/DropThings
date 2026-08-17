export type TransferStatus =
  | 'pending'
  | 'transferring'
  | 'completed'
  | 'paused'
  | 'error'
  | 'canceled';

export type TransferDirection = 'sent' | 'received';

export interface TransferItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: TransferStatus;
  progress: number; // 0 to 100
  bytesTransferred: number;
  speed: number; // bytes per second
  eta: number; // estimated seconds remaining
  direction: TransferDirection;
  timestamp: number;
  peerName?: string;
  blobUrl?: string;
  textContent?: string;
  isText?: boolean;
  error?: string;
}

export interface PeerDevice {
  id: string;
  name: string; // Primary Name / Chosen Alias
  originalName?: string; // Original detected hardware device model
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'browser';
  status: 'connected' | 'connecting' | 'disconnected';
  joinedAt: number;
  isAdmin?: boolean;
}

export interface TextShareItem {
  id: string;
  text: string;
  senderName: string;
  timestamp: number;
  direction: TransferDirection;
}

export interface TransferHistoryItem {
  id: string;
  name: string;
  size: number;
  type: string;
  direction: TransferDirection;
  speed: number;
  timeTaken: number; // in seconds
  status: TransferStatus;
  timestamp: number;
  senderName?: string;
  blobUrl?: string;
  textContent?: string;
  isText?: boolean;
}

export interface RoomState {
  roomId: string;
  peerId: string;
  deviceName: string;
  peers: PeerDevice[];
  isConnected: boolean;
}
