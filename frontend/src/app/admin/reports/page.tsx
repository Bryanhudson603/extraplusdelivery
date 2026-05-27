 'use client';
 
 import { useEffect, useMemo, useState } from 'react';
 import { api } from '@/lib/api';
 
 type DiaRelatorio = {
   dia: string;
   vendas: number;
   pedidos: number;
   ticketMedio: number;
 };
 
 type EntregadorStat = {
   entregadorId: string;
   nome: string;
   entregas: number;
 };
 
 export default function AdminReportsPage() {
   const [dias, setDias] = useState<DiaRelatorio[]>([]);
   const [entregadores, setEntregadores] = useState<EntregadorStat[]>([]);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     async function carregar() {
       try {
         const rDias = await api.get<DiaRelatorio[]>('/admin/relatorios/dias');
         const rEntregadores = await api.get<EntregadorStat[]>('/admin/entregadores/estatisticas');
         setDias(rDias);
         setEntregadores(rEntregadores);
       } catch (e) {
         console.error('Erro ao carregar relatórios admin', e);
       } finally {
         setLoading(false);
       }
     }
     carregar();
   }, []);
 
   const totalPeriodo = useMemo(() => {
     const vendas = dias.reduce((s, d) => s + d.vendas, 0);
     const pedidos = dias.reduce((s, d) => s + d.pedidos, 0);
     const ticketMedio = pedidos > 0 ? Number((vendas / pedidos).toFixed(2)) : 0;
     return { vendas, pedidos, ticketMedio };
   }, [dias]);
 
   return (
    <main className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 sm:p-6">
       <div className="max-w-7xl mx-auto space-y-6">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="text-xs text-gray-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400"
            >
              ← Voltar
            </a>
             <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
              <p className="text-xs text-gray-600 dark:text-zinc-500">
                Vendas por dia e entregas por entregador.
              </p>
             </div>
           </div>
         </div>
 
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4">
            <div className="text-xs text-gray-600 dark:text-zinc-400">Vendas no período</div>
             <div className="text-2xl font-bold text-amber-400 mt-1">R$ {totalPeriodo.vendas.toFixed(2)}</div>
           </div>
          <div className="rounded-xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4">
            <div className="text-xs text-gray-600 dark:text-zinc-400">Pedidos</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalPeriodo.pedidos}</div>
           </div>
          <div className="rounded-xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4">
            <div className="text-xs text-gray-600 dark:text-zinc-400">Ticket médio</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              R$ {totalPeriodo.ticketMedio.toFixed(2)}
            </div>
           </div>
         </div>
 
        <div className="rounded-xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800">
            <div className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
               <span>📅</span>
               Vendas por dia (últimos 30 dias)
             </div>
           </div>
           <div className="overflow-x-auto">
             <table className="min-w-full text-sm">
               <thead>
                <tr className="bg-gray-50 text-gray-600 dark:bg-zinc-900 dark:text-zinc-400">
                   <th className="text-left px-4 py-2">Dia</th>
                   <th className="text-left px-4 py-2">Pedidos</th>
                   <th className="text-left px-4 py-2">Vendas</th>
                   <th className="text-left px-4 py-2">Ticket médio</th>
                 </tr>
               </thead>
               <tbody>
                 {loading ? (
                   <tr>
                    <td className="px-4 py-3 text-gray-600 dark:text-zinc-500" colSpan={4}>
                      Carregando...
                    </td>
                   </tr>
                 ) : dias.length === 0 ? (
                   <tr>
                    <td className="px-4 py-3 text-gray-600 dark:text-zinc-500" colSpan={4}>
                      Sem dados no período
                    </td>
                   </tr>
                 ) : (
                   dias.map((d) => (
                    <tr key={d.dia} className="border-t border-gray-200 dark:border-zinc-800">
                      <td className="px-4 py-2 text-gray-900 dark:text-white">
                        {new Date(d.dia).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-2 text-gray-900 dark:text-white">{d.pedidos}</td>
                       <td className="px-4 py-2 text-amber-400">R$ {d.vendas.toFixed(2)}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-white">
                        R$ {d.ticketMedio.toFixed(2)}
                      </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
         </div>
 
        <div className="rounded-xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800">
            <div className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
               <span>🛵</span>
               Entregas por entregador
             </div>
           </div>
           <div className="overflow-x-auto">
             <table className="min-w-full text-sm">
               <thead>
                <tr className="bg-gray-50 text-gray-600 dark:bg-zinc-900 dark:text-zinc-400">
                   <th className="text-left px-4 py-2">Entregador</th>
                   <th className="text-left px-4 py-2">Entregas</th>
                 </tr>
               </thead>
               <tbody>
                 {loading ? (
                   <tr>
                    <td className="px-4 py-3 text-gray-600 dark:text-zinc-500" colSpan={2}>
                      Carregando...
                    </td>
                   </tr>
                 ) : entregadores.length === 0 ? (
                   <tr>
                    <td className="px-4 py-3 text-gray-600 dark:text-zinc-500" colSpan={2}>
                      Sem entregas registradas
                    </td>
                   </tr>
                 ) : (
                   entregadores.map((e) => (
                    <tr key={e.entregadorId} className="border-t border-gray-200 dark:border-zinc-800">
                      <td className="px-4 py-2 text-gray-900 dark:text-white">{e.nome}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-white">{e.entregas}</td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
         </div>
       </div>
     </main>
   );
 }
