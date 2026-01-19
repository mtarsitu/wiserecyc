import { Button, Label } from '@/components/ui'
import { Loader2, Usb, Check, X, Scale } from 'lucide-react'
import { useScale } from '@/contexts/ScaleContext'

export function SerialPortTest() {
  const {
    isSupported,
    isConnected,
    isConnecting,
    lastReading,
    error,
    baudRate,
    setBaudRate,
    connect,
    disconnect,
  } = useScale()

  const baudRateOptions = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200]

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
        <Scale className="h-5 w-5 text-primary" />
        <Label className="text-base font-semibold">Conectare Cântar (Port COM)</Label>
      </div>

      <p className="text-sm text-muted-foreground">
        Conectați cântarul la nivel de aplicație. Conexiunea va rămâne activă pe toate paginile
        până la refresh sau deconectare manuală.
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
              onClick={connect}
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
                  Conectare Cântar
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

        {/* Live reading */}
        {isConnected && (
          <div className="flex items-center gap-2 rounded-md bg-black px-4 py-2">
            <span className="font-mono text-xl font-bold text-green-400">
              {lastReading ? `${lastReading.value.toFixed(2)} ${lastReading.unit}` : '-- kg'}
            </span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="font-medium mb-2">Instrucțiuni:</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Conectați cântarul la calculator prin cablu serial (USB-to-Serial sau RS232)</li>
          <li>Selectați baud rate-ul corect (verificați manualul cântarului, de obicei 9600)</li>
          <li>Apăsați butonul "Conectare Cântar"</li>
          <li>Selectați portul COM corespunzător din lista care apare</li>
          <li>După conectare, greutatea va fi afișată live și disponibilă în formulare</li>
        </ol>
      </div>
    </div>
  )
}
