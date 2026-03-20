import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import type { FastifyInstance } from 'fastify'
import { setupTestApp, cleanupTestApp, clearDb } from '../../test/setup.js'

describe('Auth Module', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await setupTestApp()
  })

  afterAll(async () => {
    await cleanupTestApp()
  })

  beforeEach(() => {
    clearDb()
  })

  describe('POST /api/auth/register', () => {
    it('AC-01 | should register a new user with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          name: 'Marina Silva',
          email: 'marina@test.com',
          cpf: '12345678900',
          password: 'Senha@123',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.token).toBeDefined()
      expect(body.user.name).toBe('Marina Silva')
      expect(body.user.email).toBe('marina@test.com')
      expect(body.user.cpf).toBe('12345678900')
    })

    it('AC-02 | should reject duplicate email', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { name: 'User 1', email: 'dup@test.com', cpf: '11111111111', password: 'Senha@123' },
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { name: 'User 2', email: 'dup@test.com', cpf: '22222222222', password: 'Senha@123' },
      })

      expect(response.statusCode).toBe(409)
      const body = JSON.parse(response.body)
      expect(body.error.code).toBe('EMAIL_ALREADY_IN_USE')
    })

    it('AC-03 | should reject duplicate CPF', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { name: 'User 1', email: 'a@test.com', cpf: '11111111111', password: 'Senha@123' },
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { name: 'User 2', email: 'b@test.com', cpf: '11111111111', password: 'Senha@123' },
      })

      expect(response.statusCode).toBe(409)
      const body = JSON.parse(response.body)
      expect(body.error.code).toBe('CPF_ALREADY_IN_USE')
    })

    it('AC-04 | should reject weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { name: 'User', email: 'user@test.com', cpf: '11111111111', password: '12345678' },
      })

      expect(response.statusCode).toBe(400)
    })

    it('AC-05 | should reject invalid CPF format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { name: 'User', email: 'user@test.com', cpf: '123', password: 'Senha@123' },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { name: 'Marina', email: 'marina@test.com', cpf: '12345678900', password: 'Senha@123' },
      })
    })

    it('AC-06 | should login with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'marina@test.com', password: 'Senha@123' },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.token).toBeDefined()
      expect(body.user.email).toBe('marina@test.com')
    })

    it('AC-07 | should reject invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'marina@test.com', password: 'WrongPass@1' },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error.code).toBe('INVALID_CREDENTIALS')
    })

    it('AC-08 | should reject non-existent email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'nobody@test.com', password: 'Senha@123' },
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/auth/me', () => {
    it('AC-09 | should return user data with valid token', async () => {
      const reg = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { name: 'Marina', email: 'marina@test.com', cpf: '12345678900', password: 'Senha@123' },
      })
      const { token } = JSON.parse(reg.body)

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.user.email).toBe('marina@test.com')
    })

    it('AC-10 | RN-02 should reject request without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
