import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft, MapPin, Phone, MessageCircle, Clock, Check,
  Package, Truck, CheckCircle, XCircle, CreditCard, Banknote,
  QrCode, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

import OrderStatusBadge from '@/components/customer/OrderStatusBadge';

const statusSteps = [
  { status: 'received', label: 'Recebido', icon: Clock },
  { status: 'confirmed', label: 'Confirmado', icon: Check },
  { status: 'preparing', label: 'Separando', icon: Package },
  { status: 'out_for_delivery', label: 'Saiu p/ entrega', icon: Truck },
  { status: 'delivered', label: 'Entregue', icon: CheckCircle },
];

const statusConfig = {
  received: { next: 'confirmed', label: 'Confirmar Pedido', color: 'bg-blue-500' },
  confirmed: { next: 'preparing', label: 'Iniciar Separação', color: 'bg-purple-500' },
  preparing: { next: 'out_for_delivery', label: 'Enviar para Entrega', color: 'bg-amber-500' },
  out_for_delivery: { next: 'delivered', label: 'Marcar como Entregue', color: 'bg-cyan-500' },
  delivered: { next: null, label: null, color: 'bg-green-500' },
  cancelled: { next: null, label: null, color: 'bg-red-500' },
};

const paymentLabels = {
  pix: { label: 'PIX', icon: QrCode },
  card_delivery: { label: 'Cartão na entrega', icon: CreditCard },
  cash: { label: 'Dinheiro', icon: Banknote },
};

