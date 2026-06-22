export const FIXED_CITY_NAME = 'Rio Largo';

export const DELIVERY_NEIGHBORHOODS: Array<{ nome: string; taxaEntrega: number }> = [
  { nome: 'Mata do Rolo', taxaEntrega: 0 },
  { nome: 'Mutirao', taxaEntrega: 0 },
  { nome: 'Antonio Lins', taxaEntrega: 5 },
  { nome: 'Barnabe', taxaEntrega: 0 },
  { nome: 'Jarbas Oiticica', taxaEntrega: 5 },
  { nome: 'Centro', taxaEntrega: 0 },
  { nome: 'Palmeira', taxaEntrega: 0 },
  { nome: 'Aeroporto', taxaEntrega: 5 }
];

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function formatClientAddress(rua: string, bairro: string): string {
  return `${String(rua || '').trim()}, ${String(bairro || '').trim()}, ${FIXED_CITY_NAME}`;
}

export function parseClientAddress(value: string | null | undefined): {
  rua: string;
  bairro: string;
  cidade: string;
} {
  const raw = String(value || '').trim();
  if (!raw) {
    return { rua: '', bairro: '', cidade: FIXED_CITY_NAME };
  }

  const parts = raw.split(',').map(part => part.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return {
      rua: parts[0],
      bairro: parts[1],
      cidade: parts.slice(2).join(', ')
    };
  }

  if (parts.length === 2) {
    return {
      rua: parts[0],
      bairro: parts[1],
      cidade: FIXED_CITY_NAME
    };
  }

  return {
    rua: raw,
    bairro: '',
    cidade: FIXED_CITY_NAME
  };
}

export function getNeighborhoodDeliveryFee(address: string | null | undefined, deliveryType?: string): number {
  if (deliveryType === 'retirada') return 0;
  const bairro = parseClientAddress(address).bairro;
  const found = DELIVERY_NEIGHBORHOODS.find(item => normalizeText(item.nome) === normalizeText(bairro));
  return found?.taxaEntrega ?? 0;
}
