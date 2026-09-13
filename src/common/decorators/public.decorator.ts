import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca un endpoint como público, exceptuándolo del JwtAuthGuard global.
 * Uso: @Public() en login, healthcheck, etc.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
