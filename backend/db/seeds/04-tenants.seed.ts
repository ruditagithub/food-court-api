import { tenants } from '../schema'
import { allCuratedThemes, type ThemeTemplate } from './data/index'
import { chunkedInsert } from './helpers/batch-inserter'
import type { SeedFoodCourtsResult } from './02-food-courts.seed'
import type { SeedUsersResult } from './01-users.seed'

export interface SeedTenantsResult {
  tenantsList: (typeof tenants.$inferInsert)[]
  tenantThemeMap: Map<string, ThemeTemplate>
}

export async function seedTenants(
  fcData: SeedFoodCourtsResult,
  usersData: SeedUsersResult
): Promise<SeedTenantsResult> {
  console.log('\n[5/7] [TENANTS] Mendaftarkan 105 gerai tenant kuliner (21 per cabang)...')
  console.log(`      Tersedia ${allCuratedThemes.length} tema kuliner unik (Nusantara, Asian, Western, Healthy, Viral)`)
  const startTime = Date.now()

  const allTenants: (typeof tenants.$inferInsert)[] = []
  const tenantThemeMap = new Map<string, ThemeTemplate>()

  let globalTenantCounter = 1

  for (let fcIndex = 0; fcIndex < fcData.foodCourtsList.length; fcIndex++) {
    const fc = fcData.foodCourtsList[fcIndex]
    const fcShort = fc.slug.replace('amici-food-court-', '').replace(/-/g, '')
    const branchCity = fc.name.split(' ').pop() || 'Cabang'

    // Offset berbeda per cabang agar 21 stan di 1 food court memiliki tema yang 100% berbeda
    const themeOffset = (fcIndex * 7) % allCuratedThemes.length

    // 21 Tenant per Cabang
    for (let t = 1; t <= 21; t++) {
      const themeIndex = (themeOffset + t - 1) % allCuratedThemes.length
      const theme = allCuratedThemes[themeIndex]

      // Format Stan: STAN-A01 s/d STAN-C07
      const zoneLetter = t <= 7 ? 'A' : t <= 14 ? 'B' : 'C'
      const zoneNum = ((t - 1) % 7) + 1
      const stallNumber = `STAN-${zoneLetter}${String(zoneNum).padStart(2, '0')}`

      const owner = usersData.tenantOwners[globalTenantCounter - 1]
      const tenantId =
        fcIndex === 0 && t === 1
          ? 'tnt-rawon-siti-001' // Akun tenant default pengujian
          : `tnt-${fcShort}-${String(t).padStart(2, '0')}`

      const tenantName =
        fcIndex === 0 && t === 1
          ? 'Warung Rawon Bu Siti'
          : `${theme.nameTemplate} (${branchCity})`

      const slug = `${theme.nameTemplate.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${fcShort}-${t}`

      const tenantRecord: typeof tenants.$inferInsert = {
        id: tenantId,
        foodCourtId: fc.id,
        ownerId: owner?.id || null,
        name: tenantName,
        slug,
        stallNumber,
        description: theme.descTemplate,
        logo: `/uploads/tenants/tenant-${((globalTenantCounter - 1) % 25) + 1}.webp`,
        isOpen: true,
        openingTime: theme.genre.includes('Breakfast') ? '07:30' : '09:30',
        closingTime: theme.genre.includes('Martabak') || theme.genre.includes('Dessert') ? '22:30' : '21:30',
      }

      allTenants.push(tenantRecord)
      tenantThemeMap.set(tenantId, theme)
      globalTenantCounter++
    }
  }

  await chunkedInsert(tenants, allTenants, 50, 'Stan Kios Tenant', false)
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`      [OK] 105 stan tenant dengan 30 tema kuliner berhasil didaftarkan (${durationSec} detik)`)

  return {
    tenantsList: allTenants,
    tenantThemeMap,
  }
}
