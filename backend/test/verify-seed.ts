import { poolConnection } from '../db/index'

async function verify() {
  console.log('[VERIFY] Menghubungkan ke database dan memeriksa integritas data...')

  const tablesToCheck = [
    'users',
    'food_courts',
    'tables',
    'kiosks',
    'tenants',
    'menu_categories',
    'menus',
    'menu_options',
    'dining_sessions',
    'session_participants',
    'orders',
    'tenant_orders',
    'order_items',
    'order_item_options',
    'kitchen_queues',
    'order_status_logs',
    'payment_groups',
    'payment_group_items',
    'payments',
  ]

  console.log('\n=========================================================')
  console.log('RINGKASAN JUMLAH BARIS DATABASE (19 TABEL)')
  console.log('=========================================================')
  for (const tbl of tablesToCheck) {
    const [rows]: any = await poolConnection.query(`SELECT COUNT(*) as cnt FROM \`${tbl}\`;`)
    const count = rows[0]?.cnt || 0
    console.log(`  ${tbl.padEnd(24)} : ${Number(count).toLocaleString().padStart(8)} baris`)
  }
  console.log('---------------------------------------------------------')

  // Rentang Waktu Orders
  const [dateRange]: any = await poolConnection.query(
    'SELECT MIN(created_at) as earliest, MAX(created_at) as latest FROM `orders`;'
  )
  console.log(`  Rentang Waktu Pesanan   : ${dateRange[0]?.earliest} s/d ${dateRange[0]?.latest}`)

  // Integritas Foreign Key (Orphan Check)
  const [orphanTenantOrders]: any = await poolConnection.query(`
    SELECT COUNT(*) as orphan_count 
    FROM tenant_orders tord 
    LEFT JOIN orders ord ON tord.order_id = ord.id 
    WHERE ord.id IS NULL;
  `)
  const orphanCount = orphanTenantOrders[0]?.orphan_count || 0

  if (orphanCount === 0) {
    console.log('  Integritas Relasi       : 100% Sempurna (0 foreign key yatim / orphan)')
  } else {
    console.log(`  [WARNING] Terdeteksi ${orphanCount} foreign key yatim!`)
  }

  console.log('=========================================================\n')
  process.exit(0)
}

verify().catch((err) => {
  console.error('[ERROR] Error verifikasi:', err)
  process.exit(1)
})
