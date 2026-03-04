import { v4 } from 'uuid'

/**
 * Generate a UUID v4 string
 */
export function generateId(): string {
  return v4()
}
