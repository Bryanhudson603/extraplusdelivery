import { BadRequestException, Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { adminsStore, clientesStore, lojasStore } from './platform.store';

function slugify(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

@Controller('platform')
export class PlatformController {
  @Get('lojas')
  listarLojas() {
    return lojasStore.slice().sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
  }

  @Post('lojas')
  criarLoja(@Body() body: { nome: string; slug?: string }) {
    const nome = String(body?.nome || '').trim();
    if (!nome) {
      throw new BadRequestException('Nome da loja é obrigatório.');
    }

    const slug = body?.slug ? slugify(body.slug) : slugify(nome);
    if (!slug) {
      throw new BadRequestException('Slug inválido.');
    }

    const exists = lojasStore.find(l => l.slug === slug);
    if (exists) {
      throw new BadRequestException('Já existe uma loja com este slug.');
    }

    const loja = {
      id: slug,
      nome,
      slug,
      ativo: true,
      criadoEm: new Date().toISOString()
    };

    lojasStore.unshift(loja);
    return loja;
  }

  @Put('lojas/:id')
  atualizarLoja(@Param('id') id: string, @Body() body: { nome?: string; ativo?: boolean }) {
    const loja = lojasStore.find(l => l.id === id);
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

    return loja;
  }

  @Get('usuarios')
  listarUsuarios() {
    const admins = adminsStore.map(a => ({
      id: a.id,
      tipo: 'admin' as const,
      username: a.username,
      lojaId: a.lojaId,
      ativo: a.ativo
    }));

    const clientes = clientesStore.map(c => ({
      id: c.id,
      tipo: 'cliente' as const,
      nome: c.nome,
      telefone: c.telefone,
      lojaId: c.lojaId,
      ativo: c.ativo
    }));

    return { admins, clientes };
  }

  @Post('usuarios/admin')
  criarAdmin(@Body() body: { username: string; senha: string; lojaId: string }) {
    const username = String(body?.username || '').trim();
    const senha = String(body?.senha || '').trim();
    const lojaId = String(body?.lojaId || '').trim();

    if (!username || !senha || !lojaId) {
      throw new BadRequestException('username, senha e lojaId são obrigatórios.');
    }

    const loja = lojasStore.find(l => l.id === lojaId);
    if (!loja) {
      throw new BadRequestException('Loja não encontrada.');
    }

    const exists = adminsStore.find(a => a.username === username && a.ativo !== false);
    if (exists) {
      throw new BadRequestException('Já existe um admin com este username.');
    }

    const admin = {
      id: `admin-${Date.now()}`,
      username,
      senha,
      lojaId,
      ativo: true
    };

    adminsStore.unshift(admin);
    return admin;
  }

  @Post('usuarios/cliente')
  criarCliente(
    @Body()
    body: { nome: string; telefone: string; senha: string; endereco: string; lojaId: string }
  ) {
    const nome = String(body?.nome || '').trim();
    const telefone = String(body?.telefone || '').trim();
    const senha = String(body?.senha || '').trim();
    const endereco = String(body?.endereco || '').trim();
    const lojaId = String(body?.lojaId || '').trim();

    if (!nome || !telefone || !senha || !endereco || !lojaId) {
      throw new BadRequestException('nome, telefone, senha, endereco e lojaId são obrigatórios.');
    }

    const loja = lojasStore.find(l => l.id === lojaId);
    if (!loja) {
      throw new BadRequestException('Loja não encontrada.');
    }

    const exists = clientesStore.find(c => c.telefone === telefone && c.ativo !== false);
    if (exists) {
      throw new BadRequestException('Já existe um cliente com este telefone.');
    }

    const cliente = {
      id: `cliente-${Date.now()}`,
      nome,
      telefone,
      senha,
      endereco,
      lojaId,
      ativo: true
    };

    clientesStore.unshift(cliente);
    return cliente;
  }

  @Put('usuarios/admin/:id')
  atualizarAdmin(
    @Param('id') id: string,
    @Body() body: { senha?: string; lojaId?: string; ativo?: boolean }
  ) {
    const admin = adminsStore.find(a => a.id === id);
    if (!admin) {
      throw new BadRequestException('Admin não encontrado.');
    }

    if (body?.senha !== undefined) {
      const senha = String(body.senha || '').trim();
      if (!senha) {
        throw new BadRequestException('Senha inválida.');
      }
      admin.senha = senha;
    }

    if (body?.lojaId !== undefined) {
      const lojaId = String(body.lojaId || '').trim();
      const loja = lojasStore.find(l => l.id === lojaId);
      if (!loja) {
        throw new BadRequestException('Loja não encontrada.');
      }
      admin.lojaId = lojaId;
    }

    if (body?.ativo !== undefined) {
      admin.ativo = !!body.ativo;
    }

    return admin;
  }

  @Put('usuarios/cliente/:id')
  atualizarCliente(
    @Param('id') id: string,
    @Body() body: { senha?: string; endereco?: string; lojaId?: string; ativo?: boolean }
  ) {
    const cliente = clientesStore.find(c => c.id === id);
    if (!cliente) {
      throw new BadRequestException('Cliente não encontrado.');
    }

    if (body?.senha !== undefined) {
      const senha = String(body.senha || '').trim();
      if (!senha) {
        throw new BadRequestException('Senha inválida.');
      }
      cliente.senha = senha;
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
      const loja = lojasStore.find(l => l.id === lojaId);
      if (!loja) {
        throw new BadRequestException('Loja não encontrada.');
      }
      cliente.lojaId = lojaId;
    }

    if (body?.ativo !== undefined) {
      cliente.ativo = !!body.ativo;
    }

    return cliente;
  }
}
