import { getDb } from '../../../../database/connection.js'

export function getKycStatusTool(userId: string) {
  const db = getDb()

  const user = db
    .prepare('SELECT is_active FROM users WHERE id = ?')
    .get(userId) as { is_active: number } | undefined

  if (!user) {
    return { error: 'Usuário não encontrado.' }
  }

  // In MVP the KYC status is derived from the user's active flag
  // Active = KYC approved, Inactive = pending/rejected
  const kycStatus = user.is_active ? 'APPROVED' : 'PENDING_KYC'

  const statusDescriptions: Record<string, string> = {
    APPROVED: 'Sua verificação de identidade (KYC) foi aprovada. Sua conta está ativa.',
    PENDING_KYC: 'Sua verificação de identidade ainda está pendente. Envie os documentos necessários para ativar sua conta.',
    UNDER_REVIEW: 'Seus documentos estão em análise. Você será notificado assim que a verificação for concluída.',
    REJECTED: 'Sua verificação foi recusada. Você pode reenviar os documentos para uma nova análise.',
  }

  return {
    status: kycStatus,
    description: statusDescriptions[kycStatus] ?? 'Status desconhecido.',
  }
}
