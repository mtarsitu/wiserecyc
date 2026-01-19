import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Dialog } from '@/components/ui'
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { expenseCategoriesQueryOptions } from '@/features/expenses/queries'
import { useCreateExpenseCategory, useUpdateExpenseCategory, useDeleteExpenseCategory } from '@/features/expenses/mutations'
import { SerialPortTest } from './components/SerialPortTest'
import type { ExpenseCategory } from '@/types/database'

// Default categories to seed if empty
const DEFAULT_CATEGORIES = [
  'AVANS MARFA',
  'PLATA MARFA',
  'TUBURI OXIGEN',
  'BUTELII GAZ',
  'MOTORINA',
  'LEASING',
  'RCA',
  'ITP',
  'ASIGURARI',
  'SERVICE',
  'TRANSPORT EXTRA',
  'TRANSPORT',
  'BONUS',
  'DIVIDENDE',
  'CURIERAT',
  'INVESTITII',
  'PENALITATI',
  'ACTE FIRMA',
  'BENZINA',
  'CAIET DE SARCINI',
  'CAINI',
  'CANTAR',
  'CARTUS TONER',
  'COMISION',
  'COMISION BURSA',
  'CONSUMABILE',
  'CREDITE',
  'DOBANZI',
  'ELECTROZI',
  'IMPOZITE SI TAXE',
  'LICITATIE EXTRA',
  'LICITATII',
  'MANUSI',
  'PAPETARIE',
  'PRESTARI SERVICII',
  'ROVINIETE',
  'SOLUTIE DEGRESAT',
  'SPALATORIE UTILAJE',
  'TAXA MEDIU',
  'TAXA PARTICIPARE/CONTRAVALOARE DOCUMENTATIE',
  'TAXA POD CONSTANTA',
  'ULEI HIDRAULIC',
  'VSU',
]

export function SettingsPage() {
  const { companyId } = useAuthContext()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [isSeeding, setIsSeeding] = useState(false)

  // Query categories
  const { data: categories = [], isLoading } = useQuery(expenseCategoriesQueryOptions(companyId))

  // Mutations
  const createCategory = useCreateExpenseCategory()
  const updateCategory = useUpdateExpenseCategory()
  const deleteCategory = useDeleteExpenseCategory()

  const openDialog = (category?: ExpenseCategory) => {
    if (category) {
      setEditingCategory(category)
      setCategoryName(category.name)
    } else {
      setEditingCategory(null)
      setCategoryName('')
    }
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingCategory(null)
    setCategoryName('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId || !categoryName.trim()) return

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          name: categoryName.trim().toUpperCase(),
          companyId,
        })
      } else {
        await createCategory.mutateAsync({
          company_id: companyId,
          name: categoryName.trim().toUpperCase(),
        })
      }
      closeDialog()
    } catch (error) {
      console.error('Error saving category:', error)
      alert('Eroare la salvarea categoriei')
    }
  }

  const handleDelete = async (category: ExpenseCategory) => {
    if (!companyId) return
    if (!confirm(`Sigur doriti sa stergeti categoria "${category.name}"?`)) return

    try {
      await deleteCategory.mutateAsync({ id: category.id, companyId })
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Eroare la stergerea categoriei. Poate fi folosita de alte cheltuieli.')
    }
  }

  const seedDefaultCategories = async () => {
    if (!companyId) return
    if (!confirm('Doriti sa adaugati toate categoriile standard? Aceasta actiune va adauga doar categoriile care nu exista deja.')) return

    setIsSeeding(true)
    try {
      const existingNames = categories.map(c => c.name.toUpperCase())
      const newCategories = DEFAULT_CATEGORIES.filter(name => !existingNames.includes(name))

      for (const name of newCategories) {
        await createCategory.mutateAsync({
          company_id: companyId,
          name,
        })
      }

      alert(`Au fost adaugate ${newCategories.length} categorii noi.`)
    } catch (error) {
      console.error('Error seeding categories:', error)
      alert('Eroare la adaugarea categoriilor')
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div>
      <Header title="Setari" />
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Setari aplicatie</h2>
          <p className="text-sm text-muted-foreground">
            Configureaza setarile aplicatiei
          </p>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Profil utilizator</CardTitle>
              <CardDescription>
                Gestioneaza informatiile contului tau
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Setarile profilului vor fi disponibile in curand.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Categorii cheltuieli</CardTitle>
                <CardDescription>
                  Gestioneaza categoriile de cheltuieli ({categories.length} categorii)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {categories.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={seedDefaultCategories}
                    disabled={isSeeding}
                  >
                    {isSeeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Incarca categorii standard
                  </Button>
                )}
                <Button size="sm" onClick={() => openDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Categorie noua
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">
                    Nu exista categorii de cheltuieli. Adaugati categorii noi sau incarcati categoriile standard.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm font-medium truncate flex-1 mr-2">
                        {category.name}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openDialog(category)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(category)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conexiune Cântar</CardTitle>
              <CardDescription>
                Testează și configurează conexiunea cu cântarul prin port COM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SerialPortTest />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Category Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={closeDialog}
        title={editingCategory ? 'Editeaza categoria' : 'Categorie noua'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="categoryName" className="text-sm font-medium">
              Nume categorie *
            </label>
            <Input
              id="categoryName"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Ex: MOTORINA, SERVICE, TRANSPORT"
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Numele va fi convertit automat la majuscule
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Anuleaza
            </Button>
            <Button
              type="submit"
              disabled={createCategory.isPending || updateCategory.isPending || !categoryName.trim()}
            >
              {(createCategory.isPending || updateCategory.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingCategory ? 'Salveaza' : 'Adauga'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
