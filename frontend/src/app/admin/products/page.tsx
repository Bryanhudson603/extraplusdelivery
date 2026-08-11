'use client';
import { useMemo, useState, ChangeEvent } from 'react';
import { useEffect } from 'react';
import { ApiError, api } from '@/lib/api';

type Product = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  imagePath?: string;
  category: string;
  volume: string;
  unitPrice: number;
  promoPrice?: number;
   packQuantity?: number;
   packPrice?: number;
  stock: number;
  minStockAlert: number;
  tags: string[];
  active: boolean;
};

const initialProducts: Product[] = [];

const categories = [
  'Todas categorias',
  'Cervejas',
  'Refrigerantes',
  'Gelos',
  'Energéticos',
  'Vinhos',
  'Destilados',
  'Combos',
  'Outros'
];

type ImportResult = {
  total: number;
  criados: number;
  atualizados: number;
  erros: { linha: number; motivo: string }[];
};

const CSV_TEMPLATE =
  'Produto;CATEGORIA;VALOR;VOLUME;PREÇO DO FARDO;ESTOQUE\n' +
  'Skol Lata 350ml;Cervejas;4,50;350ml;54,00;100\n' +
  'Coca-Cola 2L;Refrigerantes;9,90;2L;;50\n';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas categorias');
  const [editing, setEditing] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  async function carregarProdutos() {
    try {
      const resp = await api.get<any[]>('/admin/produtos');
      const mapped: Product[] = resp.map((p) => ({
        id: p.id,
        name: p.name,
        description: '',
        imageUrl: p.imageUrl,
        imagePath: p.imagePath,
        category: p.category || 'Outros',
        volume: p.volume || '350ml',
        unitPrice: Number(p.price ?? 0),
        promoPrice: p.promoPrice != null ? Number(p.promoPrice) : undefined,
        packQuantity: p.packQuantity != null ? Number(p.packQuantity) : undefined,
        packPrice: p.packPrice != null ? Number(p.packPrice) : undefined,
        stock: Number(p.stock ?? 0),
        minStockAlert: 10,
        tags: Array.isArray(p.tags) ? p.tags : [],
        active: typeof p.active === 'boolean' ? p.active : true
      }));
      setProducts(mapped);
    } catch (e) {
      console.error('Erro ao carregar produtos do admin', e);
    }
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  useEffect(
    () => () => {
      if (previewImage?.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage);
      }
    },
    [previewImage]
  );

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const s = search.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s);
        const matchesCat = categoryFilter === 'Todas categorias' || p.category === categoryFilter;
        return matchesSearch && matchesCat;
      }),
    [products, search, categoryFilter]
  );

  const [form, setForm] = useState({
    id: '',
    name: '',
    description: '',
    imageUrl: '',
    imagePath: '',
    category: '',
    volume: '',
    unitPrice: '',
    promoPrice: '',
    packQuantity: '',
    packPrice: '',
    stock: '',
    minStockAlert: '10',
    tags: [] as string[],
    active: true
  });

  function openNewProduct() {
    setEditing(null);
    setSaveError(null);
    setForm({
      id: '',
      name: '',
      description: '',
      imageUrl: '',
      imagePath: '',
      category: '',
      volume: '',
      unitPrice: '',
      promoPrice: '',
      packQuantity: '',
      packPrice: '',
      stock: '',
      minStockAlert: '10',
      tags: [],
      active: true
    });
    setSelectedImageFile(null);
    setPreviewImage(null);
    setDrawerOpen(true);
  }

  function openEditProduct(p: Product) {
    setEditing(p);
    setSaveError(null);
    setForm({
      id: p.id,
      name: p.name,
      description: p.description || '',
      imageUrl: p.imageUrl || '',
      imagePath: p.imagePath || '',
      category: p.category,
      volume: p.volume,
      unitPrice: String(p.unitPrice),
      promoPrice: p.promoPrice ? String(p.promoPrice) : '',
      packQuantity: p.packQuantity != null ? String(p.packQuantity) : '',
      packPrice: p.packPrice != null ? String(p.packPrice) : '',
      stock: String(p.stock),
      minStockAlert: String(p.minStockAlert),
      tags: p.tags,
      active: p.active
    });
    setSelectedImageFile(null);
    setPreviewImage(p.imageUrl || null);
    setDrawerOpen(true);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaveError(null);
    if (file.size > 5 * 1024 * 1024) {
      setSelectedImageFile(null);
      setSaveError('A imagem deve ter no maximo 5MB.');
      return;
    }
    setSelectedImageFile(file);
    setPreviewImage(URL.createObjectURL(file));
  }

  async function uploadProductImage(file: File): Promise<{ success: true; url: string; path: string }> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('tipo', 'produtos');
    return api.post<{ success: true; url: string; path: string }>('/storage/upload', formData);
  }

  async function saveProduct() {
    setIsSaving(true);
    setSaveError(null);
    try {
      let imageUrl = form.imageUrl || undefined;
      let imagePath = form.imagePath || undefined;

      if (selectedImageFile) {
        const uploaded = await uploadProductImage(selectedImageFile);
        imageUrl = uploaded.url;
        imagePath = uploaded.path;
      }

      const parsed: Product = {
        id: form.id || `p-${Date.now()}`,
        name: form.name,
        description: form.description || undefined,
        imageUrl,
        imagePath,
        category: form.category || 'Outros',
        volume: form.volume || '350ml',
        unitPrice: Number(form.unitPrice || 0),
        promoPrice: form.promoPrice ? Number(form.promoPrice) : undefined,
        packQuantity: form.packQuantity ? Number(form.packQuantity) : undefined,
        packPrice: form.packPrice ? Number(form.packPrice) : undefined,
        stock: Number(form.stock || 0),
        minStockAlert: Number(form.minStockAlert || 10),
        tags: form.tags,
        active: form.active
      };

      const saved = await api.post<any>('/admin/produtos', {
        id: parsed.id,
        name: parsed.name,
        imageUrl: parsed.imageUrl,
        imagePath: parsed.imagePath,
        category: parsed.category,
        volume: parsed.volume,
        price: parsed.unitPrice,
        promoPrice: parsed.promoPrice,
        stock: parsed.stock,
        packQuantity: parsed.packQuantity,
        packPrice: parsed.packPrice,
        tags: parsed.tags,
        active: parsed.active
      });

      setProducts((prev) => {
        const exists = prev.find((p) => p.id === saved.id);
        const mapped: Product = {
          id: saved.id,
          name: saved.name,
          description: '',
          imageUrl: saved.imageUrl,
          imagePath: saved.imagePath,
          category: saved.category || 'Outros',
          volume: saved.volume || '350ml',
          unitPrice: Number(saved.price ?? 0),
          promoPrice: saved.promoPrice != null ? Number(saved.promoPrice) : undefined,
          packQuantity: saved.packQuantity != null ? Number(saved.packQuantity) : undefined,
          packPrice: saved.packPrice != null ? Number(saved.packPrice) : undefined,
          stock: Number(saved.stock ?? 0),
          minStockAlert: 10,
          tags: Array.isArray(saved.tags) ? saved.tags : [],
          active: typeof saved.active === 'boolean' ? saved.active : true
        };
        if (exists) {
          return prev.map((p) => (p.id === mapped.id ? mapped : p));
        }
        return [mapped, ...prev];
      });

      setDrawerOpen(false);
      setEditing(null);
      setSelectedImageFile(null);
      setPreviewImage(null);
    } catch (e) {
      console.error('Erro ao salvar produto', e);
      if (e instanceof ApiError) {
        if (e.payload && typeof e.payload === 'object' && 'message' in e.payload) {
          setSaveError(String((e.payload as { message?: unknown }).message || 'Falha ao salvar produto.'));
        } else if (typeof e.payload === 'string' && e.payload.trim()) {
          setSaveError(e.payload);
        } else {
          setSaveError(`Falha ao salvar produto (${e.status}).`);
        }
      } else {
        setSaveError('Falha ao salvar produto.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  function toggleTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag]
    }));
  }

  function toggleActive(p: Product) {
    const updated = { ...p, active: !p.active };
    api
      .put<any>(`/admin/produtos/${p.id}`, {
        id: updated.id,
        name: updated.name,
        imageUrl: updated.imageUrl,
        imagePath: updated.imagePath,
        category: updated.category,
        volume: updated.volume,
        price: updated.unitPrice,
        promoPrice: updated.promoPrice,
        stock: updated.stock,
        packQuantity: updated.packQuantity,
        packPrice: updated.packPrice,
        tags: updated.tags,
        active: updated.active
      })
      .then((saved) => {
        setProducts((prev) =>
          prev.map((item) =>
            item.id === saved.id
              ? {
                  ...item,
                  active: typeof saved.active === 'boolean' ? saved.active : item.active
                }
              : item
          )
        );
      })
      .catch((e) => console.error('Erro ao atualizar produto', e));
  }

  async function handleImportCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resultado = await api.post<ImportResult>('/admin/produtos/importar-csv', formData);
      setImportResult(resultado);
      await carregarProdutos();
    } catch (e) {
      console.error('Erro ao importar CSV de produtos', e);
      if (e instanceof ApiError) {
        if (e.payload && typeof e.payload === 'object' && 'message' in e.payload) {
          setImportError(String((e.payload as { message?: unknown }).message || 'Falha ao importar CSV.'));
        } else {
          setImportError(`Falha ao importar CSV (${e.status}).`);
        }
      } else {
        setImportError('Falha ao importar CSV.');
      }
    } finally {
      setIsImporting(false);
    }
  }

  function downloadCsvTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-produtos.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function deleteProduct(p: Product) {
    if (!window.confirm(`Excluir "${p.name}"? Essa ação não pode ser desfeita.`)) return;
    api
      .delete(`/admin/produtos/${p.id}` as any)
      .then(() => {
        setProducts((prev) => prev.filter((item) => item.id !== p.id));
        setSelectedIds((prev) => {
          if (!prev.has(p.id)) return prev;
          const next = new Set(prev);
          next.delete(p.id);
          return next;
        });
      })
      .catch((e) => console.error('Erro ao excluir produto', e));
  }

  function toggleSelectionMode() {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map((p) => p.id));
    });
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Excluir ${selectedIds.size} produto(s) selecionado(s)? Essa ação não pode ser desfeita.`)) {
      return;
    }
    setIsBulkDeleting(true);
    const ids = Array.from(selectedIds);
    try {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/admin/produtos/${id}` as any)));
      const removedIds = ids.filter((_, idx) => results[idx].status === 'fulfilled');
      setProducts((prev) => prev.filter((item) => !removedIds.includes(item.id)));
      setSelectedIds(new Set());
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        console.error(`Falha ao excluir ${failed} produto(s).`);
      }
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <main className="flex-1 bg-gray-50 dark:bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Produtos</h1>
            <p className="text-gray-600 dark:text-zinc-400">{products.length} produtos cadastrados</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="h-11 px-4 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold dark:border-zinc-700 dark:text-zinc-300"
            >
              Baixar modelo CSV
            </button>
            <label className="h-11 px-4 rounded-lg border border-amber-500 text-amber-600 dark:text-amber-400 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer">
              {isImporting ? 'Importando...' : 'Importar CSV'}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={isImporting}
                onChange={handleImportCsv}
              />
            </label>
            <button
              onClick={openNewProduct}
              className="h-11 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span className="text-lg">+</span>
              Novo Produto
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-zinc-500 -mt-3 mb-6">
          Colunas do CSV: <strong>Produto</strong>, <strong>CATEGORIA</strong> e <strong>VALOR</strong> (obrigatórias) — VOLUME,
          PREÇO DO FARDO e ESTOQUE são opcionais.
        </p>

        {(importResult || importError) && (
          <div
            className={`mb-6 rounded-lg border p-4 text-sm ${
              importError
                ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
                : 'border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300'
            }`}
          >
            {importError ? (
              <p>{importError}</p>
            ) : (
              importResult && (
                <div>
                  <p className="font-semibold">
                    Importação concluída: {importResult.criados} criado(s), {importResult.atualizados} atualizado(s)
                    {importResult.erros.length > 0 && `, ${importResult.erros.length} com erro`}.
                  </p>
                  {importResult.erros.length > 0 && (
                    <ul className="mt-2 list-disc list-inside space-y-0.5">
                      {importResult.erros.map((erro, idx) => (
                        <li key={idx}>
                          Linha {erro.linha}: {erro.motivo}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-zinc-500 text-sm">🔍</span>
            <input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-9 pr-3 rounded-lg bg-white border border-gray-300 text-sm text-gray-900 outline-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div className="relative w-full sm:w-56">
            <button className="w-full h-11 px-3 rounded-lg bg-white border border-gray-300 text-sm text-gray-900 flex items-center justify-between dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
              <span>{categoryFilter}</span>
              <span className="text-xs">▼</span>
            </button>
            <div className="hidden" />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center rounded-lg border border-gray-300 dark:border-zinc-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`h-9 px-3 text-sm font-semibold flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-black'
                  : 'bg-white text-gray-700 dark:bg-zinc-900 dark:text-zinc-300'
              }`}
            >
              <span>▦</span> Grade
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`h-9 px-3 text-sm font-semibold flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-amber-500 text-black'
                  : 'bg-white text-gray-700 dark:bg-zinc-900 dark:text-zinc-300'
              }`}
            >
              <span>☰</span> Lista
            </button>
          </div>
          <button
            type="button"
            onClick={toggleSelectionMode}
            className={`h-9 px-4 rounded-lg text-sm font-semibold border ${
              selectionMode
                ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white'
                : 'border-gray-300 text-gray-700 dark:border-zinc-700 dark:text-zinc-300'
            }`}
          >
            {selectionMode ? 'Cancelar seleção' : 'Selecionar'}
          </button>
        </div>

        {selectionMode && (
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900 rounded-lg px-4 py-2.5 mb-4 text-sm">
            <label className="flex items-center gap-2 text-gray-800 dark:text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={filtered.length > 0 && selectedIds.size === filtered.length}
                onChange={toggleSelectAll}
                className="w-4 h-4"
              />
              {selectedIds.size} selecionado(s)
            </label>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0 || isBulkDeleting}
              className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold"
            >
              {isBulkDeleting ? 'Excluindo...' : 'Excluir selecionados'}
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600 dark:text-zinc-500">Nenhum produto encontrado</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((product) => (
              <div
                key={product.id}
                className={`bg-white border rounded-2xl ${
                  selectedIds.has(product.id)
                    ? 'border-amber-500 ring-2 ring-amber-500'
                    : 'border-gray-200 dark:border-zinc-800'
                } dark:bg-zinc-900 ${!product.active ? 'opacity-60' : ''}`}
              >
                <div className="relative h-40 bg-gray-100 dark:bg-zinc-800 rounded-t-2xl overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-zinc-600 text-3xl">🍺</span>
                    </div>
                  )}
                  {selectionMode && (
                    <label className="absolute top-2 left-2 w-6 h-6 rounded bg-white/90 dark:bg-zinc-900/90 flex items-center justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelected(product.id)}
                        className="w-4 h-4"
                      />
                    </label>
                  )}
                  <span
                    className={`absolute top-2 ${selectionMode ? 'left-9' : 'left-2'} px-2 py-0.5 rounded-full text-xs font-semibold ${
                      product.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {product.active ? 'Ativo' : 'Inativo'}
                  </span>
                  {product.stock <= product.minStockAlert && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                      Estoque baixo
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <p className="text-gray-600 dark:text-zinc-500 text-xs mb-1">{product.category}</p>
                  <h3 className="text-gray-900 dark:text-white font-semibold truncate mb-1">{product.name}</h3>
                  <p className="text-gray-600 dark:text-zinc-400 text-sm mb-2">{product.volume}</p>

                  <div className="flex items-baseline gap-2 mb-3">
                    {product.promoPrice ? (
                      <>
                        <span className="text-amber-400 font-bold">R$ {product.promoPrice.toFixed(2)}</span>
                        <span className="text-gray-600 dark:text-zinc-500 line-through text-sm">R$ {product.unitPrice.toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-gray-900 dark:text-white font-bold">R$ {product.unitPrice.toFixed(2)}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-zinc-500 text-sm">Estoque: {product.stock}</span>
                    <div className="relative">
                      <details className="group">
                        <summary className="list-none">
                          <div className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-400">
                            ⋮
                          </div>
                        </summary>
                        <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 py-1 text-sm shadow-lg">
                          <button
                            onClick={() => openEditProduct(product)}
                            className="block w-full text-left px-3 py-1.5 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-zinc-800"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => toggleActive(product)}
                            className="block w-full text-left px-3 py-1.5 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-zinc-800"
                          >
                            {product.active ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            onClick={() => deleteProduct(product)}
                            className="block w-full text-left px-3 py-1.5 text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-zinc-800"
                          >
                            Excluir
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl">
            {filtered.map((product) => (
              <div
                key={product.id}
                className={`flex items-center gap-3 p-3 sm:p-4 ${
                  selectedIds.has(product.id) ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                } ${!product.active ? 'opacity-60' : ''}`}
              >
                {selectionMode && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => toggleSelected(product.id)}
                    className="w-4 h-4 flex-shrink-0"
                  />
                )}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gray-100 dark:bg-zinc-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-zinc-600 text-xl">🍺</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 dark:text-zinc-500 text-xs">
                    {product.category} · {product.volume}
                  </p>
                  <h3 className="text-gray-900 dark:text-white font-semibold truncate">{product.name}</h3>
                  <p className="sm:hidden text-gray-900 dark:text-white text-sm font-bold mt-0.5">
                    R$ {(product.promoPrice ?? product.unitPrice).toFixed(2)}
                  </p>
                </div>
                <div className="hidden sm:block text-right w-24 flex-shrink-0">
                  {product.promoPrice ? (
                    <>
                      <div className="text-amber-500 font-bold text-sm">R$ {product.promoPrice.toFixed(2)}</div>
                      <div className="text-gray-500 dark:text-zinc-500 line-through text-xs">
                        R$ {product.unitPrice.toFixed(2)}
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-900 dark:text-white font-bold text-sm">
                      R$ {product.unitPrice.toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="hidden sm:flex flex-col items-end w-28 flex-shrink-0 text-xs text-gray-600 dark:text-zinc-500">
                  <span>Estoque: {product.stock}</span>
                  {product.stock <= product.minStockAlert && (
                    <span className="text-red-500 font-semibold">Estoque baixo</span>
                  )}
                </div>
                <span
                  className={`hidden md:inline-flex px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                    product.active
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                      : 'bg-red-500/20 text-red-600 dark:text-red-400'
                  }`}
                >
                  {product.active ? 'Ativo' : 'Inativo'}
                </span>
                <div className="relative flex-shrink-0">
                  <details className="group">
                    <summary className="list-none cursor-pointer">
                      <div className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-400">
                        ⋮
                      </div>
                    </summary>
                    <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 py-1 text-sm shadow-lg">
                      <button
                        onClick={() => openEditProduct(product)}
                        className="block w-full text-left px-3 py-1.5 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-zinc-800"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleActive(product)}
                        className="block w-full text-left px-3 py-1.5 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-zinc-800"
                      >
                        {product.active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => deleteProduct(product)}
                        className="block w-full text-left px-3 py-1.5 text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-zinc-800"
                      >
                        Excluir
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setDrawerOpen(false)} />
          <aside className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white border-l border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 z-50 flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-gray-900 dark:text-white font-semibold text-base">
                {editing ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-lg border border-gray-300 text-gray-900 dark:border-zinc-800 dark:text-white"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">Nome *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                  placeholder="Skol Lata 350ml"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full min-h-[80px] rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm text-gray-900 resize-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                  placeholder="Descrição do produto..."
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">Imagem do produto</label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-300 dark:bg-zinc-800 dark:border-zinc-700 flex items-center justify-center overflow-hidden">
                    {previewImage ? (
                      <img src={previewImage} alt={form.name || 'Pré-visualização'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-600 dark:text-zinc-500 text-xs text-center px-1">Prévia</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center justify-center px-3 h-9 rounded-lg bg-gray-100 border border-gray-300 text-xs font-semibold text-gray-700 cursor-pointer dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
                      <span>Selecionar imagem</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/avif,image/svg+xml"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                    <p className="text-[11px] text-gray-600 dark:text-zinc-500">
                      Envie JPG, PNG, WEBP, AVIF ou SVG com ate 5MB. Exemplo recomendado: 800x450.
                    </p>
                    {saveError && <p className="text-[11px] text-red-500">{saveError}</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">Categoria</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                  >
                    <option value="">Selecione</option>
                    {categories.slice(1).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">Volume</label>
                  <input
                    value={form.volume}
                    onChange={(e) => setForm({ ...form, volume: e.target.value })}
                    className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                    placeholder="350ml"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">Preço Unitário *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                    className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">Preço Promocional</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.promoPrice}
                    onChange={(e) => setForm({ ...form, promoPrice: e.target.value })}
                    className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">Qtd. no Fardo</label>
                  <input
                    type="number"
                    value={form.packQuantity}
                    onChange={(e) => setForm({ ...form, packQuantity: e.target.value })}
                    className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                    placeholder="12"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">Preço do Fardo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.packPrice}
                    onChange={(e) => setForm({ ...form, packPrice: e.target.value })}
                    className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">Estoque</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">Alerta Mínimo</label>
                  <input
                    type="number"
                    value={form.minStockAlert}
                    onChange={(e) => setForm({ ...form, minStockAlert: e.target.value })}
                    className="w-full h-10 rounded-lg bg-white border border-gray-300 px-3 text-sm text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">Tags</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['promocao', 'mais_vendido', 'novo', 'destaque'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`h-7 px-3 rounded-full border text-xs flex items-center gap-1 ${
                        form.tags.includes(tag)
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'border-gray-300 text-gray-600 dark:border-zinc-700 dark:text-zinc-400'
                      }`}
                    >
                      <span>#</span>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-zinc-400">Produto ativo</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, active: !form.active })}
                  className={`w-10 h-6 rounded-full flex items-center px-1 ${
                    form.active ? 'bg-amber-500' : 'bg-gray-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
                      form.active ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-zinc-800 flex gap-3">
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 h-10 rounded-lg border border-gray-300 text-gray-700 dark:border-zinc-700 dark:text-zinc-300 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={saveProduct}
                disabled={isSaving}
                className="flex-1 h-10 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold"
              >
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </aside>
        </>
      )}
    </main>
  );
}
