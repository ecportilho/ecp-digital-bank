import { z } from 'zod'

export const NotificationTypeEnum = z.enum(['transaction', 'security', 'marketing', 'system'])

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  type: NotificationTypeEnum,
  isRead: z.boolean(),
  createdAt: z.string(),
})

export const ListNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z.coerce.boolean().default(false),
})

export type Notification = z.infer<typeof NotificationSchema>
export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuerySchema>
