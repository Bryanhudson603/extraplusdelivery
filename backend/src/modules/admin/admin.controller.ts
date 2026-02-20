import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { listarProdutos, salvarProduto, excluirProduto, type ProdutoLoja } from '../catalogo/catalogo.store';
import { pedidosStore, type Pedido } from '../pedidos/pedidos.store';
import { cuponsStore, cuponsClientesStore, type Cupom } from '../cupons/cupons.store';
import { clientesCarteiraStore, type ClienteCarteira } from '../carteira/carteira.store';

type ProdutoMaisVendido = {
  nome: string;
  quantidade: number;
};

type PedidoEmAndamento = {
  id: string;
  cliente: string;
  valor: number;
  status: string;
};

type EstoqueBaixo = {
  nome: string;
  estoque: number;
};

type ClienteRecorrente = {
  nome: string;
  pedidos: number;
};

type ClienteLoja = {
  id: string;
  nome: string;
  telefone?: string;
  endereco?: string;
  ultimoPedidoEm: string;
  totalPedidos: number;
  valorTotal: number;
  saldoCarteira: number;
};

type ClienteAdminOverride = {
  id: string;
  nome?: string;
  telefone?: string;
  endereco?: string;
};

type ClientePedidoResumo = {
  id: string;
  total: number;
  status: string;
  createdAt: string;
};

// cupons types and stores moved to shared store

type Dashboard = {
  vendasHoje: number;
  ticketMedio: number;
  pedidosHoje: number;
  clientesHoje: number;
  produtosMaisVendidos: ProdutoMaisVendido[];
  pedidosEmAndamento: PedidoEmAndamento[];
  estoqueBaixo: EstoqueBaixo[];
  clientesRecorrentes: ClienteRecorrente[];
};


const clientesOverridesStore: ClienteAdminOverride[] = [];
 

@Controller('admin')
export class AdminController {
  @Get('dashboard')
  dashboard(): Dashboard {
    const pedidosHoje = pedidosStore.filter(p => p.status !== 'cancelado');
    const pedidosFinalizadosHoje = pedidosHoje.filter(p => p.status === 'finalizado');
    const vendasHoje = pedidosFinalizadosHoje.reduce((sum, p) => sum + p.total, 0);
    const pedidosHojeCount = pedidosHoje.length;
    const ticketMedio = pedidosHojeCount > 0 ? vendasHoje / pedidosHojeCount : 0;

    const pedidosEmAndamento = pedidosStore
      .filter(p => p.status !== 'finalizado' && p.status !== 'cancelado')
      .map<PedidoEmAndamento>(p => ({
        id: p.id,
        cliente: p.clienteNome || p.clienteTelefone || 'Cliente',
        valor: p.total,
        status: p.status
      }));

    const estoque = listarProdutos('pc-bebidas');
    const estoqueBaixo = estoque
      .filter(p => p.active && p.stock <= 5)
      .map<EstoqueBaixo>(p => ({
        nome: p.name,
        estoque: p.stock
      }));

    const mapaClientes: Record<string, ClienteRecorrente> = {};
    for (const p of pedidosHoje) {
      const chave = p.clienteId || p.clienteTelefone;
      if (!chave) continue;
      const nome = p.clienteNome || p.clienteTelefone || 'Cliente';
      if (!mapaClientes[chave]) {
        mapaClientes[chave] = { nome, pedidos: 0 };
      }
      mapaClientes[chave].pedidos += 1;
    }
    const clientesRecorrentes = Object.values(mapaClientes).sort(
      (a, b) => b.pedidos - a.pedidos
    );

    const mapaProdutos: Record<string, number> = {};
    for (const p of pedidosHoje as Pedido[]) {
      for (const item of p.items) {
        mapaProdutos[item.name] = (mapaProdutos[item.name] || 0) + item.quantity;
      }
    }
    const produtosMaisVendidos = Object.entries(mapaProdutos)
      .map<ProdutoMaisVendido>(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);

    return {
      vendasHoje,
      ticketMedio,
      pedidosHoje: pedidosHojeCount,
      clientesHoje: clientesRecorrentes.length,
      produtosMaisVendidos,
      pedidosEmAndamento,
      estoqueBaixo,
      clientesRecorrentes
    };
  }
 
