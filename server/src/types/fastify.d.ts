import '@fastify/jwt'

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: {
      id: string
      name: string
      email: string
      cpf: string
      phone?: string
      accountId: string
    }
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: string
      email: string
    }
    user: {
      id: string
      email: string
    }
  }
}
