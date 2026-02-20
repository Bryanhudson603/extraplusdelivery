import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Store, Clock, Truck, CreditCard, Percent, Save, Plus, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('store');
  const [settings, setSettings] = useState({
    store_name: '',
    phone: '',
    whatsapp: '',
    address: {
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zipcode: '',
    },
    opening_hours: daysOfWeek.map((_, i) => ({
      day: i,
      open: '08:00',
      close: '22:00',
      is_closed: i === 0, // Closed on Sunday by default
    })),
    delivery_settings: {
      base_fee: 5,
      fee_per_km: 1,
      free_delivery_min: 100,
      max_distance_km: 10,
      avg_delivery_time: 30,
    },
    loyalty_settings: {
      points_per_real: 1,
      cashback_percentage: 3,
      min_purchase_for_cashback: 50,
    },
    pix_key: '',
    pix_name: '',
    accepts_card_delivery: true,
    accepts_cash: true,
    is_open: true,
    closed_message: '',
  });

  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ['storeSettings'],
    queryFn: async () => {
      const list = await base44.entities.StoreSettings.list();
      return list[0];
    },
  });

  useEffect(() => {
    if (existingSettings) {
      setSettings({
        ...settings,
        ...existingSettings,
        address: { ...settings.address, ...existingSettings.address },
        delivery_settings: { ...settings.delivery_settings, ...existingSettings.delivery_settings },
        loyalty_settings: { ...settings.loyalty_settings, ...existingSettings.loyalty_settings },
        opening_hours: existingSettings.opening_hours?.length > 0 
          ? existingSettings.opening_hours 
          : settings.opening_hours,
      });
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingSettings?.id) {
        return base44.entities.StoreSettings.update(existingSettings.id, data);
      } else {
        return base44.entities.StoreSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['storeSettings']);
      alert('Configurações salvas com sucesso!');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const updateOpeningHours = (dayIndex, field, value) => {
    setSettings(prev => ({
      ...prev,
      opening_hours: prev.opening_hours.map((h, i) =>
        i === dayIndex ? { ...h, [field]: value } : h
      ),
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Configurações</h1>
            <p className="text-zinc-400">Gerencie as configurações da loja</p>
          </div>
          <Button 
            onClick={handleSave}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            disabled={saveMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900 border-zinc-800 mb-6">
            <TabsTrigger value="store">Loja</TabsTrigger>
            <TabsTrigger value="hours">Horários</TabsTrigger>
            <TabsTrigger value="delivery">Entrega</TabsTrigger>
            <TabsTrigger value="payment">Pagamento</TabsTrigger>
            <TabsTrigger value="loyalty">Fidelidade</TabsTrigger>
          </TabsList>

          {/* Store Info */}
          <TabsContent value="store">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Store className="w-5 h-5 text-amber-400" />
                  Informações da Loja
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-zinc-400">Nome da loja</Label>
                  <Input
                    value={settings.store_name}
                    onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    placeholder="Depósito Gelado"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-400">Telefone</Label>
                    <Input
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400">WhatsApp</Label>
                    <Input
                      value={settings.whatsapp}
                      onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-zinc-400">Endereço</Label>
                  <Input
                    value={settings.address.street}
                    onChange={(e) => setSettings({ ...settings, address: { ...settings.address, street: e.target.value } })}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    placeholder="Rua"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Input
                      value={settings.address.number}
                      onChange={(e) => setSettings({ ...settings, address: { ...settings.address, number: e.target.value } })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Número"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      value={settings.address.neighborhood}
                      onChange={(e) => setSettings({ ...settings, address: { ...settings.address, neighborhood: e.target.value } })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Bairro"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      value={settings.address.city}
                      onChange={(e) => setSettings({ ...settings, address: { ...settings.address, city: e.target.value } })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <Input
                      value={settings.address.state}
                      onChange={(e) => setSettings({ ...settings, address: { ...settings.address, state: e.target.value } })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Estado"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                  <div>
                    <p className="text-white font-medium">Loja aberta</p>
                    <p className="text-zinc-500 text-sm">Receber novos pedidos</p>
                  </div>
                  <Switch
                    checked={settings.is_open}
                    onCheckedChange={(checked) => setSettings({ ...settings, is_open: checked })}
                  />
                </div>

                {!settings.is_open && (
                  <div>
                    <Label className="text-zinc-400">Mensagem de fechamento</Label>
                    <Textarea
                      value={settings.closed_message}
                      onChange={(e) => setSettings({ ...settings, closed_message: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      placeholder="Estamos fechados no momento..."
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Opening Hours */}
          <TabsContent value="hours">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Horário de Funcionamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.opening_hours.map((hour, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-lg">
                    <span className="text-white font-medium w-24">{daysOfWeek[index]}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={hour.open}
                        onChange={(e) => updateOpeningHours(index, 'open', e.target.value)}
                        disabled={hour.is_closed}
                        className="bg-zinc-800 border-zinc-700 text-white w-28"
                      />
                      <span className="text-zinc-500">às</span>
                      <Input
                        type="time"
                        value={hour.close}
                        onChange={(e) => updateOpeningHours(index, 'close', e.target.value)}
                        disabled={hour.is_closed}
                        className="bg-zinc-800 border-zinc-700 text-white w-28"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-sm">Fechado</span>
                      <Switch
                        checked={hour.is_closed}
                        onCheckedChange={(checked) => updateOpeningHours(index, 'is_closed', checked)}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Settings */}
          <TabsContent value="delivery">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-400" />
                  Configurações de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-400">Taxa base (R$)</Label>
                    <Input
                      type="number"
                      step="0.50"
                      value={settings.delivery_settings.base_fee}
                      onChange={(e) => setSettings({
                        ...settings,
                        delivery_settings: { ...settings.delivery_settings, base_fee: parseFloat(e.target.value) }
                      })}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400">Taxa por km (R$)</Label>
                    <Input
                      type="number"
                      step="0.50"
                      value={settings.delivery_settings.fee_per_km}
                      onChange={(e) => setSettings({
                        ...settings,
                        delivery_settings: { ...settings.delivery_settings, fee_per_km: parseFloat(e.target.value) }
                      })}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-400">Frete grátis a partir de (R$)</Label>
                    <Input
                      type="number"
                      value={settings.delivery_settings.free_delivery_min}
                      onChange={(e) => setSettings({
                        ...settings,
                        delivery_settings: { ...settings.delivery_settings, free_delivery_min: parseFloat(e.target.value) }
                      })}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400">Distância máxima (km)</Label>
                    <Input
                      type="number"
                      value={settings.delivery_settings.max_distance_km}
                      onChange={(e) => setSettings({
                        ...settings,
                        delivery_settings: { ...settings.delivery_settings, max_distance_km: parseFloat(e.target.value) }
                      })}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-zinc-400">Tempo médio de entrega (min)</Label>
                  <Input
                    type="number"
                    value={settings.delivery_settings.avg_delivery_time}
                    onChange={(e) => setSettings({
                      ...settings,
                      delivery_settings: { ...settings.delivery_settings, avg_delivery_time: parseInt(e.target.value) }
                    })}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Settings */}
          <TabsContent value="payment">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-400" />
                  Formas de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-zinc-400">Chave PIX</Label>
                  <Input
                    value={settings.pix_key}
                    onChange={(e) => setSettings({ ...settings, pix_key: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    placeholder="email@exemplo.com ou CPF"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400">Nome do recebedor PIX</Label>
                  <Input
                    value={settings.pix_name}
                    onChange={(e) => setSettings({ ...settings, pix_name: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    placeholder="Nome que aparece no PIX"
                  />
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                  <div>
                    <p className="text-white font-medium">Cartão na entrega</p>
                    <p className="text-zinc-500 text-sm">Aceitar cartão de crédito/débito</p>
                  </div>
                  <Switch
                    checked={settings.accepts_card_delivery}
                    onCheckedChange={(checked) => setSettings({ ...settings, accepts_card_delivery: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Dinheiro</p>
                    <p className="text-zinc-500 text-sm">Aceitar pagamento em dinheiro</p>
                  </div>
                  <Switch
                    checked={settings.accepts_cash}
                    onCheckedChange={(checked) => setSettings({ ...settings, accepts_cash: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loyalty Settings */}
          <TabsContent value="loyalty">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Percent className="w-5 h-5 text-amber-400" />
                  Programa de Fidelidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-zinc-400">Pontos por R$ gasto</Label>
                  <Input
                    type="number"
                    value={settings.loyalty_settings.points_per_real}
                    onChange={(e) => setSettings({
                      ...settings,
                      loyalty_settings: { ...settings.loyalty_settings, points_per_real: parseFloat(e.target.value) }
                    })}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                  <p className="text-zinc-500 text-sm mt-1">Ex: 1 ponto a cada R$ 1 gasto</p>
                </div>
                <div>
                  <Label className="text-zinc-400">% de Cashback</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={settings.loyalty_settings.cashback_percentage}
                    onChange={(e) => setSettings({
                      ...settings,
                      loyalty_settings: { ...settings.loyalty_settings, cashback_percentage: parseFloat(e.target.value) }
                    })}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                  <p className="text-zinc-500 text-sm mt-1">Ex: 3% de cashback em cada compra</p>
                </div>
                <div>
                  <Label className="text-zinc-400">Compra mínima para cashback (R$)</Label>
                  <Input
                    type="number"
                    value={settings.loyalty_settings.min_purchase_for_cashback}
                    onChange={(e) => setSettings({
                      ...settings,
                      loyalty_settings: { ...settings.loyalty_settings, min_purchase_for_cashback: parseFloat(e.target.value) }
                    })}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
