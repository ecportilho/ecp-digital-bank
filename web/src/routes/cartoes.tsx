import { useEffect, useState } from 'react'
import { CreditCard, Lock, Unlock, Eye, EyeOff } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { api, ApiError } from '../services/api'
import { formatCurrency, formatDate } from '../lib/formatters'

interface CardData {
  id: string
  type: string
  last4: string
  limitCents: number
  usedCents: number
  availableCents: number
  dueDay: number
  isActive: boolean
  isBlocked: boolean
}

interface CardPurchase {
  id: string
  description: string
  merchantName: string
  amountCents: number
  status: string
  purchasedAt: string
}

interface InvoiceData {
  invoice: {
    id: string
    referenceMonth: string
    totalCents: number
    dueDate: string
    status: string
  }
  purchases: CardPurchase[]
}

export function CartoesPage() {
  const [cards, setCards] = useState<CardData[]>([])
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showNumber, setShowNumber] = useState(false)
  const [isBlocking, setIsBlocking] = useState(false)

  useEffect(() => {
    api
      .get<{ cards: CardData[] }>('/api/cards')
      .then((data) => {
        setCards(data.cards)
        if (data.cards.length > 0) {
          setSelectedCard(data.cards[0] ?? null)
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCard) return
    api
      .get<InvoiceData>(`/api/cards/${selectedCard.id}/invoice`)
      .then(setInvoiceData)
      .catch(console.error)
  }, [selectedCard])

  async function handleBlockToggle() {
    if (!selectedCard) return
    setIsBlocking(true)
    try {
      const updated = await api.patch<CardData>(`/api/cards/${selectedCard.id}/block`, {
        blocked: !selectedCard.isBlocked,
      })
      setSelectedCard(updated)
      setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch (err) {
      console.error(err)
    } finally {
      setIsBlocking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!selectedCard) {
    return (
      <div className="text-center text-text-tertiary py-16">
        Nenhum cartão encontrado
      </div>
    )
  }

  const usedPercentage = Math.round((selectedCard.usedCents / selectedCard.limitCents) * 100)

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary">Cartões</h1>

      {/* Card visual */}
      <div className="relative bg-gradient-to-br from-surface via-secondary-bg to-surface border border-lime/20 rounded-card p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-lime/5 rounded-full -translate-y-16 translate-x-16" />
        <div className="relative">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-xs text-text-tertiary mb-1">ECP Digital Bank</p>
              <Badge variant={selectedCard.isBlocked ? 'danger' : 'lime'}>
                {selectedCard.isBlocked ? 'Bloqueado' : selectedCard.type === 'virtual' ? 'Virtual' : 'Físico'}
              </Badge>
            </div>
            <CreditCard size={28} className="text-lime opacity-60" />
          </div>

          <div className="mb-6">
            {showNumber ? (
              <p className="text-xl font-mono text-text-primary tracking-widest">
                •••• •••• •••• {selectedCard.last4}
              </p>
            ) : (
              <p className="text-xl font-mono text-text-primary tracking-widest">
                •••• •••• •••• {selectedCard.last4}
              </p>
            )}
          </div>

          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-text-tertiary mb-0.5">Limite disponível</p>
              <p className="text-lg font-bold text-text-primary">
                {formatCurrency(selectedCard.availableCents)}
              </p>
              <p className="text-xs text-text-tertiary">
                de {formatCurrency(selectedCard.limitCents)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-tertiary mb-0.5">Vencimento</p>
              <p className="text-sm text-text-secondary">Dia {selectedCard.dueDay}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage bar */}
      <div>
        <div className="flex justify-between text-xs text-text-tertiary mb-2">
          <span>Utilizado: {formatCurrency(selectedCard.usedCents)}</span>
          <span>{usedPercentage}% do limite</span>
        </div>
        <div className="w-full bg-secondary-bg rounded-full h-2">
          <div
            className="h-2 rounded-full bg-lime transition-all"
            style={{ width: `${Math.min(usedPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant={selectedCard.isBlocked ? 'primary' : 'secondary'}
          leftIcon={selectedCard.isBlocked ? <Unlock size={14} /> : <Lock size={14} />}
          onClick={handleBlockToggle}
          isLoading={isBlocking}
          className="flex-1"
        >
          {selectedCard.isBlocked ? 'Desbloquear' : 'Bloquear'} cartão
        </Button>
      </div>

      {/* Invoice */}
      {invoiceData && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold text-text-primary">
              Fatura de {invoiceData.invoice.referenceMonth}
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="warning">
                Vence dia {formatDate(invoiceData.invoice.dueDate).split('/')[0]}
              </Badge>
              <span className="text-sm font-bold text-text-primary">
                {formatCurrency(invoiceData.invoice.totalCents)}
              </span>
            </div>
          </div>

          <Card padding="none">
            {invoiceData.purchases.length === 0 ? (
              <div className="p-6 text-center text-text-tertiary text-sm">
                Nenhuma compra nesta fatura
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {invoiceData.purchases.map((purchase) => (
                  <li key={purchase.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{purchase.description}</p>
                      <p className="text-xs text-text-tertiary">
                        {purchase.merchantName} · {formatDate(purchase.purchasedAt)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-text-primary ml-4">
                      {formatCurrency(purchase.amountCents)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
