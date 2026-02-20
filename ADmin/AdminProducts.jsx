import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Plus, Search, Edit2, Trash2, Package, Image, Tag,
  ChevronDown, Filter, MoreVertical, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    image_url: '',
    category_id: '',
    volume: '',
    unit_price: '',
    promo_price: '',
    pack_quantity: '',
    pack_price: '',
    stock: '',
    min_stock_alert: '10',
    tags: [],
    is_active: true,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
  });

  const createProductMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      closeDialog();
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      closeDialog();
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['products']),
  });

  const openEditDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name || '',
        description: product.description || '',
        image_url: product.image_url || '',
        category_id: product.category_id || '',
        volume: product.volume || '',
        unit_price: product.unit_price?.toString() || '',
        promo_price: product.promo_price?.toString() || '',
        pack_quantity: product.pack_quantity?.toString() || '',
        pack_price: product.pack_price?.toString() || '',
        stock: product.stock?.toString() || '',
        min_stock_alert: product.min_stock_alert?.toString() || '10',
        tags: product.tags || [],
        is_active: product.is_active !== false,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        image_url: '',
        category_id: '',
        volume: '',
        unit_price: '',
        promo_price: '',
        pack_quantity: '',
        pack_price: '',
        stock: '',
        min_stock_alert: '10',
        tags: [],
        is_active: true,
      });
    }
    setEditDialogOpen(true);
  };

  const closeDialog = () => {
    setEditDialogOpen(false);
    setEditingProduct(null);
  };

  const handleSave = () => {
    const data = {
      ...productForm,
      unit_price: parseFloat(productForm.unit_price) || 0,
      promo_price: productForm.promo_price ? parseFloat(productForm.promo_price) : null,
      pack_quantity: productForm.pack_quantity ? parseInt(productForm.pack_quantity) : null,
      pack_price: productForm.pack_price ? parseFloat(productForm.pack_price) : null,
      stock: parseInt(productForm.stock) || 0,
      min_stock_alert: parseInt(productForm.min_stock_alert) || 10,
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const toggleProductStatus = (product) => {
    updateProductMutation.mutate({
      id: product.id,
      data: { is_active: !product.is_active }
    });
  };

  const toggleTag = (tag) => {
    setProductForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (categoryId) => {
    return categories.find(c => c.id === categoryId)?.name || 'Sem categoria';
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Produtos</h1>
            <p className="text-zinc-400">{products.length} produtos cadastrados</p>
          </div>
          <Button 
            onClick={() => openEditDialog()}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Produto
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-800 text-white">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="bg-zinc-900 border-zinc-800 p-4 animate-pulse">
                <div className="h-32 bg-zinc-800 rounded-xl mb-4" />
                <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2" />
                <div className="h-6 bg-zinc-800 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum produto encontrado</h3>
            <p className="text-zinc-500 mb-4">Adicione seu primeiro produto</p>
            <Button onClick={() => openEditDialog()} className="bg-amber-500 text-black">
              <Plus className="w-4 h-4 mr-2" /> Adicionar Produto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`bg-zinc-900 border-zinc-800 overflow-hidden ${!product.is_active && 'opacity-60'}`}>
                    {/* Image */}
                    <div className="relative h-32 bg-zinc-800">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-10 h-10 text-zinc-600" />
                        </div>
                      )}
                      
                      {/* Status badge */}
                      <Badge className={`absolute top-2 left-2 ${product.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {product.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>

                      {/* Stock badge */}
                      {(product.stock || 0) <= (product.min_stock_alert || 10) && (
                        <Badge className="absolute top-2 right-2 bg-red-500/20 text-red-400">
                          Estoque baixo
                        </Badge>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <p className="text-zinc-500 text-xs mb-1">{getCategoryName(product.category_id)}</p>
                      <h3 className="text-white font-semibold truncate mb-1">{product.name}</h3>
                      <p className="text-zinc-400 text-sm mb-2">{product.volume}</p>

                      <div className="flex items-baseline gap-2 mb-3">
                        {product.promo_price ? (
                          <>
                            <span className="text-amber-400 font-bold">R$ {product.promo_price.toFixed(2)}</span>
                            <span className="text-zinc-500 line-through text-sm">R$ {product.unit_price?.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-white font-bold">R$ {product.unit_price?.toFixed(2)}</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 text-sm">Estoque: {product.stock || 0}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem onClick={() => openEditDialog(product)} className="text-white">
                              <Edit2 className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleProductStatus(product)} className="text-white">
                              {product.is_active ? (
                                <><EyeOff className="w-4 h-4 mr-2" /> Desativar</>
                              ) : (
                                <><Eye className="w-4 h-4 mr-2" /> Ativar</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteProductMutation.mutate(product.id)}
                              className="text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-zinc-400">Nome *</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
                placeholder="Skol Lata 350ml"
              />
            </div>

            <div>
              <Label className="text-zinc-400">Descrição</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
                placeholder="Descrição do produto..."
              />
            </div>

            <div>
              <Label className="text-zinc-400">URL da Imagem</Label>
              <Input
                value={productForm.image_url}
                onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-400">Categoria</Label>
                <Select 
                  value={productForm.category_id} 
                  onValueChange={(value) => setProductForm({ ...productForm, category_id: value })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-400">Volume</Label>
                <Input
                  value={productForm.volume}
                  onChange={(e) => setProductForm({ ...productForm, volume: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  placeholder="350ml"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-400">Preço Unitário *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.unit_price}
                  onChange={(e) => setProductForm({ ...productForm, unit_price: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-zinc-400">Preço Promocional</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.promo_price}
                  onChange={(e) => setProductForm({ ...productForm, promo_price: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-400">Qtd. no Fardo</Label>
                <Input
                  type="number"
                  value={productForm.pack_quantity}
                  onChange={(e) => setProductForm({ ...productForm, pack_quantity: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  placeholder="12"
                />
              </div>
              <div>
                <Label className="text-zinc-400">Preço do Fardo</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.pack_price}
                  onChange={(e) => setProductForm({ ...productForm, pack_price: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-400">Estoque</Label>
                <Input
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  placeholder="100"
                />
              </div>
              <div>
                <Label className="text-zinc-400">Alerta Mínimo</Label>
                <Input
                  type="number"
                  value={productForm.min_stock_alert}
                  onChange={(e) => setProductForm({ ...productForm, min_stock_alert: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  placeholder="10"
                />
              </div>
            </div>

            <div>
              <Label className="text-zinc-400">Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['promocao', 'mais_vendido', 'novo', 'destaque'].map(tag => (
                  <Badge
                    key={tag}
                    variant="outline"
                    onClick={() => toggleTag(tag)}
                    className={`cursor-pointer ${
                      productForm.tags.includes(tag)
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-zinc-400">Produto ativo</Label>
              <Switch
                checked={productForm.is_active}
                onCheckedChange={(checked) => setProductForm({ ...productForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} className="text-zinc-400">
              Cancelar
 