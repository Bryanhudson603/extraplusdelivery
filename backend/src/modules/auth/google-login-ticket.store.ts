import { randomBytes } from 'crypto';

type TicketEntry = {
  clienteId: string;
  novoCadastro: boolean;
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

export function criarTicket(clienteId: string, novoCadastro: boolean): string {
  limparExpirados();
  const id = randomBytes(24).toString('hex');
  tickets.set(id, { clienteId, novoCadastro, expiresAt: Date.now() + TICKET_TTL_MS });
  return id;
}

export function consumirTicket(id: string): { clienteId: string; novoCadastro: boolean } | null {
  limparExpirados();
  const entry = tickets.get(id);
  if (!entry) return null;
  tickets.delete(id);
  if (entry.expiresAt < Date.now()) return null;
  return { clienteId: entry.clienteId, novoCadastro: entry.novoCadastro };
}
