import { db } from './index'
import {
  discounts,
  foodCourts,
  kiosks,
  menuCategories,
  menuOptions,
  menus,
  tables,
  tenants,
  users,
} from './schema'
import { cleanDatabase } from './seeds/00-clean.seed'
import { seedUsers } from './seeds/01-users.seed'
import { seedFoodCourts } from './seeds/02-food-courts.seed'
import { seedTablesAndKiosks } from './seeds/03-tables-kiosks.seed'
import { seedTenants } from './seeds/04-tenants.seed'
import { seedMenus } from './seeds/05-menus.seed'
import { seedDiscounts } from './seeds/05b-discounts.seed'
import {
  seedOrdersHistory,
  type OrdersHistorySeedContext,
} from './seeds/06-orders-history.seed'
import {
  clearCheckpoint,
  DEFAULT_CHECKPOINT_PATH,
  loadCheckpoint,
} from './seeds/helpers/checkpoint'
import { foodCourtConfigs } from './seeds/helpers/indonesian-names'

export interface SeedCliOptions {
  totalOrders: number
  resume: boolean
}

function parsePositiveInt(val: string | undefined, fallback: number): number {
  if (!val) return fallback
  const n = Number(val)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

export function parseSeedCliArgs(
  argv: string[],
  env: Record<string, string | undefined> = process.env
): SeedCliOptions {
  let totalOrders = parsePositiveInt(env.SEED_ORDERS_COUNT, 12000)
  let resume = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--resume') {
      resume = true
    } else if (arg.startsWith('--orders=')) {
      totalOrders = parsePositiveInt(arg.slice('--orders='.length), totalOrders)
    } else if (arg === '--orders' && i + 1 < argv.length) {
      totalOrders = parsePositiveInt(argv[++i], totalOrders)
    }
  }

  return { totalOrders, resume }
}

async function loadContextFromDatabase(): Promise<OrdersHistorySeedContext> {
  const [
    allUsers,
    fcList,
    tblList,
    kskList,
    tntList,
    catList,
    mnList,
    optList,
    dscList,
  ] = await Promise.all([
    db.select().from(users),
    db.select().from(foodCourts),
    db.select().from(tables),
    db.select().from(kiosks),
    db.select().from(tenants),
    db.select().from(menuCategories),
    db.select().from(menus),
    db.select().from(menuOptions),
    db.select().from(discounts),
  ])

  const canonicalFcOrder = new Map(foodCourtConfigs.map((fc, idx) => [fc.id, idx]))
  fcList.sort((a, b) => (canonicalFcOrder.get(a.id) ?? 999) - (canonicalFcOrder.get(b.id) ?? 999))
  tblList.sort((a, b) => a.id.localeCompare(b.id))
  kskList.sort((a, b) => a.id.localeCompare(b.id))
  tntList.sort((a, b) => a.id.localeCompare(b.id))
  mnList.sort((a, b) => a.id.localeCompare(b.id))
  dscList.sort((a, b) => a.id.localeCompare(b.id))

  const superAdmin = allUsers.find((u) => u.role === 'admin')
  const cashier = allUsers.find((u) => u.role === 'cashier')
  if (!superAdmin || !cashier) {
    throw new Error('Data master users belum lengkap di database. Jalankan seed baru terlebih dahulu.')
  }

  const menusByTenantMap = new Map<string, (typeof menus.$inferInsert)[]>()
  for (const m of mnList) {
    const arr = menusByTenantMap.get(m.tenantId) || []
    arr.push(m)
    menusByTenantMap.set(m.tenantId, arr)
  }

  const optionsByMenuMap = new Map<string, (typeof menuOptions.$inferInsert)[]>()
  for (const opt of optList) {
    const arr = optionsByMenuMap.get(opt.menuId) || []
    arr.push(opt)
    optionsByMenuMap.set(opt.menuId, arr)
  }

  const discountsByFcMap = new Map<string, (typeof discounts.$inferInsert)[]>()
  for (const d of dscList) {
    const arr = discountsByFcMap.get(d.foodCourtId) || []
    arr.push(d)
    discountsByFcMap.set(d.foodCourtId, arr)
  }

  return {
    usersData: {
      superAdmin,
      cashier,
      managers: allUsers.filter((u) => u.role === 'admin-food-court'),
      tenantOwners: allUsers.filter((u) => u.role === 'tenant'),
      customers: [],
    },
    foodCourtsData: { foodCourtsList: fcList },
    tablesData: { tablesList: tblList, kiosksList: kskList },
    tenantsData: { tenantsList: tntList, tenantThemeMap: new Map() },
    menusData: {
      categoriesList: catList,
      menusList: mnList,
      menusByTenantMap,
      optionsByMenuMap,
    },
    discountsData: { discountsList: dscList, discountsByFcMap },
  }
}

