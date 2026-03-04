import { buildApp } from './app.js'

const PORT = Number(process.env.PORT) || 3333
const HOST = process.env.HOST || '0.0.0.0'

async function start() {
  const app = await buildApp()

  try {
    await app.listen({ port: PORT, host: HOST })
    console.log(`[server] ECP Digital Bank API running at http://localhost:${PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
