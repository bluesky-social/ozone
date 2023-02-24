'use client'
export function getType(obj: unknown): string {
  if (obj && typeof obj['$type'] === 'string') {
    return obj['$type']
  }
  return ''
}