async function runMasterSeed() {
  const { totalOrders, resume } = parseSeedCliArgs(process.argv.slice(2))

  console.log('====================================================================')
  console.log('AMICI FOOD COURT - MASTER DATABASE SEEDER (450-DAY REAL-CASE ENGINE)')
  console.log('====================================================================')
  const masterStart = Date.now()

  try {
    if (resume) {
      const checkpoint = await loadCheckpoint(DEFAULT_CHECKPOINT_PATH)
      if (!checkpoint) {
        throw new Error('File checkpoint tidak ditemukan. Jalankan seed baru terlebih dahulu.')
      }
      const ctx = await loadContextFromDatabase()
      await seedOrdersHistory(ctx, checkpoint.targetOrders, { resume: true })

      const paused = (await loadCheckpoint(DEFAULT_CHECKPOINT_PATH)) !== null
      if (paused) {
        process.exit(0)
      }

      const totalSeconds = ((Date.now() - masterStart) / 1000).toFixed(2)
      console.log('\n====================================================================')
      console.log(`RESUME SEEDING SELESAI SUKSES DALAM ${totalSeconds} DETIK (${checkpoint.targetOrders.toLocaleString()} ORDERS)`)
      console.log('====================================================================\n')
      process.exit(0)
    }

    await clearCheckpoint(DEFAULT_CHECKPOINT_PATH)

    // 1. Reset Bersih Seluruh 24 Tabel Database
    await cleanDatabase()

    // 2. Akun Pengguna Staf (Super Admin, Kasir, 5 Manajer FC, 105 Pemilik Kios)
    const usersData = await seedUsers()

    // 3. 5 Cabang Food Court di Indonesia (Surabaya, Jakarta, Bandung, Bali, Jogja)
    const foodCourtsData = await seedFoodCourts(usersData)

    // 4. Meja QR & Terminal Kiosk Mandiri
    const tablesData = await seedTablesAndKiosks(foodCourtsData)

    // 5. 105 Stan Tenant Kios Kuliner (21 per cabang)
    const tenantsData = await seedTenants(foodCourtsData, usersData)

    // 6. Kategori & Ribuan Menu Hidangan Kuliner dengan Foto Unsplash HD
    const menusData = await seedMenus(tenantsData)

    // 6b. Voucher Diskon Platform & Tenant
    const discountsData = await seedDiscounts(foodCourtsData, tenantsData)

    // 7. Pesanan Historis Terdistribusi & Mutasi Saldo Keuangan Lengkap
    await seedOrdersHistory(
      {
        foodCourtsData,
        tablesData,
        tenantsData,
        menusData,
        usersData,
        discountsData,
      },
      totalOrders,
      { resume: false }
    )

    const paused = (await loadCheckpoint(DEFAULT_CHECKPOINT_PATH)) !== null
    if (paused) {
      process.exit(0)
    }

    const totalSeconds = ((Date.now() - masterStart) / 1000).toFixed(2)
    console.log('\n====================================================================')
    console.log(`FULL SEEDING SELESAI SUKSES DALAM ${totalSeconds} DETIK`)
    console.log('====================================================================')
    console.log('Ringkasan Data yang Dibuat:')
    console.log('  Food Courts       : 5 Cabang (Surabaya, Jakarta, Bandung, Bali, Jogja)')
    console.log(`  Meja QR           : ${tablesData.tablesList.length} Meja QR aktif`)
    console.log('  Perangkat Kiosk   : 10 Terminal Kiosk Mandiri (2 per cabang)')
    console.log('  Stan Tenant       : 105 Gerai Kios (21 per cabang, STAN-A01 s/d STAN-C07)')
    console.log(`  Katalog Menu      : ${menusData.menusList.length.toLocaleString()} Menu Sajian Kuliner (Foto HD)`)
    console.log(`  Voucher Diskon    : ${discountsData.discountsList.length} Kode Promo (Platform & Tenant)`)
    console.log('  Pelanggan         : Tanpa login (entitas pelanggan tunggal langsung di sesi pesanan)')
    console.log(`  Total Pesanan     : ${totalOrders.toLocaleString()} Transaksi (QR, Kiosk, Kasir, Split-Bill)`)
    console.log('  Ledger Mutasi     : Sinkron (Tenant Balance Logs & Food Court Balance Logs)')
    console.log('--------------------------------------------------------------------')
    console.log('Akun Login Pengujian (Password: "password123"):')
    console.log('  - Super Admin     : admin@foodcourt.com')
    console.log('  - Kasir FoodCourt : cashier@foodcourt.com (Kasir Amici)')
    console.log('  - Manajer Cabang  : manager@foodcourt.com (Grand City Surabaya)')
    console.log('  - Mitra Tenant    : tenant@foodcourt.com (Warung Rawon Bu Siti)')
    console.log('====================================================================\n')

    process.exit(0)
  } catch (err) {
    console.error('\n[ERROR] Fatal Seeding Error:', err)
    process.exit(1)
  }
}

if (import.meta.main) {
  runMasterSeed()
}
