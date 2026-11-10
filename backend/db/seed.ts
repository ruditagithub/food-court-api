import { cleanDatabase } from './seeds/00-clean.seed'
import { seedUsers } from './seeds/01-users.seed'
import { seedFoodCourts } from './seeds/02-food-courts.seed'
import { seedTablesAndKiosks } from './seeds/03-tables-kiosks.seed'
import { seedTenants } from './seeds/04-tenants.seed'
import { seedMenus } from './seeds/05-menus.seed'
import { seedDiscounts } from './seeds/05b-discounts.seed'
import { seedOrdersHistory } from './seeds/06-orders-history.seed'

async function runMasterSeed() {
  console.log('====================================================================')
  console.log('AMICI FOOD COURT - MASTER DATABASE SEEDER (SIMULASI 14 BULAN)')
  console.log('====================================================================')
  const masterStart = Date.now()

  try {
    // 1. Reset Bersih Seluruh 24 Tabel Database
    await cleanDatabase()

    // 2. Akun Pengguna (Super Admin, Kasir, 5 Manajer FC, 105 Pemilik Kios, 200 Pelanggan)
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
    const orderCount = process.env.SEED_ORDERS_COUNT
      ? parseInt(process.env.SEED_ORDERS_COUNT, 10)
      : 12000

    await seedOrdersHistory(
      {
        foodCourtsData,
        tablesData,
        tenantsData,
        menusData,
        usersData,
        discountsData,
      },
      orderCount
    )

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
    console.log(`  Total Pesanan     : ${orderCount.toLocaleString()} Transaksi (QR, Kiosk, Kasir)`)
    console.log('  Ledger Mutasi     : Sinkron (Tenant Balance Logs & Food Court Balance Logs)')
    console.log('  Rentang Waktu     : 1 Agustus 2025 s/d 24 Oktober 2026')
    console.log('--------------------------------------------------------------------')
    console.log('Akun Login Pengujian (Password: "password123"):')
    console.log('  - Super Admin     : admin@foodcourt.com')
    console.log('  - Kasir FoodCourt : cashier@foodcourt.com (Kasir Amici)')
    console.log('  - Manajer Cabang  : manager@foodcourt.com (Grand City Surabaya)')
    console.log('  - Mitra Tenant    : tenant@foodcourt.com (Warung Rawon Bu Siti)')
    console.log('  - Pelanggan       : customer@foodcourt.com (Rizky Ramadhan)')
    console.log('====================================================================\n')

    process.exit(0)
  } catch (err) {
    console.error('\n[ERROR] Fatal Seeding Error:', err)
    process.exit(1)
  }
}

runMasterSeed()
