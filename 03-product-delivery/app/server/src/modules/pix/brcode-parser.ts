/**
 * BRCode / EMV Pix payload parser (Bacen MPN-MP padrão).
 * Implementação sem libs externas — TLV (Tag-Length-Value) no formato:
 *   {id:2}{length:2}{value:N}
 *
 * Campos top-level relevantes:
 *   00 Payload Format Indicator ("01")
 *   01 Point of Initiation ("11" static | "12" dynamic)
 *   26 Merchant Account Info (sub-TLV; GUI "br.gov.bcb.pix", pixKey, additionalInfo)
 *   52 MCC
 *   53 Transaction Currency ("986" = BRL)
 *   54 Transaction Amount (opcional; ausente = valor livre/estático)
 *   58 Country Code ("BR")
 *   59 Merchant Name
 *   60 Merchant City
 *   62 Additional Data (sub-TLV; "05" txid)
 *   63 CRC16 (4 chars hex, sobre o resto do payload incluindo "6304")
 */

export interface BrcodeData {
  pixKey: string
  amountCents: number | null
  merchantName: string
  merchantCity: string
  txid: string | null
  description: string | null
  isStatic: boolean
  raw: string
}

export class InvalidBrcodeError extends Error {
  public readonly code = 'INVALID_BRCODE'
  constructor(message = 'BRCode inválido') {
    super(message)
    this.name = 'InvalidBrcodeError'
    Object.setPrototypeOf(this, InvalidBrcodeError.prototype)
  }
}

export class InvalidCrcError extends Error {
  public readonly code = 'INVALID_BRCODE_CRC'
  constructor(message = 'CRC do BRCode inválido') {
    super(message)
    this.name = 'InvalidCrcError'
    Object.setPrototypeOf(this, InvalidCrcError.prototype)
  }
}

export class UnsupportedBrcodeError extends Error {
  public readonly code = 'UNSUPPORTED_BRCODE'
  constructor(message = 'BRCode não suportado') {
    super(message)
    this.name = 'UnsupportedBrcodeError'
    Object.setPrototypeOf(this, UnsupportedBrcodeError.prototype)
  }
}

/**
 * Calcula CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF) conforme especificação EMV.
 * O cálculo é feito sobre a string (bytes ASCII) do payload incluindo o prefixo
 * "6304" do próprio campo CRC (id 63, len 04).
 */
export function crc16Ccitt(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff
      } else {
        crc = (crc << 1) & 0xffff
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Valida o CRC16 embutido no BRCode (últimos 4 caracteres hex).
 */
export function validateCRC16(code: string): boolean {
  const trimmed = code.trim()
  if (trimmed.length < 8) return false
  // O CRC cobre tudo até o final do "6304" inclusive
  const crcStart = trimmed.length - 4
  const prefix = trimmed.slice(0, crcStart)
  const providedCrc = trimmed.slice(crcStart).toUpperCase()
  // Sanity: o campo CRC deve começar com "6304" imediatamente antes do valor
  if (!prefix.endsWith('6304')) return false
  const expected = crc16Ccitt(prefix)
  return expected === providedCrc
}

interface Tlv {
  id: string
  value: string
}

function parseTlvs(payload: string): Tlv[] {
  const out: Tlv[] = []
  let i = 0
  while (i < payload.length) {
    if (i + 4 > payload.length) {
      throw new InvalidBrcodeError('TLV truncado')
    }
    const id = payload.slice(i, i + 2)
    const lenStr = payload.slice(i + 2, i + 4)
    const len = parseInt(lenStr, 10)
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(lenStr) || Number.isNaN(len)) {
      throw new InvalidBrcodeError(`TLV malformado na posição ${i}`)
    }
    if (i + 4 + len > payload.length) {
      throw new InvalidBrcodeError(`valor do TLV "${id}" excede tamanho do payload`)
    }
    const value = payload.slice(i + 4, i + 4 + len)
    out.push({ id, value })
    i += 4 + len
  }
  return out
}

function findTlv(tlvs: Tlv[], id: string): Tlv | undefined {
  return tlvs.find((t) => t.id === id)
}

