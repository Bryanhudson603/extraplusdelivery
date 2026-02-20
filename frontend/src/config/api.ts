const isProduction =
  (typeof import.meta !== 'undefined' &&
    (import.meta as any).env &&
    (import.meta as any).env.PROD) ||
  process.env.NODE_ENV === 'production';

export const API_BASE_URL = isProduction
  ? "https://extraplusdelivery.onrender.com"
  : "http://localhost:3000";