  @Get('relatorios/dias')
  relatorioDias(): Array<{ dia: string; vendas: number; pedidos: number; ticketMedio: number }> {
    const agoraMs = Date.now();
    const trintaDiasMs = 30 * 24 * 60 * 60 * 1000;
    const mapa: Record<string, { vendas: number; pedidos: number }> = {};
    for (const p of pedidosStore as Pedido[]) {
      const dataPedido = new Date(p.createdAt).getTime();
      if (agoraMs - dataPedido > trintaDiasMs) continue;
      const dia = new Date(p.createdAt).toISOString().slice(0, 10);
      if (!mapa[dia]) {
        mapa[dia] = { vendas: 0, pedidos: 0 };
      }
      if (p.status !== 'cancelado') {
        mapa[dia].pedidos += 1;
      }
      if (p.status === 'finalizado') {
        mapa[dia].vendas = Number((mapa[dia].vendas + p.total).toFixed(2));
      }
    }
    const lista = Object.entries(mapa)
      .map(([dia, v]) => {
        const ticketMedio = v.pedidos > 0 ? Number((v.vendas / v.pedidos).toFixed(2)) : 0;
        return { dia, vendas: v.vendas, pedidos: v.pedidos, ticketMedio };
      })
      .sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0));
    return lista;
  }

  @Get('clientes')
  listarClientes(): ClienteLoja[] {
    const mapa: Record<string, ClienteLoja> = {};

    for (const p of pedidosStore as Pedido[]) {
      const chave = p.clienteId || p.clienteTelefone;
      if (!chave) continue;
      const existente = mapa[chave];
      const valor = p.total;
      const data = p.createdAt;
      if (!existente) {
        const override = clientesOverridesStore.find(c => c.id === chave);
        const carteira = clientesCarteiraStore.find(c => c.id === chave);
        mapa[chave] = {
          id: chave,
          nome: override?.nome || p.clienteNome || 'Cliente',
          telefone: override?.telefone || p.clienteTelefone,
          endereco: override?.endereco || p.clienteEndereco,
          ultimoPedidoEm: data,
          totalPedidos: 1,
          valorTotal: valor,
          saldoCarteira: carteira?.saldo ?? 0
        };
      } else {
        existente.totalPedidos += 1;
        existente.valorTotal += valor;
        if (new Date(data).getTime() > new Date(existente.ultimoPedidoEm).getTime()) {
          existente.ultimoPedidoEm = data;
        }
      }
    }

    return Object.values(mapa).sort(
      (a, b) => new Date(b.ultimoPedidoEm).getTime() - new Date(a.ultimoPedidoEm).getTime()
    );
  }

  @Get('clientes/:id')
  obterCliente(@Param('id') id: string): ClienteLoja | null {
    const lista = this.listarClientes();
    const encontrado = lista.find(c => c.id === id);
    if (encontrado) {
      return encontrado;
    }
    const carteira = clientesCarteiraStore.find(c => c.id === id);
    const override = clientesOverridesStore.find(c => c.id === id);
    if (!override && !carteira) {
      return null;
    }
    const agora = new Date().toISOString();
    return {
      id,
      nome: override?.nome || 'Cliente',
      telefone: override?.telefone,
      endereco: override?.endereco,
      ultimoPedidoEm: agora,
      totalPedidos: 0,
      valorTotal: 0,
      saldoCarteira: carteira?.saldo ?? 0
    };
  }

  @Put('clientes/:id')
  atualizarCliente(
    @Param('id') id: string,
    @Body()
    body: {
      nome?: string;
      telefone?: string;
      endereco?: string;
    }
  ): ClienteLoja | null {
    const chave = String(id);
    let existente = clientesOverridesStore.find(c => c.id === chave);
    if (!existente) {
      existente = { id: chave };
      clientesOverridesStore.push(existente);
    }
    if (body.nome !== undefined) {
      existente.nome = String(body.nome);
    }
    if (body.telefone !== undefined) {
      existente.telefone = String(body.telefone);
    }
    if (body.endereco !== undefined) {
      existente.endereco = String(body.endereco);
    }
    return this.obterCliente(chave);
  }

  @Post('clientes/:id/carteira')
  adicionarSaldoCarteira(
    @Param('id') id: string,
    @Body() body: { valor: number }
  ): { id: string; saldoCarteira: number } {
    const chave = String(id);
    const valor = Number(body.valor);
    if (!Number.isFinite(valor) || valor <= 0) {
      const existente = clientesCarteiraStore.find(c => c.id === chave);
      return { id: chave, saldoCarteira: existente?.saldo ?? 0 };
    }
    let carteira = clientesCarteiraStore.find(c => c.id === chave);
    if (!carteira) {
      carteira = { id: chave, saldo: 0 };
      clientesCarteiraStore.push(carteira);
    }
    carteira.saldo = Number((carteira.saldo + valor).toFixed(2));
    return { id: chave, saldoCarteira: carteira.saldo };
  }

  @Get('clientes/:id/pedidos')
  listarPedidosCliente(@Param('id') id: string): ClientePedidoResumo[] {
    const pedidosCliente = (pedidosStore as Pedido[]).filter(
      p => p.clienteId === id || p.clienteTelefone === id
    );

    return pedidosCliente
      .slice()
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .map<ClientePedidoResumo>(p => ({
        id: p.id,
        total: p.total,
        status: p.status,
        createdAt: p.createdAt
      }));
  }

  @Get('produtos')
  listarProdutosAdmin(): ProdutoLoja[] {
    return listarProdutos('pc-bebidas');
  }

  @Get('cupons')
  listarCupons(): Cupom[] {
    return cuponsStore.slice().sort((a, b) => {
      const aTime = a.validoDe ? new Date(a.validoDe).getTime() : 0;
      const bTime = b.validoDe ? new Date(b.validoDe).getTime() : 0;
      return bTime - aTime;
    });
  }

  @Post('cupons')
  criarCupom(
    @Body()
    body: {
      nome: string;
      codigo: string;
      validoDe?: string;
      validoAte?: string;
      usosPorCliente?: number;
      quantidadeTotal?: number;
      ativo?: boolean;
      descontoPercentual?: number;
    }
  ): Cupom {
    const codigo = String(body.codigo || '').trim().toUpperCase();
    const nome = String(body.nome || '').trim();
    const validoDe = body.validoDe ? new Date(body.validoDe).toISOString() : undefined;
    const validoAte = body.validoAte ? new Date(body.validoAte).toISOString() : undefined;
    const usosPorCliente = typeof body.usosPorCliente === 'number' ? body.usosPorCliente : undefined;
    const quantidadeTotal =
      typeof body.quantidadeTotal === 'number' && body.quantidadeTotal > 0
        ? Math.floor(body.quantidadeTotal)
        : undefined;
    const ativo = body.ativo !== false;
    const descontoPercentual =
      typeof body.descontoPercentual === 'number' && body.descontoPercentual > 0
        ? Number(body.descontoPercentual)
        : undefined;

    const existente = cuponsStore.find(c => c.codigo === codigo);
    if (existente) {
      return existente;
    }

    const novo: Cupom = {
      id: `cupom-${cuponsStore.length + 1}-${Date.now()}`,
      nome,
      codigo,
      validoDe,
      validoAte,
      usosPorCliente,
      quantidadeTotal,
      quantidadeRestante: quantidadeTotal,
      ativo,
      descontoPercentual
    };
    cuponsStore.unshift(novo);
    return novo;
  }

  @Post('cupons/:codigo/enviar')
  enviarCupomParaClientes(
    @Param('codigo') codigoParam: string,
    @Body()
    body: { clientes: string[] }
  ): { codigo: string; enviados: number } {
    const codigo = String(codigoParam || '').trim().toUpperCase();
    const cupom = cuponsStore.find(c => c.codigo === codigo);
    if (!cupom || !cupom.ativo) {
      return { codigo, enviados: 0 };
    }
    const lista = Array.isArray(body.clientes) ? body.clientes.map(String) : [];
    let enviados = 0;
    for (const id of lista) {
      if (cupom.quantidadeRestante != null && cupom.quantidadeRestante <= 0) {
        break;
      }
      const chaves = new Set<string>([id]);
      const pedidosRelacionados = (pedidosStore as Pedido[]).filter(
        p => p.clienteId === id || p.clienteTelefone === id
      );
      for (const p of pedidosRelacionados) {
        if (p.clienteId) chaves.add(p.clienteId);
        if (p.clienteTelefone) chaves.add(p.clienteTelefone);
      }
      for (const chave of chaves) {
        const jaTem = cuponsClientesStore.find(cc => cc.codigo === codigo && cc.clienteId === chave);
        if (jaTem) continue;
        cuponsClientesStore.push({ codigo, clienteId: chave, usos: 0 });
        enviados += 1;
        if (cupom.quantidadeRestante != null) {
          cupom.quantidadeRestante = Math.max(0, cupom.quantidadeRestante - 1);
          if (cupom.quantidadeRestante <= 0) break;
        }
      }
    }
    return { codigo, enviados };
  }

  @Get('clientes/:id/cupons')
  listarCuponsDoCliente(@Param('id') id: string): Array<{
    id: string;
    nome: string;
    codigo: string;
    validoDe?: string;
    validoAte?: string;
    descontoPercentual?: number;
    usosPorCliente?: number;
    usosConsumidos: number;
    disponivel: boolean;
  }> {
    const atribuicoes = cuponsClientesStore.filter(
      cc => cc.clienteId === id
    );
    const agora = Date.now();
    return atribuicoes
      .map(cc => {
        const cupom = cuponsStore.find(c => c.codigo === cc.codigo);
        if (!cupom) {
          return {
            id: `cupom-${cc.codigo}`,
            nome: cc.codigo,
            codigo: cc.codigo,
            usosConsumidos: cc.usos,
            disponivel: false
          };
        }
        const dentroJanela =
          (!cupom.validoDe || new Date(cupom.validoDe).getTime() <= agora) &&
          (!cupom.validoAte || new Date(cupom.validoAte).getTime() >= agora);
        const usosOk =
          cupom.usosPorCliente == null || cc.usos < cupom.usosPorCliente;
        const disponivel = cupom.ativo && dentroJanela && usosOk;
        return {
          id: cupom.id,
          nome: cupom.nome,
          codigo: cupom.codigo,
          validoDe: cupom.validoDe,
          validoAte: cupom.validoAte,
          descontoPercentual: cupom.descontoPercentual,
          usosPorCliente: cupom.usosPorCliente,
          usosConsumidos: cc.usos,
          disponivel
        };
      })
      .sort((a, b) => (a.disponivel === b.disponivel ? 0 : a.disponivel ? -1 : 1));
  }
  @Post('produtos')
  criarOuAtualizarProduto(@Body() body: any): ProdutoLoja {
    const produto: ProdutoLoja = {
      id: String(body.id || `p-${Date.now()}`),
      name: String(body.name || ''),
      price: Number(body.unitPrice ?? body.price ?? 0),
      promoPrice: body.promoPrice != null ? Number(body.promoPrice) : undefined,
      stock: Number(body.stock ?? 0),
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      active: typeof body.active === 'boolean' ? body.active : true,
      imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
      category: body.category ? String(body.category) : undefined,
      volume: body.volume ? String(body.volume) : undefined,
      packQuantity: body.packQuantity != null ? Number(body.packQuantity) : undefined,
      packPrice: body.packPrice != null ? Number(body.packPrice) : undefined
    };
    return salvarProduto('pc-bebidas', produto);
  }

  @Put('produtos/:id')
  atualizarProduto(@Param('id') id: string, @Body() body: any): ProdutoLoja {
    const produto: ProdutoLoja = {
      id,
      name: String(body.name || ''),
      price: Number(body.unitPrice ?? body.price ?? 0),
      promoPrice: body.promoPrice != null ? Number(body.promoPrice) : undefined,
      stock: Number(body.stock ?? 0),
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      active: typeof body.active === 'boolean' ? body.active : true,
      imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
      category: body.category ? String(body.category) : undefined,
      volume: body.volume ? String(body.volume) : undefined,
      packQuantity: body.packQuantity != null ? Number(body.packQuantity) : undefined,
      packPrice: body.packPrice != null ? Number(body.packPrice) : undefined
    };
    return salvarProduto('pc-bebidas', produto);
  }

  @Delete('produtos/:id')
  removerProduto(@Param('id') id: string): { ok: boolean } {
    excluirProduto('pc-bebidas', id);
    return { ok: true };
  }
}
