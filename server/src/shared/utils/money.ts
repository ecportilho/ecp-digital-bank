/**
 * Convert cents to reais (integer cents → float)
 * Example: 150000 → 1500.00
 */
export function centsToReais(cents: number): number {
  return cents / 100
}

/**
 * Convert reais to cents (float → integer cents)
 * Example: 1500.00 → 150000
 */
export function reaisToCents(reais: number): number {
  return Math.round(reais * 100)
}

/**
 * Format cents as BRL currency string
 * Example: 150000 → "R$ 1.500,00"
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centsToReais(cents))
}
