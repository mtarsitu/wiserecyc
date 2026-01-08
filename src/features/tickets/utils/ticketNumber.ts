// Generate ticket number based on date and optional scale number

export function generateTicketNumber(
  date: string,
  existingNumber?: string | null,
  prefix: string = 'TC'
): string {
  // If there's already a scale number or receipt number, use it
  if (existingNumber) {
    return existingNumber
  }

  // Generate a new ticket number based on date and timestamp
  const dateStr = date.replace(/-/g, '')
  const timestamp = Date.now().toString().slice(-6)
  return `${prefix}-${dateStr}-${timestamp}`
}

// Format time for display (HH:mm)
export function formatTime(time: string | null | undefined): string {
  if (!time) {
    return new Date().toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  // If it's already in HH:mm format, return as is
  if (/^\d{2}:\d{2}$/.test(time)) {
    return time
  }

  // If it's in HH:mm:ss format, extract HH:mm
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
    return time.slice(0, 5)
  }

  // Try to parse as date/time string
  try {
    const date = new Date(`1970-01-01T${time}`)
    return date.toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch {
    return new Date().toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }
}

// Format date for display (DD.MM.YYYY)
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Get current time in HH:mm format
export function getCurrentTime(): string {
  return new Date().toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

// Get current date in YYYY-MM-DD format
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0]
}