/**
 * Parse de um BRCode Pix completo.
 * @throws InvalidBrcodeError — formato TLV inválido ou campos obrigatórios faltando
 * @throws InvalidCrcError — CRC16 não confere
 * @throws UnsupportedBrcodeError — não é Pix (GUI diferente) ou moeda não BRL
 */
export function parseBrcode(code: string): BrcodeData {
  const raw = code.trim()

  if (raw.length < 20) {
    throw new InvalidBrcodeError('BRCode muito curto')
  }

  // Validação estrutural mínima antes do parse
  if (!/^[\x20-\x7e]+$/.test(raw)) {
    throw new InvalidBrcodeError('BRCode contém caracteres inválidos')
  }

  // CRC obrigatório
  if (!validateCRC16(raw)) {
    throw new InvalidCrcError()
  }

  const topLevel = parseTlvs(raw)

  // Payload Format Indicator
  const pfi = findTlv(topLevel, '00')
  if (!pfi || pfi.value !== '01') {
    throw new InvalidBrcodeError('Payload Format Indicator ausente ou inválido')
  }

  // Point of Initiation (opcional; default "11" estático)
  const poi = findTlv(topLevel, '01')
  const isStatic = !poi || poi.value === '11'

  // Merchant Account Info (id 26) — sub-TLV com GUI "br.gov.bcb.pix"
  const mai = findTlv(topLevel, '26')
  if (!mai) {
    throw new UnsupportedBrcodeError('BRCode não é Pix (campo 26 ausente)')
  }
  const mais = parseTlvs(mai.value)
  const gui = findTlv(mais, '00')
  if (!gui || gui.value.toLowerCase() !== 'br.gov.bcb.pix') {
    throw new UnsupportedBrcodeError('BRCode não é Pix (GUI inválido)')
  }
  const pixKeyTlv = findTlv(mais, '01')
  if (!pixKeyTlv || !pixKeyTlv.value) {
    throw new InvalidBrcodeError('Chave Pix ausente no BRCode')
  }
  const pixKey = pixKeyTlv.value.trim()
  const additionalInfo = findTlv(mais, '02')?.value?.trim() || null

  // Moeda (53) — obrigatória, deve ser 986 (BRL)
  const currency = findTlv(topLevel, '53')
  if (!currency) {
    throw new InvalidBrcodeError('Moeda ausente (campo 53)')
  }
  if (currency.value !== '986') {
    throw new UnsupportedBrcodeError(`Moeda ${currency.value} não suportada (apenas BRL/986)`)
  }

  // Valor (54) — opcional
  const amountTlv = findTlv(topLevel, '54')
  let amountCents: number | null = null
  if (amountTlv && amountTlv.value.length > 0) {
    const n = Number(amountTlv.value)
    if (!Number.isFinite(n) || n < 0) {
      throw new InvalidBrcodeError('Valor (54) inválido')
    }
    amountCents = Math.round(n * 100)
  }

  // País (58) — opcional na validação mas esperado "BR"
  const country = findTlv(topLevel, '58')
  if (country && country.value.toUpperCase() !== 'BR') {
    throw new UnsupportedBrcodeError(`País ${country.value} não suportado`)
  }

  // Nome (59) e Cidade (60) — obrigatórios na spec
  const nameTlv = findTlv(topLevel, '59')
  if (!nameTlv || !nameTlv.value) {
    throw new InvalidBrcodeError('Merchant Name ausente (campo 59)')
  }
  const cityTlv = findTlv(topLevel, '60')
  if (!cityTlv || !cityTlv.value) {
    throw new InvalidBrcodeError('Merchant City ausente (campo 60)')
  }

  // Additional Data (62) — opcional; sub-TLV com txid em "05"
  let txid: string | null = null
  const addData = findTlv(topLevel, '62')
  if (addData) {
    try {
      const addTlvs = parseTlvs(addData.value)
      const txidTlv = findTlv(addTlvs, '05')
      if (txidTlv && txidTlv.value) txid = txidTlv.value
    } catch {
      // campo 62 pode vir com formato não-TLV em alguns PSPs — ignora
    }
  }

  return {
    pixKey,
    amountCents,
    merchantName: nameTlv.value.trim(),
    merchantCity: cityTlv.value.trim(),
    txid,
    description: additionalInfo,
    isStatic,
    raw,
  }
}
