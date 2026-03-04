import { z } from 'zod'

export const TransactionTypeEnum = z.enum(['credit', 'debit'])
export const TransactionCategoryEnum = z.enum([
  'pix', 'boleto', 'card_purchase', 'transfer', 'deposit', 'withdrawal', 'refund', 'fee'
])
export const TransactionStatusEnum = z.enum(['pending', 'completed', 'failed', 'cancelled'])

export const TransactionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  type: TransactionTypeEnum,
  category: TransactionCategoryEnum,
  amountCents: z.number().int(),
  balanceAfterCents: z.number().int(),
  description: z.string(),
  counterpartName: z.string().nullable(),
  counterpartDocument: z.string().nullable(),
  counterpartInstitution: z.string().nullable(),
  pixKey: z.string().nullable(),
  pixKeyType: z.string().nullable(),
  boletoCode: z.string().nullable(),
  status: TransactionStatusEnum,
  scheduledFor: z.string().nullable(),
  createdAt: z.string(),
})

export const ListTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: TransactionTypeEnum.optional(),
  category: TransactionCategoryEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export type Transaction = z.infer<typeof TransactionSchema>
export type ListTransactionsQuery = z.infer<typeof ListTransactionsQuerySchema>
