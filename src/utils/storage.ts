import { TransferHistoryItem } from '../types';

const HISTORY_KEY = 'qrdrop_transfer_history_v1';

export function getHistory(): TransferHistoryItem[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading history from storage:', err);
    return [];
  }
}

export function saveHistory(history: TransferHistoryItem[]): void {
  try {
    // Keep max 100 history entries to avoid hitting localStorage limit
    const trimmed = history.slice(0, 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Error saving history to storage:', err);
  }
}

export function addHistoryItem(item: Omit<TransferHistoryItem, 'id'>): TransferHistoryItem {
  const history = getHistory();
  const newItem: TransferHistoryItem = {
    ...item,
    id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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
