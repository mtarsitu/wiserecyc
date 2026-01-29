import { useState, useEffect } from 'react'
import { Dialog, Button, Input, Label } from '@/components/ui'
import type { TicketItem } from '../types'

interface EditedItemTime {
  timeBrut: string
  timeTara: string
  dateBrut: string
  dateTara: string
}

interface DateTimeEditModalProps {
  isOpen: boolean
  onClose: () => void
  currentDate: string
  currentTimeBrut: string
  currentTimeTara: string
  items: TicketItem[]
  onSave: (date: string, timeBrut: string, timeTara: string, itemTimes?: Record<number, EditedItemTime>) => void
}

export function DateTimeEditModal({
  isOpen,
  onClose,
  currentDate,
  currentTimeBrut,
  currentTimeTara,
  items,
  onSave
}: DateTimeEditModalProps) {
  const [date, setDate] = useState(currentDate)
  const [timeBrut, setTimeBrut] = useState(currentTimeBrut)
  const [timeTara, setTimeTara] = useState(currentTimeTara)
  const [itemTimes, setItemTimes] = useState<Record<number, EditedItemTime>>({})

  // Reset values when modal opens
  useEffect(() => {
    if (isOpen) {
      setDate(currentDate)
      setTimeBrut(currentTimeBrut)
      setTimeTara(currentTimeTara)
      // Initialize item times from items data
      const initialItemTimes: Record<number, EditedItemTime> = {}
      items.forEach((item, index) => {
        initialItemTimes[index] = {
          timeBrut: item.timeBrut || currentTimeBrut,
          timeTara: item.timeTara || currentTimeTara,
          dateBrut: item.dateBrut || currentDate,
          dateTara: item.dateTara || currentDate,
        }
      })
      setItemTimes(initialItemTimes)
    }
  }, [isOpen, currentDate, currentTimeBrut, currentTimeTara, items])

  const handleSave = () => {
    onSave(date, timeBrut, timeTara, items.length > 0 ? itemTimes : undefined)
    onClose()
  }

  const updateItemTime = (index: number, field: keyof EditedItemTime, value: string) => {
    setItemTimes(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value,
      }
    }))
  }

  // Apply global date/time to all items
  const applyGlobalToAll = () => {
    const updated: Record<number, EditedItemTime> = {}
    items.forEach((_, index) => {
      updated[index] = {
        timeBrut: timeBrut,
        timeTara: timeTara,
        dateBrut: date,
        dateTara: date,
      }
    })
    setItemTimes(updated)
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Modificare Data/Ora Cantaririi"
      maxWidth={items.length > 1 ? "2xl" : "sm"}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Modificarile afecteaza doar tichetul printat, nu si datele din baza de date.
        </p>

        {/* Global date/time settings */}
        <div className="p-3 bg-muted/30 rounded-lg border">
          <h4 className="text-sm font-medium mb-3">Setări Generale</h4>
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
                  step="1"
                  value={timeBrut}
                  onChange={(e) => setTimeBrut(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-time-tara">Ora cantarire TARA</Label>
                <Input
                  id="edit-time-tara"
                  type="time"
                  step="1"
                  value={timeTara}
                  onChange={(e) => setTimeTara(e.target.value)}
                />
              </div>
            </div>

            {items.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyGlobalToAll}
                className="w-full"
              >
                Aplică la toate materialele
              </Button>
            )}
          </div>
        </div>

        {/* Per-item time editing - only show if multiple items */}
        {items.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              {items.length > 1 ? 'Ore pe Material' : 'Ore Material'}
            </h4>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {items.map((item, index) => (
                <div key={index} className="p-3 border rounded-lg bg-white">
                  <div className="text-sm font-medium mb-2 text-primary">
                    {item.materialName}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Data BRUT</Label>
                      <Input
                        type="date"
                        value={itemTimes[index]?.dateBrut || date}
                        onChange={(e) => updateItemTime(index, 'dateBrut', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ora BRUT</Label>
                      <Input
                        type="time"
                        step="1"
                        value={itemTimes[index]?.timeBrut || timeBrut}
                        onChange={(e) => updateItemTime(index, 'timeBrut', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data TARA</Label>
                      <Input
                        type="date"
                        value={itemTimes[index]?.dateTara || date}
                        onChange={(e) => updateItemTime(index, 'dateTara', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ora TARA</Label>
                      <Input
                        type="time"
                        step="1"
                        value={itemTimes[index]?.timeTara || timeTara}
                        onChange={(e) => updateItemTime(index, 'timeTara', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
