import { cleanDatabase } from './seeds/00-clean.seed'
import { seedUsers } from './seeds/01-users.seed'
import { seedFoodCourts } from './seeds/02-food-courts.seed'
import { seedTablesAndKiosks } from './seeds/03-tables-kiosks.seed'
import { seedTenants } from './seeds/04-tenants.seed'
import { seedMenus } from './seeds/05-menus.seed'
import { seedOrdersHistory } from './seeds/06-orders-history.seed'

async function runMasterSeed() {
  console.log('====================================================================')
  console.log('AMICI FOOD COURT - MASTER DATABASE SEEDER (SIMULASI 1 TAHUN)')
  console.log('====================================================================')
  const masterStart = Date.now()

  try {
    // 1. Reset Bersih Database (Truncate dengan FK checks = 0)
    await cleanDatabase()

    // 2. Akun Pengguna (Admin, Kasir, Manajer, 105 Pemilik Kios, 200 Pelanggan)
    const usersData = await seedUsers()

    // 3. 5 Cabang Food Court di Indonesia
    const foodCourtsData = await seedFoodCourts(usersData)

    // 4. Meja QR (Random 25 - 80 per cabang) & Perangkat Kiosk
    const tablesData = await seedTablesAndKiosks(foodCourtsData)

    // 5. 105 Stan Tenant Kios Kuliner (21 per cabang)
    const tenantsData = await seedTenants(foodCourtsData, usersData)

    // 6. Kategori & ~2.800 Menu Hidangan Nusantara (10 - 40 per tenant)
    const menusData = await seedMenus(tenantsData)

    // 7. 40.000 Pesanan Historis Terdistribusi (1 Agustus 2025 s/d 24 Oktober 2026)
    await seedOrdersHistory(
      {
        foodCourtsData,
        tablesData,
        tenantsData,
        menusData,
        usersData,
      },
      40000
    )

    const totalSeconds = ((Date.now() - masterStart) / 1000).toFixed(2)
    console.log('\n====================================================================')
    console.log(`FULL SEEDING SELESAI SUKSES DALAM ${totalSeconds} DETIK`)
    console.log('====================================================================')
    console.log('Ringkasan Data yang Dibuat:')
    console.log('  Food Courts     : 5 Cabang (Surabaya, Jakarta, Bandung, Bali, Jogja)')
    console.log(`  Meja QR         : ${tablesData.tablesList.length} Meja (${tablesData.tablesList.length / 5 | 0} rata-rata per cabang, 25-80 acak)`)
    console.log('  Perangkat Kiosk : 10 Terminal Kiosk Mandiri (2 per cabang)')
    console.log('  Stan Tenant     : 105 Gerai Kios (21 per cabang, STAN-A01 s/d STAN-C07)')
    console.log(`  Katalog Menu    : ${menusData.menusList.length.toLocaleString()} Menu Sajian Kuliner`)
    console.log('  Total Pesanan   : 40.000 Orders (Lengkap Sesi, Sub-order, Antrean, Pembayaran)')
    console.log('  Rentang Waktu   : 1 Agustus 2025 s/d 24 Oktober 2026')
    console.log('--------------------------------------------------------------------')
    console.log('Akun Login Pengujian (Password: "password123"):')
    console.log('  - Super Admin   : admin@foodcourt.com')
    console.log('  - Kasir         : cashier@foodcourt.com (Kasir Amici)')
    console.log('  - Manajer FC    : manager@foodcourt.com (Grand City Surabaya)')
    console.log('  - Mitra Tenant  : tenant@foodcourt.com (Warung Rawon Bu Siti)')
    console.log('  - Customer      : customer@foodcourt.com (Rizky Ramadhan)')
    console.log('====================================================================\n')

    process.exit(0)
  } catch (err) {
    console.error('\n[ERROR] Fatal Seeding Error:', err)
    process.exit(1)
  }
}

runMasterSeed()
