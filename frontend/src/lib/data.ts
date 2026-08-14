export type Category = {
  id: string;
  name: string;
  icon?: string;
  order: number;
};

export type Product = {
  id: string;
  name: string;
  image: string;
  price: number;
  promoPrice?: number;
  stock: number;
  tags?: string[];
  categoryId: string;
  packQuantity?: number;
  packPrice?: number;
};

export type Banner = {
  id: string;
  image: string;
  title?: string;
};

export type StoreSettings = {
  name: string;
  open: boolean;
  phone?: string;
  address?: string;
};

export const categories: Category[] = [
  { id: 'c1', name: 'Cervejas', icon: '🍺', order: 1 },
  { id: 'c2', name: 'Refrigerantes', icon: '🥤', order: 2 },
  { id: 'c3', name: 'Gelos', icon: '🧊', order: 3 },
  { id: 'c4', name: 'Energéticos', icon: '⚡', order: 4 },
  { id: 'c5', name: 'Vinhos', icon: '🍷', order: 5 },
  { id: 'c6', name: 'Destilados', icon: '🥃', order: 6 },
  { id: 'c7', name: 'Combos', icon: '🎁', order: 7 },
  { id: 'c8', name: 'Petiscos', icon: '🍟', order: 8 },
  { id: 'c9', name: 'Gin', icon: '🍸', order: 9 },
  { id: 'c10', name: 'Whisky', icon: '🥃', order: 10 },
  { id: 'c11', name: 'Diversos', icon: '📦', order: 11 },
  { id: 'c12', name: 'Outros', icon: '🍹', order: 12 }
];

export const products: Product[] = [];

export const banners: Banner[] = [
  { id: 'b1', image: '/dil-bebidas-logo.svg', title: 'Promoções da Semana' },
  { id: 'b2', image: '/dil-bebidas-logo.svg', title: 'Mais Vendidos' },
  { id: 'b3', image: '/dil-bebidas-logo.svg', title: 'Combos Especiais' }
];

export const store: StoreSettings = {
  name: 'Dil Bebidas',
  open: true,
  phone: '(82) 99310-7309',
  address: 'Rua das Bebidas, 123'
};
