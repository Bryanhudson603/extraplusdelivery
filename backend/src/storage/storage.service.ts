import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

const BUCKET_NAME = 'produtos';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml'
] as const;
const ALLOWED_UPLOAD_TYPES = ['produtos', 'categorias', 'banners', 'logos', 'entregadores'] as const;

export type StorageUploadType = (typeof ALLOWED_UPLOAD_TYPES)[number];

@Injectable()
export class StorageService {
  private supabaseClient: SupabaseClient | null = null;

  getAllowedTypes(): readonly StorageUploadType[] {
    return ALLOWED_UPLOAD_TYPES;
  }

  validateOwnedPath(lojaId: string, path?: string | null): string | null {
    const safePath = String(path || '').trim();
    if (!safePath) return null;
    this.assertPathBelongsToLoja(lojaId, safePath);
    return safePath;
  }

  validateUploadType(tipo: string): StorageUploadType {
    if ((ALLOWED_UPLOAD_TYPES as readonly string[]).includes(tipo)) {
      return tipo as StorageUploadType;
    }
    throw new BadRequestException('Tipo de upload inválido.');
  }

  validateImage(file?: Express.Multer.File): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException('Arquivo de imagem é obrigatório.');
    }

    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.mimetype)) {
      throw new BadRequestException('Formato inválido. Use JPG, JPEG, PNG, WEBP, AVIF ou SVG.');
    }

    if (!file.size || file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Imagem excede o limite de 5MB.');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Imagem inválida.');
    }
  }

  async compressImage(file: Express.Multer.File): Promise<Buffer> {
    this.validateImage(file);

    return sharp(file.buffer)
      .rotate()
      .resize(800, 800, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .webp({ quality: 82 })
      .toBuffer();
  }

  getPublicUrl(path: string): string {
    const { data } = this.getSupabaseClient().storage.from(BUCKET_NAME).getPublicUrl(path);
    if (!data?.publicUrl) {
      throw new InternalServerErrorException('Falha ao gerar URL pública da imagem.');
    }
    return data.publicUrl;
  }

  async uploadImage(params: {
    lojaId: string;
    tipo: string;
    file?: Express.Multer.File;
  }): Promise<{ url: string; path: string }> {
    const lojaId = this.assertLojaId(params.lojaId);
    const tipo = this.validateUploadType(String(params.tipo || '').trim());
    this.validateImage(params.file);

    const optimized = await this.compressImage(params.file);
    const path = `${lojaId}/${tipo}/${randomUUID()}.webp`;

    const { error } = await this.getSupabaseClient()
      .storage.from(BUCKET_NAME)
      .upload(path, optimized, {
        contentType: 'image/webp',
        upsert: false
      });

    if (error) {
      throw new InternalServerErrorException(`Falha ao enviar imagem: ${error.message}`);
    }

    return {
      url: this.getPublicUrl(path),
      path
    };
  }

  async deleteImage(lojaId: string, path?: string | null): Promise<void> {
    const safePath = this.validateOwnedPath(lojaId, path);
    if (!safePath) return;

    const { error } = await this.getSupabaseClient().storage.from(BUCKET_NAME).remove([safePath]);
    if (error) {
      throw new InternalServerErrorException(`Falha ao remover imagem: ${error.message}`);
    }
  }

  async replaceImage(params: {
    lojaId: string;
    tipo: string;
    file?: Express.Multer.File;
    currentPath?: string | null;
  }): Promise<{ url: string; path: string }> {
    const next = await this.uploadImage({
      lojaId: params.lojaId,
      tipo: params.tipo,
      file: params.file
    });

    if (params.currentPath) {
      await this.deleteImage(params.lojaId, params.currentPath);
    }

    return next;
  }

  private getSupabaseClient(): SupabaseClient {
    if (this.supabaseClient) {
      return this.supabaseClient;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new UnauthorizedException('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
    }

    this.supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    return this.supabaseClient;
  }

  private assertLojaId(lojaId: string): string {
    const normalized = String(lojaId || '').trim();
    if (!normalized) {
      throw new BadRequestException('Loja inválida para upload.');
    }
    return normalized;
  }

  private assertPathBelongsToLoja(lojaId: string, path: string): void {
    const safeLojaId = this.assertLojaId(lojaId);
    if (!path.startsWith(`${safeLojaId}/`)) {
      throw new BadRequestException('Arquivo não pertence à loja autenticada.');
    }
  }
}
