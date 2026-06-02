import { getAuthPayloadFromRequest } from '../auth/auth-token';
import type { LojaRepository } from '../repositories/loja.repository';

export async function resolveLojaId(req: { headers?: Record<string, unknown> }, lojaRepo: LojaRepository) {
  const payload = getAuthPayloadFromRequest(req);
  if (payload?.lojaId) return payload.lojaId;
  const loja = await lojaRepo.obterPrimeiraAtiva();
  return loja?.id || null;
}

