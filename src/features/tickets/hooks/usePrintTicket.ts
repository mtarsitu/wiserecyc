import { useState, useCallback } from 'react'
import type { TicketData } from '../types'

interface UsePrintTicketReturn {
  isOpen: boolean
  ticketData: TicketData | null
  openTicketDialog: (data: TicketData) => void
  closeTicketDialog: () => void
}

export function usePrintTicket(): UsePrintTicketReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [ticketData, setTicketData] = useState<TicketData | null>(null)

  const openTicketDialog = useCallback((data: TicketData) => {
    setTicketData(data)
    setIsOpen(true)
  }, [])

  const closeTicketDialog = useCallback(() => {
    setIsOpen(false)
    // Keep ticketData for a moment to allow animation
    setTimeout(() => setTicketData(null), 300)
  }, [])

  return {
    isOpen,
    ticketData,
    openTicketDialog,
    closeTicketDialog
  }
}
