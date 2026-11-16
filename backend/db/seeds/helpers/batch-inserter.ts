import mysql from 'mysql2'
import type { Pool, PoolConnection } from 'mysql2/promise'
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
  for (let i = 0; i < total; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    await db.insert(table).values(chunk as any)
  }

  if (showLog) {
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`      [OK] ${label}: ${total.toLocaleString()} baris tersimpan (${durationSec} detik)`)
  }
}

function escapeSqlValue(val: unknown): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL'
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  return mysql.escape(val as any)
}

/**
 * Builds escaped multi-row SQL INSERT statements split by maxBytesPerQuery (default 4 MB),
 * bypassing MySQL's 65,535 prepared-statement placeholder limit.
 */
export function buildRawInsertStatements(
  tableName: string,
  columns: readonly string[],
  rows: readonly unknown[][],
  maxBytesPerQuery = 4 * 1024 * 1024
): string[] {
  if (rows.length === 0) return []

  const header = `INSERT INTO \`${tableName}\` (${columns.map((c) => `\`${c}\``).join(',')}) VALUES `
  const statements: string[] = []
  let currentParts: string[] = []
  let currentBytes = header.length

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const tuple = `(${row.map(escapeSqlValue).join(',')})`
    const tupleBytes = tuple.length + (currentParts.length > 0 ? 1 : 0)

    if (currentParts.length > 0 && currentBytes + tupleBytes > maxBytesPerQuery) {
      statements.push(header + currentParts.join(',') + ';')
      currentParts = [tuple]
      currentBytes = header.length + tuple.length
    } else {
      currentParts.push(tuple)
      currentBytes += tupleBytes
    }
  }

  if (currentParts.length > 0) {
    statements.push(header + currentParts.join(',') + ';')
  }

  return statements
}

export async function rawBulkInsert(
  conn: PoolConnection,
  tableName: string,
  columns: readonly string[],
  rows: readonly unknown[][],
  maxBytesPerQuery = 4 * 1024 * 1024
): Promise<void> {
  const statements = buildRawInsertStatements(tableName, columns, rows, maxBytesPerQuery)
  for (const sql of statements) {
    await conn.query(sql)
  }
}

/**
 * Runs bulk seeding on a single pooled connection with FK & unique checks temporarily disabled,
 * always restoring session flags before releasing back to the pool.
 */
export async function withFastBulkSession<T>(
  pool: Pool,
  fn: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection()
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;')
    await conn.query('SET UNIQUE_CHECKS = 0;')
    return await fn(conn)
  } finally {
    await conn.query('SET UNIQUE_CHECKS = 1;').catch(() => {})
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;').catch(() => {})
    conn.release()
  }
}
