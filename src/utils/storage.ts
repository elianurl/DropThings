import { TransferHistoryItem } from '../types';

const HISTORY_KEY = 'dropthings.transferHistory.v1';
const LEGACY_HISTORY_KEYS = ['dropthing.transferHistory.v1', 'qrdrop_transfer_history_v1'];

function readStoredHistory(): string | null {
  const current = localStorage.getItem(HISTORY_KEY);
  if (current) return current;

  for (const legacyKey of LEGACY_HISTORY_KEYS) {
    const legacy = localStorage.getItem(legacyKey);
    if (!legacy) continue;

    localStorage.setItem(HISTORY_KEY, legacy);
    LEGACY_HISTORY_KEYS.forEach((key) => localStorage.removeItem(key));
    return legacy;
  }
  return null;
}

export function getHistory(): TransferHistoryItem[] {
  try {
    const data = readStoredHistory();
    if (!data) return [];
    const parsed: unknown = JSON.parse(data);
    return Array.isArray(parsed) ? (parsed as TransferHistoryItem[]) : [];
  } catch (err) {
    console.error('Error reading history from storage:', err);
    return [];
  }
}

export function saveHistory(history: TransferHistoryItem[]): void {
  try {
    // Keep max 100 history entries to avoid hitting localStorage limit
    const trimmed = history.slice(0, 100).map(({ blobUrl: _blobUrl, ...item }) => item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Error saving history to storage:', err);
  }
}

export function addHistoryItem(item: Omit<TransferHistoryItem, 'id'>): TransferHistoryItem {
  const history = getHistory();
  const newItem: TransferHistoryItem = {
    ...item,
    id: `hist-${crypto.randomUUID()}`,
  };
  history.unshift(newItem);
  saveHistory(history);
  return newItem;
}

export function deleteHistoryItem(id: string): TransferHistoryItem[] {
  const history = getHistory().filter((item) => item.id !== id);
  saveHistory(history);
  return history;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.error('Error clearing history:', err);
  }
}
