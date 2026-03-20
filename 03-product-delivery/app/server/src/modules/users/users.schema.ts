import { z } from 'zod'

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^\+55\d{10,11}$/, 'Telefone deve estar no formato +55XXXXXXXXXXX')
    .optional(),
  avatarUrl: z.string().url('URL de avatar inválida').optional(),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .regex(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Nova senha deve conter letras maiúsculas, minúsculas, números e símbolos'
    ),
})

export const UserProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  cpf: z.string(),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
export type UserProfile = z.infer<typeof UserProfileSchema>
