import { z } from 'zod'

export const EcpPayWebhookSchema = z.object({
  eventId: z.string().min(1, 'eventId é obrigatório'),
  referenceId: z.string().min(1, 'referenceId é obrigatório'),
  externalId: z.string().min(1, 'externalId é obrigatório'),
  amountCents: z.number().int().min(1),
  status: z.enum(['paid', 'refunded', 'failed']),
  paidAt: z.string().optional(),
})

export type EcpPayWebhookInput = z.infer<typeof EcpPayWebhookSchema>
