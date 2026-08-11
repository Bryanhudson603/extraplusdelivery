import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { getAuthCookieOptions, readRawCookie, signAuthToken, type AuthTokenPayload } from '../../auth/auth-token';
import { GoogleAuthService } from './google-auth.service';
import { ExchangeGoogleTicketDto } from './auth.dto';
import type { ClienteLoginResponse } from './auth.dto';

const OAUTH_STATE_COOKIE = 'extraplus_oauth_state';

function getFrontendBaseUrl(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/$/, '');
}

function oauthStateCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    maxAge: 5 * 60 * 1000,
    path: '/'
  };
}

@Controller('auth/google')
export class GoogleAuthController {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  @Get()
  @Throttle({ default: { limit: 20, ttl: 60 } })
  iniciar(@Res() res: any) {
    if (!this.googleAuthService.isConfigured()) {
      return res.redirect(`${getFrontendBaseUrl()}/login?error=google_not_configured`);
    }

    const { url, state } = this.googleAuthService.buildAuthorizationUrl();
    res.cookie(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions());
    return res.redirect(url);
  }

  @Get('callback')
  @Throttle({ default: { limit: 20, ttl: 60 } })
  async callback(@Req() req: any, @Res() res: any, @Query('code') code?: string, @Query('state') state?: string, @Query('error') error?: string) {
    const frontendUrl = getFrontendBaseUrl();
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });

    if (error) {
      return res.redirect(`${frontendUrl}/login?error=google_auth_denied`);
    }

    const stateCookie = readRawCookie({ headers: req.headers }, OAUTH_STATE_COOKIE);
    if (!code || !state || !stateCookie || state !== stateCookie) {
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }

    try {
      const { ticket } = await this.googleAuthService.handleCallback(code);
      return res.redirect(`${frontendUrl}/login/google/callback?ticket=${encodeURIComponent(ticket)}`);
    } catch {
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  }

  @Post('exchange')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  async exchange(
    @Body() body: ExchangeGoogleTicketDto,
    @Res({ passthrough: true }) res: any
  ): Promise<ClienteLoginResponse> {
    const { response, clienteId, lojaId, telefone } = await this.googleAuthService.exchangeTicket(body.ticket);

    const payload: AuthTokenPayload = {
      sub: clienteId,
      tipo: 'cliente',
      lojaId,
      telefone
    };
    const token = signAuthToken(payload, '7d');
    res.cookie('extraplus_token', token, getAuthCookieOptions());

    return response;
  }
}
