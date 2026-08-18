import { TransferHistoryItem } from '../types';

const HISTORY_KEY = 'dropthing.transferHistory.v1';
const LEGACY_HISTORY_KEY = 'qrdrop_transfer_history_v1';

function readStoredHistory(): string | null {
  const current = localStorage.getItem(HISTORY_KEY);
  if (current) return current;

  const legacy = localStorage.getItem(LEGACY_HISTORY_KEY);
  if (legacy) {
    localStorage.setItem(HISTORY_KEY, legacy);
    localStorage.removeItem(LEGACY_HISTORY_KEY);
  }
  return legacy;
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
