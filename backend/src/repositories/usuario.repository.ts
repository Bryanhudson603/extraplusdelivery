import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { UsuarioEntity } from '../entities/usuario.entity';

@Injectable()
export class UsuarioRepository {
  constructor(
    @InjectRepository(UsuarioEntity)
    private readonly repo: Repository<UsuarioEntity>
  ) {}

  async findAtivoByUsername(lojaId: string, username: string): Promise<UsuarioEntity | null> {
    const user = await this.repo.findOne({
      where: { lojaId, username, ativo: true }
    });
    return user || null;
  }

  async findAtivoByUsernameAnyLoja(username: string): Promise<UsuarioEntity | null> {
    const user = await this.repo.findOne({
      where: { username, ativo: true },
      order: { criadoEm: 'DESC' }
    });
    return user || null;
  }

  async existsAtivoByUsername(username: string): Promise<boolean> {
    const count = await this.repo.count({ where: { username, ativo: true } });
    return count > 0;
  }

  async existsAtivoByUsernameExcluindo(username: string, excludeId: string): Promise<boolean> {
    const count = await this.repo.count({ where: { username, ativo: true, id: Not(excludeId) } });
    return count > 0;
  }

  async findById(id: string): Promise<UsuarioEntity | null> {
    const user = await this.repo.findOne({ where: { id } });
    return user || null;
  }

  async listByLoja(lojaId: string): Promise<UsuarioEntity[]> {
    return this.repo.find({ where: { lojaId }, order: { criadoEm: 'DESC' } });
  }

  save(user: UsuarioEntity): Promise<UsuarioEntity> {
    return this.repo.save(user);
  }
}
