import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Zap,
  CreditCard,
  FileText,
  User,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Início', exact: true },
  { to: '/extrato', icon: ArrowLeftRight, label: 'Extrato' },
  { to: '/pix/enviar', icon: Zap, label: 'Pix' },
  { to: '/cartoes', icon: CreditCard, label: 'Cartões' },
  { to: '/pagamentos', icon: FileText, label: 'Pagamentos' },
  { to: '/perfil', icon: User, label: 'Perfil' },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-surface border-r border-border h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-8 h-8 bg-lime rounded-lg flex items-center justify-center">
          <span className="text-background font-bold text-sm">E</span>
        </div>
        <span className="font-bold text-text-primary text-lg">ECP Bank</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-lime/10 text-lime'
                  : 'text-text-secondary hover:text-text-primary hover:bg-secondary-bg'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-border">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-info/20 rounded-full flex items-center justify-center text-info font-semibold text-sm flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
              <p className="text-xs text-text-tertiary truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-medium text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors w-full"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
