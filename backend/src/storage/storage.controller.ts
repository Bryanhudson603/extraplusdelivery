import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { RequireAuth } from '../auth/require-auth.guard';
import { StorageService } from './storage.service';

class UploadImageDto {
  @IsString()
  @IsIn(['produtos', 'categorias', 'banners', 'logos', 'entregadores'])
  tipo!: string;
}

@Controller('storage')
@UseGuards(RequireAuth('admin'))
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }
    })
  )
  async upload(
    @Req() req: any,
    @Body() body: UploadImageDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    const lojaId = String(req?.auth?.lojaId || '').trim();
    const uploaded = await this.storageService.uploadImage({
      lojaId,
      tipo: body.tipo,
      file
    });

    return {
      success: true,
      url: uploaded.url,
      path: uploaded.path
    };
  }
}
