import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ApiError } from '../services/api'

const DEMO_ACCOUNTS: Array<{ email: string; name: string; tag: string }> = [
  { email: 'marina@email.com', name: 'Marina Silva', tag: 'Titular padrão' },
  { email: 'carlos.mendes@email.com', name: 'Carlos Eduardo Mendes', tag: 'Consumidor' },
  { email: 'aisha.santos@email.com', name: 'Aisha Oliveira Santos', tag: 'Consumidora' },
  { email: 'roberto.tanaka@email.com', name: 'Roberto Yukio Tanaka', tag: 'Consumidor' },
  { email: 'francisca.lima@email.com', name: 'Francisca das Chagas Lima', tag: 'Consumidora' },
  { email: 'lucas.ndongo@email.com', name: 'Lucas Gabriel Ndongo', tag: 'Consumidor' },
  { email: 'patricia.werneck@email.com', name: 'Patrícia Werneck de Souza', tag: 'Consumidora' },
  { email: 'davi.ribeiro@email.com', name: 'Davi Henrique Ribeiro', tag: 'Consumidor' },
  { email: 'camila.duarte@email.com', name: 'Camila Ferreira Duarte', tag: 'Consumidora' },
  { email: 'mohammad.khalil@email.com', name: 'Mohammad Ali Khalil', tag: 'Consumidor' },
  { email: 'yuki.prado@email.com', name: 'Yuki Nakamura Prado', tag: 'Consumidora' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDemo, setShowDemo] = useState(false)

  function handleQuickLogin(demoEmail: string) {
    setEmail(demoEmail)
    setPassword('Senha@123')
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login({ email, password })
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Erro ao fazer login. Tente novamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex items-center gap-3 justify-center mb-8">
        <span className="text-lime text-3xl leading-none">&#x2B21;</span>
        <span className="font-bold text-text-primary text-2xl">ECP Bank</span>
      </div>

      <div className="bg-surface border border-border rounded-card p-8">
        <h1 className="text-xl font-bold text-text-primary mb-1">Bem-vindo de volta</h1>
        <p className="text-text-secondary text-sm mb-6">Acesse sua conta digital</p>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-control text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            placeholder="Sua senha"
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
            autoComplete="current-password"
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full"
          >
            Entrar
          </Button>
        </form>

        <p className="text-center text-sm text-text-tertiary mt-6">
          Não tem conta?{' '}
          <Link to="/register" className="text-lime hover:text-lime-pressed font-medium">
            Criar conta
          </Link>
        </p>
      </div>

      {/* Acesso rapido demo — escondido atras de link discreto */}
      {!showDemo && (
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => setShowDemo(true)}
            className="text-[11px] text-text-tertiary hover:text-text-secondary underline decoration-dotted underline-offset-4 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Mostrar contas de demo"
            title="Acesso rapido para demo"
          >
            ·
          </button>
        </div>
      )}

      {showDemo && (
        <div className="mt-4 bg-surface border border-border rounded-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-wider text-text-tertiary">
              Acesso rápido (demo) — Senha: Senha@123
            </div>
            <button
              type="button"
              onClick={() => setShowDemo(false)}
              className="text-text-tertiary hover:text-text-primary transition-colors"
              aria-label="Fechar acesso rapido"
            >
              <X size={14} />
            </button>
          </div>
          <div className="grid gap-1.5 max-h-64 overflow-y-auto pr-1">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => handleQuickLogin(account.email)}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-control text-left text-xs transition-colors border
                  ${email === account.email
                    ? 'bg-lime/10 border-lime text-lime'
                    : 'bg-background border-border text-text-primary hover:border-lime/40'}`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{account.name}</span>
                  <span className="text-[10px] text-text-tertiary truncate">{account.email}</span>
                </div>
                <span className="text-[10px] text-text-tertiary bg-secondary-bg px-2 py-0.5 rounded-full flex-shrink-0">
                  {account.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
