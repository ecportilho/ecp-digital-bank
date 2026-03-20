import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Search, ArrowRight, CheckCircle } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { api, ApiError } from '../../services/api'
import { formatCurrency } from '../../lib/formatters'

interface PixKeyInfo {
  keyType: string
  keyValue: string
  holderName: string
}

interface TransferResult {
  transactionId: string
  amountCents: number
  balanceAfterCents: number
  counterpartName: string
}

type Step = 'key' | 'amount' | 'confirm' | 'success'

const KEY_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  email: 'Email',
  phone: 'Telefone',
  random: 'Chave aleatória',
}

export function PixEnviarPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('key')
  const [pixKey, setPixKey] = useState('')
  const [keyInfo, setKeyInfo] = useState<PixKeyInfo | null>(null)
  const [amountReais, setAmountReais] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TransferResult | null>(null)

  async function handleLookupKey() {
    setError(null)
    setIsLoading(true)
    try {
      const data = await api.get<PixKeyInfo>(`/api/pix/lookup?key=${encodeURIComponent(pixKey)}`)
      setKeyInfo(data)
      setStep('amount')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Chave Pix não encontrada')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleTransfer() {
    setError(null)
    const amountCents = Math.round(parseFloat(amountReais.replace(',', '.')) * 100)

    if (isNaN(amountCents) || amountCents <= 0) {
      setError('Informe um valor válido')
      return
    }

    setIsLoading(true)
    try {
      const data = await api.post<TransferResult>('/api/pix/transfer', {
        pixKey,
        amountCents,
        description: description || undefined,
      })
      setResult(data)
      setStep('success')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Erro ao realizar transferência')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-lime/10 rounded-control flex items-center justify-center text-lime">
          <Zap size={20} />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Enviar Pix</h1>
      </div>

      {/* Step: Enter Key */}
      {step === 'key' && (
        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-4">Para quem você quer enviar?</h2>
          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-control text-sm text-danger">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <Input
              label="Chave Pix"
              placeholder="CPF, email, telefone ou chave aleatória"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              leftIcon={<Search size={16} />}
            />
            <Button
              onClick={handleLookupKey}
              isLoading={isLoading}
              disabled={!pixKey.trim()}
              className="w-full"
              rightIcon={<ArrowRight size={16} />}
            >
              Continuar
            </Button>
          </div>
        </Card>
      )}

      {/* Step: Enter Amount */}
      {step === 'amount' && keyInfo && (
        <Card>
          <div className="mb-4 p-3 bg-secondary-bg rounded-control">
            <p className="text-xs text-text-tertiary mb-1">Destinatário</p>
            <p className="font-semibold text-text-primary">{keyInfo.holderName}</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {KEY_TYPE_LABELS[keyInfo.keyType] ?? keyInfo.keyType}: {keyInfo.keyValue}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-control text-sm text-danger">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Valor (R$)"
              placeholder="0,00"
              value={amountReais}
              onChange={(e) => setAmountReais(e.target.value)}
              inputMode="decimal"
            />
            <Input
              label="Descrição (opcional)"
              placeholder="Para que é essa transferência?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep('key')} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={!amountReais.trim()}
                className="flex-1"
              >
                Revisar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && keyInfo && (
        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-4">Confirmar transferência</h2>

          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-control text-sm text-danger">
              {error}
            </div>
          )}

          <div className="space-y-3 mb-6">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-text-tertiary">Para</span>
              <span className="text-sm font-medium text-text-primary">{keyInfo.holderName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-text-tertiary">Chave Pix</span>
              <span className="text-sm text-text-secondary">{keyInfo.keyValue}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-text-tertiary">Valor</span>
              <span className="text-lg font-bold text-text-primary">
                {formatCurrency(Math.round(parseFloat(amountReais.replace(',', '.')) * 100))}
              </span>
            </div>
            {description && (
              <div className="flex justify-between py-2">
                <span className="text-sm text-text-tertiary">Descrição</span>
                <span className="text-sm text-text-secondary">{description}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('amount')} className="flex-1">
              Voltar
            </Button>
            <Button onClick={handleTransfer} isLoading={isLoading} className="flex-1">
              Confirmar Pix
            </Button>
          </div>
        </Card>
      )}

      {/* Step: Success */}
      {step === 'success' && result && (
        <Card variant="highlighted">
          <div className="text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-success" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-1">Pix enviado!</h2>
            <p className="text-text-secondary text-sm mb-4">
              Transferência realizada com sucesso
            </p>
            <p className="text-2xl font-bold text-lime mb-1">
              {formatCurrency(result.amountCents)}
            </p>
            <p className="text-xs text-text-tertiary mb-6">
              para {result.counterpartName}
            </p>
            <p className="text-sm text-text-secondary mb-6">
              Saldo atual:{' '}
              <span className="font-semibold text-text-primary">
                {formatCurrency(result.balanceAfterCents)}
              </span>
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => navigate('/')} className="flex-1">
                Início
              </Button>
              <Button
                onClick={() => {
                  setStep('key')
                  setPixKey('')
                  setKeyInfo(null)
                  setAmountReais('')
                  setDescription('')
                  setResult(null)
                  setError(null)
                }}
                className="flex-1"
              >
                Novo Pix
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
