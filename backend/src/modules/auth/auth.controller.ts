import { BadRequestException, Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import {
  adminsStore,
  clientesStore,
  lojasStore,
  platformAdminsStore,
  type Loja
} from '../platform/platform.store';

type AdminLoginDto = {
  username: string;
  password: string;
};

type ClienteLoginDto = {
  telefone: string;
  senha: string;
};

type RegistrarClienteDto = {
  nome: string;
  telefone: string;
  senha: string;
  endereco: string;
};

type PlatformLoginDto = {
  username: string;
  password: string;
};

type AdminLoginResponse = {
  tipo: 'admin';
  adminId: string;
  username: string;
  loja: Loja;
};

type ClienteLoginResponse = {
  tipo: 'cliente';
  clienteId: string;
  telefone: string;
  nome: string;
  endereco: string;
  loja: Loja;
};

type PlatformLoginResponse = {
  tipo: 'plataforma';
  adminId: string;
  username: string;
};

@Controller('auth')
export class AuthController {
  @Get('lojas')
  listarLojas(): Loja[] {
    return lojasStore.filter(l => l.ativo !== false);
  }

  @Post('login-admin')
  loginAdmin(@Body() body: AdminLoginDto): AdminLoginResponse {
    const admin = adminsStore.find(
      a => a.ativo !== false && a.username === body.username && a.senha === body.password
    );

    if (!admin) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const loja = lojasStore.find(l => l.ativo !== false && l.id === admin.lojaId);

    if (!loja) {
      throw new UnauthorizedException('Loja não encontrada para este administrador');
    }

    return {
      tipo: 'admin',
      adminId: admin.id,
      username: admin.username,
      loja
    };
  }

  @Post('login-cliente')
  loginCliente(@Body() body: ClienteLoginDto): ClienteLoginResponse {
    const cliente = clientesStore.find(
      c => c.ativo !== false && c.telefone === body.telefone && c.senha === body.senha
    );

    if (!cliente) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const loja = lojasStore.find(l => l.ativo !== false && l.id === cliente.lojaId);

    if (!loja) {
      throw new UnauthorizedException('Loja não encontrada para este cliente');
    }

    return {
      tipo: 'cliente',
      clienteId: cliente.id,
      telefone: cliente.telefone,
      nome: cliente.nome,
      endereco: cliente.endereco,
      loja
    };
  }

  @Post('register-cliente')
  registrarCliente(@Body() body: RegistrarClienteDto): ClienteLoginResponse {
    const lojaPadrao = lojasStore.find(l => l.ativo !== false) || null;

    if (!lojaPadrao) {
      throw new BadRequestException('Nenhuma loja disponível para cadastro');
    }

    const exists = clientesStore.find(c => c.ativo !== false && c.telefone === body.telefone);
    if (exists) {
      throw new UnauthorizedException('Telefone já cadastrado');
    }

    const novo = {
      id: `cliente-${clientesStore.length + 1}`,
      nome: body.nome,
      telefone: body.telefone,
      senha: body.senha,
      endereco: body.endereco,
      lojaId: lojaPadrao.id,
      ativo: true
    };

    clientesStore.push(novo);

    return {
      tipo: 'cliente',
      clienteId: novo.id,
      telefone: novo.telefone,
      nome: novo.nome,
      endereco: novo.endereco,
      loja: lojaPadrao
    };
  }

  @Post('login-plataforma')
  loginPlataforma(@Body() body: PlatformLoginDto): PlatformLoginResponse {
    const envUser = process.env.PLATFORM_ADMIN_USER;
    const envPass = process.env.PLATFORM_ADMIN_PASS;

    if (envUser && envPass) {
      if (body.username === envUser) {
        if (body.password !== envPass) {
          throw new UnauthorizedException('Credenciais inválidas');
        }
        return { tipo: 'plataforma', adminId: 'platform-env', username: envUser };
      }
    }

    const admin = platformAdminsStore.find(
      a => a.ativo !== false && a.username === body.username && a.senha === body.password
    );

    if (!admin) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return { tipo: 'plataforma', adminId: admin.id, username: admin.username };
  }
}
