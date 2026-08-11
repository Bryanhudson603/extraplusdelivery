import { FIXED_CITY_NAME, parseClientAddress } from './delivery';

export type AddressRecord = {
  id: string;
  nome: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  referencia: string;
  cidade: string;
};

const STORAGE_KEY = 'extraplus-addresses';

function generateId(): string {
  return `end-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeSegment(value: string): string {
  return String(value || '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
}

export function fromLegacyString(value: string): AddressRecord {
  const parsed = parseClientAddress(value);
  return {
    id: generateId(),
    nome: 'Endereço',
    cep: '',
    rua: parsed.rua,
    numero: '',
    complemento: '',
    bairro: parsed.bairro,
    referencia: '',
    cidade: parsed.cidade || FIXED_CITY_NAME
  };
}

export function loadAddresses(): AddressRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item): AddressRecord | null => {
        if (typeof item === 'string') {
          const texto = item.trim();
          return texto ? fromLegacyString(texto) : null;
        }
        if (item && typeof item === 'object') {
          return {
            id: String(item.id || generateId()),
            nome: String(item.nome || 'Endereço'),
            cep: String(item.cep || ''),
            rua: String(item.rua || ''),
            numero: String(item.numero || ''),
            complemento: String(item.complemento || ''),
            bairro: String(item.bairro || ''),
            referencia: String(item.referencia || ''),
            cidade: String(item.cidade || FIXED_CITY_NAME)
          };
        }
        return null;
      })
      .filter((item): item is AddressRecord => item !== null);
  } catch {
    return [];
  }
}

export function saveAddresses(list: AddressRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
  }
}

export function formatAddressSummary(a: AddressRecord): string {
  const linha1 = [a.rua, a.numero ? `nº ${a.numero}` : ''].filter(Boolean).join(', ');
  const linha2 = [linha1, a.bairro].filter(Boolean).join(' - ');
  return linha2 || 'Endereço incompleto';
}

export function toCompatAddressString(a: AddressRecord): string {
  const ruaCompleta = [
    sanitizeSegment(a.rua),
    a.numero ? `nº ${sanitizeSegment(a.numero)}` : '',
    a.complemento ? `(${sanitizeSegment(a.complemento)})` : ''
  ]
    .filter(Boolean)
    .join(' ');

  const bairro = sanitizeSegment(a.bairro);
  const cidade = sanitizeSegment(a.cidade) || FIXED_CITY_NAME;

  return `${ruaCompleta}, ${bairro}, ${cidade}`;
}

export function syncSessionEndereco(a: AddressRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem('extraplus-session');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.tipo !== 'cliente') return;
    parsed.endereco = toCompatAddressString(a);
    window.localStorage.setItem('extraplus-session', JSON.stringify(parsed));
  } catch {
  }
}
