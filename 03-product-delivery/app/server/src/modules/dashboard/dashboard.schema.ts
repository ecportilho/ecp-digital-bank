import { z } from 'zod'

export const DashboardSchema = z.object({
  balance: z.object({
    balanceCents: z.number().int(),
    accountNumber: z.string(),
    agency: z.string(),
  }),
  spending: z.object({
    currentMonthCents: z.number().int(),
    previousMonthCents: z.number().int(),
    byCategory: z.array(z.object({
      category: z.string(),
      totalCents: z.number().int(),
      percentage: z.number(),
      count: z.number().int(),
    })),
  }),
  recentTransactions: z.array(z.object({
    id: z.string(),
    type: z.string(),
    category: z.string(),
    amountCents: z.number().int(),
    description: z.string(),
    counterpartName: z.string().nullable(),
    createdAt: z.string(),
  })),
  card: z.object({
    id: z.string(),
    last4: z.string(),
    limitCents: z.number().int(),
    usedCents: z.number().int(),
    availableCents: z.number().int(),
    isBlocked: z.boolean(),
  }).nullable(),
  notifications: z.object({
    unreadCount: z.number().int(),
  }),
})

export type Dashboard = z.infer<typeof DashboardSchema>
