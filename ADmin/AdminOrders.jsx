import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search, Filter, Clock, CheckCircle, Package, Truck, Check,
  XCircle, ChevronRight, Phone, MessageCircle, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';

import OrderStatusBadge from '@/components/customer/OrderStatusBadge';

const statusConfig = {
  received: { next: 'confirmed', label: 'Confirmar' },
  confirmed: { next: 'preparing', label: 'Iniciar Separação' },
  preparing: { next: 'out_for_delivery', label: 'Enviar para Entrega' },
  out_for_delivery: { next: 'delivered', label: 'Marcar Entregue' },
  delivered: { next: null, label: null },
  cancelled: { next: null, label: null },
};

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
    refetchInterval: 30000,
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['allOrders']),
  });

  const advanceStatus = (order) => {
    const nextStatus = statusConfig[order.status]?.next;
    if (!nextStatus) return;

    updateOrderMutation.mutate({
      id: order.id,
      data: {
        status: nextStatus,
        status_history: [
          ...(order.status_history || []),
          { status: nextStatus, timestamp: new Date().toISOString() }
        ]
      }
    });
  };

  const cancelOrder = (order) => {
    updateOrderMutation.mutate({
      id: order.id,
      data: {
        status: 'cancelled',
        status_history: [
          ...(order.status_history || []),
          { status: 'cancelled', timestamp: new Date().toISOString() }
        ]
      }
    });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id?.toLowerCase().includes(search.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingOrders = orders.filter(o => ['received', 'confirmed', 'preparing', 'out_for_delivery'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'delivered');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const OrderCard = ({ order }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card className="bg-zinc-900 border-zinc-800 p-4 hover:border-zinc-700 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-bold">#{order.id?.slice(-6).toUpperCase()}</span>
              <OrderStatusBadge status={order.status} size="sm" />
            </div>
            <p className="text-zinc-400 text-sm">
              {format(new Date(order.created_date), "d MMM, HH:mm", { locale: ptBR })}
            </p>
          </div>
          <p className="text-amber-400 font-bold text-lg">R$ {order.total?.toFixed(2)}</p>
        </div>

        <div className="flex items-center gap-3 mb-3 p-3 bg-zinc-800/50 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <span className="text-amber-400 font-bold">{order.customer_name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{order.customer_name}</p>
            <p className="text-zinc-500 text-sm">{order.customer_phone}</p>
          </div>
          {order.customer_phone && (
            <div className="flex gap-2">
              <a 
                href={`https://wa.me/${order.customer_phone?.replace(/\D/g, '')}?text=Olá! Sobre seu pedido ${order.id?.slice(-6).toUpperCase()}...`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-400 hover:bg-green-500/10">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </a>
              <a href={`tel:${order.customer_phone}`}>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:bg-zinc-800">
                  <Phone className="w-4 h-4" />
                </Button>
              </a>
            </div>
          )}
        </div>

        {/* Items summary */}
        <div className="mb-3">
          <p className="text-zinc-500 text-sm">
            {order.items?.reduce((acc, i) => acc + i.quantity, 0)} itens: 
            <span className="text-zinc-300 ml-1">
              {order.items?.slice(0, 2).map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
              {order.items?.length > 2 && ` +${order.items.length - 2}`}
            </span>
          </p>
        </div>

        {/* Delivery info */}
        {order.delivery_type === 'delivery' && order.delivery_address && (
          <div className="mb-3 p-2 bg-zinc-800/30 rounded-lg">
            <p className="text-zinc-400 text-xs flex items-center gap-1">
              <Truck className="w-3 h-3" />
              {order.delivery_address.street}, {order.delivery_address.number} - {order.delivery_address.neighborhood}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {statusConfig[order.status]?.next && (
            <Button 
              onClick={() => advanceStatus(order)}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              disabled={updateOrderMutation.isPending}
            >
              {statusConfig[order.status].label}
            </Button>
          )}
          {!['delivered', 'cancelled'].includes(order.status) && (
            <Button 
              variant="outline" 
              onClick={() => cancelOrder(order)}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              disabled={updateOrderMutation.isPending}
            >
              Cancelar
            </Button>
          )}
          <Link to={createPageUrl(`AdminOrderDetails?id=${order.id}`)}>
            <Button variant="ghost" size="icon" className="text-zinc-400">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Pedidos</h1>
            <p className="text-zinc-400">{pendingOrders.length} pendentes</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="border-zinc-700 text-zinc-400"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-amber-500/10 border-amber-500/30 p-4 text-center">
            <p className="text-3xl font-bold text-amber-400">{pendingOrders.length}</p>
            <p className="text-amber-400/70 text-sm">Pendentes</p>
          </Card>
          <Card className="bg-green-500/10 border-green-500/30 p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{completedOrders.length}</p>
            <p className="text-green-400/70 text-sm">Entregues</p>
          </Card>
          <Card className="bg-red-500/10 border-red-500/30 p-4 text-center">
            <p className="text-3xl font-bold text-red-400">{cancelledOrders.length}</p>
            <p className="text-red-400/70 text-sm">Cancelados</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Buscar pedido ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="received">Recebido</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="preparing">Separando</SelectItem>
              <SelectItem value="out_for_delivery">Em entrega</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-zinc-900 border-zinc-800 p-4 animate-pulse">
                <div className="h-5 bg-zinc-800 rounded w-32 mb-2" />
                <div className="h-4 bg-zinc-800 rounded w-48 mb-4" />
                <div className="h-16 bg-zinc-800 rounded" />
              </Card>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum pedido encontrado</h3>
            <p className="text-zinc-500">Os pedidos aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}