import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, CreditCard } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ApiError } from '../services/api'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function formatCPFInput(value: string): string {
    return value.replace(/\D/g, '').slice(0, 11)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await register({ name, email, cpf, password })
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Erro ao criar conta. Tente novamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex items-center gap-3 justify-center mb-8">
        <div className="w-10 h-10 bg-lime rounded-xl flex items-center justify-center">
          <span className="text-background font-bold text-lg">E</span>
        </div>
        <span className="font-bold text-text-primary text-2xl">ECP Bank</span>
      </div>

      <div className="bg-surface border border-border rounded-card p-8">
        <h1 className="text-xl font-bold text-text-primary mb-1">Criar conta</h1>
        <p className="text-text-secondary text-sm mb-6">Abra sua conta digital gratuita</p>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-control text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome completo"
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<User size={16} />}
            autoComplete="name"
            required
          />

          <Input
            label="Email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail size={16} />}
            autoComplete="email"
            required
          />

          <Input
            label="CPF"
            type="text"
            placeholder="00000000000"
            value={cpf}
            onChange={(e) => setCpf(formatCPFInput(e.target.value))}
            leftIcon={<CreditCard size={16} />}
            hint="Somente números, sem pontos ou traços"
            inputMode="numeric"
            required
          />

          <Input
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={16} />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            hint="Deve conter maiúsculas, minúsculas, números e símbolos"
            autoComplete="new-password"
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full"
          >
            Criar conta
          </Button>
        </form>

        <p className="text-center text-sm text-text-tertiary mt-6">
          Já tem conta?{' '}
          <Link to="/login" className="text-lime hover:text-lime-pressed font-medium">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}
