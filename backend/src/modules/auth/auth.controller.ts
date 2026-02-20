import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';

type Loja = {
  id: string;
  nome: string;
  slug: string;
};

type AdminUser = {
  id: string;
  username: string;
  senha: string;
  lojaId: string;
};

type ClienteUser = {
  id: string;
  nome: string;
  telefone: string;
  senha: string;
  endereco: string;
  lojaId: string;
};

const lojas: Loja[] = [
  {
    id: 'pc-bebidas',
    nome: 'PC Bebidas',
    slug: 'pc-bebidas'
  }
];

const admins: AdminUser[] = [
  {
    id: 'admin-1',
    username: 'bhnsilva',
    senha: 'Brasill1',
    lojaId: 'pc-bebidas'
  }
];

const clientes: ClienteUser[] = [
  {
    id: 'cliente-1',
    nome: 'Cliente Exemplo',
    telefone: '82993107309',
    senha: '123456',
    endereco: 'Rua das Bebidas, 123',
    lojaId: 'pc-bebidas'
  }
];

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

@Controller('auth')
export class AuthController {
  @Get('lojas')
  listarLojas(): Loja[] {
    return lojas;
  }

  @Post('login-admin')
  loginAdmin(@Body() body: AdminLoginDto): AdminLoginResponse {
    const admin = admins.find(a => a.username === body.username && a.senha === body.password);

    if (!admin) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const loja = lojas.find(l => l.id === admin.lojaId);

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
    const cliente = clientes.find(c => c.telefone === body.telefone && c.senha === body.senha);

    if (!cliente) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const loja = lojas.find(l => l.id === cliente.lojaId);

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
    const lojaPadrao = lojas[0];

    if (!lojaPadrao) {
      throw new UnauthorizedException('Nenhuma loja disponível para cadastro');
    }

    const exists = clientes.find(c => c.telefone === body.telefone);
    if (exists) {
      throw new UnauthorizedException('Telefone já cadastrado');
    }

    const novo: ClienteUser = {
      id: `cliente-${clientes.length + 1}`,
      nome: body.nome,
      telefone: body.telefone,
      senha: body.senha,
      endereco: body.endereco,
      lojaId: lojaPadrao.id
    };

    clientes.push(novo);

    return {
      tipo: 'cliente',
      clienteId: novo.id,
      telefone: novo.telefone,
      nome: novo.nome,
      endereco: novo.endereco,
      loja: lojaPadrao
    };
  }
}
