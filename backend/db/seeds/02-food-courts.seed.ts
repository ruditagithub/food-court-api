import { foodCourts } from '../schema'
import { foodCourtConfigs } from './helpers/indonesian-names'
import { foodCourtLogos } from './data/image-catalog'
import { chunkedInsert } from './helpers/batch-inserter'
import type { SeedUsersResult } from './01-users.seed'

export interface SeedFoodCourtsResult {
  foodCourtsList: (typeof foodCourts.$inferInsert)[]
}

export async function seedFoodCourts(usersData: SeedUsersResult): Promise<SeedFoodCourtsResult> {
  console.log('\n[3/8] [FOOD COURTS] Mempersiapkan 5 cabang Food Court Indonesia dengan foto & rekening...')
  const startTime = Date.now()

  const list: (typeof foodCourts.$inferInsert)[] = foodCourtConfigs.map((fc, idx) => {
    const manager = usersData.managers[idx]
    return {
      id: fc.id,
      managerId: manager?.id || null,
      name: fc.name,
      slug: fc.slug,
      address: fc.address,
      phone: fc.phone,
      logo: foodCourtLogos[idx % foodCourtLogos.length],
      status: 'ACTIVE' as const,
      balance: 0,
      bankName: 'Bank Central Asia (BCA)',
      bankAccountNumber: `88301982${String(idx + 1).padStart(3, '0')}`,
      bankAccountHolder: `PT Amici Boga Sejahtera - ${fc.city}`,
    }
  })

  await chunkedInsert(foodCourts, list, 50, 'Cabang Food Court', false)
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`      [OK] 5 cabang Food Court berhasil disimpan (${durationSec} detik)`)

  return { foodCourtsList: list }
}
