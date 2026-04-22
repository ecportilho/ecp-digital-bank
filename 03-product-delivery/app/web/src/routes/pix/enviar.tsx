import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Search, ArrowRight, CheckCircle, ClipboardPaste } from 'lucide-react'
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

interface BrcodeData {
  pixKey: string
  amountCents: number | null
  merchantName: string
  merchantCity: string
  txid: string | null
  description: string | null
  isStatic: boolean
  raw: string
}

type Mode = 'key' | 'brcode'
type Step = 'key' | 'amount' | 'confirm' | 'success' | 'brcode-input' | 'brcode-confirm'

const KEY_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  email: 'Email',
  phone: 'Telefone',
  random: 'Chave aleatória',
}

export function PixEnviarPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('key')
  const [step, setStep] = useState<Step>('key')
  const [pixKey, setPixKey] = useState('')
  const [keyInfo, setKeyInfo] = useState<PixKeyInfo | null>(null)
  const [amountReais, setAmountReais] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TransferResult | null>(null)

  // BRCode state
  const [brcodeInput, setBrcodeInput] = useState('')
  const [brcodeData, setBrcodeData] = useState<BrcodeData | null>(null)
  const [brcodeAmountReais, setBrcodeAmountReais] = useState('')

  function resetAll() {
    setStep(mode === 'key' ? 'key' : 'brcode-input')
    setPixKey('')
    setKeyInfo(null)
    setAmountReais('')
    setDescription('')
    setResult(null)
    setError(null)
    setBrcodeInput('')
    setBrcodeData(null)
    setBrcodeAmountReais('')
  }

  function switchMode(next: Mode) {
    if (next === mode) return
    setMode(next)
    setError(null)
    setResult(null)
    if (next === 'key') {
      setStep('key')
    } else {
      setStep('brcode-input')
    }
  }

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

  async function handleDecodeBrcode() {
    setError(null)
    setIsLoading(true)
    try {
      const res = await api.post<{ success: boolean; data: BrcodeData }>(
        '/api/pix/parse-brcode',
        { brcode: brcodeInput.trim() }
      )
      setBrcodeData(res.data)
      if (res.data.amountCents === null) {
        setBrcodeAmountReais('')
      } else {
        setBrcodeAmountReais((res.data.amountCents / 100).toFixed(2).replace('.', ','))
      }
      setStep('brcode-confirm')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Não foi possível decodificar o BRCode')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePayByBrcode() {
    if (!brcodeData) return
    setError(null)

    // Para BRCode estático, usa o valor digitado; dinâmico usa o embutido
    let payloadAmount: number | undefined
    if (brcodeData.amountCents === null) {
      const cents = Math.round(parseFloat(brcodeAmountReais.replace(',', '.')) * 100)
      if (isNaN(cents) || cents <= 0) {
        setError('Informe um valor válido')
        return
      }
      payloadAmount = cents
    }

    setIsLoading(true)
    try {
      const data = await api.post<TransferResult>('/api/pix/pay-by-brcode', {
        brcode: brcodeData.raw,
        amountCents: payloadAmount,
        description: description || undefined,
      })
      setResult(data)
      setStep('success')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Erro ao realizar pagamento')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const displayAmountCents = brcodeData?.amountCents
    ?? (brcodeAmountReais ? Math.round(parseFloat(brcodeAmountReais.replace(',', '.')) * 100) : 0)

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-lime/10 rounded-control flex items-center justify-center text-lime">
          <Zap size={20} />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Enviar Pix</h1>
      </div>

      {/* Mode Tabs — escondido na tela de sucesso */}
      {step !== 'success' && (
        <div className="flex gap-1 mb-4 p-1 bg-secondary-bg rounded-control">
          <button
            type="button"
            onClick={() => switchMode('key')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-control transition-colors ${
              mode === 'key'
                ? 'bg-primary-bg text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Por chave
          </button>
          <button
            type="button"
            onClick={() => switchMode('brcode')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-control transition-colors ${
              mode === 'brcode'
                ? 'bg-primary-bg text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Copia e cola
          </button>
        </div>
      )}

      {/* MODE: KEY — Step: Enter Key */}
      {mode === 'key' && step === 'key' && (
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

      {/* MODE: KEY — Step: Enter Amount */}
      {mode === 'key' && step === 'amount' && keyInfo && (
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

      {/* MODE: KEY — Step: Confirm */}
      {mode === 'key' && step === 'confirm' && keyInfo && (
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

      {/* MODE: BRCODE — Step: Input */}
      {mode === 'brcode' && step === 'brcode-input' && (
        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-4">Colar código Pix copia-e-cola</h2>
          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-control text-sm text-danger">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Código Pix
              </label>
              <textarea
                placeholder="Cole aqui o código Pix copia-e-cola"
                value={brcodeInput}
                onChange={(e) => setBrcodeInput(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 bg-primary-bg border border-border rounded-control text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime font-mono"
              />
              <p className="text-xs text-text-tertiary mt-1">
                O código começa com "0002..." e termina com 4 caracteres hexadecimais
              </p>
            </div>
            <Button
              onClick={handleDecodeBrcode}
              isLoading={isLoading}
              disabled={brcodeInput.trim().length < 50}
              className="w-full"
              leftIcon={<ClipboardPaste size={16} />}
              rightIcon={<ArrowRight size={16} />}
            >
              Decodificar
            </Button>
          </div>
        </Card>
      )}

      {/* MODE: BRCODE — Step: Confirm */}
      {mode === 'brcode' && step === 'brcode-confirm' && brcodeData && (
        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-4">Confirmar pagamento</h2>

          <div className="mb-4 p-3 bg-secondary-bg rounded-control">
            <p className="text-xs text-text-tertiary mb-1">Recebedor</p>
            <p className="font-semibold text-text-primary">{brcodeData.merchantName}</p>
            <p className="text-xs text-text-secondary mt-0.5">{brcodeData.merchantCity}</p>
            <p className="text-xs text-text-secondary mt-0.5 break-all">Chave: {brcodeData.pixKey}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-control text-sm text-danger">
              {error}
            </div>
          )}

          <div className="space-y-4 mb-6">
            {brcodeData.amountCents !== null ? (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-text-tertiary">Valor (fixo no código)</span>
                <span className="text-lg font-bold text-text-primary">
                  {formatCurrency(brcodeData.amountCents)}
                </span>
              </div>
            ) : (
              <Input
                label="Valor (R$) — código sem valor definido"
                placeholder="0,00"
                value={brcodeAmountReais}
                onChange={(e) => setBrcodeAmountReais(e.target.value)}
                inputMode="decimal"
              />
            )}
            <Input
              label="Descrição (opcional)"
              placeholder={brcodeData.description ?? 'Para que é esse pagamento?'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setStep('brcode-input')
                setError(null)
              }}
              className="flex-1"
            >
              Voltar
            </Button>
            <Button
              onClick={handlePayByBrcode}
              isLoading={isLoading}
              disabled={displayAmountCents <= 0}
              className="flex-1"
            >
              Confirmar pagamento
            </Button>
          </div>
        </Card>
      )}

      {/* Step: Success (shared) */}
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
              <Button onClick={resetAll} className="flex-1">
                Novo Pix
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
