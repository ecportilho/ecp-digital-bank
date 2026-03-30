import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, ArrowLeftRight, Shield, Sparkles, CheckCheck } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../services/api'
import { formatRelativeTime } from '../../lib/formatters'
import { ProfileSwitcher } from './ProfileSwitcher'

interface Notification {
  id: string
  userId: string
  title: string
  body: string
  type: 'transaction' | 'security' | 'marketing' | 'system'
  isRead: boolean
  createdAt: string
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

interface UnreadCountResponse {
  unreadCount: number
}

const typeIcons: Record<Notification['type'], typeof Bell> = {
  transaction: ArrowLeftRight,
  security: Shield,
  system: Bell,
  marketing: Sparkles,
}

export function Header() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  })()

  // Fetch unread count on mount and periodically
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await api.get<UnreadCountResponse>('/api/notifications/unread-count')
      setUnreadCount(data.unreadCount)
    } catch {
      // Silently fail — badge just won't update
    }
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30_000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Fetch recent notifications when dropdown opens
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.get<NotificationsResponse>('/api/notifications?limit=5')
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch {
      // Silently fail — dropdown will show empty state
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleBellClick = () => {
    const willOpen = !isOpen
    setIsOpen(willOpen)
    if (willOpen) {
      fetchNotifications()
    }
  }

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/notifications/read-all')
      setUnreadCount(0)
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      )
    } catch {
      // Silently fail
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
      <div className="flex items-center gap-4">
        <ProfileSwitcher />
        {user && (
          <p className="text-sm text-text-secondary hidden md:block">
            {greeting},{' '}
            <span className="font-semibold text-text-primary">
              {user.name.split(' ')[0]}
            </span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleBellClick}
            className="relative p-2 text-text-tertiary hover:text-text-primary hover:bg-secondary-bg rounded-control transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none bg-lime text-background rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-card shadow-2xl z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-text-primary">
                  Notificações
                </h3>
                {unreadCount > 0 && (
                  <span className="text-xs text-text-tertiary">
                    {unreadCount} {unreadCount === 1 ? 'não lida' : 'não lidas'}
                  </span>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-80 overflow-y-auto">
                {isLoading ? (
                  <div className="px-4 py-8 text-center text-sm text-text-tertiary">
                    Carregando...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-text-tertiary">
                    Nenhuma notificação
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const Icon = typeIcons[notification.type] || Bell
                    return (
                      <div
                        key={notification.id}
                        className={`flex gap-3 px-4 py-3 hover:bg-secondary-bg transition-colors cursor-pointer ${
                          !notification.isRead ? 'border-l-2 border-l-lime' : 'border-l-2 border-l-transparent'
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <Icon size={16} className="text-text-tertiary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm truncate ${
                              !notification.isRead
                                ? 'font-semibold text-text-primary'
                                : 'font-medium text-text-secondary'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                            {notification.body}
                          </p>
                          <p className="text-[11px] text-text-tertiary mt-1">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && unreadCount > 0 && (
                <div className="border-t border-border px-4 py-2.5">
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center justify-center gap-1.5 w-full text-xs font-medium text-lime hover:text-lime/80 transition-colors"
                  >
                    <CheckCheck size={14} />
                    Marcar todas como lidas
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
