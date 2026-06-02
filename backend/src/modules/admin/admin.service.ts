import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { resolveLojaId } from '../../common/resolve-loja-id';
import { ClienteCarteiraEntity } from '../../entities/clienteCarteira.entity';
import { LojaRepository } from '../../repositories/loja.repository';
import { PedidoRepository } from '../../repositories/pedido.repository';
import { ProdutoRepository } from '../../repositories/produto.repository';
import { CupomClienteRepository } from '../../repositories/cupom-cliente.repository';
import { CupomRepository } from '../../repositories/cupom.repository';
import { ClienteCarteiraRepository } from '../../repositories/cliente-carteira.repository';
import type { PedidoEntity } from '../../entities/pedido.entity';
import { ProdutoEntity } from '../../entities/produto.entity';
import { CupomEntity } from '../../entities/cupom.entity';
import { CupomClienteEntity } from '../../entities/cupomCliente.entity';

type ProdutoMaisVendido = { nome: string; quantidade: number };
type PedidoEmAndamento = { id: string; cliente: string; valor: number; status: string };
type EstoqueBaixo = { nome: string; estoque: number };
type ClienteRecorrente = { nome: string; pedidos: number };

type Cupom = {
  id: string;
  nome: string;
  codigo: string;
  validoDe?: string;
  validoAte?: string;
  usosPorCliente?: number;
  quantidadeTotal?: number;
  quantidadeRestante?: number;
  ativo: boolean;
  descontoPercentual?: number;
};

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

type ClientePedidoResumo = { id: string; total: number; status: string; createdAt: string };

type ClienteAdminOverride = {
  id: string;
  nome?: string;
  telefone?: string;
  endereco?: string;
};

@Injectable()
export class AdminService {
  private readonly clientesOverridesStore: ClienteAdminOverride[] = [];

  constructor(
    private readonly lojaRepo: LojaRepository,
    private readonly pedidoRepo: PedidoRepository,
    private readonly produtoRepo: ProdutoRepository,
    private readonly cupomRepo: CupomRepository,
    private readonly cupomClienteRepo: CupomClienteRepository,
    private readonly carteiraRepo: ClienteCarteiraRepository
  ) {}

  private getOverride(id: string): ClienteAdminOverride | undefined {
    return this.clientesOverridesStore.find(c => c.id === id);
  }

  private upsertOverride(id: string, patch: { nome?: string; telefone?: string; endereco?: string }) {
    let existente = this.getOverride(id);
    if (!existente) {
      existente = { id };
      this.clientesOverridesStore.push(existente);
    }
    if (patch.nome !== undefined) existente.nome = String(patch.nome);
    if (patch.telefone !== undefined) existente.telefone = String(patch.telefone);
    if (patch.endereco !== undefined) existente.endereco = String(patch.endereco);
    return existente;
  }

  private produtoToAdminDto(p: ProdutoEntity) {
    return {
      id: p.id,
      name: p.nome,
      price: Number(p.preco ?? 0),
      promoPrice: p.precoPromocional != null ? Number(p.precoPromocional) : undefined,
      stock: Number(p.estoqueAtual ?? 0),
      tags: Array.isArray(p.tags) ? p.tags : [],
      active: p.ativo !== false,
      imageUrl: p.imageUrl || undefined,
      category: p.categoriaNome || undefined,
      volume: p.volume || undefined,
      packQuantity: p.packQuantity != null ? Number(p.packQuantity) : undefined,
      packPrice: p.packPrice != null ? Number(p.packPrice) : undefined
    };
  }

  private pedidoClienteKey(p: PedidoEntity): string | null {
    return p.clienteId || p.clienteTelefone || null;
  }

  private async assertClienteKeyBelongsToLoja(lojaId: string, clienteKey: string): Promise<void> {
    const key = String(clienteKey || '').trim();
    if (!key) {
      throw new ForbiddenException();
    }
    const [temPedido, temCarteira, temCupom] = await Promise.all([
      this.pedidoRepo.existsClienteKeyInLoja(lojaId, key),
      this.carteiraRepo.findByKey(lojaId, key).then(v => !!v),
      this.cupomClienteRepo.existsByClienteKey(lojaId, key)
    ]);
    if (!temPedido && !temCarteira && !temCupom) {
      // MULTI TENANT SECURITY CHECK
      throw new ForbiddenException();
    }
  }

