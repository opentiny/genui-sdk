import net from 'node:net';

export const isPlaygroundDevelopment = process.env.NODE_ENV === 'development';

function isPrivateOrLocalHost(host: string): boolean {
  const lower = host.toLowerCase().replace(/\.$/, '');

  if (lower === 'localhost' || lower.endsWith('.localhost') || lower === '127.0.0.1' || lower === '::1') {
    return true;
  }

  const ipVersion = net.isIP(lower);
  if (!ipVersion) {
    return false;
  }

  if (ipVersion === 4) {
    const [a, b] = lower.split('.').map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    return false;
  }

  // IPv6：常见私有/本地前缀
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:')) {
    return true;
  }

  return false;
}

export function isAllowedAgentUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);

    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return false;
    }

    if (isPrivateOrLocalHost(u.hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
