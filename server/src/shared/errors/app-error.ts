import { ErrorCode } from './error-codes.js'

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: unknown

  constructor(code: ErrorCode, message: string, statusCode = 400, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype)
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined && { details: this.details }),
      },
    }
  }
}

// Convenience factories
export const Errors = {
  unauthorized: (message = 'Unauthorized') =>
    new AppError(ErrorCode.UNAUTHORIZED, message, 401),

  forbidden: (message = 'Forbidden') =>
    new AppError(ErrorCode.FORBIDDEN, message, 403),

  notFound: (message = 'Resource not found') =>
    new AppError(ErrorCode.NOT_FOUND, message, 404),

  insufficientBalance: () =>
    new AppError(ErrorCode.INSUFFICIENT_BALANCE, 'Saldo insuficiente', 422),

  dailyLimitExceeded: (limit: number) =>
    new AppError(
      ErrorCode.DAILY_LIMIT_EXCEEDED,
      `Limite diário de transferência excedido. Limite: R$ ${(limit / 100).toFixed(2)}`,
      422
    ),

  nightLimitExceeded: () =>
    new AppError(
      ErrorCode.NIGHT_LIMIT_EXCEEDED,
      'No período noturno (20h-6h), o limite máximo por Pix é R$ 1.000,00',
      422
    ),

  reinforcedAuthRequired: () =>
    new AppError(
      ErrorCode.REINFORCED_AUTH_REQUIRED,
      'Transferências acima de R$ 5.000,00 requerem autenticação reforçada',
      422
    ),

  rateLimitExceeded: () =>
    new AppError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Muitas transferências em um curto período. Tente novamente em alguns minutos.',
      429
    ),

  pixKeyLimitReached: () =>
    new AppError(
      ErrorCode.PIX_KEY_LIMIT_REACHED,
      'Limite máximo de 5 chaves Pix atingido',
      422
    ),

  pixKeyAlreadyExists: () =>
    new AppError(
      ErrorCode.PIX_KEY_ALREADY_EXISTS,
      'Esta chave Pix já está cadastrada',
      409
    ),
}
