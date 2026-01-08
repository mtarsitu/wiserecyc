import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'RON'): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date))
}

export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function calculateFinalQuantity(quantity: number, impuritiesPercent: number): number {
  return quantity - (quantity * impuritiesPercent / 100)
}

export function calculatePricePerKgRon(pricePerTonUsd: number, exchangeRate: number): number {
  return (pricePerTonUsd * exchangeRate) / 1000
}
