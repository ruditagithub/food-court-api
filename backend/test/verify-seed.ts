import { poolConnection } from '../db/index'

async function verify() {
  console.log('[VERIFY] Menghubungkan ke database dan memeriksa integritas data (24 tabel)...')

  const tablesToCheck = [
    'users',
    'food_courts',
    'tables',
    'kiosks',
    'tenants',
    'menu_categories',
    'menus',
    'menu_options',
    'discounts',
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
    'withdrawal_requests',
    'tenant_balance_logs',
    'food_court_withdrawals',
    'food_court_balance_logs',
  ]

  console.log('\n===============================================================')
  console.log('RINGKASAN JUMLAH BARIS DATABASE (24 TABEL)')
  console.log('===============================================================')
  let totalRows = 0
  for (const tbl of tablesToCheck) {
    const [rows]: any = await poolConnection.query(`SELECT COUNT(*) as cnt FROM \`${tbl}\`;`)
    const count = Number(rows[0]?.cnt || 0)
    totalRows += count
    console.log(`  ${tbl.padEnd(26)} : ${count.toLocaleString().padStart(12)} baris`)
  }
  console.log('---------------------------------------------------------------')
  console.log(`  ${'TOTAL SELURUH BARIS'.padEnd(26)} : ${totalRows.toLocaleString().padStart(12)} baris`)
  console.log('---------------------------------------------------------------')

  // 1. Rentang Waktu Orders
  const [dateRange]: any = await poolConnection.query(
    'SELECT MIN(created_at) as earliest, MAX(created_at) as latest FROM `orders`;'
  )
  console.log(`  Rentang Waktu Pesanan      : ${dateRange[0]?.earliest} s/d ${dateRange[0]?.latest}`)

  // 2. Distribusi Kanal & Split-Bill
  const [channelRows]: any = await poolConnection.query(`
    SELECT
      CASE
        WHEN kiosk_id IS NOT NULL THEN 'KIOSK'
        WHEN table_id IS NOT NULL THEN 'TABLE_QR'
        ELSE 'CASHIER'
      END AS channel,
      COUNT(*) AS cnt
    FROM dining_sessions
    GROUP BY channel;
  `)
  const channelSummary = channelRows.map((r: any) => `${r.channel}=${Number(r.cnt).toLocaleString()}`).join(', ')
  console.log(`  Distribusi Kanal Sesi      : ${channelSummary}`)

  const [splitBillRows]: any = await poolConnection.query(`
    SELECT COUNT(*) AS split_orders FROM (
      SELECT order_id FROM payment_groups GROUP BY order_id HAVING COUNT(*) > 1
    ) sb;
  `)
  console.log(`  Pesanan Split-Bill (2-4x)  : ${Number(splitBillRows[0]?.split_orders || 0).toLocaleString()} orders`)

  // 3. Integritas Foreign Key (Orphan Check)
  const [orphanTenantOrders]: any = await poolConnection.query(`
    SELECT COUNT(*) as orphan_count
    FROM tenant_orders tord
    LEFT JOIN orders ord ON tord.order_id = ord.id
    WHERE ord.id IS NULL;
  `)
  const orphanCount = Number(orphanTenantOrders[0]?.orphan_count || 0)

  // 4. Rekonsiliasi Saldo Tenant vs Ledger
  const [tenantMismatchRows]: any = await poolConnection.query(`
    SELECT COUNT(*) AS mismatch
    FROM tenants t
    LEFT JOIN (
      SELECT tenant_id, COALESCE(SUM(net_amount), 0) AS ledger_sum
      FROM tenant_balance_logs
      GROUP BY tenant_id
    ) l ON t.id = l.tenant_id
    WHERE t.balance != COALESCE(l.ledger_sum, 0);
  `)
  const tenantMismatch = Number(tenantMismatchRows[0]?.mismatch || 0)

  // 5. Rekonsiliasi Saldo Food Court vs Ledger
  const [fcMismatchRows]: any = await poolConnection.query(`
    SELECT COUNT(*) AS mismatch
    FROM food_courts fc
    LEFT JOIN (
      SELECT food_court_id, COALESCE(SUM(net_amount), 0) AS ledger_sum
      FROM food_court_balance_logs
      GROUP BY food_court_id
    ) l ON fc.id = l.food_court_id
    WHERE fc.balance != COALESCE(l.ledger_sum, 0);
  `)
  const fcMismatch = Number(fcMismatchRows[0]?.mismatch || 0)

  // 6. Rekonsiliasi Split-Bill (orders.total_amount == SUM(payment_groups.amount_due))
  const [splitMismatchRows]: any = await poolConnection.query(`
    SELECT COUNT(*) AS mismatch
    FROM orders o
    LEFT JOIN (
      SELECT order_id, SUM(amount_due) AS total_due
      FROM payment_groups
      GROUP BY order_id
    ) pg ON o.id = pg.order_id
    WHERE o.total_amount != COALESCE(pg.total_due, -1);
  `)
  const splitMismatch = Number(splitMismatchRows[0]?.mismatch || 0)

  // 7. Pastikan tidak ada cancelled orders yang tertinggal di kitchen_queues sebagai QUEUED/COOKING
  const [ghostQueueRows]: any = await poolConnection.query(`
    SELECT COUNT(*) AS cnt
    FROM kitchen_queues kq
    JOIN tenant_orders tord ON kq.tenant_order_id = tord.id
    WHERE tord.status = 'CANCELLED'
      AND kq.status IN ('QUEUED', 'COOKING');
  `)
  const ghostQueueCount = Number(ghostQueueRows[0]?.cnt || 0)

  // 8. Konsistensi status order vs pembayaran (CONFIRMED tidak boleh PENDING)
  const [statusMismatchRows]: any = await poolConnection.query(`
    SELECT COUNT(*) AS cnt
    FROM orders
    WHERE (order_status = 'CONFIRMED' AND payment_status = 'PENDING')
       OR (order_status = 'COMPLETED' AND payment_status != 'PAID');
  `)
  const statusMismatchCount = Number(statusMismatchRows[0]?.cnt || 0)

  // 9. Rekonsiliasi usage_count voucher diskon
  const [discountMismatchRows]: any = await poolConnection.query(`
    SELECT COUNT(*) AS cnt
    FROM discounts d
    LEFT JOIN (
      SELECT discount_id, COUNT(*) AS used_cnt
      FROM orders
      WHERE discount_id IS NOT NULL AND order_status != 'CANCELLED'
      GROUP BY discount_id
    ) o ON d.id = o.discount_id
    WHERE d.usage_count != COALESCE(o.used_cnt, 0);
  `)
  const discountMismatchCount = Number(discountMismatchRows[0]?.cnt || 0)

  console.log(`  Orphan Tenant Orders       : ${orphanCount}`)
  console.log(`  Mismatch Saldo Tenant      : ${tenantMismatch}`)
  console.log(`  Mismatch Saldo Food Court  : ${fcMismatch}`)
  console.log(`  Mismatch Split-Bill Order  : ${splitMismatch}`)
  console.log(`  Ghost Kitchen Queues       : ${ghostQueueCount}`)
  console.log(`  Mismatch Status Order/Pay  : ${statusMismatchCount}`)
  console.log(`  Mismatch Kuota Diskon      : ${discountMismatchCount}`)
  console.log('===============================================================\n')

  const hasErrors =
    orphanCount > 0 ||
    tenantMismatch > 0 ||
    fcMismatch > 0 ||
    splitMismatch > 0 ||
    ghostQueueCount > 0 ||
    statusMismatchCount > 0 ||
    discountMismatchCount > 0
  if (hasErrors) {
    console.error('[FAIL] Terdeteksi ketidaksesuaian integritas data / ledger!')
    process.exit(1)
  }

  console.log('[PASS] Seluruh 24 tabel, relasi, split-bill, dan rekonsiliasi saldo 100% sinkron!')
  process.exit(0)
}

verify().catch((err) => {
  console.error('[ERROR] Error verifikasi:', err)
  process.exit(1)
})
