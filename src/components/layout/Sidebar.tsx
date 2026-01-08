import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Receipt,
  Banknote,
  Scissors,
  Package,
  Users,
  Building2,
  FileText,
  Truck,
  Tags,
  BarChart3,
  Settings,
  Shield,
  UserCog,
} from 'lucide-react'

type NavItem =
  | { name: string; href: string; icon: typeof LayoutDashboard; adminOnly?: boolean }
  | { type: 'separator' }

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Achizitii', href: '/achizitii', icon: ShoppingCart },
  { name: 'Vanzari', href: '/vanzari', icon: TrendingUp },
  { name: 'Cheltuieli', href: '/cheltuieli', icon: Receipt },
  { name: 'Casierie', href: '/casierie', icon: Banknote },
  { name: 'Dezmembrari', href: '/dezmembrari', icon: Scissors },
  { name: 'Stocuri', href: '/stocuri', icon: Package },
  { type: 'separator' },
  { name: 'Furnizori', href: '/furnizori', icon: Users },
  { name: 'Clienti', href: '/clienti', icon: Building2 },
  { name: 'Contracte', href: '/contracte', icon: FileText },
  { name: 'Transportatori', href: '/transportatori', icon: Truck },
  { name: 'Materiale', href: '/materiale', icon: Tags },
  { name: 'Salariati', href: '/salariati', icon: UserCog },
  { type: 'separator' },
  { name: 'Rapoarte', href: '/rapoarte', icon: BarChart3 },
  { name: 'Setari', href: '/setari', icon: Settings },
  { type: 'separator' },
  { name: 'Administrare', href: '/admin', icon: Shield, adminOnly: true },
]

export function Sidebar() {
  const { isSuperAdmin } = useAuthContext()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Package className="h-8 w-8 text-primary" />
        <span className="text-xl font-bold">WiseRecyc</span>
      </div>
      <nav className="flex flex-col gap-1 p-4">
        {navigation.map((item, index) => {
          if ('type' in item && item.type === 'separator') {
            return <div key={index} className="my-2 border-t" />
          }
          if (!('href' in item)) return null
          // Hide admin-only items from non-admins
          if (item.adminOnly && !isSuperAdmin) return null
          const Icon = item.icon
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
