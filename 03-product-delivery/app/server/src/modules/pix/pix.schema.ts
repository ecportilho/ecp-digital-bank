import { z } from 'zod'

export const PixKeyTypeEnum = z.enum(['cpf', 'email', 'phone', 'random'])

export const CreatePixKeySchema = z.object({
  keyType: PixKeyTypeEnum,
  keyValue: z.string().min(1),
})

export const PixTransferSchema = z.object({
  pixKey: z.string().min(1, 'Chave Pix é obrigatória'),
  amountCents: z
    .number()
    .int('Valor deve ser inteiro (centavos)')
    .min(1, 'Valor mínimo é R$ 0,01')
    .max(10000000, 'Valor máximo por transferência é R$ 100.000,00'),
  description: z.string().max(140).optional(),
  // RN-03: reinforced auth token for amounts > 500000 cents
  reinforcedToken: z.string().optional(),
})

export const PixKeySchema = z.object({
  id: z.string(),
  userId: z.string(),
  accountId: z.string(),
  keyType: PixKeyTypeEnum,
  keyValue: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
})

export const PixTransferResponseSchema = z.object({
  transactionId: z.string(),
  amountCents: z.number(),
  balanceAfterCents: z.number(),
  counterpartName: z.string(),
  pixKey: z.string(),
  createdAt: z.string(),
})

export const PixQrCodeSchema = z.object({
  amountCents: z
    .number()
    .int('Valor deve ser inteiro (centavos)')
    .min(1, 'Valor mínimo é R$ 0,01'),
  description: z.string().max(140).optional(),
})

export type CreatePixKeyInput = z.infer<typeof CreatePixKeySchema>
export type PixTransferInput = z.infer<typeof PixTransferSchema>
export type PixQrCodeInput = z.infer<typeof PixQrCodeSchema>
export type PixKey = z.infer<typeof PixKeySchema>
export type PixTransferResponse = z.infer<typeof PixTransferResponseSchema>
