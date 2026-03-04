import type { FastifyRequest, FastifyReply } from 'fastify'
import { Errors } from '../errors/app-error.js'
import { getDb } from '../../database/connection.js'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()

    const db = getDb()
    const payload = request.user as { id: string; email: string }

    const user = db
      .prepare('SELECT id, name, email, cpf, phone, is_active FROM users WHERE id = ?')
      .get(payload.id) as { id: string; name: string; email: string; cpf: string; phone: string | null; is_active: number } | undefined

    if (!user || !user.is_active) {
      throw Errors.unauthorized('Usuário não encontrado ou inativo')
    }

    const account = db
      .prepare('SELECT id, number, agency, balance_cents FROM accounts WHERE user_id = ?')
      .get(user.id) as { id: string; number: string; agency: string; balance_cents: number } | undefined

    request.currentUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      cpf: user.cpf,
      phone: user.phone ?? undefined,
      accountId: account?.id ?? '',
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AppError') {
      throw err
    }
    throw Errors.unauthorized('Token inválido ou expirado')
  }
}
