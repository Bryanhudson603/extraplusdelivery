function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
}

const fallbackBaseUrl = 'http://localhost:3000';

export const API_BASE_URL =
  getEnv('NEXT_PUBLIC_API_URL') ||
  'https://extraplusdelivery.onrender.com' ||
  fallbackBaseUrl;
