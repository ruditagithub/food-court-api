import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export const DEFAULT_CHECKPOINT_PATH = resolve(
  import.meta.dir,
  '../../.seed-checkpoint.json'
)

export interface SerializedDailyBucket {
  dayIndex: number
  dateStr: string
  dayStartIso: string
  targetOrders: number
}

export interface SeedCheckpoint {
  version: number
  targetOrders: number
  completedDays: number
  lastOrderSeq: number
  lastTenantBalLogSeq: number
  lastFcBalLogSeq: number
  lastTenantWdSeq: number
  lastFcWdSeq: number
  endDateIso?: string
  dailyPlan: SerializedDailyBucket[]
  tenantBalances: Record<string, number>
  foodCourtBalances: Record<string, number>
  discountUsageCounts: Record<string, number>
  updatedAt: string
}

export async function loadCheckpoint(
  filePath = DEFAULT_CHECKPOINT_PATH
): Promise<SeedCheckpoint | null> {
  if (!existsSync(filePath)) return null
  const raw = await readFile(filePath, 'utf-8')
  return JSON.parse(raw) as SeedCheckpoint
}

export async function saveCheckpoint(
  checkpoint: SeedCheckpoint,
  filePath = DEFAULT_CHECKPOINT_PATH
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  const tmpPath = `${filePath}.tmp`
  await writeFile(tmpPath, JSON.stringify(checkpoint), 'utf-8')
  await rename(tmpPath, filePath)
}

export async function clearCheckpoint(
  filePath = DEFAULT_CHECKPOINT_PATH
): Promise<void> {
  if (existsSync(filePath)) {
    await unlink(filePath)
  }
}
