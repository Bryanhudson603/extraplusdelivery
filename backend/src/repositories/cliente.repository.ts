import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClienteEntity } from '../entities/cliente.entity';

@Injectable()
export class ClienteRepository {
  constructor(
    @InjectRepository(ClienteEntity)
    private readonly repo: Repository<ClienteEntity>
  ) {}

  async findAtivoByTelefone(lojaId: string, telefone: string): Promise<ClienteEntity | null> {
    const cliente = await this.repo.findOne({
      where: { lojaId, telefone, ativo: true }
    });
    return cliente || null;
  }

  async findAtivoByTelefoneAnyLoja(telefone: string): Promise<ClienteEntity | null> {
    const cliente = await this.repo.findOne({
      where: { telefone, ativo: true },
      order: { criadoEm: 'DESC' }
    });
    return cliente || null;
  }

  async existsAtivoByTelefone(lojaId: string, telefone: string): Promise<boolean> {
    const count = await this.repo.count({ where: { lojaId, telefone, ativo: true } });
    return count > 0;
  }

  async findById(id: string): Promise<ClienteEntity | null> {
    const cliente = await this.repo.findOne({ where: { id } });
    return cliente || null;
  }

  async listByLoja(lojaId: string): Promise<ClienteEntity[]> {
    return this.repo.find({ where: { lojaId }, order: { criadoEm: 'DESC' } });
  }

  save(cliente: ClienteEntity): Promise<ClienteEntity> {
    return this.repo.save(cliente);
  }
}
