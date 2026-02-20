import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DollarSign, ShoppingBag, Users, TrendingUp, Package, AlertTriangle,
  Clock, ChevronRight, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const { data: orders = [] } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['allProducts'],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['allCustomers'],
    queryFn: () => base44.entities.CustomerProfile.list(),
  });

  // Today's stats
  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.created_date).toDateString() === today);
  const todayRevenue = todayOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const avgTicket = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

  // Pending orders
  const pendingOrders = orders.filter(o => ['received', 'confirmed', 'preparing'].includes(o.status));

  // Low stock products
  const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.min_stock_alert || 10));

  // Top products
  const productSales = {};
  orders.forEach(order => {
    order.items?.forEach(item => {
      productSales[item.product_name] = (productSales[item.product_name] || 0) + item.quantity;
    });
  });
  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const stats = [
    {
      title: 'Vendas Hoje',
      value: `R$ ${todayRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Pedidos Hoje',
      value: todayOrders.length,
      icon: ShoppingBag,
      color: 'from-blue-500 to-cyan-600',
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Ticket Médio',
      value: `R$ ${avgTicket.toFixed(2)}`,
      icon: TrendingUp,
      color: 'from-purple-500 to-violet-600',
      trend: '+5%',
      trendUp: true,
    },
    {
      title: 'Clientes',
      value: customers.length,
      icon: Users,
      color: 'from-amber-500 to-orange-600',
      trend: '+15%',
      trendUp: true,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-zinc-400">Bem-vindo de volta! 👋</p>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            Loja Aberta
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-zinc-400 text-sm mb-1">{stat.title}</p>
                      <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 mt-3 text-sm ${stat.trendUp ? 'text-green-400' : 'text-red-400'}`}>
                    {stat.trendUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span>{stat.trend} vs ontem</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pending Orders */}
          <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Pedidos Pendentes ({pendingOrders.length})
              </CardTitle>
              <Link to={createPageUrl('AdminOrders')}>
                <Button variant="ghost" size="sm" className="text-amber-400">
                  Ver todos <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {pendingOrders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-zinc-500">Nenhum pedido pendente 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingOrders.slice(0, 5).map(order => (
                    <Link key={order.id} to={createPageUrl(`AdminOrderDetails?id=${order.id}`)}>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">#{order.id?.slice(-6).toUpperCase()}</p>
                            <p className="text-zinc-500 text-sm">{order.customer_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-amber-400 font-bold">R$ {order.total?.toFixed(2)}</p>
                          <p className="text-zinc-500 text-xs">
                            {format(new Date(order.created_date), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-6">
            {/* Low Stock Alert */}
            {lowStockProducts.length > 0 && (
              <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-red-400 flex items-center gap-2 text-base">
                    <AlertTriangle className="w-5 h-5" />
                    Estoque Baixo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lowStockProducts.slice(0, 3).map(product => (
                      <div key={product.id} className="flex items-center justify-between text-sm">
                        <span className="text-white truncate">{product.name}</span>
                        <Badge variant="outline" className="border-red-500/50 text-red-400">
                          {product.stock} un
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <Link to={createPageUrl('AdminProducts')}>
                    <Button variant="ghost" size="sm" className="w-full mt-3 text-red-400">
                      Ver todos ({lowStockProducts.length})
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Top Products */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white flex items-center gap-2 text-base">
                  <Package className="w-5 h-5 text-amber-400" />
                  Mais Vendidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topProducts.map(([name, qty], index) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-amber-500 text-black' :
                        index === 1 ? 'bg-zinc-400 text-black' :
                        index === 2 ? 'bg-amber-700 text-white' :
                        'bg-zinc-700 text-white'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-white text-sm flex-1 truncate">{name}</span>
                      <span className="text-zinc-400 text-sm">{qty} un</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-3">
              <Link to={createPageUrl('AdminProducts')}>
                <Card className="bg-zinc-900 border-zinc-800 p-4 hover:border-amber-500/50 transition-colors cursor-pointer">
                  <Package className="w-6 h-6 text-amber-400 mb-2" />
                  <p className="text-white font-medium text-sm">Produtos</p>
                </Card>
              </Link>
              <Link to={createPageUrl('AdminOrders')}>
                <Card className="bg-zinc-900 border-zinc-800 p-4 hover:border-amber-500/50 transition-colors cursor-pointer">
                  <ShoppingBag className="w-6 h-6 text-blue-400 mb-2" />
                  <p className="text-white font-medium text-sm">Pedidos</p>
                </Card>
              </Link>
              <Link to={createPageUrl('AdminCustomers')}>
                <Card className="bg-zinc-900 border-zinc-800 p-4 hover:border-amber-500/50 transition-colors cursor-pointer">
                  <Users className="w-6 h-6 text-green-400 mb-2" />
                  <p className="text-white font-medium text-sm">Clientes</p>
                </Card>
              </Link>
              <Link to={createPageUrl('AdminSettings')}>
                <Card className="bg-zinc-900 border-zinc-800 p-4 hover:border-amber-500/50 transition-colors cursor-pointer">
                  <TrendingUp className="w-6 h-6 text-purple-400 mb-2" />
                  <p className="text-white font-medium text-sm">Relatórios</p>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}