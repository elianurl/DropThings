export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '0 B/s';
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return '0s';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  if (mins < 60) {
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

export function detectDeviceName(): { name: string; originalName: string; type: 'mobile' | 'desktop' | 'tablet' | 'browser' } {
  const ua = navigator.userAgent;
  let type: 'mobile' | 'desktop' | 'tablet' | 'browser' = 'desktop';
  let originalName = 'Navegador Web';

  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    type = 'tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
    type = 'mobile';
  }

  if (/iPhone/i.test(ua)) originalName = 'iPhone';
  else if (/iPad/i.test(ua)) originalName = 'iPad';
  else if (/Android/i.test(ua)) originalName = type === 'mobile' ? 'Dispositivo Android' : 'Tablet Android';
  else if (/Macintosh|Mac OS X/i.test(ua)) originalName = 'Mac';
  else if (/Windows/i.test(ua)) originalName = 'PC Windows';
  else if (/Linux/i.test(ua)) originalName = 'Linux PC';

  let name = originalName;
  try {
    const aliasKey = 'dropthings.deviceAlias';
    const legacyAliasKeys = ['dropthing.deviceAlias', 'qrdrop_device_alias'];
    const savedAlias = localStorage.getItem(aliasKey)
      || legacyAliasKeys.map((key) => localStorage.getItem(key)).find(Boolean);
    if (savedAlias && savedAlias.trim()) {
      name = savedAlias.trim();
      localStorage.setItem(aliasKey, name);
      legacyAliasKeys.forEach((key) => localStorage.removeItem(key));
    }
  } catch (e) {
    // Ignore localStorage error
  }

  return { name, originalName, type };
}

export function generateRoomId(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars like O, 0, I, 1
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % chars.length;
    result += chars.charAt(randomIndex);
  }
  return result;
}

export function getFileTypeCategory(fileType: string, fileName: string): 'image' | 'video' | 'audio' | 'document' | 'archive' | 'code' | 'text' | 'other' {
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('audio/')) return 'audio';
  if (fileType.includes('pdf') || fileType.includes('word') || fileType.includes('document') || fileType.includes('sheet') || fileType.includes('presentation')) return 'document';
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar') || fileType.includes('compressed') || fileName.endsWith('.7z') || fileName.endsWith('.zip')) return 'archive';
  if (fileType.includes('json') || fileType.includes('javascript') || fileType.includes('typescript') || fileType.includes('html') || fileType.includes('css')) return 'code';
  if (fileType.startsWith('text/')) return 'text';
  return 'other';
}
