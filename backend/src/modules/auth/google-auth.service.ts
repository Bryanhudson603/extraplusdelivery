import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { ClienteEntity } from '../../entities/cliente.entity';
import { SocialAccountEntity } from '../../entities/socialAccount.entity';
import { ClienteRepository } from '../../repositories/cliente.repository';
import { LojaRepository } from '../../repositories/loja.repository';
import { SocialAccountRepository } from '../../repositories/social-account.repository';
import { criarTicket, consumirTicket } from './google-login-ticket.store';
import { toLojaDto } from './auth.service';
import type { ClienteLoginResponse, LojaDto } from './auth.dto';

const GOOGLE_PROVIDER = 'google';

type GoogleProfile = {
  sub: string;
  email: string;
  name: string;
};

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    private readonly clienteRepo: ClienteRepository,
    private readonly lojaRepo: LojaRepository,
    private readonly socialAccountRepo: SocialAccountRepository
  ) {}

  isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL);
  }

  private getClient(): OAuth2Client {
    return new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
  }

  buildAuthorizationUrl(): { url: string; state: string } {
    const client = this.getClient();
    const state = randomBytes(24).toString('hex');
    const url = client.generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account'
    });
    return { url, state };
  }

  private async verifyAndExtractProfile(code: string): Promise<GoogleProfile> {
    const client = this.getClient();

    let tokens;
    try {
      const result = await client.getToken({ code, redirect_uri: process.env.GOOGLE_CALLBACK_URL });
      tokens = result.tokens;
    } catch (error) {
      this.logger.warn(`Falha ao trocar code por token com o Google: ${(error as Error)?.message}`);
      throw new UnauthorizedException('Falha na autenticação com o Google');
    }

    if (!tokens.id_token) {
      throw new UnauthorizedException('Google não retornou id_token');
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (error) {
      this.logger.warn(`id_token do Google inválido: ${(error as Error)?.message}`);
      throw new UnauthorizedException('Token do Google inválido');
    }

    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedException('Google não retornou os dados esperados');
    }
    if (payload.email_verified === false) {
      throw new UnauthorizedException('E-mail do Google não verificado');
    }
    const issuer = payload.iss;
    if (issuer !== 'accounts.google.com' && issuer !== 'https://accounts.google.com') {
      throw new UnauthorizedException('Emissor do token inválido');
    }

    return {
      sub: payload.sub,
      email: payload.email.trim().toLowerCase(),
      name: (payload.name || payload.email).trim()
    };
  }

  private async localizarOuCriarCliente(profile: GoogleProfile): Promise<{ cliente: ClienteEntity; novoCadastro: boolean }> {
    const socialExistente = await this.socialAccountRepo.findByProvider(GOOGLE_PROVIDER, profile.sub);
    if (socialExistente) {
      const cliente = await this.clienteRepo.findById(socialExistente.clienteId);
      if (cliente && cliente.ativo !== false) return { cliente, novoCadastro: false };
      throw new UnauthorizedException('Conta vinculada não está mais disponível');
    }

    const clientePorEmail = await this.clienteRepo.findAtivoByEmailAnyLoja(profile.email);
    if (clientePorEmail) {
      await this.vincularConta(clientePorEmail.id, profile);
      return { cliente: clientePorEmail, novoCadastro: false };
    }

    const lojaPadrao = await this.lojaRepo.obterPrimeiraAtiva();
    if (!lojaPadrao) {
      throw new BadRequestException('Nenhuma loja disponível para cadastro');
    }

    const senhaAleatoria = randomUUID() + randomUUID();
    const novo = new ClienteEntity();
    novo.id = randomUUID();
    novo.nome = profile.name;
    novo.email = profile.email;
    novo.telefone = null;
    novo.endereco = '';
    novo.senhaHash = await bcrypt.hash(senhaAleatoria, 10);
    novo.lojaId = lojaPadrao.id;
    novo.ativo = true;

    const salvo = await this.clienteRepo.save(novo);
    await this.vincularConta(salvo.id, profile);
    return { cliente: salvo, novoCadastro: true };
  }

  private async vincularConta(clienteId: string, profile: GoogleProfile): Promise<void> {
    const jaVinculado = await this.socialAccountRepo.findByClienteAndProvider(clienteId, GOOGLE_PROVIDER);
    if (jaVinculado) return;

    const social = new SocialAccountEntity();
    social.id = randomUUID();
    social.clienteId = clienteId;
    social.provider = GOOGLE_PROVIDER;
    social.providerUserId = profile.sub;
    social.email = profile.email;
    await this.socialAccountRepo.save(social);

    const cliente = await this.clienteRepo.findById(clienteId);
    if (cliente && !cliente.email) {
      cliente.email = profile.email;
      await this.clienteRepo.save(cliente);
    }
  }

  async handleCallback(code: string): Promise<{ ticket: string }> {
    const profile = await this.verifyAndExtractProfile(code);
    const { cliente, novoCadastro } = await this.localizarOuCriarCliente(profile);
    const ticket = criarTicket(cliente.id, novoCadastro);
    return { ticket };
  }

  async exchangeTicket(ticketId: string): Promise<{ response: ClienteLoginResponse; clienteId: string; lojaId: string; telefone?: string }> {
    const ticketEntry = consumirTicket(ticketId);
    if (!ticketEntry) {
      throw new UnauthorizedException('Ticket inválido ou expirado');
    }

    const cliente = await this.clienteRepo.findById(ticketEntry.clienteId);
    if (!cliente || cliente.ativo === false) {
      throw new UnauthorizedException('Cliente não encontrado');
    }

    const loja = await this.lojaRepo.obterPorId(cliente.lojaId);
    if (!loja || loja.ativo === false) {
      throw new UnauthorizedException('Loja não encontrada para este cliente');
    }

    const lojaDto: LojaDto = toLojaDto(loja);
    const response: ClienteLoginResponse = {
      tipo: 'cliente',
      clienteId: cliente.id,
      telefone: cliente.telefone || '',
      nome: cliente.nome,
      endereco: cliente.endereco,
      loja: lojaDto,
      novoCadastro: ticketEntry.novoCadastro
    };

    return {
      response,
      clienteId: cliente.id,
      lojaId: cliente.lojaId,
      telefone: cliente.telefone || undefined
    };
  }
}
