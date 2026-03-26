import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Zap, MessageCircle, User } from 'lucide-react'

const mobileNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Início', end: true },
  { to: '/extrato', icon: ArrowLeftRight, label: 'Extrato', end: false },
  { to: '/pix/enviar', icon: Zap, label: 'Pix', end: false },
  { to: '/chat', icon: MessageCircle, label: 'Chat IA', end: false },
  { to: '/perfil', icon: User, label: 'Perfil', end: false },
]

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-border z-40">
      <div className="flex items-center justify-around px-2 py-2">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-control text-xs font-medium transition-colors ${
                isActive ? 'text-lime' : 'text-text-tertiary'
              }`
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
