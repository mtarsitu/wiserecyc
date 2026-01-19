import { useState, useRef, useCallback, useEffect } from 'react'

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

export interface UseSerialScaleOptions {
  baudRate?: number
  onReading?: (reading: ScaleReading) => void
}

export interface UseSerialScaleReturn {
  isSupported: boolean
  isConnected: boolean
  isConnecting: boolean
  lastReading: ScaleReading | null
  error: string | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  captureWeight: () => ScaleReading | null
}

// Parse weight from scale output - common formats
function parseScaleReading(raw: string): ScaleReading | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Common scale output formats:
  // "  12.50 kg" or "12.50kg" or "ST,GS,  12.50, kg" or "+  12.50 kg"
  // Some scales send: "N  +    12.50 kg" (N=Net, G=Gross)

  // Try to extract number and unit
  const patterns = [
    // Pattern: optional prefix, number with optional decimals, unit
    /[+-]?\s*(\d+(?:[.,]\d+)?)\s*(kg|g|lb|oz|t)?/i,
    // Pattern for scales with comma as decimal separator
    /[+-]?\s*(\d+(?:,\d+)?)\s*(kg|g|lb|oz|t)?/i,
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match) {
      // Replace comma with dot for parsing
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

export function useSerialScale(options: UseSerialScaleOptions = {}): UseSerialScaleReturn {
  const { baudRate = 9600, onReading } = options

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastReading, setLastReading] = useState<ScaleReading | null>(null)
  const [error, setError] = useState<string | null>(null)

  const portRef = useRef<SerialPort | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const isReadingRef = useRef(false)
  const bufferRef = useRef('')

  const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator

  const processData = useCallback((data: string) => {
    // Accumulate data in buffer
    bufferRef.current += data

    // Process complete lines (split by newline or carriage return)
    const lines = bufferRef.current.split(/[\r\n]+/)

    // Keep incomplete line in buffer
    bufferRef.current = lines.pop() || ''

    for (const line of lines) {
      const reading = parseScaleReading(line)
      if (reading) {
        setLastReading(reading)
        onReading?.(reading)
      }
    }
  }, [onReading])

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
      setError('Web Serial API nu este suportat în acest browser. Folosiți Chrome sau Edge.')
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

      // Start reading
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

  const captureWeight = useCallback((): ScaleReading | null => {
    return lastReading
  }, [lastReading])

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

  return {
    isSupported,
    isConnected,
    isConnecting,
    lastReading,
    error,
    connect,
    disconnect,
    captureWeight,
  }
}
