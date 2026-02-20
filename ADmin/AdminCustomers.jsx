import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search, Users, UserCheck, UserX, Gift, MessageCircle, Phone,
  MoreVertical, TrendingUp, TrendingDown, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';

export default function AdminCustomers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [couponValue, setCouponValue] = useState('10');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.CustomerProfile.list('-total_spent'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CustomerProfile.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['customers']),
  });

  const createCouponMutation = useMutation({
    mutationFn: (data) => base44.entities.Coupon.create(data),
    onSuccess: () => {
      setCouponDialogOpen(false);
      setSelectedCustomer(null);
    },
  });

  const getUserInfo = (userId) => {
    return users.find(u => u.id === userId);
  };

  const toggleBlock = (customer) => {
    updateCustomerMutation.mutate({
      id: customer.id,
      data: { is_blocked: !customer.is_blocked }
    });
  };

  const openCouponDialog = (customer) => {
    setSelectedCustomer(customer);
    setCouponDialogOpen(true);
  };

  const sendCoupon = () => {
    const code = `ESPECIAL${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    createCouponMutation.mutate({
      code,
      description: 'Cupom especial para você!',
      type: 'percentage',
      discount_value: parseInt(couponValue),
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customer_ids: [selectedCustomer?.user_id],
      is_active: true,
      usage_limit: 1,
      single_use_per_customer: true,
    });
  };

  const filteredCustomers = customers.filter(customer => {
    const user = getUserInfo(customer.user_id);
    const matchesSearch = 
      user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      customer.phone?.includes(search);
    return matchesSearch;
  });

  // Stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.total_orders > 0).length;
  const blockedCustomers = customers.filter(c => c.is_blocked).length;
  const topSpender = customers[0];

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-zinc-400">{totalCustomers} clientes cadastrados</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalCustomers}</p>
                <p className="text-zinc-500 text-sm">Total</p>
              </div>
            </div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{activeCustomers}</p>
                <p className="text-zinc-500 text-sm">Ativos</p>
              </div>
            </div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{blockedCustomers}</p>
                <p className="text-zinc-500 text-sm">Bloqueados</p>
              </div>
            </div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white truncate">
                  {topSpender ? `R$ ${topSpender.total_spent?.toFixed(0)}` : '-'}
                </p>
                <p className="text-zinc-500 text-sm">Top cliente</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800 text-white"
          />
        </div>

        {/* Customers List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="bg-zinc-900 border-zinc-800 p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-800" />
                  <div className="flex-1">
                    <div className="h-4 bg-zinc-800 rounded w-32 mb-2" />
                    <div className="h-3 bg-zinc-800 rounded w-48" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum cliente encontrado</h3>
            <p className="text-zinc-500">Os clientes aparecerão aqui após o primeiro pedido</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer, index) => {
              const user = getUserInfo(customer.user_id);
              return (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`bg-zinc-900 border-zinc-800 p-4 ${customer.is_blocked && 'opacity-60'}`}>
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-black font-bold text-lg">
                          {user?.full_name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-semibold truncate">{user?.full_name || 'Cliente'}</p>
                          {index === 0 && (
                            <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                              <Crown className="w-3 h-3 mr-1" /> Top
                            </Badge>
                          )}
                          {customer.is_blocked && (
                            <Badge className="bg-red-500/20 text-red-400 text-xs">Bloqueado</Badge>
                          )}
                        </div>
                        <p className="text-zinc-500 text-sm truncate">{user?.email}</p>
                        {customer.phone && (
                          <p className="text-zinc-500 text-sm">{customer.phone}</p>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-6 text-center">
                        <div>
                          <p className="text-white font-bold">{customer.total_orders || 0}</p>
                          <p className="text-zinc-500 text-xs">Pedidos</p>
                        </div>
                        <div>
                          <p className="text-amber-400 font-bold">R$ {(customer.total_spent || 0).toFixed(0)}</p>
                          <p className="text-zinc-500 text-xs">Total gasto</p>
                        </div>
                        <div>
                          <p className="text-green-400 font-bold">R$ {(customer.cashback_balance || 0).toFixed(2)}</p>
                          <p className="text-zinc-500 text-xs">Cashback</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {customer.phone && (
                          <a 
                            href={`https://wa.me/${customer.phone?.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-400 hover:bg-green-500/10">
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem 
                              onClick={() => openCouponDialog(customer)}
                              className="text-white"
                            >
                              <Gift className="w-4 h-4 mr-2" /> Enviar cupom
                            </DropdownMenuItem>
                            <DropdownMenuItem 
 