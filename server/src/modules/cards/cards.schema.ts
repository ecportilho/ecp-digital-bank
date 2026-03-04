import { z } from 'zod'

export const CardTypeEnum = z.enum(['physical', 'virtual'])

export const CardSchema = z.object({
  id: z.string(),
  userId: z.string(),
  accountId: z.string(),
  type: CardTypeEnum,
  last4: z.string().length(4),
  limitCents: z.number().int(),
  usedCents: z.number().int(),
  availableCents: z.number().int(),
  dueDay: z.number().int().min(1).max(28),
  isActive: z.boolean(),
  isBlocked: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const UpdateCardLimitSchema = z.object({
  limitCents: z
    .number()
    .int()
    .min(0, 'Limite deve ser positivo')
    .max(2000000, 'Limite máximo é R$ 20.000,00'),
})

export const BlockCardSchema = z.object({
  blocked: z.boolean(),
})

export const InvoiceSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  referenceMonth: z.string(),
  totalCents: z.number().int(),
  dueDate: z.string(),
  status: z.enum(['open', 'closed', 'paid', 'overdue']),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
})

export const CardPurchaseSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  invoiceId: z.string().nullable(),
  description: z.string(),
  merchantName: z.string(),
  merchantCategory: z.string().nullable(),
  amountCents: z.number().int(),
  installments: z.number().int(),
  currentInstallment: z.number().int(),
  status: z.enum(['pending', 'completed', 'cancelled', 'refunded']),
  purchasedAt: z.string(),
})

export type Card = z.infer<typeof CardSchema>
export type Invoice = z.infer<typeof InvoiceSchema>
export type CardPurchase = z.infer<typeof CardPurchaseSchema>
export type UpdateCardLimitInput = z.infer<typeof UpdateCardLimitSchema>
export type BlockCardInput = z.infer<typeof BlockCardSchema>
