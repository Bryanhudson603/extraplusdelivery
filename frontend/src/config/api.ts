function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
}

function isIp(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

export const API_BASE_URL = (() => {
  const env = getEnv('NEXT_PUBLIC_API_URL');

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || isIp(hostname)) {
      return `http://${hostname}:3000`;
    }
    return env || `http://${hostname}:3000`;
  }

  return env || 'http://localhost:3000';
})();
