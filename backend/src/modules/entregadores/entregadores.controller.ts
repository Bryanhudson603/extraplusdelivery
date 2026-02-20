import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { entregadoresStore, type Entregador } from './entregadores.store';
import { pedidosStore } from '../pedidos/pedidos.store';

type CriarEntregadorDto = {
  nome: string;
  telefone?: string;
};

type AtualizarEntregadorDto = {
  nome?: string;
  telefone?: string;
  ativo?: boolean;
};

@Controller('admin/entregadores')
export class EntregadoresController {
  @Get()
  listar(): Entregador[] {
    return entregadoresStore.slice();
  }

  @Post()
  criar(@Body() body: CriarEntregadorDto): Entregador {
    const nome = String(body.nome || '').trim();
    const telefone =
      body.telefone && String(body.telefone).trim() ? String(body.telefone).trim() : undefined;
    const novo: Entregador = {
      id: randomUUID(),
      nome: nome || 'Entregador',
      telefone,
      ativo: true
    };
    entregadoresStore.push(novo);
    return novo;
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() body: AtualizarEntregadorDto): Entregador | null {
    const existente = entregadoresStore.find(e => e.id === id);
    if (!existente) return null;
    if (body.nome !== undefined) {
      existente.nome = String(body.nome || '').trim() || existente.nome;
    }
    if (body.telefone !== undefined) {
      const texto = String(body.telefone || '').trim();
      existente.telefone = texto || undefined;
    }
    if (body.ativo !== undefined) {
      existente.ativo = !!body.ativo;
    }
    return existente;
  }

  @Get('estatisticas')
  estatisticas(): Array<{ entregadorId: string; nome: string; entregas: number }> {
    const mapa: Record<string, { entregadorId: string; nome: string; entregas: number }> = {};
    for (const pedido of pedidosStore) {
      const id = (pedido as any).entregadorId as string | undefined;
      if (!id) continue;
      if (!mapa[id]) {
        const entregador = entregadoresStore.find(e => e.id === id);
        mapa[id] = {
          entregadorId: id,
          nome: entregador?.nome || 'Entregador',
          entregas: 0
        };
      }
      mapa[id].entregas += 1;
    }
    return Object.values(mapa).sort((a, b) => b.entregas - a.entregas);
  }
}