  private cupomToDto(c: CupomEntity): Cupom {
    return {
      id: c.id,
      nome: c.nome,
      codigo: c.codigo,
      validoDe: c.validoDe ? c.validoDe.toISOString() : undefined,
      validoAte: c.validoAte ? c.validoAte.toISOString() : undefined,
      usosPorCliente: c.usosPorCliente != null ? Number(c.usosPorCliente) : undefined,
      quantidadeTotal: c.quantidadeTotal != null ? Number(c.quantidadeTotal) : undefined,
      quantidadeRestante: c.quantidadeRestante != null ? Number(c.quantidadeRestante) : undefined,
      ativo: c.ativo !== false,
      descontoPercentual: c.descontoPercentual != null ? Number(c.descontoPercentual) : undefined
    };
  }

  async dashboard(req: { headers?: Record<string, unknown> }): Promise<Dashboard> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) {
      return {
        vendasHoje: 0,
        ticketMedio: 0,
        pedidosHoje: 0,
        clientesHoje: 0,
        produtosMaisVendidos: [],
        pedidosEmAndamento: [],
        estoqueBaixo: [],
        clientesRecorrentes: []
      };
    }

    const pedidos = await this.pedidoRepo.listByLoja(lojaId);
    const pedidosValidos = pedidos.filter(p => p.status !== 'cancelado');
    const pedidosFinalizados = pedidosValidos.filter(p => p.status === 'finalizado');
    const vendasHoje = pedidosFinalizados.reduce((sum, p) => sum + Number(p.total), 0);
    const pedidosHojeCount = pedidosValidos.length;
    const ticketMedio = pedidosHojeCount > 0 ? vendasHoje / pedidosHojeCount : 0;

    const pedidosEmAndamento = pedidosValidos
      .filter(p => p.status !== 'finalizado' && p.status !== 'cancelado')
      .map<PedidoEmAndamento>(p => ({
        id: p.id,
        cliente: p.clienteNome || p.clienteTelefone || 'Cliente',
        valor: Number(p.total),
        status: p.status
      }));

    const estoque = await this.produtoRepo.listAllByLoja(lojaId);
    const estoqueBaixo = estoque
      .filter(p => p.ativo && p.estoqueAtual <= 5)
      .map<EstoqueBaixo>(p => ({
        nome: p.nome,
        estoque: p.estoqueAtual
      }));

    const mapaClientes: Record<string, ClienteRecorrente> = {};
    for (const p of pedidosValidos) {
      const chave = this.pedidoClienteKey(p);
      if (!chave) continue;
      const nome = p.clienteNome || p.clienteTelefone || 'Cliente';
      if (!mapaClientes[chave]) {
        mapaClientes[chave] = { nome, pedidos: 0 };
      }
      mapaClientes[chave].pedidos += 1;
    }
    const clientesRecorrentes = Object.values(mapaClientes).sort((a, b) => b.pedidos - a.pedidos);

    const mapaProdutos: Record<string, number> = {};
    for (const p of pedidosValidos) {
      for (const item of p.itens || []) {
        mapaProdutos[item.nomeProduto] = (mapaProdutos[item.nomeProduto] || 0) + item.quantidade;
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

  async relatorioDias(req: { headers?: Record<string, unknown> }) {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) return [];
    const pedidos = await this.pedidoRepo.listByLoja(lojaId);
    const agoraMs = Date.now();
    const trintaDiasMs = 30 * 24 * 60 * 60 * 1000;
    const mapa: Record<string, { vendas: number; pedidos: number }> = {};

    for (const p of pedidos) {
      const dataPedido = p.criadoEm.getTime();
      if (agoraMs - dataPedido > trintaDiasMs) continue;
      const dia = p.criadoEm.toISOString().slice(0, 10);
      if (!mapa[dia]) {
        mapa[dia] = { vendas: 0, pedidos: 0 };
      }
      if (p.status !== 'cancelado') {
        mapa[dia].pedidos += 1;
      }
      if (p.status === 'finalizado') {
        mapa[dia].vendas = Number((mapa[dia].vendas + Number(p.total)).toFixed(2));
      }
    }

    return Object.entries(mapa)
      .map(([dia, v]) => {
        const ticketMedio = v.pedidos > 0 ? Number((v.vendas / v.pedidos).toFixed(2)) : 0;
        return { dia, vendas: v.vendas, pedidos: v.pedidos, ticketMedio };
      })
      .sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0));
  }

  async listarClientes(req: { headers?: Record<string, unknown> }): Promise<ClienteLoja[]> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) return [];
    const [pedidos, carteiras] = await Promise.all([
      this.pedidoRepo.listByLoja(lojaId),
      this.carteiraRepo.listByLoja(lojaId)
    ]);
    const carteiraMap: Record<string, number> = {};
    for (const c of carteiras) {
      carteiraMap[c.clienteKey] = Number(c.saldo);
    }

    const mapa: Record<string, ClienteLoja> = {};
    for (const p of pedidos) {
      const chave = this.pedidoClienteKey(p);
      if (!chave) continue;
      const existente = mapa[chave];
      const valor = Number(p.total);
      const data = p.criadoEm.toISOString();
      if (!existente) {
        const override = this.getOverride(chave);
        mapa[chave] = {
          id: chave,
          nome: override?.nome || p.clienteNome || p.clienteTelefone || 'Cliente',
          telefone: override?.telefone || p.clienteTelefone || undefined,
          endereco: override?.endereco || p.clienteEndereco || undefined,
          ultimoPedidoEm: data,
          totalPedidos: 1,
          valorTotal: valor,
          saldoCarteira: carteiraMap[chave] ?? 0
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

  async obterCliente(req: { headers?: Record<string, unknown> }, id: string): Promise<ClienteLoja | null> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) return null;
    const lista = await this.listarClientes(req);
    const encontrado = lista.find(c => c.id === id);
    if (encontrado) return encontrado;

    const carteira = await this.carteiraRepo.findByKey(lojaId, id);
    const override = this.getOverride(id);
    if (!override && !carteira) return null;
    const agora = new Date().toISOString();
    return {
      id,
      nome: override?.nome || 'Cliente',
      telefone: override?.telefone,
      endereco: override?.endereco,
      ultimoPedidoEm: agora,
      totalPedidos: 0,
      valorTotal: 0,
      saldoCarteira: carteira ? Number(carteira.saldo) : 0
    };
  }

  async atualizarCliente(req: { headers?: Record<string, unknown> }, id: string, body: any): Promise<ClienteLoja | null> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) throw new ForbiddenException();
    await this.assertClienteKeyBelongsToLoja(lojaId, String(id));
    this.upsertOverride(String(id), {
      nome: body?.nome,
      telefone: body?.telefone,
      endereco: body?.endereco
    });
    return this.obterCliente(req, String(id));
  }

  async adicionarSaldoCarteira(
    req: { headers?: Record<string, unknown> },
    id: string,
    body: { valor: number }
  ): Promise<{ id: string; saldoCarteira: number }> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) throw new ForbiddenException();
    const chave = String(id);
    await this.assertClienteKeyBelongsToLoja(lojaId, chave);
    const valor = Number(body.valor);
    if (!Number.isFinite(valor) || valor <= 0) {
      const existente = await this.carteiraRepo.findByKey(lojaId, chave);
      return { id: chave, saldoCarteira: existente ? Number(existente.saldo) : 0 };
    }
    let carteira = await this.carteiraRepo.findByKey(lojaId, chave);
    if (!carteira) {
      carteira = new ClienteCarteiraEntity();
      carteira.lojaId = lojaId;
      carteira.clienteKey = chave;
      carteira.saldo = '0.00';
    }
    carteira.saldo = Number((Number(carteira.saldo) + valor).toFixed(2)).toFixed(2);
    const salvo = await this.carteiraRepo.save(carteira);
    return { id: chave, saldoCarteira: Number(salvo.saldo) };
  }

  async listarPedidosCliente(req: { headers?: Record<string, unknown> }, id: string): Promise<ClientePedidoResumo[]> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) throw new ForbiddenException();
    await this.assertClienteKeyBelongsToLoja(lojaId, String(id));
    const pedidos = await this.pedidoRepo.listByLoja(lojaId);
    const pedidosCliente = pedidos.filter(p => p.clienteId === id || p.clienteTelefone === id);
    return pedidosCliente
      .slice()
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
      .map<ClientePedidoResumo>(p => ({
        id: p.id,
        total: Number(p.total),
        status: p.status,
        createdAt: p.criadoEm.toISOString()
      }));
  }

  async listarProdutos(req: { headers?: Record<string, unknown> }) {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) return [];
    const produtos = await this.produtoRepo.listAllByLoja(lojaId);
    return produtos.map(p => this.produtoToAdminDto(p));
  }

  async listarCupons(req: { headers?: Record<string, unknown> }): Promise<Cupom[]> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) return [];
    const cupons = await this.cupomRepo.listByLoja(lojaId);
    return cupons
      .map(c => this.cupomToDto(c))
      .sort((a, b) => {
        const aTime = a.validoDe ? new Date(a.validoDe).getTime() : 0;
        const bTime = b.validoDe ? new Date(b.validoDe).getTime() : 0;
        return bTime - aTime;
      });
  }

  async criarCupom(req: { headers?: Record<string, unknown> }, body: any): Promise<Cupom> {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) {
      throw new BadRequestException('Nenhuma loja ativa disponível.');
    }

    const codigo = String(body.codigo || '').trim().toUpperCase();
    const nome = String(body.nome || '').trim();
    const validoDe = body.validoDe ? new Date(body.validoDe) : null;
    const validoAte = body.validoAte ? new Date(body.validoAte) : null;
    const usosPorCliente = typeof body.usosPorCliente === 'number' ? Math.floor(body.usosPorCliente) : null;
    const quantidadeTotal =
      typeof body.quantidadeTotal === 'number' && body.quantidadeTotal > 0 ? Math.floor(body.quantidadeTotal) : null;
    const ativo = body.ativo !== false;
    const descontoPercentual =
      typeof body.descontoPercentual === 'number' && body.descontoPercentual > 0 ? Number(body.descontoPercentual) : null;

    const existente = await this.cupomRepo.findByCodigo(lojaId, codigo);
    if (existente) return this.cupomToDto(existente);

    const novo = new CupomEntity();
    novo.id = `cupom-${Date.now()}`;
    novo.lojaId = lojaId;
    novo.nome = nome;
    novo.codigo = codigo;
    novo.validoDe = validoDe;
    novo.validoAte = validoAte;
    novo.usosPorCliente = usosPorCliente;
    novo.quantidadeTotal = quantidadeTotal;
    novo.quantidadeRestante = quantidadeTotal;
    novo.ativo = ativo;
    novo.descontoPercentual = descontoPercentual != null ? descontoPercentual.toFixed(2) : null;

    const salvo = await this.cupomRepo.save(novo);
    return this.cupomToDto(salvo);
  }

  async enviarCupomParaClientes(
    req: { headers?: Record<string, unknown> },
    codigoParam: string,
    body: { clientes: string[] }
  ) {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) throw new ForbiddenException();

    const codigo = String(codigoParam || '').trim().toUpperCase();
    const cupom = await this.cupomRepo.findByCodigo(lojaId, codigo);
    if (!cupom || !cupom.ativo) {
      return { codigo, enviados: 0 };
    }

    const lista = Array.isArray(body.clientes) ? body.clientes.map(String) : [];
    let enviados = 0;
    const pedidos = await this.pedidoRepo.listByLoja(lojaId);

    for (const id of lista) {
      if (cupom.quantidadeRestante != null && cupom.quantidadeRestante <= 0) break;
      await this.assertClienteKeyBelongsToLoja(lojaId, String(id));
      const chaves = new Set<string>([id]);
      const pedidosRelacionados = pedidos.filter(p => p.clienteId === id || p.clienteTelefone === id);
      for (const p of pedidosRelacionados) {
        if (p.clienteId) chaves.add(p.clienteId);
        if (p.clienteTelefone) chaves.add(p.clienteTelefone);
      }

      for (const chave of chaves) {
        const jaTem = await this.cupomClienteRepo.findByClienteKey(lojaId, codigo, chave);
        if (jaTem) continue;

        const atrib = new CupomClienteEntity();
        atrib.id = randomUUID();
        atrib.lojaId = lojaId;
        atrib.codigo = codigo;
        atrib.clienteKey = chave;
        atrib.usos = 0;
        await this.cupomClienteRepo.save(atrib);

        enviados += 1;
        if (cupom.quantidadeRestante != null) {
          cupom.quantidadeRestante = Math.max(0, cupom.quantidadeRestante - 1);
          if (cupom.quantidadeRestante <= 0) break;
        }
      }
    }

    await this.cupomRepo.save(cupom);
    return { codigo, enviados };
  }

  async listarCuponsDoCliente(req: { headers?: Record<string, unknown> }, id: string) {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) throw new ForbiddenException();
    await this.assertClienteKeyBelongsToLoja(lojaId, String(id));

    const [atribuicoes, cupons] = await Promise.all([
      this.cupomClienteRepo.listByClienteKey(lojaId, id),
      this.cupomRepo.listByLoja(lojaId)
    ]);
    const cupomPorCodigo: Record<string, CupomEntity> = {};
    for (const c of cupons) cupomPorCodigo[c.codigo] = c;

    const agora = Date.now();
    return atribuicoes
      .map(cc => {
        const cupom = cupomPorCodigo[cc.codigo];
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
          (!cupom.validoDe || cupom.validoDe.getTime() <= agora) &&
          (!cupom.validoAte || cupom.validoAte.getTime() >= agora);
        const usosOk = cupom.usosPorCliente == null || cc.usos < cupom.usosPorCliente;
        const disponivel = cupom.ativo && dentroJanela && usosOk;
        return {
          id: cupom.id,
          nome: cupom.nome,
          codigo: cupom.codigo,
          validoDe: cupom.validoDe ? cupom.validoDe.toISOString() : undefined,
          validoAte: cupom.validoAte ? cupom.validoAte.toISOString() : undefined,
          descontoPercentual: cupom.descontoPercentual != null ? Number(cupom.descontoPercentual) : undefined,
          usosPorCliente: cupom.usosPorCliente != null ? Number(cupom.usosPorCliente) : undefined,
          usosConsumidos: cc.usos,
          disponivel
        };
      })
      .sort((a, b) => (a.disponivel === b.disponivel ? 0 : a.disponivel ? -1 : 1));
  }

  async criarOuAtualizarProduto(req: { headers?: Record<string, unknown> }, body: any) {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) {
      throw new BadRequestException('Nenhuma loja ativa disponível.');
    }

    const id = String(body.id || `p-${Date.now()}`);
    let produto = await this.produtoRepo.findById(id);
    if (produto && produto.lojaId !== lojaId) {
      // MULTI TENANT SECURITY CHECK
      throw new ForbiddenException();
    }

    const p = produto || new ProdutoEntity();
    p.id = id;
    p.lojaId = lojaId;
    p.nome = String(body.name || '');
    p.categoriaNome = body.category ? String(body.category) : null;
    p.preco = Number(body.unitPrice ?? body.price ?? 0).toFixed(2);
    p.precoPromocional = body.promoPrice != null ? Number(body.promoPrice).toFixed(2) : null;
    p.estoqueAtual = Number(body.stock ?? 0);
    p.tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
    p.ativo = typeof body.active === 'boolean' ? body.active : true;
    p.imageUrl = body.imageUrl ? String(body.imageUrl) : null;
    p.volume = body.volume ? String(body.volume) : null;
    p.packQuantity = body.packQuantity != null ? Number(body.packQuantity) : null;
    p.packPrice = body.packPrice != null ? Number(body.packPrice).toFixed(2) : null;

    const salvo = await this.produtoRepo.save(p);
    return this.produtoToAdminDto(salvo);
  }

  async atualizarProduto(req: { headers?: Record<string, unknown> }, id: string, body: any) {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) {
      throw new BadRequestException('Nenhuma loja ativa disponível.');
    }
    let produto = await this.produtoRepo.findById(String(id));
    if (!produto) {
      throw new BadRequestException('Produto não encontrado.');
    }
    if (produto.lojaId !== lojaId) {
      // MULTI TENANT SECURITY CHECK
      throw new ForbiddenException();
    }
    produto.nome = String(body.name || '');
    produto.categoriaNome = body.category ? String(body.category) : null;
    produto.preco = Number(body.unitPrice ?? body.price ?? 0).toFixed(2);
    produto.precoPromocional = body.promoPrice != null ? Number(body.promoPrice).toFixed(2) : null;
    produto.estoqueAtual = Number(body.stock ?? 0);
    produto.tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
    produto.ativo = typeof body.active === 'boolean' ? body.active : true;
    produto.imageUrl = body.imageUrl ? String(body.imageUrl) : null;
    produto.volume = body.volume ? String(body.volume) : null;
    produto.packQuantity = body.packQuantity != null ? Number(body.packQuantity) : null;
    produto.packPrice = body.packPrice != null ? Number(body.packPrice).toFixed(2) : null;
    const salvo = await this.produtoRepo.save(produto);
    return this.produtoToAdminDto(salvo);
  }

  async removerProduto(req: { headers?: Record<string, unknown> }, id: string) {
    const lojaId = await resolveLojaId(req, this.lojaRepo);
    if (!lojaId) {
      throw new BadRequestException('Nenhuma loja ativa disponível.');
    }
    const produto = await this.produtoRepo.findById(String(id));
    if (!produto) {
      return { ok: true };
    }
    if (produto.lojaId !== lojaId) {
      // MULTI TENANT SECURITY CHECK
      throw new ForbiddenException();
    }
    await this.produtoRepo.removeById(produto.id);
    return { ok: true };
  }
}
