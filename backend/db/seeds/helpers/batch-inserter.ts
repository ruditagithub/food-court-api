import { db } from '../../index'

/**
 * High-performance bulk insert helper that slices large arrays into chunks
 * to avoid MySQL parameter limits and packet size overflows.
 */
export async function chunkedInsert<T extends Record<string, any>>(
  table: any,
  rows: T[],
  chunkSize = 1000,
  label = 'records'
): Promise<void> {
  const total = rows.length
  if (total === 0) return

  const startTime = Date.now()
  let inserted = 0

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    await db.insert(table).values(chunk as any)
    inserted += chunk.length

    const pct = Math.round((inserted / total) * 100)
    if (total >= 5000 && (inserted % 5000 === 0 || inserted === total)) {
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`   ⏳ [${label}] ${inserted.toLocaleString()} / ${total.toLocaleString()} (${pct}%) [${elapsedSec}s]`)
    }
  }

  const durationMs = Date.now() - startTime
  console.log(`✅ [${label}] Selesai: ${total.toLocaleString()} baris berhasil disimpan (${(durationMs / 1000).toFixed(2)} detik)`)
}
