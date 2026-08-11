import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialAccountEntity } from '../entities/socialAccount.entity';

@Injectable()
export class SocialAccountRepository {
  constructor(
    @InjectRepository(SocialAccountEntity)
    private readonly repo: Repository<SocialAccountEntity>
  ) {}

  async findByProvider(provider: string, providerUserId: string): Promise<SocialAccountEntity | null> {
    const conta = await this.repo.findOne({ where: { provider, providerUserId } });
    return conta || null;
  }

  async findByClienteAndProvider(clienteId: string, provider: string): Promise<SocialAccountEntity | null> {
    const conta = await this.repo.findOne({ where: { clienteId, provider } });
    return conta || null;
  }

  save(conta: SocialAccountEntity): Promise<SocialAccountEntity> {
    return this.repo.save(conta);
  }
}
