export type DiaHorario = {
  dia: number;
  abre: string;
  fecha: string;
  fechado: boolean;
};

const FUSO_LOJA = 'America/Maceio';

const WEEKDAY_PARA_DIA: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

export function obterMomentoAtualLoja(): { dia: number; hora: string } {
  const agora = new Date();
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO_LOJA,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(agora);

  const weekday = partes.find(p => p.type === 'weekday')?.value || 'Sun';
  const hour = partes.find(p => p.type === 'hour')?.value || '00';
  const minute = partes.find(p => p.type === 'minute')?.value || '00';

  return { dia: WEEKDAY_PARA_DIA[weekday] ?? 0, hora: `${hour === '24' ? '00' : hour}:${minute}` };
}

// horarios null/vazio = sem restrição configurada, considera sempre aberto
export function estaDentroDoHorario(horarios: DiaHorario[] | null | undefined): boolean {
  if (!horarios || horarios.length === 0) return true;

  const { dia, hora } = obterMomentoAtualLoja();
  const configDia = horarios.find(h => h.dia === dia);
  if (!configDia || configDia.fechado) return false;
  if (!configDia.abre || !configDia.fecha) return true;

  if (configDia.fecha < configDia.abre) {
    return hora >= configDia.abre || hora < configDia.fecha;
  }
  return hora >= configDia.abre && hora < configDia.fecha;
}
