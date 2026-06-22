import { getOrderStatusLabel } from '@/lib/orders';

export function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    aguardando_pagamento: 'bg-amber-100 text-amber-700 border border-amber-200',
    recebido: 'bg-slate-200 text-slate-800 border border-slate-300',
    confirmado: 'bg-blue-100 text-blue-700 border border-blue-200',
    em_separacao: 'bg-blue-100 text-blue-700 border border-blue-200',
    saiu_para_entrega: 'bg-purple-100 text-purple-700 border border-purple-200',
    finalizado: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    cancelado: 'bg-red-100 text-red-700 border border-red-200'
  };
  const cls = map[status] || 'bg-slate-200 text-slate-800 border border-slate-300';
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>{getOrderStatusLabel(status)}</span>;
}
