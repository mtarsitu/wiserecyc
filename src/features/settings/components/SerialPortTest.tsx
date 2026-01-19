import { useState, useRef, useCallback } from 'react'
import { Button, Label } from '@/components/ui'
import { Loader2, Usb, Check, X, RefreshCw } from 'lucide-react'

// Web Serial API types (not included in standard TypeScript lib)
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

export function SerialPortTest() {
  const isSupported = 'serial' in navigator
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [receivedData, setReceivedData] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [portInfo, setPortInfo] = useState<SerialPortInfo | null>(null)

  const portRef = useRef<SerialPort | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const isReadingRef = useRef(false)

  // Common baud rates for scales
  const [baudRate, setBaudRate] = useState(9600)
  const baudRateOptions = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200]

  const connectToPort = useCallback(async () => {
    if (!isSupported || !navigator.serial) {
      setError('Web Serial API nu este suportat în acest browser. Folosiți Chrome sau Edge.')
      return
    }

    setIsConnecting(true)
    setError(null)
    setReceivedData([])

    try {
      // Request a port from the user
      const port = await navigator.serial.requestPort()

      // Get port info
      const info = port.getInfo()
      setPortInfo(info)

      // Open the port with specified settings
      await port.open({
        baudRate: baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      })

      portRef.current = port
      setIsConnected(true)

      // Start reading data
      startReading(port)

      setReceivedData(prev => [...prev, `[INFO] Conectat la port COM (baud rate: ${baudRate})`])

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
  }, [baudRate, isSupported])

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

            if (done) {
              break
            }

            if (value) {
              const text = decoder.decode(value)
              const timestamp = new Date().toLocaleTimeString('ro-RO')

              // Convert bytes to HEX for debugging
              const hexBytes = Array.from(value)
                .map(b => b.toString(16).padStart(2, '0').toUpperCase())
                .join(' ')

              // Show both raw text and HEX
              const displayText = text.replace(/\r/g, '\\r').replace(/\n/g, '\\n')

              setReceivedData(prev => {
                const newData = [
                  ...prev,
                  `[${timestamp}] TEXT: "${displayText}"`,
                  `[${timestamp}] HEX:  ${hexBytes}`,
                  `---`
                ]
                // Keep only last 100 entries
                return newData.slice(-100)
              })
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
  }, [])

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
      setPortInfo(null)
      setReceivedData(prev => [...prev, '[INFO] Deconectat de la port COM'])
    } catch (err) {
      console.error('Disconnect error:', err)
      setError(`Eroare la deconectare: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const clearData = useCallback(() => {
    setReceivedData([])
    setError(null)
  }, [])

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <X className="h-5 w-5" />
          <span className="font-medium">Web Serial API nu este suportat</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Pentru a utiliza funcția de citire din port COM, vă rugăm să folosiți
          <strong> Google Chrome</strong> sau <strong>Microsoft Edge</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Usb className="h-5 w-5 text-primary" />
        <Label className="text-base font-semibold">Test Port COM (Cântar)</Label>
      </div>

      <p className="text-sm text-muted-foreground">
        Testați conexiunea cu cântarul prin portul serial. Asigurați-vă că cântarul
        este conectat și pornit înainte de a apăsa butonul de conectare.
      </p>

      {/* Settings */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="baudRate">Baud Rate</Label>
          <select
            id="baudRate"
            value={baudRate}
            onChange={(e) => setBaudRate(Number(e.target.value))}
            disabled={isConnected}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {baudRateOptions.map(rate => (
              <option key={rate} value={rate}>{rate}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          {!isConnected ? (
            <Button
              onClick={connectToPort}
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se conectează...
                </>
              ) : (
                <>
                  <Usb className="mr-2 h-4 w-4" />
                  Conectare Port COM
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={disconnect}
              variant="destructive"
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              Deconectare
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
          isConnected
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-muted text-muted-foreground'
        }`}>
          {isConnected ? (
            <>
              <Check className="h-4 w-4" />
              Conectat
            </>
          ) : (
            <>
              <X className="h-4 w-4" />
              Neconectat
            </>
          )}
        </div>

        {portInfo && (
          <span className="text-sm text-muted-foreground">
            Vendor ID: {portInfo.usbVendorId || 'N/A'},
            Product ID: {portInfo.usbProductId || 'N/A'}
          </span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Data Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Date primite de la cântar:</Label>
          <Button variant="ghost" size="sm" onClick={clearData}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Golește
          </Button>
        </div>

        <div className="h-64 overflow-y-auto rounded-lg border bg-black p-3 font-mono text-sm text-green-400">
          {receivedData.length === 0 ? (
            <span className="text-muted-foreground">
              {isConnected
                ? 'Așteptare date de la cântar... Puneți greutate pe cântar.'
                : 'Apăsați "Conectare Port COM" pentru a începe.'}
            </span>
          ) : (
            receivedData.map((line, index) => (
              <div key={index} className="whitespace-pre-wrap">
                {line}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="font-medium mb-2">Instrucțiuni:</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Conectați cântarul la calculator prin cablu serial (USB-to-Serial sau RS232)</li>
          <li>Selectați baud rate-ul corect (verificați manualul cântarului, de obicei 9600)</li>
          <li>Apăsați butonul "Conectare Port COM"</li>
          <li>Selectați portul COM corespunzător din lista care apare</li>
          <li>Datele de la cântar vor apărea în caseta de mai sus</li>
        </ol>
      </div>
    </div>
  )
}
