import { useState, useEffect } from 'react'
import { Button, Input, Label, Textarea } from '@/components/ui'
import type { Transporter } from '@/types/database'

interface TransporterFormProps {
  transporter?: Transporter | null
  isLoading?: boolean
  onSubmit: (data: {
    name: string
    cui: string
    phone: string
    email: string
    vehicle_number: string
    notes: string
  }) => void
  onCancel: () => void
}

export function TransporterForm({
  transporter,
  isLoading,
  onSubmit,
  onCancel,
}: TransporterFormProps) {
  const [name, setName] = useState('')
  const [cui, setCui] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [notes, setNotes] = useState('')

  // Populate form when editing
  useEffect(() => {
    if (transporter) {
      setName(transporter.name || '')
      setCui(transporter.cui || '')
      setPhone(transporter.phone || '')
      setEmail(transporter.email || '')
      setVehicleNumber(transporter.vehicle_number || '')
      setNotes(transporter.notes || '')
    }
  }, [transporter])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('Numele transportatorului este obligatoriu')
      return
    }
    onSubmit({
      name: name.trim(),
      cui: cui.trim(),
      phone: phone.trim(),
      email: email.trim(),
      vehicle_number: vehicleNumber.trim().toUpperCase(),
      notes: notes.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nume *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Numele transportatorului"
          required
          autoFocus
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cui">CUI</Label>
          <Input
            id="cui"
            value={cui}
            onChange={(e) => setCui(e.target.value)}
            placeholder="ex: RO12345678"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="ex: 0722123456"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ex: contact@firma.ro"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicle_number">Nr. masina implicit</Label>
          <Input
            id="vehicle_number"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
            placeholder="ex: B-123-ABC"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observatii</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observatii..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Anuleaza
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Se salveaza...' : transporter ? 'Salveaza' : 'Adauga transportator'}
        </Button>
      </div>
    </form>
  )
}
