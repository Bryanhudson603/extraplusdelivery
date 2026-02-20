export function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    recebido: 'bg-gray-200 text-gray-800',
    confirmado: 'bg-blue-100 text-blue-700',
    em_separacao: 'bg-orange-100 text-orange-700',
    saiu_para_entrega: 'bg-purple-100 text-purple-700',
    finalizado: 'bg-green-100 text-green-700',
    cancelado: 'bg-red-100 text-red-700'
  };
  const cls = map[status] || 'bg-gray-200 text-gray-800';
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>{status}</span>;
}
