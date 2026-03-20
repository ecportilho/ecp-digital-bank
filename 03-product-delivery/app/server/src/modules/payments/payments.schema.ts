import { z } from 'zod'

export const PayBoletoSchema = z.object({
  boletoCode: z
    .string()
    .min(44, 'Código de boleto inválido')
    .max(54, 'Código de boleto inválido'),
  amountCents: z
    .number()
    .int('Valor deve ser inteiro (centavos)')
    .min(1, 'Valor mínimo é R$ 0,01'),
  description: z.string().max(140).optional(),
  scheduledFor: z
    .string()
    .datetime({ message: 'Data de agendamento inválida' })
    .optional(),
})

export const ScheduledPaymentSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  type: z.literal('boleto'),
  amountCents: z.number().int(),
  description: z.string(),
  boletoCode: z.string().nullable(),
  status: z.enum(['pending', 'completed', 'failed', 'cancelled']),
  scheduledFor: z.string().nullable(),
  createdAt: z.string(),
})

export type PayBoletoInput = z.infer<typeof PayBoletoSchema>
export type ScheduledPayment = z.infer<typeof ScheduledPaymentSchema>
