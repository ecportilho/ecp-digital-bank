process.env.DATABASE_PATH = ':memory:'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod'
process.env.NODE_ENV = 'test'
process.env.ECP_PAY_WEBHOOK_SECRET = process.env.ECP_PAY_WEBHOOK_SECRET || 'test-webhook-secret'
