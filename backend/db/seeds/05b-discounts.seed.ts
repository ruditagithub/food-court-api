import { discounts } from '../schema'
import { chunkedInsert } from './helpers/batch-inserter'
import type { SeedFoodCourtsResult } from './02-food-courts.seed'
import type { SeedTenantsResult } from './04-tenants.seed'

export interface SeedDiscountsResult {
  discountsList: (typeof discounts.$inferInsert)[]
  discountsByFcMap: Map<string, (typeof discounts.$inferInsert)[]>
}

export async function seedDiscounts(
  fcData: SeedFoodCourtsResult,
  tenantsData: SeedTenantsResult
): Promise<SeedDiscountsResult> {
  console.log('\n[6b/8] [DISCOUNTS] Mendaftarkan voucher diskon platform & tenant...')
  const startTime = Date.now()

  const allDiscounts: (typeof discounts.$inferInsert)[] = []
  const discountsByFcMap = new Map<string, (typeof discounts.$inferInsert)[]>()

  const startDate = new Date('2025-08-01T00:00:00.000Z')
  const endDate = new Date('2026-12-31T23:59:59.000Z')

  let discountSeq = 1

  for (const fc of fcData.foodCourtsList) {
    const fcDiscounts: (typeof discounts.$inferInsert)[] = []
    const fcShort = fc.slug.replace('amici-food-court-', '').toUpperCase()

    // 1. Food Court Wide Vouchers
    const platformVouchers = [
      {
        code: `AMICIBARU-${fcShort}`,
        name: 'Promo Pengguna Baru Amici',
        description: 'Diskon 20% s/d Rp 15.000 untuk santap di Amici Food Court',
        type: 'PERCENTAGE' as const,
        value: 20,
        maxDiscountAmount: 15000,
        minOrderAmount: 40000,
      },
      {
        code: `GAJIANSERU-${fcShort}`,
        name: 'Promo Gajian Seru Amici',
        description: 'Potongan langsung Rp 10.000 untuk pesanan minimal Rp 60.000',
        type: 'FIXED_AMOUNT' as const,
        value: 10000,
        maxDiscountAmount: 10000,
        minOrderAmount: 60000,
      },
      {
        code: `MAKANHEMAT-${fcShort}`,
        name: 'Voucher Makan Siang Hemat',
        description: 'Diskon 15% maksimal Rp 10.000',
        type: 'PERCENTAGE' as const,
        value: 15,
        maxDiscountAmount: 10000,
        minOrderAmount: 35000,
      },
      {
        code: `WEEKENDSERU-${fcShort}`,
        name: 'Pesta Akhir Pekan Amici',
        description: 'Diskon 25% spesial akhir pekan maksimal Rp 25.000',
        type: 'PERCENTAGE' as const,
        value: 25,
        maxDiscountAmount: 25000,
        minOrderAmount: 75000,
      },
      {
        code: `AMICIPROMO-${fcShort}`,
        name: 'Voucher Amici Ceria',
        description: 'Potongan hemat Rp 5.000 tanpa batas waktu',
        type: 'FIXED_AMOUNT' as const,
        value: 5000,
        maxDiscountAmount: 5000,
        minOrderAmount: 25000,
      },
    ]

    for (const pv of platformVouchers) {
      const rec: typeof discounts.$inferInsert = {
        id: `dsc-fc-${String(discountSeq++).padStart(4, '0')}`,
        foodCourtId: fc.id,
        tenantId: null,
        code: pv.code,
        name: pv.name,
        description: pv.description,
        scope: 'FOOD_COURT',
        type: pv.type,
        value: pv.value,
        maxDiscountAmount: pv.maxDiscountAmount,
        minOrderAmount: pv.minOrderAmount,
        isPublic: true,
        usageLimit: 5000,
        usageCount: 0,
        startDate,
        endDate,
        status: 'ACTIVE',
      }
      fcDiscounts.push(rec)
      allDiscounts.push(rec)
    }

    // 2. Tenant Specific Vouchers for some tenants in this food court
    const fcTenants = tenantsData.tenantsList.filter((t) => t.foodCourtId === fc.id)
    const featuredTenants = fcTenants.slice(0, 5) // 5 tenant promo per cabang

    for (const tnt of featuredTenants) {
      const isFixed = Math.random() < 0.5
      const rec: typeof discounts.$inferInsert = {
        id: `dsc-tnt-${String(discountSeq++).padStart(4, '0')}`,
        foodCourtId: fc.id,
        tenantId: tnt.id,
        code: `PROMO-${tnt.slug.slice(0, 8).toUpperCase()}-${discountSeq}`,
        name: `Voucher Spesial ${tnt.name}`,
        description: `Promo istimewa hidangan favorit di ${tnt.name}`,
        scope: 'TENANT',
        type: isFixed ? 'FIXED_AMOUNT' : 'PERCENTAGE',
        value: isFixed ? 5000 : 15,
        maxDiscountAmount: isFixed ? 5000 : 12000,
        minOrderAmount: 30000,
        isPublic: true,
        usageLimit: 1000,
        usageCount: 0,
        startDate,
        endDate,
        status: 'ACTIVE',
      }
      fcDiscounts.push(rec)
      allDiscounts.push(rec)
    }

    discountsByFcMap.set(fc.id, fcDiscounts)
  }

  await chunkedInsert(discounts, allDiscounts, 100, 'Voucher Diskon', false)
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`      [OK] ${allDiscounts.length} voucher diskon platform & tenant berhasil disimpan (${durationSec} detik)`)

  return {
    discountsList: allDiscounts,
    discountsByFcMap,
  }
}

