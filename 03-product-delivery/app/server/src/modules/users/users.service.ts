import bcrypt from 'bcryptjs'
import { getDb } from '../../database/connection.js'
import { AppError, Errors } from '../../shared/errors/app-error.js'
import { ErrorCode } from '../../shared/errors/error-codes.js'
import type { UpdateProfileInput, ChangePasswordInput } from './users.schema.js'

interface UserRow {
  id: string
  name: string
  email: string
  cpf: string
  phone: string | null
  avatar_url: string | null
  password_hash: string
  is_active: number
  created_at: string
}

function toUserProfile(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    cpf: row.cpf,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  }
}

export class UsersService {
  getProfile(userId: string) {
    const db = getDb()
    const user = db
      .prepare('SELECT * FROM users WHERE id = ? AND is_active = 1')
      .get(userId) as UserRow | undefined

    if (!user) {
      throw Errors.notFound('Usuário não encontrado')
    }

    return toUserProfile(user)
  }

  updateProfile(userId: string, input: UpdateProfileInput) {
    const db = getDb()

    const user = db
      .prepare('SELECT id FROM users WHERE id = ? AND is_active = 1')
      .get(userId) as { id: string } | undefined

    if (!user) {
      throw Errors.notFound('Usuário não encontrado')
    }

    const updates: string[] = []
    const params: unknown[] = []

    if (input.name !== undefined) {
      updates.push('name = ?')
      params.push(input.name)
    }

    if (input.phone !== undefined) {
      updates.push('phone = ?')
      params.push(input.phone)
    }

    if (input.avatarUrl !== undefined) {
      updates.push('avatar_url = ?')
      params.push(input.avatarUrl)
    }

    if (updates.length === 0) {
      return this.getProfile(userId)
    }

    updates.push("updated_at = datetime('now')")
    params.push(userId)

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params)

    return this.getProfile(userId)
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const db = getDb()

    const user = db
      .prepare('SELECT id, password_hash FROM users WHERE id = ? AND is_active = 1')
      .get(userId) as { id: string; password_hash: string } | undefined

    if (!user) {
      throw Errors.notFound('Usuário não encontrado')
    }

    const isCurrentPasswordValid = await bcrypt.compare(input.currentPassword, user.password_hash)
    if (!isCurrentPasswordValid) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Senha atual incorreta', 400)
    }

    const newHash = await bcrypt.hash(input.newPassword, 12)
    db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?
    `).run(newHash, userId)

    return { message: 'Senha alterada com sucesso' }
  }
}
