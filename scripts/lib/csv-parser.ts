import * as fs from 'fs'
import * as path from 'path'

// Parse CSV file and return array of objects
export function parseCSV<T extends Record<string, string>>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())

  if (lines.length < 2) return []

  // Parse header
  const headers = parseCSVLine(lines[0])

  // Parse data rows
  const data: T[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0 || values.every(v => !v.trim())) continue

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || ''
    })
    data.push(row as T)
  }

  return data
}

// Parse a single CSV line handling quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)

  return result.map(s => s.trim())
}

// Parse timestamp from CSV format (M/D/YYYY H:MM:SS)
export function parseTimestamp(timestamp: string): { date: string; time: string } | null {
  if (!timestamp) return null

  const parts = timestamp.split(' ')
  if (parts.length < 2) return null

  const dateParts = parts[0].split('/')
  if (dateParts.length !== 3) return null

  const month = dateParts[0].padStart(2, '0')
  const day = dateParts[1].padStart(2, '0')
  const year = dateParts[2]

  const date = `${year}-${month}-${day}`
  const time = parts[1] || '00:00:00'

  return { date, time }
}

// Parse payment status
export function parsePaymentStatus(status: string): 'paid' | 'unpaid' | 'partial' {
  const normalized = status.trim().toUpperCase()
  if (normalized === 'N') return 'unpaid'
  if (normalized.startsWith('C')) return 'paid' // C1, C2
  return 'unpaid'
}

// Parse payment method
export function parsePaymentMethod(method: string): 'cash' | 'bank' {
  const normalized = method.trim().toUpperCase()
  if (normalized === 'B') return 'bank'
  return 'cash' // C1, C2, default
}

// Parse transport type
export function parseTransportType(type: string): 'intern' | 'extern' {
  const normalized = type.trim().toUpperCase()
  if (normalized === 'INT') return 'intern'
  return 'extern'
}

// Parse number, handling comma as decimal separator
export function parseNumber(value: string): number {
  if (!value) return 0
  const cleaned = value.replace(',', '.').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

// Get all CSV files from directory
export function getCSVFiles(dirPath: string): string[] {
  return fs.readdirSync(dirPath)
    .filter(file => file.endsWith('.csv'))
    .map(file => path.join(dirPath, file))
}
