import { randomBytes } from 'crypto';

type TicketEntry = {
  clienteId: string;
  expiresAt: number;
};

const TICKET_TTL_MS = 2 * 60 * 1000;
const tickets = new Map<string, TicketEntry>();

function limparExpirados(): void {
  const agora = Date.now();
  for (const [id, entry] of tickets) {
    if (entry.expiresAt < agora) tickets.delete(id);
  }
}

export function criarTicket(clienteId: string): string {
  limparExpirados();
  const id = randomBytes(24).toString('hex');
  tickets.set(id, { clienteId, expiresAt: Date.now() + TICKET_TTL_MS });
  return id;
}

export function consumirTicket(id: string): string | null {
  limparExpirados();
  const entry = tickets.get(id);
  if (!entry) return null;
  tickets.delete(id);
  if (entry.expiresAt < Date.now()) return null;
  return entry.clienteId;
}
