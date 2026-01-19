import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from 'react'

// Web Serial API types
interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialOptions {
  baudRate: number
  dataBits?: number
  stopBits?: number
  parity?: 'none' | 'even' | 'odd'
  flowControl?: 'none' | 'hardware'
}

interface SerialPort {
  readable: ReadableStream<Uint8Array> | null
  writable: WritableStream<Uint8Array> | null
  getInfo(): SerialPortInfo
  open(options: SerialOptions): Promise<void>
  close(): Promise<void>
}

interface Serial {
  requestPort(): Promise<SerialPort>
  getPorts(): Promise<SerialPort[]>
}

declare global {
  interface Navigator {
    serial?: Serial
  }
}

export interface ScaleReading {
  value: number
  unit: string
  timestamp: Date
  raw: string
}

interface ScaleContextType {
  isSupported: boolean
  isConnected: boolean
  isConnecting: boolean
  lastReading: ScaleReading | null
  error: string | null
  baudRate: number
  setBaudRate: (rate: number) => void
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

const ScaleContext = createContext<ScaleContextType | null>(null)

// Parse weight from scale output
function parseScaleReading(raw: string): ScaleReading | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Format 1: CSV format like "1,ST,       100,      0,kg" or "     0,kg"
  // Structure: ID, STATUS, WEIGHT, TARE?, UNIT
  // Weight is typically at position 2 (after ID and status)
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim())
    let unit = 'kg'
    let weightValue: number | null = null

    // Find the unit
    for (const part of parts) {
      if (/^(kg|g|lb|oz|t)$/i.test(part)) {
        unit = part.toLowerCase()
        break
      }
    }

    // Simple format like "     0,kg" (just 2 parts)
    if (parts.length === 2) {
      const numMatch = parts[0].match(/^-?\s*(\d+(?:[.,]\d+)?)\s*$/)
      if (numMatch) {
        weightValue = parseFloat(numMatch[1].replace(',', '.'))
      }
    }
    // Full format like "1,ST,100,0,kg" - weight is at position 2
    else if (parts.length >= 3) {
      // Skip position 0 (ID like "1") and position 1 (status like "ST")
      // Weight should be at position 2
      const numMatch = parts[2].match(/^-?\s*(\d+(?:[.,]\d+)?)\s*$/)
      if (numMatch) {
        weightValue = parseFloat(numMatch[1].replace(',', '.'))
      }
    }

    if (weightValue !== null && !isNaN(weightValue)) {
      return {
        value: weightValue,
        unit,
        timestamp: new Date(),
        raw: trimmed,
      }
    }
  }

  // Format 2: Simple format like "  12.50 kg"
  const patterns = [
    /[+-]?\s*(\d+(?:[.,]\d+)?)\s*(kg|g|lb|oz|t)?/i,
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match) {
      const numStr = match[1].replace(',', '.')
      const value = parseFloat(numStr)

      if (!isNaN(value)) {
        return {
          value,
          unit: match[2]?.toLowerCase() || 'kg',
          timestamp: new Date(),
          raw: trimmed,
        }
      }
    }
  }

  return null
}

export function ScaleProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastReading, setLastReading] = useState<ScaleReading | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [baudRate, setBaudRate] = useState(9600)

  const portRef = useRef<SerialPort | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const isReadingRef = useRef(false)
  const bufferRef = useRef('')

  const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator

  const processData = useCallback((data: string) => {
    bufferRef.current += data
    const lines = bufferRef.current.split(/[\r\n]+/)
    bufferRef.current = lines.pop() || ''

    for (const line of lines) {
      const reading = parseScaleReading(line)
      if (reading) {
        setLastReading(reading)
      }
    }
  }, [])

  const startReading = useCallback(async (port: SerialPort): Promise<void> => {
    if (!port.readable) {
      setError('Portul nu poate fi citit.')
      return
    }

    isReadingRef.current = true
    const decoder = new TextDecoder()

    try {
      while (port.readable && isReadingRef.current) {
        const reader = port.readable.getReader()
        readerRef.current = reader

        try {
          while (isReadingRef.current) {
            const { value, done } = await reader.read()
            if (done) break
            if (value) {
              const text = decoder.decode(value)
              processData(text)
            }
          }
        } catch (err) {
          if (isReadingRef.current) {
            console.error('Read error:', err)
          }
        } finally {
          reader.releaseLock()
        }
      }
    } catch (err) {
      console.error('Reading stream error:', err)
    }
  }, [processData])

  const connect = useCallback(async () => {
    if (!isSupported || !navigator.serial) {
      setError('Web Serial API nu este suportat în acest browser.')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const port = await navigator.serial.requestPort()

      await port.open({
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      })

      portRef.current = port
      setIsConnected(true)
      bufferRef.current = ''

      startReading(port)

    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotFoundError') {
          setError('Nu a fost selectat niciun port.')
        } else if (err.name === 'SecurityError') {
          setError('Acces refuzat la portul serial.')
        } else if (err.name === 'NetworkError') {
          setError('Portul este deja utilizat de altă aplicație.')
        } else {
          setError(`Eroare la conectare: ${err.message}`)
        }
      }
      setIsConnected(false)
    } finally {
      setIsConnecting(false)
    }
  }, [baudRate, isSupported, startReading])

  const disconnect = useCallback(async () => {
    isReadingRef.current = false

    try {
      if (readerRef.current) {
        await readerRef.current.cancel()
        readerRef.current = null
      }

      if (portRef.current) {
        await portRef.current.close()
        portRef.current = null
      }

      setIsConnected(false)
      setLastReading(null)
      bufferRef.current = ''
    } catch (err) {
      console.error('Disconnect error:', err)
      setError(`Eroare la deconectare: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isReadingRef.current = false
      if (readerRef.current) {
        readerRef.current.cancel().catch(console.error)
      }
      if (portRef.current) {
        portRef.current.close().catch(console.error)
      }
    }
  }, [])

  return (
    <ScaleContext.Provider
      value={{
        isSupported,
        isConnected,
        isConnecting,
        lastReading,
        error,
        baudRate,
        setBaudRate,
        connect,
        disconnect,
      }}
    >
      {children}
    </ScaleContext.Provider>
  )
}

export function useScale() {
  const context = useContext(ScaleContext)
  if (!context) {
    throw new Error('useScale must be used within a ScaleProvider')
  }
  return context
}
