import { useEffect, useState } from 'react'
import { ArrowDownLeft, Copy, CheckCheck } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { api } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'

interface PixKey {
  id: string
  keyType: string
  key_value: string
  key_type: string
  is_active: number
}

const KEY_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  email: 'Email',
  phone: 'Telefone',
  random: 'Chave aleatória',
}

export function PixReceberPage() {
  const { user } = useAuth()
  const [keys, setKeys] = useState<PixKey[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api
      .get<{ keys: PixKey[] }>('/api/pix/keys')
      .then((data) => setKeys(data.keys))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  async function copyKey(value: string, id: string) {
    await navigator.clipboard.writeText(value)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-success/10 rounded-control flex items-center justify-center text-success">
          <ArrowDownLeft size={20} />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Receber Pix</h1>
      </div>

      <Card>
        <p className="text-sm text-text-secondary mb-2">Suas chaves Pix cadastradas</p>
        <p className="text-xs text-text-tertiary mb-4">
          Compartilhe uma das suas chaves para receber transferências
        </p>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-6 text-text-tertiary text-sm">
            Você não tem chaves Pix cadastradas.{' '}
            <a href="/pix/chaves" className="text-lime hover:text-lime-pressed">Cadastrar chave</a>
          </div>
        ) : (
          <ul className="space-y-2">
            {keys.map((key) => (
              <li
                key={key.id}
                className="flex items-center justify-between p-3 bg-secondary-bg rounded-control border border-border"
              >
                <div>
                  <Badge variant="default" className="mb-1">
                    {KEY_TYPE_LABELS[key.key_type] ?? key.key_type}
                  </Badge>
                  <p className="text-sm font-medium text-text-primary">{key.key_value}</p>
                </div>
                <button
                  onClick={() => copyKey(key.key_value, key.id)}
                  className="p-2 text-text-tertiary hover:text-lime transition-colors"
                  aria-label="Copiar chave"
                >
                  {copiedId === key.id ? (
                    <CheckCheck size={16} className="text-success" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {user && (
        <Card>
          <p className="text-sm text-text-secondary mb-3">Dados da conta</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-text-tertiary">Nome</span>
              <span className="text-sm text-text-primary font-medium">{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-text-tertiary">Banco</span>
              <span className="text-sm text-text-primary">ECP Digital Bank</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
