import { describe, it, expect } from '@jest/globals'
import {
  parseBrcode,
  validateCRC16,
  crc16Ccitt,
  InvalidBrcodeError,
  InvalidCrcError,
  UnsupportedBrcodeError,
} from './brcode-parser.js'

/**
 * Fixtures geradas programaticamente com o próprio algoritmo CRC16/CCITT-FALSE
 * (conferido contra a lógica do parser). Cada código é um payload EMV Pix
 * válido segundo a especificação Bacen MPN-MP.
 */

// Estático, sem valor, chave random UUID
const BRCODE_STATIC_NO_AMOUNT =
  '00020101021126580014br.gov.bcb.pix0136b47a2edc-2fa0-46c1-b27a-1ac7b6f94f0c5204000053039865802BR5915Fulano da Silva6008Brasilia62070503***6304FCBC'

// Dinâmico, valor R$ 10,50, chave email
const BRCODE_DYNAMIC_WITH_AMOUNT =
  '00020101021226370014br.gov.bcb.pix0115teste@email.com520400005303986540510.505802BR5912Loja Exemplo6009Sao Paulo62090505TX123630488D0'

// Moeda USD (840) — inválida para Pix
const BRCODE_USD =
  '00020101021226360014br.gov.bcb.pix0114chave@test.com52040000530384054041.005802BR5908Loja USD6005Miami63049CFD'

// GUI não é br.gov.bcb.pix
const BRCODE_NON_PIX =
  '00020101021126180009other.gui0101x5204000053039865802BR5901X6001Y63044A4F'

describe('brcode-parser', () => {
  describe('crc16Ccitt', () => {
    it('deve calcular CRC16/CCITT-FALSE', () => {
      // Vetor conhecido: "123456789" → 0x29B1
      expect(crc16Ccitt('123456789')).toBe('29B1')
    })
  })

  describe('validateCRC16', () => {
    it('valida CRC de BRCode estático', () => {
      expect(validateCRC16(BRCODE_STATIC_NO_AMOUNT)).toBe(true)
    })

    it('valida CRC de BRCode dinâmico', () => {
      expect(validateCRC16(BRCODE_DYNAMIC_WITH_AMOUNT)).toBe(true)
    })

    it('rejeita CRC corrompido', () => {
      const bad = BRCODE_STATIC_NO_AMOUNT.slice(0, -4) + 'FFFF'
      expect(validateCRC16(bad)).toBe(false)
    })

    it('rejeita payload sem prefixo 6304 antes do CRC', () => {
      expect(validateCRC16('ABCD')).toBe(false)
    })
  })

  describe('parseBrcode — BRCode estático', () => {
    it('extrai campos de um BRCode estático sem valor', () => {
      const data = parseBrcode(BRCODE_STATIC_NO_AMOUNT)
      expect(data.pixKey).toBe('b47a2edc-2fa0-46c1-b27a-1ac7b6f94f0c')
      expect(data.amountCents).toBeNull()
      expect(data.merchantName).toBe('Fulano da Silva')
      expect(data.merchantCity).toBe('Brasilia')
      expect(data.txid).toBe('***')
      expect(data.isStatic).toBe(true)
    })
  })

  describe('parseBrcode — BRCode dinâmico', () => {
    it('extrai valor e marca como dinâmico', () => {
      const data = parseBrcode(BRCODE_DYNAMIC_WITH_AMOUNT)
      expect(data.pixKey).toBe('teste@email.com')
      expect(data.amountCents).toBe(1050)
      expect(data.merchantName).toBe('Loja Exemplo')
      expect(data.merchantCity).toBe('Sao Paulo')
      expect(data.txid).toBe('TX123')
      expect(data.isStatic).toBe(false)
    })
  })

  describe('parseBrcode — erros', () => {
    it('lança InvalidCrcError quando CRC está incorreto', () => {
      const bad = BRCODE_STATIC_NO_AMOUNT.slice(0, -4) + '0000'
      expect(() => parseBrcode(bad)).toThrow(InvalidCrcError)
    })

    it('lança UnsupportedBrcodeError quando moeda ≠ 986 (BRL)', () => {
      expect(() => parseBrcode(BRCODE_USD)).toThrow(UnsupportedBrcodeError)
    })

    it('lança UnsupportedBrcodeError quando GUI não é br.gov.bcb.pix', () => {
      expect(() => parseBrcode(BRCODE_NON_PIX)).toThrow(UnsupportedBrcodeError)
    })

    it('lança InvalidBrcodeError para payload muito curto', () => {
      expect(() => parseBrcode('0001')).toThrow(InvalidBrcodeError)
    })

    it('lança InvalidBrcodeError para payload vazio', () => {
      expect(() => parseBrcode('')).toThrow(InvalidBrcodeError)
    })
  })
})
