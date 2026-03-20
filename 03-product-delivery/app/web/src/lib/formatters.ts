/**
 * Format integer cents to BRL currency string
 * Example: 150000 → "R$ 1.500,00"
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

/**
 * Format a date string to Brazilian locale
 * Example: "2024-03-15T10:00:00Z" → "15/03/2024"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

/**
 * Format a date string to Brazilian locale with time
 * Example: "2024-03-15T10:00:00Z" → "15/03/2024 às 10:00"
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date).replace(',', ' às')
}

/**
 * Format a CPF string for display
 * Example: "12345678900" → "123.456.789-00"
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '')
  if (cleaned.length !== 11) return cpf
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Format a phone number for display
 * Example: "+5511999887766" → "+55 (11) 99988-7766"
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    const local = cleaned.slice(2)
    if (local.length === 11) {
      return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
    }
    if (local.length === 10) {
      return `+55 (${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
    }
  }
  return phone
}

/**
 * Format account number with agency
 * Example: agency="0001", number="00012345" → "0001 / 00012345-0"
 */
export function formatAccount(agency: string, number: string): string {
  return `${agency} / ${number}`
}

/**
 * Mask sensitive data (e.g., CPF for display)
 * Example: "12345678900" → "123.***.***-00"
 */
export function maskCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '')
  if (cleaned.length !== 11) return cpf
  return `${cleaned.slice(0, 3)}.***.***-${cleaned.slice(9)}`
}

/**
 * Relative time formatter
 * Example: 2 hours ago → "há 2 horas"
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'agora mesmo'
  if (diffMins < 60) return `há ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`
  if (diffHours < 24) return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
  if (diffDays < 7) return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
  return formatDate(dateStr)
}
