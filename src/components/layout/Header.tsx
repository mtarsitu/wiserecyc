import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LogOut, User, Building2, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const navigate = useNavigate()
  const { profile, signOut, isSuperAdmin, userCompanies, switchCompany, companyId } = useAuthContext()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const getRoleBadge = () => {
    if (!profile) return null
    const roleLabels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      operator: 'Operator',
      viewer: 'Viewer',
    }
    return (
      <Badge variant={isSuperAdmin ? 'default' : 'secondary'}>
        {roleLabels[profile.role] || profile.role}
      </Badge>
    )
  }

  // Show company selector only if user has multiple companies
  const hasMultipleCompanies = userCompanies.length > 1

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-4">
        {hasMultipleCompanies ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span>{profile?.company?.name || 'Selecteaza compania'}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {userCompanies.map((uc) => (
                <DropdownMenuItem
                  key={uc.company_id}
                  onClick={() => switchCompany(uc.company_id)}
                  className={uc.company_id === companyId ? 'bg-accent' : ''}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  {uc.company.name}
                  {uc.company_id === companyId && (
                    <Badge variant="secondary" className="ml-2">Activ</Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : profile?.company ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{profile.company.name}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{profile?.full_name || profile?.email}</span>
          {getRoleBadge()}
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Deconectare">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
