import { PixService } from '../../../pix/pix.service.js'

export function sendPixTool(
  userId: string,
  accountId: string,
  pixKey: string,
  amountCents: number,
  description?: string,
) {
  const pixService = new PixService()

  try {
    const result = pixService.transfer(userId, accountId, {
      pixKey,
      amountCents,
      description: description ?? 'Transferência PIX via assistente',
    })

    return {
      success: true,
      transactionId: result.transactionId,
      amountCents: result.amountCents,
      amountFormatted: `R$ ${(result.amountCents / 100).toFixed(2).replace('.', ',')}`,
      balanceAfterCents: result.balanceAfterCents,
      balanceAfterFormatted: `R$ ${(result.balanceAfterCents / 100).toFixed(2).replace('.', ',')}`,
      counterpartName: result.counterpartName,
      pixKey: result.pixKey,
      createdAt: result.createdAt,
    }
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string }
    return {
      success: false,
      errorCode: error.code ?? 'UNKNOWN_ERROR',
      errorMessage: error.message ?? 'Erro ao processar transferência PIX.',
    }
  }
}
