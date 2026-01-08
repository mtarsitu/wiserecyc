import { Header } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import {
  FileText,
  BarChart3,
  Users,
  Package,
  TrendingUp,
  Calculator,
  Receipt,
  Wallet
} from 'lucide-react'
import { Link } from 'react-router-dom'

const reports = [
  {
    title: 'Situatie Contracte',
    description: 'Achizitii, vanzari si cheltuieli pe fiecare contract',
    icon: FileText,
    href: '/rapoarte/contracte',
  },
  {
    title: 'Situatie DEEE',
    description: 'Raport separat pentru categoria DEEE',
    icon: BarChart3,
    href: '/rapoarte/deee',
  },
  {
    title: 'Situatie Furnizori',
    description: 'Sold si istoric pe fiecare furnizor',
    icon: Users,
    href: '/rapoarte/furnizori',
  },
  {
    title: 'Profit / Pierdere',
    description: 'Balanta achizitii vs vanzari pe material',
    icon: TrendingUp,
    href: '/rapoarte/profit',
  },
  {
    title: 'Preturi medii achizitie',
    description: 'Preturi medii pe zi, saptamana, luna per material',
    icon: Calculator,
    href: '/rapoarte/preturi',
  },
  {
    title: 'Stocuri materiale',
    description: 'Inventar curent pe locatii (curte, contract, DEEE)',
    icon: Package,
    href: '/rapoarte/stocuri',
  },
  {
    title: 'Cheltuieli pe categorii',
    description: 'Analiza cheltuielilor pe fiecare categorie',
    icon: Receipt,
    href: '/rapoarte/cheltuieli',
  },
  {
    title: 'Avansuri Salariati',
    description: 'Avansuri si salarii pe salariat, cu selectie 1-15 sau 16-31',
    icon: Wallet,
    href: '/rapoarte/avansuri',
  },
]

export function ReportsPage() {
  return (
    <div>
      <Header title="Rapoarte" />
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Rapoarte disponibile</h2>
          <p className="text-sm text-muted-foreground">
            Selecteaza tipul de raport pe care doresti sa il generezi
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => {
            const Icon = report.icon
            return (
              <Link key={report.href} to={report.href}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-base">{report.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{report.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
