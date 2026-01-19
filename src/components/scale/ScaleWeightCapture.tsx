import { useState, useEffect, useCallback } from 'react'
import { Button, Label, Input } from '@/components/ui'
import { Scale, Usb, Check, X, Loader2, Truck, TruckIcon } from 'lucide-react'
import { useSerialScale } from '@/hooks/useSerialScale'

export interface WeightData {
  weight_brut: number | null
  weight_tara: number | null
  weight_net: number | null
  weight_brut_time: string | null
  weight_tara_time: string | null
}

interface ScaleWeightCaptureProps {
  value: WeightData
  onChange: (data: WeightData) => void
  disabled?: boolean
}

export function ScaleWeightCapture({ value, onChange, disabled }: ScaleWeightCaptureProps) {
  const [baudRate, setBaudRate] = useState(9600)
  const {
    isSupported,
    isConnected,
    isConnecting,
    lastReading,
    error,
    connect,
    disconnect,
  } = useSerialScale({ baudRate })

  // Calculate net weight when brut or tara changes
  useEffect(() => {
    if (value.weight_brut !== null && value.weight_tara !== null) {
      const net = value.weight_brut - value.weight_tara
      if (net !== value.weight_net) {
        onChange({
          ...value,
          weight_net: Math.max(0, net),
        })
      }
    }
  }, [value.weight_brut, value.weight_tara])

  const captureBrut = useCallback(() => {
    if (lastReading) {
      onChange({
        ...value,
        weight_brut: lastReading.value,
        weight_brut_time: lastReading.timestamp.toISOString(),
        weight_net: value.weight_tara !== null
          ? Math.max(0, lastReading.value - value.weight_tara)
          : null,
      })
    }
  }, [lastReading, value, onChange])

  const captureTara = useCallback(() => {
    if (lastReading) {
      onChange({
        ...value,
        weight_tara: lastReading.value,
        weight_tara_time: lastReading.timestamp.toISOString(),
        weight_net: value.weight_brut !== null
          ? Math.max(0, value.weight_brut - lastReading.value)
          : null,
      })
    }
  }, [lastReading, value, onChange])

  const handleManualBrut = (val: string) => {
    const num = parseFloat(val) || null
    onChange({
      ...value,
      weight_brut: num,
      weight_brut_time: num ? new Date().toISOString() : null,
      weight_net: num !== null && value.weight_tara !== null
        ? Math.max(0, num - value.weight_tara)
        : null,
    })
  }

  const handleManualTara = (val: string) => {
    const num = parseFloat(val) || null
    onChange({
      ...value,
      weight_tara: num,
      weight_tara_time: num ? new Date().toISOString() : null,
      weight_net: value.weight_brut !== null && num !== null
        ? Math.max(0, value.weight_brut - num)
        : null,
    })
  }

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-'
    return new Date(isoString).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">Cântărire</Label>
        </div>

        {/* Connection Controls */}
        <div className="flex items-center gap-2">
          {isSupported && (
            <>
              <select
                value={baudRate}
                onChange={(e) => setBaudRate(Number(e.target.value))}
                disabled={isConnected || disabled}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value={9600}>9600</option>
                <option value={4800}>4800</option>
                <option value={19200}>19200</option>
                <option value={38400}>38400</option>
              </select>

              {!isConnected ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={connect}
                  disabled={isConnecting || disabled}
                >
                  {isConnecting ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Usb className="mr-1 h-3 w-3" />
                  )}
                  Conectare cântar
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={disconnect}
                  disabled={disabled}
                >
                  <X className="mr-1 h-3 w-3" />
                  Deconectare
                </Button>
              )}
            </>
          )}

          {/* Status indicator */}
          <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
            isConnected
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-muted text-muted-foreground'
          }`}>
            {isConnected ? (
              <>
                <Check className="h-3 w-3" />
                <span>Conectat</span>
              </>
            ) : (
              <>
                <X className="h-3 w-3" />
                <span>Neconectat</span>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="text-xs text-destructive">{error}</div>
      )}

      {!isSupported && (
        <div className="text-xs text-amber-600 dark:text-amber-400">
          Web Serial API nu este suportat. Folosiți Chrome sau Edge pentru conectare la cântar.
          Puteți introduce valorile manual.
        </div>
      )}

      {/* Current scale reading */}
      {isConnected && (
        <div className="flex items-center gap-4 rounded-md bg-black p-3">
          <span className="text-xs text-muted-foreground">Citire cântar:</span>
          <span className="font-mono text-2xl font-bold text-green-400">
            {lastReading ? `${lastReading.value.toFixed(2)} ${lastReading.unit}` : '-- kg'}
          </span>
        </div>
      )}

      {/* Weight inputs grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Brut (masina plina) */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm">Brut (mașină plină)</Label>
          </div>
          <div className="flex gap-1">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={value.weight_brut ?? ''}
              onChange={(e) => handleManualBrut(e.target.value)}
              placeholder="0.00"
              className="text-right"
              disabled={disabled}
            />
            <span className="flex items-center text-sm text-muted-foreground">kg</span>
          </div>
          {isConnected && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={captureBrut}
              disabled={!lastReading || disabled}
            >
              <Truck className="mr-1 h-3 w-3" />
              Preia BRUT
            </Button>
          )}
          {value.weight_brut_time && (
            <div className="text-xs text-muted-foreground">
              Ora: {formatTime(value.weight_brut_time)}
            </div>
          )}
        </div>

        {/* Tara (masina goala) */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <TruckIcon className="h-4 w-4 text-muted-foreground opacity-50" />
            <Label className="text-sm">Tara (mașină goală)</Label>
          </div>
          <div className="flex gap-1">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={value.weight_tara ?? ''}
              onChange={(e) => handleManualTara(e.target.value)}
              placeholder="0.00"
              className="text-right"
              disabled={disabled}
            />
            <span className="flex items-center text-sm text-muted-foreground">kg</span>
          </div>
          {isConnected && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={captureTara}
              disabled={!lastReading || disabled}
            >
              <TruckIcon className="mr-1 h-3 w-3" />
              Preia TARA
            </Button>
          )}
          {value.weight_tara_time && (
            <div className="text-xs text-muted-foreground">
              Ora: {formatTime(value.weight_tara_time)}
            </div>
          )}
        </div>

        {/* Net (calculated) */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Scale className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Net (calculat)</Label>
          </div>
          <div className="flex gap-1">
            <Input
              type="number"
              value={value.weight_net?.toFixed(2) ?? ''}
              readOnly
              className="text-right bg-muted/50 font-bold"
              disabled
            />
            <span className="flex items-center text-sm text-muted-foreground">kg</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Net = Brut - Tara
          </div>
        </div>
      </div>
    </div>
  )
}
