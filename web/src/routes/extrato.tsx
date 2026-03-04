import { useEffect, useState } from 'react'
import { ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { api } from '../services/api'
import { formatCurrency, formatDateTime } from '../lib/formatters'

interface Transaction {
  id: string
  type: string
  category: string
  amountCents: number
  description: string
  counterpartName: string | null
  status: string
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const CATEGORY_LABELS: Record<string, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  card_purchase: 'Cartão',
  transfer: 'Transferência',
  deposit: 'Depósito',
  withdrawal: 'Saque',
  refund: 'Estorno',
  fee: 'Tarifa',
}

export function ExtratoPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<string>('')

  useEffect(() => {
    async function fetchTransactions() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' })
        if (typeFilter) params.set('type', typeFilter)

        const data = await api.get<{ transactions: Transaction[]; pagination: Pagination }>(
          `/api/transactions?${params}`
        )
        setTransactions(data.transactions)
        setPagination(data.pagination)
      } catch (err) {
        console.error('Error fetching transactions:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTransactions()
  }, [page, typeFilter])

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Extrato</h1>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
            className="bg-surface border border-border rounded-control text-text-secondary text-sm px-3 py-2 outline-none focus:border-lime"
          >
            <option value="">Todos</option>
            <option value="credit">Entradas</option>
            <option value="debit">Saídas</option>
          </select>
        </div>
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-text-tertiary">
            Nenhuma transação encontrada
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border/50">
              {transactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between p-4 hover:bg-secondary-bg/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-control flex items-center justify-center flex-shrink-0 ${
                        tx.type === 'credit'
                          ? 'bg-success/10 text-success'
                          : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {tx.type === 'credit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary line-clamp-1">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="default" className="text-xs">
                          {CATEGORY_LABELS[tx.category] ?? tx.category}
                        </Badge>
                        <span className="text-xs text-text-tertiary">{formatDateTime(tx.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p
                      className={`text-sm font-semibold ${
                        tx.type === 'credit' ? 'text-success' : 'text-text-primary'
                      }`}
                    >
                      {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amountCents)}
                    </p>
                    {tx.status === 'pending' && <Badge variant="warning">Pendente</Badge>}
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <p className="text-xs text-text-tertiary">
                  {pagination.total} transações no total
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs bg-surface border border-border rounded-control text-text-secondary disabled:opacity-50 hover:border-lime transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1.5 text-xs text-text-tertiary">
                    {page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="px-3 py-1.5 text-xs bg-surface border border-border rounded-control text-text-secondary disabled:opacity-50 hover:border-lime transition-colors"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
