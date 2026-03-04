import { getDb } from '../../database/connection.js'
import { Errors } from '../../shared/errors/app-error.js'
import type { ListNotificationsQuery } from './notifications.schema.js'

interface NotificationRow {
  id: string
  user_id: string
  title: string
  body: string
  type: string
  is_read: number
  created_at: string
}

function toNotificationResponse(row: NotificationRow) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    type: row.type,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  }
}

export class NotificationsService {
  listNotifications(userId: string, query: ListNotificationsQuery) {
    const db = getDb()

    const conditions: string[] = ['user_id = ?']
    const params: unknown[] = [userId]

    if (query.unreadOnly) {
      conditions.push('is_read = 0')
    }

    const where = conditions.join(' AND ')
    const offset = (query.page - 1) * query.limit

    const total = (
      db.prepare(`SELECT COUNT(*) as count FROM notifications WHERE ${where}`).get(...params) as { count: number }
    ).count

    const rows = db
      .prepare(`
        SELECT * FROM notifications
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, query.limit, offset) as NotificationRow[]

    return {
      notifications: rows.map(toNotificationResponse),
      unreadCount: (db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId) as { count: number }).count,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  }

  markAsRead(userId: string, notificationId: string) {
    const db = getDb()

    const notification = db
      .prepare('SELECT id FROM notifications WHERE id = ? AND user_id = ?')
      .get(notificationId, userId) as { id: string } | undefined

    if (!notification) {
      throw Errors.notFound('Notificação não encontrada')
    }

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notificationId)

    return { message: 'Notificação marcada como lida' }
  }

  markAllAsRead(userId: string) {
    const db = getDb()
    const result = db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(userId)
    return { markedCount: result.changes }
  }

  getUnreadCount(userId: string) {
    const db = getDb()
    const result = db
      .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0')
      .get(userId) as { count: number }
    return { unreadCount: result.count }
  }
}
