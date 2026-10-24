import { poolConnection } from '../index'

/**
 * Cleanly truncates all database tables in a safe order with FK checks disabled
 */
export async function cleanDatabase(): Promise<void> {
  console.log('[1/7] [CLEAN] Menghapus dan mereset seluruh tabel database...')
  const startTime = Date.now()

  const tables = [
    'payments',
    'payment_group_items',
    'payment_groups',
    'order_status_logs',
    'kitchen_queues',
    'order_item_options',
    'order_items',
    'tenant_orders',
    'orders',
    'session_participants',
    'dining_sessions',
    'menu_options',
    'menus',
    'menu_categories',
    'tenants',
    'kiosks',
    'tables',
    'food_courts',
    'users',
  ]

  await poolConnection.query('SET FOREIGN_KEY_CHECKS = 0;')

  try {
    for (const tbl of tables) {
      await poolConnection.query(`TRUNCATE TABLE \`${tbl}\`;`)
    }
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`      [OK] Berhasil mereset ${tables.length} tabel (${durationSec} detik)`)
  } finally {
    await poolConnection.query('SET FOREIGN_KEY_CHECKS = 1;')
  }
}
