import { useState } from 'react'
import { User, Mail, Phone, Shield, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { api, ApiError } from '../services/api'
import { formatCPF } from '../lib/formatters'

export function PerfilPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError(null)
    setProfileSuccess(null)
    setIsSavingProfile(true)

    try {
      await api.patch('/api/users/me', {
        name: name || undefined,
        phone: phone || undefined,
      })
      setProfileSuccess('Perfil atualizado com sucesso!')
    } catch (err) {
      if (err instanceof ApiError) {
        setProfileError(err.message)
      } else {
        setProfileError('Erro ao salvar perfil')
      }
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)
    setIsSavingPassword(true)

    try {
      await api.post('/api/users/me/change-password', {
        currentPassword,
        newPassword,
      })
      setPasswordSuccess('Senha alterada com sucesso!')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      if (err instanceof ApiError) {
        setPasswordError(err.message)
      } else {
        setPasswordError('Erro ao alterar senha')
      }
    } finally {
      setIsSavingPassword(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary">Perfil</h1>

      {/* Profile info */}
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-info/20 rounded-full flex items-center justify-center text-info font-bold text-2xl flex-shrink-0">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-text-primary">{user?.name}</p>
            <p className="text-sm text-text-secondary">{user?.email}</p>
            {user?.cpf && (
              <p className="text-xs text-text-tertiary mt-0.5">CPF: {formatCPF(user.cpf)}</p>
            )}
          </div>
        </div>

        {profileError && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-control text-sm text-danger">
            {profileError}
          </div>
        )}
        {profileSuccess && (
          <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-control text-sm text-success">
            {profileSuccess}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<User size={16} />}
          />
          <Input
            label="Telefone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+5511999887766"
            leftIcon={<Phone size={16} />}
          />
          <Input
            label="Email"
            value={user?.email ?? ''}
            leftIcon={<Mail size={16} />}
            disabled
            hint="Email não pode ser alterado"
          />
          <Button type="submit" isLoading={isSavingProfile}>
            Salvar perfil
          </Button>
        </form>
      </Card>

      {/* Change password */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Shield size={18} className="text-lime" />
          Alterar senha
        </h2>

        {passwordError && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-control text-sm text-danger">
            {passwordError}
          </div>
        )}
        {passwordSuccess && (
          <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-control text-sm text-success">
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Senha atual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <Input
            label="Nova senha"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="Mínimo 8 caracteres com maiúsculas, minúsculas, números e símbolos"
            autoComplete="new-password"
            required
          />
          <Button type="submit" isLoading={isSavingPassword}>
            Alterar senha
          </Button>
        </form>
      </Card>

      {/* Logout */}
      <Card>
        <Button
          variant="danger"
          onClick={handleLogout}
          leftIcon={<LogOut size={16} />}
          className="w-full"
        >
          Sair da conta
        </Button>
      </Card>
    </div>
  )
}
