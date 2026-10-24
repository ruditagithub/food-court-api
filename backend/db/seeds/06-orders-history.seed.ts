import {
  diningSessions,
  sessionParticipants,
  orders,
  tenantOrders,
  orderItems,
  orderItemOptions,
  kitchenQueues,
  paymentGroups,
  paymentGroupItems,
  payments,
  orderStatusLogs,
} from '../schema'
import { chunkedInsert } from './helpers/batch-inserter'
import { generateRandomOrderDate, getRandomInt } from './helpers/date-generator'
import type { SeedFoodCourtsResult } from './02-food-courts.seed'
import type { SeedTablesKiosksResult } from './03-tables-kiosks.seed'
import type { SeedTenantsResult } from './04-tenants.seed'
import type { SeedMenusResult } from './05-menus.seed'
import type { SeedUsersResult } from './01-users.seed'

export interface OrdersHistorySeedContext {
  foodCourtsData: SeedFoodCourtsResult
  tablesData: SeedTablesKiosksResult
  tenantsData: SeedTenantsResult
  menusData: SeedMenusResult
  usersData: SeedUsersResult
}

export async function seedOrdersHistory(
  ctx: OrdersHistorySeedContext,
  totalOrders = 40000
): Promise<void> {
  console.log(`\n[7/7] [ORDERS HISTORY] Memulai simulasi 14 bulan (${totalOrders.toLocaleString()} transaksi pesanan)...`)
  console.log(`      Rentang Tanggal: 1 Agustus 2025 s/d 24 Oktober 2026`)
  const totalStartTime = Date.now()

  // Pre-index tables & tenants per Food Court for rapid lookup
  const tablesByFc = new Map<string, typeof ctx.tablesData.tablesList>()
  for (const tbl of ctx.tablesData.tablesList) {
    const arr = tablesByFc.get(tbl.foodCourtId) || []
    arr.push(tbl)
    tablesByFc.set(tbl.foodCourtId, arr)
  }

  const tenantsByFc = new Map<string, typeof ctx.tenantsData.tenantsList>()
  for (const tnt of ctx.tenantsData.tenantsList) {
    const arr = tenantsByFc.get(tnt.foodCourtId) || []
    arr.push(tnt)
    tenantsByFc.set(tnt.foodCourtId, arr)
  }

  const notesPool = [
    null,
    null,
    null,
    'Jangan terlalu pedas',
    'Es batunya dipisah ya kak',
    'Kuah diperbanyak',
    'Tanpa daun bawang & seledri',
    'Goreng agak kering',
    'Sambal dipisah',
    'Bumbu kacang dipisah',
    'Tolong sendok & garpu',
  ]

  const paymentMethods: ('QRIS' | 'E_WALLET' | 'CASH' | 'CARD')[] = [
    'QRIS', 'QRIS', 'QRIS', 'QRIS', 'QRIS', 'QRIS', // 60%
    'E_WALLET', 'E_WALLET',                          // 20%
    'CASH',                                          // 10%
    'CARD',                                          // 10%
  ]

  const providers = {
    QRIS: ['Midtrans-QRIS', 'BCA-QRIS', 'ShopeePay-QRIS'],
    E_WALLET: ['GoPay', 'OVO', 'DANA', 'ShopeePay'],
    CASH: ['Kasir-Amici'],
    CARD: ['BCA-Debit', 'Mandiri-Debit', 'Visa-Credit'],
  }

  // Batching: 4 batches of 10.000 orders
  const batchSize = 10000
  const totalBatches = Math.ceil(totalOrders / batchSize)
  let orderNumberCounter = 1

  for (let b = 1; b <= totalBatches; b++) {
    const batchStart = (b - 1) * batchSize + 1
    const batchEnd = Math.min(b * batchSize, totalOrders)
    const currentBatchCount = batchEnd - batchStart + 1

    console.log(`\n⏳ [Batch ${b}/${totalBatches}] Men-generate pesanan #${batchStart.toLocaleString()} s/d #${batchEnd.toLocaleString()} (${currentBatchCount.toLocaleString()} data)...`)
    const batchStartTime = Date.now()

    // Transient memory collections for this batch
    const batchSessions: (typeof diningSessions.$inferInsert)[] = []
    const batchParticipants: (typeof sessionParticipants.$inferInsert)[] = []
    const batchOrders: (typeof orders.$inferInsert)[] = []
    const batchTenantOrders: (typeof tenantOrders.$inferInsert)[] = []
    const batchOrderItems: (typeof orderItems.$inferInsert)[] = []
    const batchOrderItemOptions: (typeof orderItemOptions.$inferInsert)[] = []
    const batchQueues: (typeof kitchenQueues.$inferInsert)[] = []
    const batchPaymentGroups: (typeof paymentGroups.$inferInsert)[] = []
    const batchPaymentGroupItems: (typeof paymentGroupItems.$inferInsert)[] = []
    const batchPayments: (typeof payments.$inferInsert)[] = []
    const batchLogs: (typeof orderStatusLogs.$inferInsert)[] = []

    for (let i = 0; i < currentBatchCount; i++) {
      const orderSeq = orderNumberCounter++

      // 1. Tanggal pesanan (Agustus 2025 s/d Oktober 2026 dengan kurva jam sibuk)
      const orderDate = generateRandomOrderDate()
      const yyyymmdd = orderDate.toISOString().slice(0, 10).replace(/-/g, '')

      // 2. Pilih Cabang Food Court
      const fc = ctx.foodCourtsData.foodCourtsList[orderSeq % ctx.foodCourtsData.foodCourtsList.length]
      const branchTables = tablesByFc.get(fc.id) || []
      const branchTenants = tenantsByFc.get(fc.id) || []

      // 3. Tentukan Tipe Pemesanan: 85% DINE_IN, 15% TAKEAWAY
      const isDineIn = Math.random() < 0.85
      const table = isDineIn && branchTables.length > 0 ? branchTables[orderSeq % branchTables.length] : null

      // Status Probabilitas: 86% COMPLETED, 10% CANCELLED, 4% PENDING
      const statusRoll = Math.random()
      const isCompleted = statusRoll < 0.86
      const isCancelled = !isCompleted && statusRoll < 0.96
      const isPending = !isCompleted && !isCancelled

      const sessionStatus = isCompleted ? 'COMPLETED' : isCancelled ? 'CANCELLED' : 'ACTIVE'
      const orderStatus = isCompleted ? 'COMPLETED' : isCancelled ? 'CANCELLED' : 'CONFIRMED'
      const paymentStatus = isCompleted ? 'PAID' : isCancelled ? 'REFUNDED' : 'PENDING'

      const sessionId = `ses-${orderSeq}-${Math.random().toString(36).substring(2, 7)}`
      const sessionCode = `S${yyyymmdd.slice(2)}-${String(orderSeq).padStart(6, '0')}`

      batchSessions.push({
        id: sessionId,
        foodCourtId: fc.id,
        tableId: table?.id || null,
        kioskId: null,
        sessionCode,
        orderType: isDineIn ? 'DINE_IN' : 'TAKEAWAY',
        status: sessionStatus,
        startedAt: orderDate,
        createdAt: orderDate,
        updatedAt: orderDate,
      })

      // 4. Session Participant (Pelanggan)
      const customer = ctx.usersData.customers[orderSeq % ctx.usersData.customers.length]
      const participantId = `part-${sessionId}`
      batchParticipants.push({
        id: participantId,
        sessionId,
        userId: customer.id,
        name: customer.name,
        isHost: true,
        joinedAt: orderDate,
        createdAt: orderDate,
        updatedAt: orderDate,
      })

      // Master Order ID & Payment Group ID
      const orderId = `ord-${orderSeq}-${Math.random().toString(36).substring(2, 7)}`
      const orderNumber = `ORD-${yyyymmdd}-${String(orderSeq).padStart(6, '0')}`
      const paymentGroupId = `pg-${orderId}`

      // 5. Pilih 1 sampai 2 Tenant pada Food Court ini
      const tenantCount = Math.random() < 0.75 ? 1 : 2
      const chosenTenants: (typeof branchTenants[0])[] = []
      const tenantIndex1 = (orderSeq * 3) % branchTenants.length
      chosenTenants.push(branchTenants[tenantIndex1])
      if (tenantCount === 2 && branchTenants.length > 1) {
        const tenantIndex2 = (orderSeq * 7 + 1) % branchTenants.length
        if (tenantIndex2 !== tenantIndex1) {
          chosenTenants.push(branchTenants[tenantIndex2])
        }
      }

      let masterSubtotal = 0

      // 6. Sub-orders per Tenant
      for (let t = 0; t < chosenTenants.length; t++) {
        const tnt = chosenTenants[t]
        const tntMenus = ctx.menusData.menusByTenantMap.get(tnt.id) || []
        if (tntMenus.length === 0) continue

        const tenantOrderId = `tord-${orderId}-${t + 1}`
        let tenantSubtotal = 0

        // Pilih 1 sampai 3 hidangan dari tenant ini
        const itemsToPick = getRandomInt(1, 3)
        for (let it = 0; it < itemsToPick; it++) {
          const menu = tntMenus[(orderSeq + it * 5) % tntMenus.length]
          const qty = getRandomInt(1, 2)
          const itemSubtotal = menu.price * qty

          tenantSubtotal += itemSubtotal
          const itemId = `item-${tenantOrderId}-${it + 1}`

          batchOrderItems.push({
            id: itemId,
            tenantOrderId,
            menuId: menu.id,
            menuNameSnapshot: menu.name,
            unitPriceSnapshot: menu.price,
            quantity: qty,
            subtotal: itemSubtotal,
            notes: notesPool[getRandomInt(0, notesPool.length - 1)],
            createdAt: orderDate,
            updatedAt: orderDate,
          })

          // Link item ke payment group items (Split bill / breakdown)
          batchPaymentGroupItems.push({
            id: `pgi-${itemId}`,
            paymentGroupId,
            orderItemId: itemId,
            allocatedAmount: itemSubtotal,
            createdAt: orderDate,
            updatedAt: orderDate,
          })

          // Tambahkan order item options untuk 30% item
          if (Math.random() < 0.3) {
            const isBeverage = menu.name.toLowerCase().includes('es ') || menu.name.toLowerCase().includes('jus ') || menu.name.toLowerCase().includes('tea')
            batchOrderItemOptions.push({
              id: `oio-${itemId}`,
              orderItemId: itemId,
              optionNameSnapshot: isBeverage ? 'Less Sugar & Less Ice' : 'Level Pedas: Sedang',
              priceAdjustmentSnapshot: 0,
              createdAt: orderDate,
              updatedAt: orderDate,
            })
          }
        }

        masterSubtotal += tenantSubtotal

        const tenantOrderStatus = isCompleted
          ? 'COMPLETED'
          : isCancelled
          ? 'WAITING_PAYMENT'
          : 'PREPARING'

        batchTenantOrders.push({
          id: tenantOrderId,
          orderId,
          tenantId: tnt.id,
          subtotal: tenantSubtotal,
          status: tenantOrderStatus,
          sentToKitchenAt: isCompleted || isPending ? orderDate : null,
          createdAt: orderDate,
          updatedAt: orderDate,
        })

        // Kitchen Queue Ticket
        batchQueues.push({
          id: `q-${tenantOrderId}`,
          tenantOrderId,
          queueNumber: `Q-${String((orderSeq % 999) + 1).padStart(3, '0')}`,
          status: isCompleted ? 'PICKED_UP' : isCancelled ? 'QUEUED' : 'COOKING',
          queuedAt: orderDate,
          startedAt: orderDate,
          finishedAt: isCompleted ? new Date(orderDate.getTime() + 15 * 60000) : null,
          createdAt: orderDate,
          updatedAt: orderDate,
        })
      }

      // 7. Hitung Pajak & Total
      const taxAmount = Math.round(masterSubtotal * 0.1) // 10% PB1
      const serviceFee = 2000 // Biaya platform tetap
      const totalAmount = masterSubtotal + taxAmount + serviceFee

      batchOrders.push({
        id: orderId,
        sessionId,
        orderNumber,
        subtotal: masterSubtotal,
        taxAmount,
        serviceFee,
        discountAmount: 0,
        totalAmount,
        paymentStatus,
        orderStatus,
        createdAt: orderDate,
        updatedAt: orderDate,
      })

      // 8. Payment Group & Payment
      batchPaymentGroups.push({
        id: paymentGroupId,
        orderId,
        participantId,
        amountDue: totalAmount,
        amountPaid: isCompleted ? totalAmount : 0,
        status: isCompleted ? 'PAID' : isCancelled ? 'CANCELLED' : 'PENDING',
        createdAt: orderDate,
        updatedAt: orderDate,
      })

      const method = paymentMethods[orderSeq % paymentMethods.length]
      const methodProviders = providers[method]
      const provider = methodProviders[orderSeq % methodProviders.length]

      batchPayments.push({
        id: `pay-${orderId}`,
        paymentGroupId,
        paymentReference: `PAY-${yyyymmdd}-${String(orderSeq).padStart(6, '0')}`,
        paymentMethod: method,
        provider,
        amount: totalAmount,
        status: isCompleted ? 'SUCCESS' : isCancelled ? 'FAILED' : 'PENDING',
        paidAt: isCompleted ? orderDate : null,
        createdAt: orderDate,
        updatedAt: orderDate,
      })

      // 9. Order Status Logs
      batchLogs.push({
        id: `log-${orderId}-1`,
        orderId,
        status: 'ORDER_CREATED',
        description: `Pesanan #${orderNumber} dibuat oleh ${customer.name}`,
        createdAt: orderDate,
      })
      if (isCompleted) {
        batchLogs.push({
          id: `log-${orderId}-2`,
          orderId,
          status: 'PAYMENT_SUCCESS',
          description: `Pembayaran ${method} (${provider}) sebesar Rp ${totalAmount.toLocaleString()} sukses`,
          createdAt: orderDate,
        })
      }
    }

    // Insert seluruh entitas batch ini secara berurutan sesuai FK
    await chunkedInsert(diningSessions, batchSessions, 1000, `B${b}-Sessions`, false)
    await chunkedInsert(sessionParticipants, batchParticipants, 1000, `B${b}-Participants`, false)
    await chunkedInsert(orders, batchOrders, 1000, `B${b}-Orders`, false)
    await chunkedInsert(tenantOrders, batchTenantOrders, 1000, `B${b}-TenantOrders`, false)
    await chunkedInsert(orderItems, batchOrderItems, 1000, `B${b}-OrderItems`, false)
    await chunkedInsert(orderItemOptions, batchOrderItemOptions, 1000, `B${b}-OrderItemOptions`, false)
    await chunkedInsert(kitchenQueues, batchQueues, 1000, `B${b}-Queues`, false)
    await chunkedInsert(paymentGroups, batchPaymentGroups, 1000, `B${b}-PaymentGroups`, false)
    await chunkedInsert(paymentGroupItems, batchPaymentGroupItems, 1000, `B${b}-PaymentGroupItems`, false)
    await chunkedInsert(payments, batchPayments, 1000, `B${b}-Payments`, false)
    await chunkedInsert(orderStatusLogs, batchLogs, 1000, `B${b}-Logs`, false)

    const batchDurationSec = ((Date.now() - batchStartTime) / 1000).toFixed(1)
    const totalProgressPct = Math.round((batchEnd / totalOrders) * 100)
    console.log(`      [PROGRESS] Batch ${b}/${totalBatches} (${batchEnd.toLocaleString()} / ${totalOrders.toLocaleString()} orders - ${totalProgressPct}%) selesai [${batchDurationSec}s]`)
  }

  const totalDurationSec = ((Date.now() - totalStartTime) / 1000).toFixed(1)
  console.log(`      [OK] ${totalOrders.toLocaleString()} pesanan historis beserta relasinya berhasil disimpan (${totalDurationSec} detik)`)
}
