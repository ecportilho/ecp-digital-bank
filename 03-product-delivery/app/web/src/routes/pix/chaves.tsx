import { useEffect, useState } from 'react'
import { Key, Plus, Trash2 } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { api, ApiError } from '../../services/api'

interface PixKey {
  id: string
  key_type: string
  key_value: string
  is_active: number
  created_at: string
}

const KEY_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  email: 'Email',
  phone: 'Telefone',
  random: 'Chave aleatória',
}

export function PixChavesPage() {
  const [keys, setKeys] = useState<PixKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [keyType, setKeyType] = useState<string>('email')
  const [keyValue, setKeyValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadKeys() {
    try {
      const data = await api.get<{ keys: PixKey[] }>('/api/pix/keys')
      setKeys(data.keys)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadKeys() }, [])

  async function handleAddKey() {
    setError(null)
    setIsSaving(true)
    try {
      await api.post('/api/pix/keys', {
        keyType,
        keyValue: keyType === 'random' ? '' : keyValue,
      })
      setIsAddModalOpen(false)
      setKeyValue('')
      setKeyType('email')
      await loadKeys()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Erro ao cadastrar chave')
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteKey(keyId: string) {
    if (!confirm('Deseja remover esta chave Pix?')) return
    try {
      await api.delete(`/api/pix/keys/${keyId}`)
      await loadKeys()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lime/10 rounded-control flex items-center justify-center text-lime">
            <Key size={20} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Minhas Chaves</h1>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          leftIcon={<Plus size={14} />}
          disabled={keys.length >= 5}
        >
          Adicionar
        </Button>
      </div>

      <p className="text-sm text-text-tertiary">
        {keys.length}/5 chaves cadastradas
      </p>

      <Card padding="none">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="p-6 text-center text-text-tertiary text-sm">
            Nenhuma chave Pix cadastrada
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {keys.map((key) => (
              <li key={key.id} className="flex items-center justify-between p-4">
                <div>
                  <Badge variant="lime" className="mb-1">
                    {KEY_TYPE_LABELS[key.key_type] ?? key.key_type}
                  </Badge>
                  <p className="text-sm font-medium text-text-primary">{key.key_value}</p>
                </div>
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="p-2 text-text-tertiary hover:text-danger transition-colors"
                  aria-label="Remover chave"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setError(null) }}
        title="Adicionar chave Pix"
      >
        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-control text-sm text-danger">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Tipo de chave
            </label>
            <select
              value={keyType}
              onChange={(e) => setKeyType(e.target.value)}
              className="w-full bg-secondary-bg border border-border rounded-control text-text-primary text-sm px-4 py-2.5 outline-none focus:border-lime"
            >
              <option value="cpf">CPF</option>
              <option value="email">Email</option>
              <option value="phone">Telefone</option>
              <option value="random">Chave aleatória</option>
            </select>
          </div>

          {keyType !== 'random' && (
            <Input
              label="Valor da chave"
              placeholder={
                keyType === 'cpf' ? '00000000000' :
                keyType === 'email' ? 'seu@email.com' :
                '+5511999887766'
              }
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
            />
          )}

          {keyType === 'random' && (
            <p className="text-sm text-text-tertiary">
              Uma chave aleatória será gerada automaticamente
            </p>
          )}

          <Button
            onClick={handleAddKey}
            isLoading={isSaving}
            disabled={keyType !== 'random' && !keyValue.trim()}
            className="w-full"
          >
            Cadastrar chave
          </Button>
        </div>
      </Modal>
    </div>
  )
}
