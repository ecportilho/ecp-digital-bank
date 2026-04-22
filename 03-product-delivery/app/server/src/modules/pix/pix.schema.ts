import { z } from 'zod'

export const PixKeyTypeEnum = z.enum(['cpf', 'email', 'phone', 'random'])

export const CreatePixKeySchema = z
  .object({
    keyType: PixKeyTypeEnum,
    keyValue: z.string().default(''),
  })
  .refine((data) => data.keyType === 'random' || data.keyValue.length >= 1, {
    message: 'keyValue é obrigatório para tipos cpf/email/phone',
    path: ['keyValue'],
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

export const PixPayBrcodeSchema = z.object({
  brcode: z.string().min(50, 'BRCode muito curto').max(1000, 'BRCode muito longo'),
  // Obrigatório se o BRCode for estático (sem valor embutido); ignorado caso contrário
  amountCents: z
    .number()
    .int('Valor deve ser inteiro (centavos)')
    .positive('Valor deve ser positivo')
    .optional(),
  description: z.string().max(140).optional(),
  reinforcedToken: z.string().optional(),
})

export const PixParseBrcodeSchema = z.object({
  brcode: z.string().min(1, 'BRCode é obrigatório').max(1000),
})

export type CreatePixKeyInput = z.infer<typeof CreatePixKeySchema>
export type PixTransferInput = z.infer<typeof PixTransferSchema>
export type PixQrCodeInput = z.infer<typeof PixQrCodeSchema>
export type PixPayBrcodeInput = z.infer<typeof PixPayBrcodeSchema>
export type PixParseBrcodeInput = z.infer<typeof PixParseBrcodeSchema>
export type PixKey = z.infer<typeof PixKeySchema>
export type PixTransferResponse = z.infer<typeof PixTransferResponseSchema>
