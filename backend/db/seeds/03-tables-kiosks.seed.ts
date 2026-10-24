import { tables, kiosks } from '../schema'
import { chunkedInsert } from './helpers/batch-inserter'
import { getRandomInt } from './helpers/date-generator'
import type { SeedFoodCourtsResult } from './02-food-courts.seed'

export interface SeedTablesKiosksResult {
  tablesList: (typeof tables.$inferInsert)[]
  kiosksList: (typeof kiosks.$inferInsert)[]
}

export async function seedTablesAndKiosks(
  fcData: SeedFoodCourtsResult
): Promise<SeedTablesKiosksResult> {
  console.log('\n[4/7] [TABLES & KIOSKS] Membuat meja QR (random 25 - 80 per cabang) & perangkat Kiosk...')
  const startTime = Date.now()

  const allTables: (typeof tables.$inferInsert)[] = []
  const allKiosks: (typeof kiosks.$inferInsert)[] = []

  const capacities = [2, 4, 4, 4, 6, 6, 8]

  for (let fcIndex = 0; fcIndex < fcData.foodCourtsList.length; fcIndex++) {
    const fc = fcData.foodCourtsList[fcIndex]
    const branchCode = `FC0${fcIndex + 1}`

    // Random antara 25 sampai 80 Meja per Cabang
    const numTables = getRandomInt(25, 80)
    for (let t = 1; t <= numTables; t++) {
      const tableNum = `T-${String(t).padStart(2, '0')}`
      const tableId = `tbl-${branchCode.toLowerCase()}-${String(t).padStart(2, '0')}`
      const qrToken = `QR-${branchCode}-${tableNum}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      const cap = capacities[t % capacities.length]

      allTables.push({
        id: tableId,
        foodCourtId: fc.id,
        tableNumber: tableNum,
        qrToken,
        capacity: cap,
        status: 'available' as const,
      })
    }

    // 2 Kiosk Device per Cabang
    allKiosks.push(
      {
        id: `ksk-${branchCode.toLowerCase()}-01`,
        foodCourtId: fc.id,
        kioskName: `Kiosk Utama Lobby ${fc.name}`,
        deviceCode: `DEV-KSK-${branchCode}-01`,
        location: 'Lobby Pintu Masuk Barat',
        status: 'ACTIVE' as const,
      },
      {
        id: `ksk-${branchCode.toLowerCase()}-02`,
        foodCourtId: fc.id,
        kioskName: `Kiosk Self-Service Timur ${fc.name}`,
        deviceCode: `DEV-KSK-${branchCode}-02`,
        location: 'Koridor Timur Area Tengah',
        status: 'ACTIVE' as const,
      }
    )
  }

  await chunkedInsert(tables, allTables, 100, 'Meja QR Food Court', false)
  await chunkedInsert(kiosks, allKiosks, 50, 'Perangkat Kiosk', false)

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`      [OK] ${allTables.length} meja QR dan ${allKiosks.length} kiosk berhasil disimpan (${durationSec} detik)`)

  return {
    tablesList: allTables,
    kiosksList: allKiosks,
  }
}
