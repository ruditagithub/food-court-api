import { db } from '../../index'

/**
 * High-performance bulk insert helper that slices large arrays into chunks
 * to avoid MySQL parameter limits and packet size overflows.
 */
export async function chunkedInsert<T extends Record<string, any>>(
  table: any,
  rows: T[],
  chunkSize = 1000,
  label = 'records',
  showLog = false
): Promise<void> {
  const total = rows.length
  if (total === 0) return

  const startTime = Date.now()
  let inserted = 0

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    await db.insert(table).values(chunk as any)
    inserted += chunk.length
  }

  if (showLog) {
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`      [OK] ${label}: ${total.toLocaleString()} baris tersimpan (${durationSec} detik)`)
  }
}
