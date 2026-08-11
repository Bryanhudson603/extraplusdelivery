import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { getAuthCookieOptions } from '../../auth/auth-token';
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
    return getAuthCookieOptions();
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
