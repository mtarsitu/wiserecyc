import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Plus } from 'lucide-react'

export function TransportersPage() {
  return (
    <div>
      <Header title="Transportatori" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lista transportatori</h2>
            <p className="text-sm text-muted-foreground">
              Gestioneaza transportatorii
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Transportator nou
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transportatori</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Nu exista transportatori inregistrati. Apasa butonul "Transportator nou" pentru a adauga.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
