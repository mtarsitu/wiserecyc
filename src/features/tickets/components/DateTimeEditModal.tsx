import { useState, useEffect } from 'react'
import { Dialog, Button, Input, Label } from '@/components/ui'

interface DateTimeEditModalProps {
  isOpen: boolean
  onClose: () => void
  currentDate: string
  currentTimeBrut: string
  currentTimeTara: string
  onSave: (date: string, timeBrut: string, timeTara: string) => void
}

export function DateTimeEditModal({
  isOpen,
  onClose,
  currentDate,
  currentTimeBrut,
  currentTimeTara,
  onSave
}: DateTimeEditModalProps) {
  const [date, setDate] = useState(currentDate)
  const [timeBrut, setTimeBrut] = useState(currentTimeBrut)
  const [timeTara, setTimeTara] = useState(currentTimeTara)

  // Reset values when modal opens
  useEffect(() => {
    if (isOpen) {
      setDate(currentDate)
      setTimeBrut(currentTimeBrut)
      setTimeTara(currentTimeTara)
    }
  }, [isOpen, currentDate, currentTimeBrut, currentTimeTara])

  const handleSave = () => {
    onSave(date, timeBrut, timeTara)
    onClose()
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Modificare Data/Ora Cantaririi"
      maxWidth="sm"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Modificarile afecteaza doar tichetul printat, nu si datele din baza de date.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-date">Data cantaririi</Label>
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-time-brut">Ora cantarire BRUT</Label>
              <Input
                id="edit-time-brut"
                type="time"
                value={timeBrut}
                onChange={(e) => setTimeBrut(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-time-tara">Ora cantarire TARA</Label>
              <Input
                id="edit-time-tara"
                type="time"
                value={timeTara}
                onChange={(e) => setTimeTara(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Anuleaza
          </Button>
          <Button type="button" onClick={handleSave}>
            Aplica modificarile
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
