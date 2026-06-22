import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { signAuthToken, type AuthTokenPayload } from '../../auth/auth-token';
import { ClienteEntity } from '../../entities/cliente.entity';
import { LojaEntity } from '../../entities/loja.entity';
import { UsuarioEntity } from '../../entities/usuario.entity';
import { ClienteRepository } from '../../repositories/cliente.repository';
import { LojaRepository } from '../../repositories/loja.repository';
import { UsuarioRepository } from '../../repositories/usuario.repository';
import {
  AdminLoginDto,
  ClienteLoginDto,
  PlatformLoginDto,
  RegistrarClienteDto,
  type AdminLoginResponse,
  type ClienteLoginResponse,
  type LojaDto,
  type PlatformLoginResponse
} from './auth.dto';
import { FIXED_CITY_NAME, formatClientAddress } from '../../common/delivery';

function toLojaDto(loja: LojaEntity): LojaDto {
  return {
    id: loja.id,
    nome: loja.nome,
    slug: loja.slug,
    ativo: loja.ativo,
    criadoEm: loja.criadoEm.toISOString()
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly lojaRepo: LojaRepository,
    private readonly usuarioRepo: UsuarioRepository,
    private readonly clienteRepo: ClienteRepository
  ) {}

  async listarLojas(): Promise<LojaDto[]> {
    const lojas = await this.lojaRepo.listarAtivas();
    return lojas.map(toLojaDto);
  }

  async loginAdmin(body: AdminLoginDto): Promise<{ response: AdminLoginResponse; token: string }> {
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    if (!username || !password) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const admin = await this.usuarioRepo.findAtivoByUsernameAnyLoja(username);
    if (!admin) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const ok = await bcrypt.compare(password, admin.senhaHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const loja = await this.lojaRepo.obterPorId(admin.lojaId);
    if (!loja || loja.ativo === false) {
      throw new UnauthorizedException('Loja não encontrada para este administrador');
    }

    const response: AdminLoginResponse = {
      tipo: 'admin',
      adminId: admin.id,
      username: admin.username,
      loja: toLojaDto(loja)
    };

    const payload: AuthTokenPayload = {
      sub: admin.id,
      tipo: 'admin',
      lojaId: admin.lojaId,
      username: admin.username
    };
    const token = signAuthToken(payload, '7d');

    return { response, token };
  }

  async loginCliente(body: ClienteLoginDto): Promise<{ response: ClienteLoginResponse; token: string }> {
    const telefone = String(body.telefone || '').trim();
    const senha = String(body.senha || '').trim();
    if (!telefone || !senha) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const cliente = await this.clienteRepo.findAtivoByTelefoneAnyLoja(telefone);
    if (!cliente) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const ok = await bcrypt.compare(senha, cliente.senhaHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const loja = await this.lojaRepo.obterPorId(cliente.lojaId);
    if (!loja || loja.ativo === false) {
      throw new UnauthorizedException('Loja não encontrada para este cliente');
    }

    const response: ClienteLoginResponse = {
      tipo: 'cliente',
      clienteId: cliente.id,
      telefone: cliente.telefone,
      nome: cliente.nome,
      endereco: cliente.endereco,
      loja: toLojaDto(loja)
    };

    const payload: AuthTokenPayload = {
      sub: cliente.id,
      tipo: 'cliente',
      lojaId: cliente.lojaId,
      telefone: cliente.telefone
    };
    const token = signAuthToken(payload, '7d');

    return { response, token };
  }

  async registrarCliente(
    body: RegistrarClienteDto
  ): Promise<{ response: ClienteLoginResponse; token: string }> {
    const nome = String(body?.nome || '').trim();
    const telefone = String(body?.telefone || '').trim();
    const senha = String(body?.senha || '').trim();
    const rua = String(body?.rua || '').trim();
    const bairro = String(body?.bairro || '').trim();
    const cidade = String(body?.cidade || '').trim() || FIXED_CITY_NAME;
    const endereco = formatClientAddress(rua, bairro);

    if (!nome || !telefone || !senha || !rua || !bairro || !cidade) {
      throw new BadRequestException('Dados inválidos');
    }

    if (cidade !== FIXED_CITY_NAME) {
      throw new BadRequestException(`Cidade invalida. Use ${FIXED_CITY_NAME}.`);
    }

    const lojaPadrao = await this.lojaRepo.obterPrimeiraAtiva();
    if (!lojaPadrao) {
      throw new BadRequestException('Nenhuma loja disponível para cadastro');
    }

    const exists = await this.clienteRepo.existsAtivoByTelefone(lojaPadrao.id, telefone);
    if (exists) {
      throw new UnauthorizedException('Telefone já cadastrado');
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const novo = new ClienteEntity();
    novo.id = randomUUID();
    novo.nome = nome;
    novo.telefone = telefone;
    novo.senhaHash = senhaHash;
    novo.endereco = endereco;
    novo.lojaId = lojaPadrao.id;
    novo.ativo = true;

    const salvo = await this.clienteRepo.save(novo);

    const response: ClienteLoginResponse = {
      tipo: 'cliente',
      clienteId: salvo.id,
      telefone: salvo.telefone,
      nome: salvo.nome,
      endereco: salvo.endereco,
      loja: toLojaDto(lojaPadrao)
    };

    const payload: AuthTokenPayload = {
      sub: salvo.id,
      tipo: 'cliente',
      lojaId: salvo.lojaId,
      telefone: salvo.telefone
    };
    const token = signAuthToken(payload, '7d');

    return { response, token };
  }

  async seedAdminForLojaIfNeeded(lojaId: string): Promise<void> {
    const user = await this.usuarioRepo.findAtivoByUsername(lojaId, 'bhnsilva');
    if (user) return;
    const senhaHash = await bcrypt.hash('Brasill1', 10);
    const admin = new UsuarioEntity();
    admin.id = randomUUID();
    admin.username = 'bhnsilva';
    admin.senhaHash = senhaHash;
    admin.lojaId = lojaId;
    admin.ativo = true;
    await this.usuarioRepo.save(admin);
  }

  async loginPlataforma(body: PlatformLoginDto): Promise<{ response: PlatformLoginResponse; token: string }> {
    const envUser = process.env.PLATFORM_ADMIN_USER;
    const envPassHash = process.env.PLATFORM_ADMIN_PASS_HASH;
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();

    if (!envUser || !envPassHash) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    if (username !== envUser) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const ok = await bcrypt.compare(password, envPassHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const response: PlatformLoginResponse = {
      tipo: 'plataforma',
      adminId: 'platform-env',
      username: envUser
    };
    const token = signAuthToken({ sub: 'platform-env', tipo: 'plataforma', username: envUser }, '7d');
    return { response, token };
  }
}
