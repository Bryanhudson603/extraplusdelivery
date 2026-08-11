import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { ClienteEntity } from '../../entities/cliente.entity';
import { LojaEntity } from '../../entities/loja.entity';
import { UsuarioEntity } from '../../entities/usuario.entity';
import { ClienteRepository } from '../../repositories/cliente.repository';
import { LojaRepository } from '../../repositories/loja.repository';
import { UsuarioRepository } from '../../repositories/usuario.repository';

function slugify(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function toLojaResp(loja: LojaEntity) {
  return {
    id: loja.id,
    nome: loja.nome,
    slug: loja.slug,
    ativo: loja.ativo,
    criadoEm: loja.criadoEm.toISOString()
  };
}

@Injectable()
export class PlatformService {
  constructor(
    private readonly lojaRepo: LojaRepository,
    private readonly usuarioRepo: UsuarioRepository,
    private readonly clienteRepo: ClienteRepository
  ) {}

  async listarLojas() {
    const lojas = await this.lojaRepo.listarTodas();
    return lojas.map(toLojaResp);
  }

  async criarLoja(body: { nome: string; slug?: string }) {
    const nome = String(body?.nome || '').trim();
    if (!nome) {
      throw new BadRequestException('Nome da loja é obrigatório.');
    }

    const slug = body?.slug ? slugify(body.slug) : slugify(nome);
    if (!slug) {
      throw new BadRequestException('Slug inválido.');
    }

    const exists = await this.lojaRepo.obterPorSlug(slug);
    if (exists) {
      throw new BadRequestException('Já existe uma loja com este slug.');
    }

    const loja = new LojaEntity();
    loja.id = slug;
    loja.nome = nome;
    loja.slug = slug;
    loja.ativo = true;

    const salvo = await this.lojaRepo.criar(loja);
    return toLojaResp(salvo);
  }

  async atualizarLoja(id: string, body: { nome?: string; ativo?: boolean }) {
    const loja = await this.lojaRepo.obterPorId(id);
    if (!loja) {
      throw new BadRequestException('Loja não encontrada.');
    }

    if (body?.nome !== undefined) {
      const nome = String(body.nome || '').trim();
      if (!nome) {
        throw new BadRequestException('Nome inválido.');
      }
      loja.nome = nome;
    }

    if (body?.ativo !== undefined) {
      loja.ativo = !!body.ativo;
    }

    const salvo = await this.lojaRepo.salvar(loja);
    return toLojaResp(salvo);
  }

  async listarUsuarios() {
    const lojas = await this.lojaRepo.listarTodas();
    const lojaIds = lojas.map(l => l.id);
    const admins: Array<{ id: string; tipo: 'admin'; username: string; lojaId: string; ativo: boolean }> = [];
    const clientes: Array<{
      id: string;
      tipo: 'cliente';
      nome: string;
      telefone: string;
      lojaId: string;
      ativo: boolean;
    }> = [];

    for (const lojaId of lojaIds) {
      const usuarios = await this.usuarioRepo.listByLoja(lojaId);
      for (const u of usuarios) {
        admins.push({
          id: u.id,
          tipo: 'admin',
          username: u.username,
          lojaId: u.lojaId,
          ativo: u.ativo
        });
      }

      const cls = await this.clienteRepo.listByLoja(lojaId);
      for (const c of cls) {
        clientes.push({
          id: c.id,
          tipo: 'cliente',
          nome: c.nome,
          telefone: c.telefone || '',
          lojaId: c.lojaId,
          ativo: c.ativo
        });
      }
    }

    return { admins, clientes };
  }

  async criarAdmin(body: { username: string; senha: string; lojaId: string }) {
    const username = String(body?.username || '').trim();
    const senha = String(body?.senha || '').trim();
    const lojaId = String(body?.lojaId || '').trim();

    if (!username || !senha || !lojaId) {
      throw new BadRequestException('username, senha e lojaId são obrigatórios.');
    }

    const loja = await this.lojaRepo.obterPorId(lojaId);
    if (!loja) {
      throw new BadRequestException('Loja não encontrada.');
    }

    const exists = await this.usuarioRepo.existsAtivoByUsername(username);
    if (exists) {
      throw new BadRequestException('Já existe um admin com este username.');
    }

    const admin = new UsuarioEntity();
    admin.id = randomUUID();
    admin.username = username;
    admin.senhaHash = await bcrypt.hash(senha, 10);
    admin.lojaId = lojaId;
    admin.ativo = true;

    const salvo = await this.usuarioRepo.save(admin);
    return { id: salvo.id, username: salvo.username, senha: '', lojaId: salvo.lojaId, ativo: salvo.ativo };
  }

  async criarCliente(body: { nome: string; telefone: string; senha: string; endereco: string; lojaId: string }) {
    const nome = String(body?.nome || '').trim();
    const telefone = String(body?.telefone || '').trim();
    const senha = String(body?.senha || '').trim();
    const endereco = String(body?.endereco || '').trim();
    const lojaId = String(body?.lojaId || '').trim();

    if (!nome || !telefone || !senha || !endereco || !lojaId) {
      throw new BadRequestException('nome, telefone, senha, endereco e lojaId são obrigatórios.');
    }

    const loja = await this.lojaRepo.obterPorId(lojaId);
    if (!loja) {
      throw new BadRequestException('Loja não encontrada.');
    }

    const exists = await this.clienteRepo.findAtivoByTelefoneAnyLoja(telefone);
    if (exists) {
      throw new BadRequestException('Já existe um cliente com este telefone.');
    }

    const cliente = new ClienteEntity();
    cliente.id = randomUUID();
    cliente.nome = nome;
    cliente.telefone = telefone;
    cliente.senhaHash = await bcrypt.hash(senha, 10);
    cliente.endereco = endereco;
    cliente.lojaId = lojaId;
    cliente.ativo = true;

    const salvo = await this.clienteRepo.save(cliente);
    return {
      id: salvo.id,
      nome: salvo.nome,
      telefone: salvo.telefone,
      senha: '',
      endereco: salvo.endereco,
      lojaId: salvo.lojaId,
      ativo: salvo.ativo
    };
  }

  async atualizarAdmin(id: string, body: { senha?: string; lojaId?: string; ativo?: boolean }) {
    const admin = await this.usuarioRepo.findById(id);
    if (!admin) {
      throw new BadRequestException('Admin não encontrado.');
    }

    if (body?.senha !== undefined) {
      const senha = String(body.senha || '').trim();
      if (!senha) {
        throw new BadRequestException('Senha inválida.');
      }
      admin.senhaHash = await bcrypt.hash(senha, 10);
    }

    if (body?.lojaId !== undefined) {
      const lojaId = String(body.lojaId || '').trim();
      const loja = await this.lojaRepo.obterPorId(lojaId);
      if (!loja) {
        throw new BadRequestException('Loja não encontrada.');
      }
      admin.lojaId = lojaId;
    }

    if (body?.ativo !== undefined) {
      admin.ativo = !!body.ativo;
    }

    const salvo = await this.usuarioRepo.save(admin);
    return { id: salvo.id, username: salvo.username, senha: '', lojaId: salvo.lojaId, ativo: salvo.ativo };
  }

  async atualizarCliente(id: string, body: { senha?: string; endereco?: string; lojaId?: string; ativo?: boolean }) {
    const cliente = await this.clienteRepo.findById(id);
    if (!cliente) {
      throw new BadRequestException('Cliente não encontrado.');
    }

    if (body?.senha !== undefined) {
      const senha = String(body.senha || '').trim();
      if (!senha) {
        throw new BadRequestException('Senha inválida.');
      }
      cliente.senhaHash = await bcrypt.hash(senha, 10);
    }

    if (body?.endereco !== undefined) {
      const endereco = String(body.endereco || '').trim();
      if (!endereco) {
        throw new BadRequestException('Endereço inválido.');
      }
      cliente.endereco = endereco;
    }

    if (body?.lojaId !== undefined) {
      const lojaId = String(body.lojaId || '').trim();
      const loja = await this.lojaRepo.obterPorId(lojaId);
      if (!loja) {
        throw new BadRequestException('Loja não encontrada.');
      }
      cliente.lojaId = lojaId;
    }

    if (body?.ativo !== undefined) {
      cliente.ativo = !!body.ativo;
    }

    const salvo = await this.clienteRepo.save(cliente);
    return {
      id: salvo.id,
      nome: salvo.nome,
      telefone: salvo.telefone,
      senha: '',
      endereco: salvo.endereco,
      lojaId: salvo.lojaId,
      ativo: salvo.ativo
    };
  }
}
