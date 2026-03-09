import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Zap,
  CreditCard,
  FileText,
  User,
  LogOut,
  Send,
  ArrowDownLeft,
  Key,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface NavItem {
  to: string
  icon: LucideIcon
  label: string
  exact?: boolean
  children?: { to: string; icon: LucideIcon; label: string }[]
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Início', exact: true },
  { to: '/extrato', icon: ArrowLeftRight, label: 'Extrato' },
  {
    to: '/pix/enviar', icon: Zap, label: 'Pix',
    children: [
      { to: '/pix/enviar', icon: Send, label: 'Enviar' },
      { to: '/pix/receber', icon: ArrowDownLeft, label: 'Receber' },
      { to: '/pix/chaves', icon: Key, label: 'Minhas Chaves' },
    ],
  },
  { to: '/cartoes', icon: CreditCard, label: 'Cartões' },
  { to: '/pagamentos', icon: FileText, label: 'Pagamentos' },
  { to: '/perfil', icon: User, label: 'Perfil' },
]

function PixSubMenu({ item }: { item: NavItem }) {
  const location = useLocation()
  const isPixActive = location.pathname.startsWith('/pix')
  const [isOpen, setIsOpen] = useState(isPixActive)

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-medium transition-colors w-full ${
          isPixActive
            ? 'bg-lime/10 text-lime'
            : 'text-text-secondary hover:text-text-primary hover:bg-secondary-bg'
        }`}
      >
        <item.icon size={18} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && item.children && (
        <div className="ml-4 mt-1 space-y-0.5">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-control text-sm transition-colors ${
                  isActive
                    ? 'text-lime font-medium'
                    : 'text-text-tertiary hover:text-text-primary hover:bg-secondary-bg'
                }`
              }
            >
              <child.icon size={16} />
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

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
        {navItems.map((item) =>
          item.children ? (
            <PixSubMenu key={item.to} item={item} />
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact ?? false}
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
          )
        )}
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
