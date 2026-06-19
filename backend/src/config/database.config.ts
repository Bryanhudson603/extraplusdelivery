import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

type DatabaseOptions = TypeOrmModuleOptions & DataSourceOptions;

function isTruthy(value?: string): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase());
}

function isPlaceholderHost(host: string): boolean {
  return ['base', 'host', 'database', 'db'].includes(host.trim().toLowerCase());
}

function buildSslConfig() {
  const shouldUseSsl =
    isTruthy(process.env.DB_SSL) ||
    process.env.NODE_ENV === 'production' ||
    (process.env.DATABASE_URL || '').toLowerCase().includes('sslmode=require');

  if (!shouldUseSsl) {
    return false;
  }

  const rejectUnauthorized = isTruthy(process.env.DB_SSL_REJECT_UNAUTHORIZED);
  return { rejectUnauthorized };
}

function ensureValidDatabaseUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(
      'DATABASE_URL inválida. Use o formato postgres://usuario:senha@host:5432/database.'
    );
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL inválida. O protocolo deve ser postgres:// ou postgresql://.');
  }

  if (!parsed.hostname || isPlaceholderHost(parsed.hostname)) {
    throw new Error(
      `DATABASE_URL inválida. Host "${parsed.hostname || '(vazio)'}" não é válido para produção.`
    );
  }

  if (!parsed.pathname || parsed.pathname === '/') {
    throw new Error('DATABASE_URL inválida. O nome do banco precisa estar presente na URL.');
  }

  return rawUrl;
}

function ensureValidSplitDatabaseEnv() {
  const host = process.env.DB_HOST;
  if (!host) {
    throw new Error('Configuração de banco incompleta. Defina DATABASE_URL ou DB_HOST.');
  }
  if (isPlaceholderHost(host)) {
    throw new Error(`DB_HOST inválido para produção: "${host}".`);
  }
  if (!process.env.DB_USER || !process.env.DB_NAME) {
    throw new Error('Configuração de banco incompleta. Defina DB_USER e DB_NAME.');
  }
}

export function hasDatabaseConfig(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.DB_HOST);
}

export function getDatabaseConfigError(): string | null {
  try {
    if (process.env.DATABASE_URL) {
      ensureValidDatabaseUrl(process.env.DATABASE_URL);
      return null;
    }

    ensureValidSplitDatabaseEnv();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Configuração de banco inválida.';
  }
}

export function createDatabaseOptions(): DatabaseOptions {
  const ssl = buildSslConfig();

  if (process.env.DATABASE_URL) {
    return {
      type: 'postgres',
      url: ensureValidDatabaseUrl(process.env.DATABASE_URL),
      ssl,
      extra: ssl ? { ssl } : undefined,
      autoLoadEntities: true,
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      migrationsRun: true,
      synchronize: false
    };
  }

  ensureValidSplitDatabaseEnv();

  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USER,
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME,
    ssl,
    extra: ssl ? { ssl } : undefined,
    autoLoadEntities: true,
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsRun: true,
    synchronize: false
  };
}