export default function AdminOrderDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const orders = await base44.entities.Order.filter({ id: orderId });
      return orders[0];
    },
    enabled: !!orderId,
  });

  const updateOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.update(orderId, data),
    onSuccess: () => queryClient.invalidateQueries(['order', orderId]),
  });

  const advanceStatus = () => {
    const nextStatus = statusConfig[order.status]?.next;
    if (!nextStatus) return;

    updateOrderMutation.mutate({
      status: nextStatus,
      status_history: [
        ...(order.status_history || []),
        { status: nextStatus, timestamp: new Date().toISOString() }
      ]
    });
  };

  const cancelOrder = () => {
    updateOrderMutation.mutate({
      status: 'cancelled',
      status_history: [
        ...(order.status_history || []),
        { status: 'cancelled', timestamp: new Date().toISOString() }
      ]
    });
  };

  const markAsPaid = () => {
    updateOrderMutation.mutate({ payment_status: 'paid' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Pedido não encontrado</h2>
          <Button onClick={() => navigate(createPageUrl('AdminOrders'))} className="bg-amber-500 text-black">
            Voltar aos pedidos
          </Button>
        </div>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex(s => s.status === order.status);
  const PaymentIcon = paymentLabels[order.payment_method]?.icon || CreditCard;

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('AdminOrders'))}
            className="text-white hover:bg-zinc-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Pedido #{order.id?.slice(-6).toUpperCase()}</h1>
            <p className="text-zinc-400 text-sm">
              {format(new Date(order.created_date), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* Status Progress */}
        {order.status !== 'cancelled' && (
          <Card className="bg-zinc-900 border-zinc-800 p-6 mb-4">
            <div className="relative">
              <div className="flex justify-between">
                {statusSteps.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const Icon = step.icon;

                  return (
                    <div key={step.status} className="flex flex-col items-center relative z-10">
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: isCurrent ? 1.1 : 1 }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                          isCompleted
                            ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                            : 'bg-zinc-800'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isCompleted ? 'text-black' : 'text-zinc-500'}`} />
                      </motion.div>
                      <span className={`text-xs text-center ${isCompleted ? 'text-white' : 'text-zinc-500'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-zinc-800 -z-0">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600"
                  initial={{ width: '0%' }}
                  animate={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Customer Info */}
        <Card className="bg-zinc-900 border-zinc-800 p-4 mb-4">
          <h3 className="text-white font-semibold mb-3">Cliente</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-400 font-bold text-lg">{order.customer_name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{order.customer_name}</p>
              <p className="text-zinc-400 text-sm">{order.customer_phone}</p>
            </div>
            <div className="flex gap-2">
              {order.customer_phone && (
                <>
                  <a 
                    href={`https://wa.me/${order.customer_phone?.replace(/\D/g, '')}?text=Olá! Sobre seu pedido ${order.id?.slice(-6).toUpperCase()}...`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="icon" variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/10">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </a>
                  <a href={`tel:${order.customer_phone}`}>
                    <Button size="icon" variant="outline" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </a>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Delivery Info */}
        {order.delivery_type === 'delivery' && order.delivery_address && (
          <Card className="bg-zinc-900 border-zinc-800 p-4 mb-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-amber-400 mt-0.5" />
              <div>
                <h3 className="text-white font-medium mb-1">Endereço de entrega</h3>
                <p className="text-zinc-400 text-sm">
                  {order.delivery_address.street}, {order.delivery_address.number}
                  {order.delivery_address.complement && ` - ${order.delivery_address.complement}`}
                </p>
                <p className="text-zinc-500 text-sm">{order.delivery_address.neighborhood}</p>
                {order.delivery_address.reference && (
                  <p className="text-zinc-500 text-sm mt-1">Ref: {order.delivery_address.reference}</p>
                )}
              </div>
            </div>
          </Card>
        )}

        {order.delivery_type === 'pickup' && (
          <Card className="bg-zinc-900 border-zinc-800 p-4 mb-4">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-amber-400" />
              <p className="text-white font-medium">Retirada no balcão</p>
            </div>
          </Card>
        )}

        {/* Items */}
        <Card className="bg-zinc-900 border-zinc-800 p-4 mb-4">
          <h3 className="text-white font-semibold mb-4">Itens do pedido</h3>
          <div className="space-y-3">
            {order.items?.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden">
                  {item.product_image ? (
                    <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">🍺</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{item.product_name}</p>
                  <p className="text-zinc-500 text-sm">{item.quantity}x R$ {item.unit_price?.toFixed(2)}</p>
                </div>
                <p className="text-white font-medium">R$ {item.total?.toFixed(2)}</p>
              </div>
            ))}
          </div>

          <Separator className="bg-zinc-800 my-4" />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Subtotal</span>
              <span className="text-white">R$ {order.subtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Taxa de entrega</span>
              <span className="text-white">R$ {order.delivery_fee?.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Desconto {order.coupon_code && `(${order.coupon_code})`}</span>
                <span>- R$ {order.discount?.toFixed(2)}</span>
              </div>
            )}
            {order.cashback_used > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Cashback usado</span>
                <span>- R$ {order.cashback_used?.toFixed(2)}</span>
              </div>
            )}
            <Separator className="bg-zinc-800 my-2" />
            <div className="flex justify-between text-lg">
              <span className="text-white font-semibold">Total</span>
              <span className="text-amber-400 font-bold">R$ {order.total?.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* Payment */}
        <Card className="bg-zinc-900 border-zinc-800 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PaymentIcon className="w-5 h-5 text-zinc-400" />
              <div>
                <p className="text-white font-medium">
                  {paymentLabels[order.payment_method]?.label || 'Pagamento'}
                </p>
                <Badge className={order.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}>
                  {order.payment_status === 'paid' ? 'Pago' : 'Aguardando'}
                </Badge>
              </div>
            </div>
            {order.payment_status !== 'paid' && (
              <Button 
                onClick={markAsPaid}
                variant="outline"
                className="border-green-500/50 text-green-400 hover:bg-green-500/10"
              >
                <Check className="w-4 h-4 mr-2" /> Marcar como pago
              </Button>
            )}
          </div>
          {order.payment_method === 'cash' && order.change_for && (
            <p className="text-zinc-400 text-sm mt-2">
              Troco para: R$ {order.change_for.toFixed(2)}
            </p>
          )}
        </Card>

        {/* Notes */}
        {order.notes && (
          <Card className="bg-zinc-900 border-zinc-800 p-4 mb-4">
            <h3 className="text-white font-semibold mb-2">Observações</h3>
            <p className="text-zinc-400">{order.notes}</p>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {statusConfig[order.status]?.next && (
            <Button 
              onClick={advanceStatus}
              className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold"
              disabled={updateOrderMutation.isPending}
            >
              {statusConfig[order.status].label}
            </Button>
          )}
          {!['delivered', 'cancelled'].includes(order.status) && (
            <Button 
              variant="outline"
              onClick={cancelOrder}
              className="h-12 border-red-500/50 text-red-400 hover:bg-red-500/10"
              disabled={updateOrderMutation.isPending}
            >
              <XCircle className="w-4 h-4 mr-2" /> Cancelar
            </Button>
          )}
          <Button variant="outline" className="h-12 border-zinc-700 text-zinc-400 hover:bg-zinc-800">
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>
        </div>
      </div>
    </div>
  );
}