import { getDb } from '../connection.js'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function runMigrations() {
  const db = getDb()

  console.log('[migrate] Starting database migrations...')

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const migrationFiles = ['001-initial.sql', '002-chat.sql']

  for (const file of migrationFiles) {
    const alreadyApplied = db.prepare('SELECT id FROM _migrations WHERE name = ?').get(file)

    if (alreadyApplied) {
      console.log(`[migrate] Skipping ${file} (already applied)`)
      continue
    }

    const sqlPath = path.join(__dirname, file)
    const sql = readFileSync(sqlPath, 'utf-8')

    try {
      db.exec(sql)
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file)
      console.log(`[migrate] Applied ${file}`)
    } catch (err) {
      console.error(`[migrate] Failed to apply ${file}:`, err)
      process.exit(1)
    }
  }

  console.log('[migrate] All migrations applied successfully.')
  process.exit(0)
}

runMigrations()
