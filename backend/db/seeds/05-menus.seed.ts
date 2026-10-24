import { menuCategories, menus, menuOptions } from '../schema'
import { chunkedInsert } from './helpers/batch-inserter'
import { getRandomInt } from './helpers/date-generator'
import type { SeedTenantsResult } from './04-tenants.seed'

export interface SeedMenusResult {
  categoriesList: (typeof menuCategories.$inferInsert)[]
  menusList: (typeof menus.$inferInsert)[]
  menusByTenantMap: Map<string, (typeof menus.$inferInsert)[]>
}

export async function seedMenus(tenantsData: SeedTenantsResult): Promise<SeedMenusResult> {
  console.log('\n[6/7] [MENUS] Menyusun ribuan menu hidangan kuliner (random 10 s/d 40 per tenant)...')
  console.log('      Mencakup masakan lokal, viral, ramen, sushi, pizza, nasi kandar, english breakfast, dsb.')
  const startTime = Date.now()

  const allCategories: (typeof menuCategories.$inferInsert)[] = []
  const allMenus: (typeof menus.$inferInsert)[] = []
  const allOptions: (typeof menuOptions.$inferInsert)[] = []
  const menusByTenantMap = new Map<string, (typeof menus.$inferInsert)[]>()

  let globalMenuCounter = 1

  for (const tenant of tenantsData.tenantsList) {
    const theme = tenantsData.tenantThemeMap.get(tenant.id)
    if (!theme) continue

    const tenantMenus: (typeof menus.$inferInsert)[] = []

    // 1. Kategori Menu untuk Tenant
    const tenantCategoryRecords: (typeof menuCategories.$inferInsert)[] = []
    for (let c = 0; c < theme.categories.length; c++) {
      const cat = theme.categories[c]
      const catId = `cat-${tenant.id}-${c + 1}`
      const catRecord: typeof menuCategories.$inferInsert = {
        id: catId,
        tenantId: tenant.id,
        name: cat.name,
        sortOrder: c + 1,
      }
      tenantCategoryRecords.push(catRecord)
      allCategories.push(catRecord)
    }

    // 2. Kumpulkan seluruh item dasar dari tema ini
    const rawItems: {
      name: string
      basePrice: number
      desc: string
      isDrink?: boolean
      catId: string
    }[] = []

    for (let c = 0; c < theme.categories.length; c++) {
      const cat = theme.categories[c]
      const catId = tenantCategoryRecords[c].id
      for (const it of cat.items) {
        rawItems.push({ ...it, catId })
      }
    }

    // 3. Tentukan jumlah menu untuk tenant ini: RANDOM 10 sampai 40
    const targetMenuCount = getRandomInt(10, 40)

    // Variasi porsi/penyajian realistis jika target menu melebihi item dasar tema
    const realisticVariants = [
      { prefix: '', suffix: '', priceMult: 1.0, descNote: '' },
      { prefix: '', suffix: ' (Porsi Jumbo)', priceMult: 1.35, descNote: ' • Porsi besar lebih mengenyangkan' },
      { prefix: 'Paket Hemat ', suffix: ' + Es Teh', priceMult: 1.15, descNote: ' • Termasuk segelas es teh manis dingin' },
      { prefix: '', suffix: ' (Ekstra Pedas)', priceMult: 1.05, descNote: ' • Dengan racikan cabai rawit ekstra pedas nampol' },
      { prefix: '', suffix: ' (Double Topping)', priceMult: 1.3, descNote: ' • Porsi topping ganda melimpah' },
      { prefix: 'Set ', suffix: ' Komplit Puas', priceMult: 1.4, descNote: ' • Dilengkapi sup dan pelengkap komplit' },
    ]

    for (let m = 0; m < targetMenuCount; m++) {
      const baseItem = rawItems[m % rawItems.length]
      const variantIdx = Math.floor(m / rawItems.length) % realisticVariants.length
      const variant = realisticVariants[variantIdx]

      let menuName = baseItem.name
      if (variantIdx > 0 && !menuName.includes('(')) {
        menuName = `${variant.prefix}${menuName}${variant.suffix}`
      }

      // Hitung harga realistis dalam IDR (dibulatkan ke ribuan)
      const adjustedPrice = Math.round((baseItem.basePrice * variant.priceMult) / 1000) * 1000
      const finalPrice = Math.max(5000, adjustedPrice)

      const isAvailable = Math.random() < 0.96 // 96% ready
      const stock = isAvailable ? getRandomInt(25, 95) : 0

      // Waktu persiapan realistis
      let prepTime = getRandomInt(12, 20)
      if (baseItem.isDrink) {
        prepTime = getRandomInt(3, 7)
      } else if (theme.genre.includes('Steak') || theme.genre.includes('Pizza')) {
        prepTime = getRandomInt(18, 25)
      }

      const menuId = `menu-${String(globalMenuCounter).padStart(5, '0')}`
      globalMenuCounter++

      const menuRecord: typeof menus.$inferInsert = {
        id: menuId,
        tenantId: tenant.id,
        categoryId: baseItem.catId,
        name: menuName,
        description: `${baseItem.desc}${variant.descNote}`,
        price: finalPrice,
        stock,
        status: isAvailable ? 'AVAILABLE' : 'OUT_OF_STOCK',
        preparationTime: prepTime,
        imageUrl: `/uploads/menus/menu-${((globalMenuCounter - 1) % 35) + 1}.webp`,
        isAvailable,
      }

      tenantMenus.push(menuRecord)
      allMenus.push(menuRecord)

      // 4. Tambahkan menu options (addons/varian) untuk hidangan yang relevan
      if (baseItem.isDrink) {
        if (Math.random() < 0.4) {
          allOptions.push(
            { id: `opt-${menuId}-1`, menuId, name: 'Less Sugar (Gula Sedikit)', priceAdjustment: 0 },
            { id: `opt-${menuId}-2`, menuId, name: 'Less Ice (Es Sedikit)', priceAdjustment: 0 },
            { id: `opt-${menuId}-3`, menuId, name: 'Extra Topping Grass Jelly', priceAdjustment: 4000 }
          )
        }
      } else {
        if (Math.random() < 0.35) {
          allOptions.push(
            { id: `opt-${menuId}-1`, menuId, name: 'Level Pedas: Sedang', priceAdjustment: 0 },
            { id: `opt-${menuId}-2`, menuId, name: 'Level Pedas: Ekstra Pedas', priceAdjustment: 2000 },
            { id: `opt-${menuId}-3`, menuId, name: 'Extra Nasi Putih Pulen', priceAdjustment: 6000 }
          )
        }
      }
    }

    menusByTenantMap.set(tenant.id, tenantMenus)
  }

  await chunkedInsert(menuCategories, allCategories, 500, 'Kategori Menu', false)
  await chunkedInsert(menus, allMenus, 1000, 'Menu Kuliner', false)
  await chunkedInsert(menuOptions, allOptions, 1000, 'Opsi Varian Menu', false)

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`      [OK] ${allCategories.length} kategori, ${allMenus.length} menu, dan ${allOptions.length} varian berhasil disimpan (${durationSec} detik)`)

  return {
    categoriesList: allCategories,
    menusList: allMenus,
    menusByTenantMap,
  }
}
