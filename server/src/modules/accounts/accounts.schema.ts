import { z } from 'zod'

export const AccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  agency: z.string(),
  number: z.string(),
  balanceCents: z.number().int(),
  dailyTransferLimitCents: z.number().int(),
  dailyTransferredCents: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const UpdateLimitSchema = z.object({
  dailyTransferLimitCents: z
    .number()
    .int()
    .min(0, 'Limite deve ser positivo')
    .max(10000000, 'Limite máximo é R$ 100.000,00'),
})

export type Account = z.infer<typeof AccountSchema>
export type UpdateLimitInput = z.infer<typeof UpdateLimitSchema>
