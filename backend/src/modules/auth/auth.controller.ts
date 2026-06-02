import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  AdminLoginDto,
  ClienteLoginDto,
  PlatformLoginDto,
  RegistrarClienteDto,
  type AdminLoginResponse,
  type ClienteLoginResponse,
  type PlatformLoginResponse
} from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private cookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    } as const;
  }

  @Get('lojas')
  listarLojas() {
    return this.authService.listarLojas();
  }

  @Post('login-admin')
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async loginAdmin(
    @Body() body: AdminLoginDto,
    @Res({ passthrough: true }) res: any
  ): Promise<AdminLoginResponse> {
    const { response, token } = await this.authService.loginAdmin(body);
    res.cookie('extraplus_token', token, this.cookieOptions());
    return response;
  }

  @Post('login-cliente')
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async loginCliente(
    @Body() body: ClienteLoginDto,
    @Res({ passthrough: true }) res: any
  ): Promise<ClienteLoginResponse> {
    const { response, token } = await this.authService.loginCliente(body);
    res.cookie('extraplus_token', token, this.cookieOptions());
    return response;
  }

  @Post('register-cliente')
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async registrarCliente(
    @Body() body: RegistrarClienteDto,
    @Res({ passthrough: true }) res: any
  ): Promise<ClienteLoginResponse> {
    const { response, token } = await this.authService.registrarCliente(body);
    res.cookie('extraplus_token', token, this.cookieOptions());
    return response;
  }

  @Post('login-plataforma')
  async loginPlataforma(
    @Body() body: PlatformLoginDto,
    @Res({ passthrough: true }) res: any
  ): Promise<PlatformLoginResponse> {
    const { response, token } = await this.authService.loginPlataforma(body);
    res.cookie('extraplus_token', token, this.cookieOptions());
    return response;
  }
}
