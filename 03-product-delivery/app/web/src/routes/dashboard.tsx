import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  FileText,
  Eye,
  EyeOff,
  TrendingUp,
  CreditCard,
  Lock,
  Unlock,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { api } from '../services/api'
import { formatCurrency, formatRelativeTime } from '../lib/formatters'

interface DashboardData {
  balance: {
    balanceCents: number
    accountNumber: string
    agency: string
  }
  spending: {
    currentMonthCents: number
    previousMonthCents: number
    byCategory: Array<{
      category: string
      totalCents: number
      percentage: number
      count: number
    }>
  }
  recentTransactions: Array<{
    id: string
    type: string
    category: string
    amountCents: number
    description: string
    counterpartName: string | null
    createdAt: string
  }>
  card: {
    id: string
    last4: string
    limitCents: number
    usedCents: number
    availableCents: number
    isBlocked: boolean
  } | null
  notifications: {
    unreadCount: number
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  card_purchase: 'Cartao',
  transfer: 'Transferencia',
  deposit: 'Deposito',
  withdrawal: 'Saque',
  refund: 'Estorno',
  fee: 'Tarifa',
}

const CATEGORY_COLORS = [
  { bg: 'bg-lime', text: 'text-lime', hex: '#b7ff2a' },
  { bg: 'bg-info', text: 'text-info', hex: '#4da3ff' },
  { bg: 'bg-warning', text: 'text-warning', hex: '#ffcc00' },
  { bg: 'bg-danger', text: 'text-danger', hex: '#ff4d4d' },
  { bg: 'bg-success', text: 'text-success', hex: '#3dff8b' },
]

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [showBalance, setShowBalance] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const dashboardData = await api.get<DashboardData>('/api/dashboard')
        setData(dashboardData)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const quickActions = [
    { label: 'Enviar Pix', icon: Zap, to: '/pix/enviar', color: 'text-lime' },
    { label: 'Receber Pix', icon: ArrowDownLeft, to: '/pix/receber', color: 'text-success' },
    { label: 'Pagar boleto', icon: FileText, to: '/pagamentos', color: 'text-info' },
    { label: 'Extrato', icon: TrendingUp, to: '/extrato', color: 'text-warning' },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const topCategories = data?.spending.byCategory.slice(0, 5) ?? []
  const spendingVariation =
    data && data.spending.previousMonthCents > 0
      ? ((data.spending.currentMonthCents - data.spending.previousMonthCents) /
          data.spending.previousMonthCents) *
        100
      : null
  const cardUsagePercent =
    data?.card && data.card.limitCents > 0
      ? Math.round((data.card.usedCents / data.card.limitCents) * 100)
      : 0

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-text-primary">Inicio</h1>

      {/* Balance Card */}
      <Card variant="highlighted" className="bg-gradient-to-br from-surface to-secondary-bg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-text-secondary mb-1">Saldo disponivel</p>
            {showBalance ? (
              <p className="text-3xl font-bold text-text-primary">
                {data ? formatCurrency(data.balance.balanceCents) : '--'}
              </p>
            ) : (
              <p className="text-3xl font-bold text-text-primary tracking-widest">------</p>
            )}
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-2 text-text-tertiary hover:text-text-primary transition-colors"
            aria-label={showBalance ? 'Ocultar saldo' : 'Mostrar saldo'}
          >
            {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {data && (
          <p className="text-xs text-text-tertiary">
            Ag. {data.balance.agency} - Conta {data.balance.accountNumber}
          </p>
        )}
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Acoes rapidas</h2>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link key={action.to} to={action.to}>
              <div className="bg-surface border border-border rounded-card p-4 flex flex-col items-center gap-2 hover:border-lime/30 transition-colors cursor-pointer">
                <div className={`${action.color}`}>
                  <action.icon size={22} />
                </div>
                <span className="text-xs text-text-secondary font-medium text-center">
                  {action.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Spending by Category + Card Summary - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Spending by Category */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-text-secondary">Gastos do mes</h2>
            {spendingVariation !== null && (
              <Badge variant={spendingVariation <= 0 ? 'success' : 'danger'}>
                {spendingVariation > 0 ? '+' : ''}
                {spendingVariation.toFixed(1)}%
              </Badge>
            )}
          </div>

          {data && (
            <p className="text-xl font-bold text-text-primary mb-5">
              {showBalance ? formatCurrency(data.spending.currentMonthCents) : '------'}
            </p>
          )}

          {/* CSS Donut Chart */}
          {topCategories.length > 0 && (
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                  {(() => {
                    let cumulativePercent = 0
                    return topCategories.map((cat, i) => {
                      const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length].hex
                      const dashArray = `${cat.percentage} ${100 - cat.percentage}`
                      const dashOffset = 100 - cumulativePercent
                      cumulativePercent += cat.percentage
                      return (
                        <circle
                          key={cat.category}
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="none"
                          stroke={color}
                          strokeWidth="3.5"
                          strokeDasharray={dashArray}
                          strokeDashoffset={dashOffset}
                          strokeLinecap="round"
                        />
                      )
                    })
                  })()}
                  {/* Center background circle */}
                  <circle cx="18" cy="18" r="13" fill="#131c28" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-text-primary">
                    {topCategories.length}
                  </span>
                </div>
              </div>

              {/* Category Legend */}
              <div className="flex-1 space-y-2">
                {topCategories.map((cat, i) => {
                  const colorSet = CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                  return (
                    <div key={cat.category} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorSet.bg}`}
                        />
                        <span className="text-xs text-text-secondary truncate">
                          {CATEGORY_LABELS[cat.category] ?? cat.category}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-text-primary flex-shrink-0">
                        {cat.percentage.toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {topCategories.length === 0 && (
            <p className="text-sm text-text-tertiary text-center py-4">
              Nenhum gasto no periodo
            </p>
          )}
        </Card>

        {/* Card Summary */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={16} className="text-text-tertiary" />
            <h2 className="text-sm font-medium text-text-secondary">Seu cartao</h2>
          </div>

          {data?.card ? (
            <div className="space-y-4">
              {/* Card visual */}
              <div className="bg-gradient-to-br from-[#1a2740] to-[#0d1622] rounded-card p-4 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs text-text-tertiary font-medium tracking-wider uppercase">
                    ECP Digital Bank
                  </span>
                  {data.card.isBlocked ? (
                    <Badge variant="danger">
                      <Lock size={10} className="mr-1" />
                      Bloqueado
                    </Badge>
                  ) : (
                    <Badge variant="success">
                      <Unlock size={10} className="mr-1" />
                      Ativo
                    </Badge>
                  )}
                </div>
                <p className="text-lg font-mono text-text-primary tracking-widest">
                  **** **** **** {data.card.last4}
                </p>
              </div>

              {/* Limit usage bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-tertiary">Limite utilizado</span>
                  <span className="text-xs font-medium text-text-primary">
                    {cardUsagePercent}%
                  </span>
                </div>
                <div className="w-full h-2 bg-border/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      cardUsagePercent >= 90
                        ? 'bg-danger'
                        : cardUsagePercent >= 70
                          ? 'bg-warning'
                          : 'bg-lime'
                    }`}
                    style={{ width: `${Math.min(cardUsagePercent, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-text-tertiary">
                    Usado: {showBalance ? formatCurrency(data.card.usedCents) : '------'}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    Disponivel: {showBalance ? formatCurrency(data.card.availableCents) : '------'}
                  </span>
                </div>
              </div>

              {/* Total limit */}
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <span className="text-xs text-text-tertiary">Limite total</span>
                <span className="text-sm font-semibold text-text-primary">
                  {showBalance ? formatCurrency(data.card.limitCents) : '------'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CreditCard size={32} className="text-text-tertiary mb-3" />
              <p className="text-sm text-text-tertiary mb-3">
                Voce ainda nao possui um cartao
              </p>
              <Button variant="secondary" size="sm">
                Solicitar cartao
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-text-secondary">Ultimas transacoes</h2>
          <Link to="/extrato" className="text-xs text-lime hover:text-lime-pressed font-medium">
            Ver extrato completo
          </Link>
        </div>

        <Card padding="none">
          {(data?.recentTransactions.length ?? 0) === 0 ? (
            <div className="p-6 text-center text-text-tertiary text-sm">
              Nenhuma transacao encontrada
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {data?.recentTransactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between p-4 hover:bg-secondary-bg/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-control flex items-center justify-center flex-shrink-0 ${
                        tx.type === 'credit'
                          ? 'bg-success/10 text-success'
                          : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {tx.type === 'credit' ? (
                        <ArrowDownLeft size={16} />
                      ) : (
                        <ArrowUpRight size={16} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary line-clamp-1">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-text-tertiary">
                          {formatRelativeTime(tx.createdAt)}
                        </p>
                        <span className="text-text-tertiary">-</span>
                        <p className="text-xs text-text-tertiary">
                          {CATEGORY_LABELS[tx.category] ?? tx.category}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p
                      className={`text-sm font-semibold ${
                        tx.type === 'credit' ? 'text-success' : 'text-text-primary'
                      }`}
                    >
                      {tx.type === 'credit' ? '+' : '-'}
                      {formatCurrency(tx.amountCents)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
