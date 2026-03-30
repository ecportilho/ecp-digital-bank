import bcrypt from 'bcryptjs'
import { getDb } from '../../database/connection.js'
import { AppError, Errors } from '../../shared/errors/app-error.js'
import { ErrorCode } from '../../shared/errors/error-codes.js'
import { generateId } from '../../shared/utils/uuid.js'
import type { RegisterInput, LoginInput, AuthResponse } from './auth.schema.js'
import type { FastifyInstance } from 'fastify'

interface UserRow {
  id: string
  name: string
  email: string
  cpf: string
  phone: string | null
  password_hash: string
  role: string
  is_active: number
}

export class AuthService {
  constructor(private readonly app: FastifyInstance) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const db = getDb()

    // Check email uniqueness
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(input.email)
    if (existingEmail) {
      throw new AppError(ErrorCode.EMAIL_ALREADY_IN_USE, 'Este email já está em uso', 409)
    }

    // Check CPF uniqueness
    const existingCpf = db.prepare('SELECT id FROM users WHERE cpf = ?').get(input.cpf)
    if (existingCpf) {
      throw new AppError(ErrorCode.CPF_ALREADY_IN_USE, 'Este CPF já está cadastrado', 409)
    }

    const passwordHash = await bcrypt.hash(input.password, 12)
    const userId = generateId()
    const accountId = generateId()
    const accountNumber = String(Math.floor(10000000 + Math.random() * 90000000))

    // Create user + account in a transaction
    const createUserAndAccount = db.transaction(() => {
      db.prepare(`
        INSERT INTO users (id, name, email, cpf, password_hash, phone, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(userId, input.name, input.email, input.cpf, passwordHash, input.phone ?? null)

      db.prepare(`
        INSERT INTO accounts (id, user_id, agency, number, balance_cents, daily_transfer_limit_cents)
        VALUES (?, ?, '0001', ?, 0, 500000)
      `).run(accountId, userId, accountNumber)
    })

    createUserAndAccount()

    const token = this.app.jwt.sign({ id: userId, email: input.email, role: 'consumer' })

    return {
      token,
      user: {
        id: userId,
        name: input.name,
        email: input.email,
        cpf: input.cpf,
        phone: input.phone,
      },
    }
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const db = getDb()

    const user = db
      .prepare('SELECT id, name, email, cpf, phone, password_hash, role, is_active FROM users WHERE email = ?')
      .get(input.email) as UserRow | undefined

    if (!user) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Email ou senha inválidos', 401)
    }

    if (!user.is_active) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Conta inativa', 401)
    }

    const passwordValid = await bcrypt.compare(input.password, user.password_hash)
    if (!passwordValid) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Email ou senha inválidos', 401)
    }

    const token = this.app.jwt.sign({ id: user.id, email: user.email, role: user.role ?? 'consumer' })

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        phone: user.phone ?? undefined,
      },
    }
  }
}
