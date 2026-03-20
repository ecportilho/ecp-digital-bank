import { useState, useEffect } from 'react'
import { FileText, X, CheckCircle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { api, ApiError } from '../services/api'
import { formatCurrency, formatDate } from '../lib/formatters'

interface ScheduledPayment {
  id: string
  amountCents: number
  description: string
  status: string
  scheduledFor: string | null
}

interface PayResult {
  transactionId: string
  status: string
  amountCents: number
  balanceAfterCents?: number
  scheduledFor?: string
}

export function PagamentosPage() {
  const [boletoCode, setBoletoCode] = useState('')
  const [amountReais, setAmountReais] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<PayResult | null>(null)
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([])
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(true)

  async function loadScheduled() {
    try {
      const data = await api.get<{ payments: ScheduledPayment[] }>('/api/payments/scheduled')
      setScheduledPayments(data.payments)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingScheduled(false)
    }
  }

  useEffect(() => { loadScheduled() }, [])

  async function handlePay() {
    setError(null)
    const amountCents = Math.round(parseFloat(amountReais.replace(',', '.')) * 100)

    if (isNaN(amountCents) || amountCents <= 0) {
      setError('Informe um valor válido')
      return
    }

    setIsLoading(true)
    try {
      const result = await api.post<PayResult>('/api/payments/boleto', {
        boletoCode,
        amountCents,
        description: description || undefined,
        scheduledFor: scheduledFor || undefined,
      })
      setSuccess(result)
      setBoletoCode('')
      setAmountReais('')
      setDescription('')
      setScheduledFor('')
      await loadScheduled()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Erro ao pagar boleto')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCancel(paymentId: string) {
    if (!confirm('Deseja cancelar este agendamento?')) return
    try {
      await api.delete(`/api/payments/scheduled/${paymentId}`)
      await loadScheduled()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-info/10 rounded-control flex items-center justify-center text-info">
          <FileText size={20} />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Pagamentos</h1>
      </div>

      {/* Pay boleto form */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-4">Pagar boleto</h2>

        {success && (
          <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-control text-sm text-success flex items-center gap-2">
            <CheckCircle size={16} />
            {success.status === 'pending'
              ? `Boleto agendado para ${success.scheduledFor ? formatDate(success.scheduledFor) : 'data futura'}`
              : `Boleto pago! Saldo após: ${success.balanceAfterCents !== undefined ? formatCurrency(success.balanceAfterCents) : '--'}`}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-control text-sm text-danger">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Código do boleto"
            placeholder="Cole o código de barras aqui"
            value={boletoCode}
            onChange={(e) => setBoletoCode(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor (R$)"
              placeholder="0,00"
              value={amountReais}
              onChange={(e) => setAmountReais(e.target.value)}
              inputMode="decimal"
            />
            <Input
              label="Agendar para (opcional)"
              type="date"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value ? new Date(e.target.value + 'T12:00:00').toISOString() : '')}
            />
          </div>
          <Input
            label="Descrição (opcional)"
            placeholder="Nome do boleto"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button
            onClick={handlePay}
            isLoading={isLoading}
            disabled={!boletoCode.trim() || !amountReais.trim()}
            className="w-full"
          >
            {scheduledFor ? 'Agendar pagamento' : 'Pagar agora'}
          </Button>
        </div>
      </Card>

      {/* Scheduled payments */}
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-3">Agendamentos</h2>
        <Card padding="none">
          {isLoadingScheduled ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" />
            </div>
          ) : scheduledPayments.length === 0 ? (
            <div className="p-6 text-center text-text-tertiary text-sm">
              Nenhum pagamento agendado
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {scheduledPayments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{payment.description}</p>
                    {payment.scheduledFor && (
                      <p className="text-xs text-text-tertiary mt-0.5">
                        Agendado para {formatDate(payment.scheduledFor)}
                      </p>
                    )}
                    <Badge variant="warning" className="mt-1">Pendente</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-text-primary">
                      {formatCurrency(payment.amountCents)}
                    </span>
                    <button
                      onClick={() => handleCancel(payment.id)}
                      className="p-1.5 text-text-tertiary hover:text-danger transition-colors"
                      aria-label="Cancelar agendamento"
                    >
                      <X size={16} />
                    </button>
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
