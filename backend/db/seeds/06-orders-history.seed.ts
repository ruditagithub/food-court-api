import { eq } from 'drizzle-orm'
import { db } from '../index'
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
  discounts,
  tenantBalanceLogs,
  withdrawalRequests,
  foodCourtWithdrawals,
  foodCourtBalanceLogs,
  tenants,
  foodCourts,
} from '../schema'
import { chunkedInsert } from './helpers/batch-inserter'
import {
  generateRandomOrderDate,
  getRandomInt,
  SEED_START_DATE,
  SEED_END_DATE,
} from './helpers/date-generator'
import type { SeedFoodCourtsResult } from './02-food-courts.seed'
import type { SeedTablesKiosksResult } from './03-tables-kiosks.seed'
import type { SeedTenantsResult } from './04-tenants.seed'
import type { SeedMenusResult } from './05-menus.seed'
import type { SeedUsersResult } from './01-users.seed'
import type { SeedDiscountsResult } from './05b-discounts.seed'

export interface OrdersHistorySeedContext {
  foodCourtsData: SeedFoodCourtsResult
  tablesData: SeedTablesKiosksResult
  tenantsData: SeedTenantsResult
  menusData: SeedMenusResult
  usersData: SeedUsersResult
  discountsData: SeedDiscountsResult
}

export async function seedOrdersHistory(
  ctx: OrdersHistorySeedContext,
  totalOrders = 12000
): Promise<void> {
  console.log(`\n[7/8] [ORDERS HISTORY & FINANCIAL LEDGERS] Memulai simulasi 14 bulan (${totalOrders.toLocaleString()} pesanan)...`)
  console.log(`      Rentang Tanggal: 1 Agustus 2025 s/d 24 Oktober 2026`)
  console.log(`      Termasuk: Meja QR, Kiosk Mandiri, Kasir Tunai, Voucher Diskon, & Ledger Keuangan Mutasi`)
  const totalStartTime = Date.now()

  // Pre-index tables, kiosks, and tenants per Food Court for rapid lookup
  const tablesByFc = new Map<string, typeof ctx.tablesData.tablesList>()
  for (const tbl of ctx.tablesData.tablesList) {
    const arr = tablesByFc.get(tbl.foodCourtId) || []
    arr.push(tbl)
    tablesByFc.set(tbl.foodCourtId, arr)
  }

  const kiosksByFc = new Map<string, typeof ctx.tablesData.kiosksList>()
  for (const ksk of ctx.tablesData.kiosksList) {
    const arr = kiosksByFc.get(ksk.foodCourtId) || []
    arr.push(ksk)
    kiosksByFc.set(ksk.foodCourtId, arr)
  }

  const tenantsByFc = new Map<string, typeof ctx.tenantsData.tenantsList>()
  for (const tnt of ctx.tenantsData.tenantsList) {
    const arr = tenantsByFc.get(tnt.foodCourtId) || []
    arr.push(tnt)
    tenantsByFc.set(tnt.foodCourtId, arr)
  }

  // In-memory rolling balance ledgers
  const tenantBalances = new Map<string, number>()
  for (const tnt of ctx.tenantsData.tenantsList) {
    tenantBalances.set(tnt.id, 0)
  }

  const foodCourtBalances = new Map<string, number>()
  for (const fc of ctx.foodCourtsData.foodCourtsList) {
    foodCourtBalances.set(fc.id, 0)
  }

  const notesPool = [
    null,
    null,
    null,
    'Jangan terlalu pedas ya kak',
    'Es batunya dipisah',
    'Kuah diperbanyak',
    'Tanpa daun bawang & seledri',
    'Goreng agak garing/kering',
    'Sambal dipisah',
    'Tolong sendok & garpu higienis',
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

  // Global collections for financial ledgers
  const allTenantBalanceLogs: (typeof tenantBalanceLogs.$inferInsert)[] = []
  const allFoodCourtBalanceLogs: (typeof foodCourtBalanceLogs.$inferInsert)[] = []
  let tenantBalanceLogSeq = 1
  let fcBalanceLogSeq = 1

  // Batching: 4 batches of 3.000 orders
  const batchSize = 3000
  const totalBatches = Math.ceil(totalOrders / batchSize)
  let orderNumberCounter = 1

  for (let b = 1; b <= totalBatches; b++) {
    const batchStart = (b - 1) * batchSize + 1
    const batchEnd = Math.min(b * batchSize, totalOrders)
    const currentBatchCount = batchEnd - batchStart + 1

    console.log(`\n⏳ [Batch ${b}/${totalBatches}] Memproses pesanan #${batchStart.toLocaleString()} s/d #${batchEnd.toLocaleString()} (${currentBatchCount.toLocaleString()} orders)...`)
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
      const branchKiosks = kiosksByFc.get(fc.id) || []
      const branchTenants = tenantsByFc.get(fc.id) || []
      const branchDiscounts = ctx.discountsData.discountsByFcMap.get(fc.id) || []

      // 3. Tentukan Kanal Pemesanan: 75% Meja QR, 15% Kiosk, 10% Kasir
      const channelRoll = Math.random()
      let isKiosk = false
      let isCashierCounter = false
      let table = null
      let kiosk = null

      if (channelRoll < 0.75) {
        // Meja QR
        table = branchTables.length > 0 ? branchTables[orderSeq % branchTables.length] : null
      } else if (channelRoll < 0.90 && branchKiosks.length > 0) {
        // Kiosk Mandiri
        isKiosk = true
        kiosk = branchKiosks[orderSeq % branchKiosks.length]
      } else {
        // Kasir Counter
        isCashierCounter = true
      }

      const orderType: 'DINE_IN' | 'TAKEAWAY' = isKiosk
        ? Math.random() < 0.6 ? 'TAKEAWAY' : 'DINE_IN'
        : isCashierCounter
        ? Math.random() < 0.5 ? 'TAKEAWAY' : 'DINE_IN'
        : 'DINE_IN'

      // Status Probabilitas: 88% COMPLETED, 8% CANCELLED, 4% PENDING
      const statusRoll = Math.random()
      const isCompleted = statusRoll < 0.88
      const isCancelled = !isCompleted && statusRoll < 0.96
      const isPending = !isCompleted && !isCancelled

      const sessionStatus = isCompleted ? 'COMPLETED' : isCancelled ? 'CANCELLED' : 'ACTIVE'
      const orderStatus = isCompleted ? 'COMPLETED' : isCancelled ? 'CANCELLED' : 'CONFIRMED'
      const paymentStatus = isCompleted ? 'PAID' : isCancelled ? 'REFUNDED' : 'PENDING'

      const sessionId = `ses-${orderSeq}-${Math.random().toString(36).substring(2, 7)}`
      const sessionCode = isKiosk
        ? `K${yyyymmdd.slice(2)}-${String(orderSeq).padStart(5, '0')}`
        : isCashierCounter
        ? `C${yyyymmdd.slice(2)}-${String(orderSeq).padStart(5, '0')}`
        : `S${yyyymmdd.slice(2)}-${String(orderSeq).padStart(5, '0')}`

      batchSessions.push({
        id: sessionId,
        foodCourtId: fc.id,
        tableId: table?.id || null,
        kioskId: kiosk?.id || null,
        sessionCode,
        orderType,
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
        userId: isCashierCounter ? null : customer.id,
        name: isCashierCounter ? `Pelanggan Walk-In #${orderSeq}` : customer.name,
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
      const tenantCount = Math.random() < 0.7 ? 1 : 2
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
      const orderTenantOrders: { tenantId: string; subtotal: number; id: string }[] = []

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
          const menuOpts = ctx.menusData.optionsByMenuMap.get(menu.id) || []
          const hasOption = menuOpts.length > 0 && Math.random() < 0.4
          const chosenOpt = hasOption ? menuOpts[it % menuOpts.length] : null
          const optAdjustment = chosenOpt?.priceAdjustment || 0

          const qty = getRandomInt(1, 2)
          const unitPrice = menu.price + optAdjustment
          const itemSubtotal = unitPrice * qty

          tenantSubtotal += itemSubtotal
          const itemId = `item-${tenantOrderId}-${it + 1}`

          batchOrderItems.push({
            id: itemId,
            tenantOrderId,
            menuId: menu.id,
            menuNameSnapshot: menu.name,
            unitPriceSnapshot: unitPrice,
            quantity: qty,
            subtotal: itemSubtotal,
            notes: notesPool[getRandomInt(0, notesPool.length - 1)],
            createdAt: orderDate,
            updatedAt: orderDate,
          })

          // Link item ke payment group items
          batchPaymentGroupItems.push({
            id: `pgi-${itemId}`,
            paymentGroupId,
            orderItemId: itemId,
            allocatedAmount: itemSubtotal,
            createdAt: orderDate,
            updatedAt: orderDate,
          })

          // Tambahkan order item options jika ada opsi yang dipilih
          if (chosenOpt) {
            batchOrderItemOptions.push({
              id: `oio-${itemId}`,
              orderItemId: itemId,
              optionNameSnapshot: chosenOpt.name,
              priceAdjustmentSnapshot: chosenOpt.priceAdjustment,
              createdAt: orderDate,
              updatedAt: orderDate,
            })
          }
        }

        masterSubtotal += tenantSubtotal
        orderTenantOrders.push({
          id: tenantOrderId,
          tenantId: tnt.id,
          subtotal: tenantSubtotal,
        })

        const tenantOrderStatus = isCompleted
          ? 'COMPLETED'
          : isCancelled
          ? 'CANCELLED'
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

      // 7. Hitung Voucher Diskon (20% probabilitas penggunaan jika memenuhi minimum order)
      let appliedDiscount: (typeof discounts.$inferInsert) | null = null
      let discountAmount = 0

      if (branchDiscounts.length > 0 && Math.random() < 0.22) {
        const candidateDiscount = branchDiscounts[orderSeq % branchDiscounts.length]
        const minOrderAmount = candidateDiscount.minOrderAmount ?? 0
        if (masterSubtotal >= minOrderAmount) {
          appliedDiscount = candidateDiscount
          if (candidateDiscount.type === 'PERCENTAGE') {
            const rawDisc = Math.round((masterSubtotal * candidateDiscount.value) / 100)
            discountAmount = Math.min(candidateDiscount.maxDiscountAmount || rawDisc, rawDisc)
          } else {
            discountAmount = Math.min(masterSubtotal, candidateDiscount.value)
          }
        }
      }

      // 8. Hitung Pajak PB1 (10%), Service Fee, dan Total
      const discountedSubtotal = Math.max(0, masterSubtotal - discountAmount)
      const taxAmount = Math.round(discountedSubtotal * 0.1) // 10% PB1
      const serviceFee = 2000 // Biaya platform tetap
      const totalAmount = discountedSubtotal + taxAmount + serviceFee

      batchOrders.push({
        id: orderId,
        sessionId,
        orderNumber,
        subtotal: masterSubtotal,
        taxAmount,
        serviceFee,
        discountAmount,
        discountId: appliedDiscount?.id || null,
        totalAmount,
        paymentStatus,
        orderStatus,
        createdAt: orderDate,
        updatedAt: orderDate,
      })

      // 9. Payment Group & Payment
      batchPaymentGroups.push({
        id: paymentGroupId,
        orderId,
        participantId,
        amountDue: totalAmount,
        amountPaid: isCompleted ? totalAmount : 0,
        discountAmount,
        status: isCompleted ? 'PAID' : isCancelled ? 'CANCELLED' : 'PENDING',
        createdAt: orderDate,
        updatedAt: orderDate,
      })

      // Tentukan Metode Pembayaran
      let method = isCashierCounter ? 'CASH' : paymentMethods[orderSeq % paymentMethods.length]
      const methodProviders = providers[method]
      const provider = methodProviders[orderSeq % methodProviders.length]

      let cashierId: string | null = null
      let cashReceived: number | null = null
      let cashChange: number | null = null

      if (method === 'CASH') {
        cashierId = ctx.usersData.cashier.id
        // Pembayaran tunai dibulatkan ke kelipatan 10.000 atau 50.000 terdekat
        cashReceived = Math.ceil(totalAmount / 10000) * 10000
        cashChange = cashReceived - totalAmount
      }

      batchPayments.push({
        id: `pay-${orderId}`,
        paymentGroupId,
        paymentReference: `PAY-${yyyymmdd}-${String(orderSeq).padStart(6, '0')}`,
        paymentMethod: method,
        provider,
        amount: totalAmount,
        cashierId,
        cashReceived,
        cashChange,
        status: isCompleted ? 'SUCCESS' : isCancelled ? 'FAILED' : 'PENDING',
        paidAt: isCompleted ? orderDate : null,
        createdAt: orderDate,
        updatedAt: orderDate,
      })

      // 10. Order Status Logs
      batchLogs.push({
        id: `log-${orderId}-1`,
        orderId,
        status: 'ORDER_CREATED',
        description: `Pesanan #${orderNumber} dibuat (${orderType})`,
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

        // 11. FINANCIAL LEDGER MUTASI (Tenant Revenue & Food Court Settlement)
        // A. Mutasi Saldo Setiap Tenant (100% Subtotal Kios)
        for (const tOrd of orderTenantOrders) {
          const currentBal = tenantBalances.get(tOrd.tenantId) || 0
          const newBal = currentBal + tOrd.subtotal
          tenantBalances.set(tOrd.tenantId, newBal)

          allTenantBalanceLogs.push({
            id: `tbl-${String(tenantBalanceLogSeq++).padStart(8, '0')}`,
            tenantId: tOrd.tenantId,
            tenantOrderId: tOrd.id,
            withdrawalRequestId: null,
            type: 'ORDER_REVENUE',
            grossAmount: tOrd.subtotal,
            platformFee: 0,
            netAmount: tOrd.subtotal,
            balanceAfter: newBal,
            description: `Pendapatan pesanan #${orderNumber} (${tOrd.id})`,
            createdAt: orderDate,
          })
        }

        // B. Mutasi Settlement Cabang Food Court (Subtotal + ServiceFee + Tax - 1% Platform Fee)
        const fcPlatformFee = Math.round(masterSubtotal * 0.01) // 1% platform fee diserap FC
        const fcNetAmount = masterSubtotal + serviceFee + taxAmount - fcPlatformFee
        const currentFcBal = foodCourtBalances.get(fc.id) || 0
        const newFcBal = currentFcBal + fcNetAmount
        foodCourtBalances.set(fc.id, newFcBal)

        allFoodCourtBalanceLogs.push({
          id: `fcl-${String(fcBalanceLogSeq++).padStart(8, '0')}`,
          foodCourtId: fc.id,
          orderId,
          withdrawalId: null,
          type: 'ORDER_SETTLEMENT',
          subtotalAmount: masterSubtotal,
          serviceFee,
          taxAmount,
          platformFee: fcPlatformFee,
          netAmount: fcNetAmount,
          balanceAfter: newFcBal,
          description: `Settlement pesanan #${orderNumber}`,
          createdAt: orderDate,
        })
      }
    }

    // Insert batch ke database
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

  // 12. SIMULASI WITHDRAWALS / PENCAIRAN DANA TENANT & FOOD COURT
  console.log('\n[7b/8] [WITHDRAWALS] Menyusun mutasi pencairan dana Tenant & Food Court...')
  const withdrawalReceiptUrl = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80'
  const allTenantWithdrawals: (typeof withdrawalRequests.$inferInsert)[] = []
  const allFcWithdrawals: (typeof foodCourtWithdrawals.$inferInsert)[] = []

  let tenantWithdrawalCounter = 1
  for (const tnt of ctx.tenantsData.tenantsList) {
    const curBal = tenantBalances.get(tnt.id) || 0
    if (curBal < 1000000) continue

    // Lakukan 1-3 pencairan dana per tenant yang memiliki saldo cukup
    const numWd = getRandomInt(1, 3)
    for (let w = 0; w < numWd; w++) {
      const wdAmount = Math.min(curBal - 500000, getRandomInt(500000, 2500000))
      if (wdAmount <= 0) break

      const wdId = `wd-tnt-${String(tenantWithdrawalCounter).padStart(5, '0')}`
      const isPending = w === numWd - 1 && Math.random() < 0.25
      const status = isPending ? 'PENDING' : 'COMPLETED'
      const requestedDate = new Date(SEED_START_DATE.getTime() + Math.random() * (SEED_END_DATE.getTime() - SEED_START_DATE.getTime()))

      allTenantWithdrawals.push({
        id: wdId,
        foodCourtId: tnt.foodCourtId,
        tenantId: tnt.id,
        amount: wdAmount,
        paymentMethod: 'TRANSFER',
        bankName: tnt.bankName || 'BCA',
        bankAccountNumber: tnt.bankAccountNumber || '5271890001',
        bankAccountHolder: tnt.bankAccountHolder || tnt.name,
        status,
        proofReceiptUrl: status === 'COMPLETED' ? withdrawalReceiptUrl : null,
        transferReference: status === 'COMPLETED' ? `TRF-TNT-${String(tenantWithdrawalCounter).padStart(5, '0')}` : null,
        adminNotes: status === 'COMPLETED' ? 'Pencairan dana omzet berkala ditransfer via BI-FAST' : null,
        processedBy: ctx.usersData.superAdmin.id,
        requestedAt: requestedDate,
        processedAt: status === 'COMPLETED' ? requestedDate : null,
        completedAt: status === 'COMPLETED' ? requestedDate : null,
        createdAt: requestedDate,
        updatedAt: requestedDate,
      })

      if (status === 'COMPLETED') {
        const afterBal = (tenantBalances.get(tnt.id) || 0) - wdAmount
        tenantBalances.set(tnt.id, afterBal)

        allTenantBalanceLogs.push({
          id: `tbl-${String(tenantBalanceLogSeq++).padStart(8, '0')}`,
          tenantId: tnt.id,
          tenantOrderId: null,
          withdrawalRequestId: wdId,
          type: 'WITHDRAWAL_COMPLETED',
          grossAmount: 0,
          platformFee: 0,
          netAmount: -wdAmount,
          balanceAfter: afterBal,
          description: `Pencairan dana tenant #${wdId} berhasil`,
          createdAt: requestedDate,
        })
      }
      tenantWithdrawalCounter++
    }
  }

  // Pencairan Dana Cabang Food Court (ke Rekening PT Utama)
  let fcWithdrawalCounter = 1
  for (const fc of ctx.foodCourtsData.foodCourtsList) {
    const curBal = foodCourtBalances.get(fc.id) || 0
    if (curBal < 5000000) continue

    const numWd = getRandomInt(2, 4)
    for (let w = 0; w < numWd; w++) {
      const wdAmount = Math.min(curBal - 2000000, getRandomInt(2000000, 10000000))
      if (wdAmount <= 0) break

      const wdId = `wd-fc-${String(fcWithdrawalCounter).padStart(5, '0')}`
      const isPending = w === numWd - 1 && Math.random() < 0.2
      const status = isPending ? 'PENDING' : 'COMPLETED'
      const requestedDate = new Date(SEED_START_DATE.getTime() + Math.random() * (SEED_END_DATE.getTime() - SEED_START_DATE.getTime()))

      allFcWithdrawals.push({
        id: wdId,
        foodCourtId: fc.id,
        amount: wdAmount,
        paymentMethod: 'TRANSFER',
        bankName: fc.bankName || 'BCA',
        bankAccountNumber: fc.bankAccountNumber || '88301982001',
        bankAccountHolder: fc.bankAccountHolder || fc.name,
        status,
        proofReceiptUrl: status === 'COMPLETED' ? withdrawalReceiptUrl : null,
        transferReference: status === 'COMPLETED' ? `TRF-FC-${String(fcWithdrawalCounter).padStart(5, '0')}` : null,
        adminNotes: status === 'COMPLETED' ? 'Penyaluran dana pendapatan operasional cabang ke rekening holding' : null,
        requestedBy: fc.managerId,
        processedBy: ctx.usersData.superAdmin.id,
        requestedAt: requestedDate,
        processedAt: status === 'COMPLETED' ? requestedDate : null,
        completedAt: status === 'COMPLETED' ? requestedDate : null,
        createdAt: requestedDate,
        updatedAt: requestedDate,
      })

      if (status === 'COMPLETED') {
        const afterBal = (foodCourtBalances.get(fc.id) || 0) - wdAmount
        foodCourtBalances.set(fc.id, afterBal)

        allFoodCourtBalanceLogs.push({
          id: `fcl-${String(fcBalanceLogSeq++).padStart(8, '0')}`,
          foodCourtId: fc.id,
          orderId: null,
          withdrawalId: wdId,
          type: 'WITHDRAWAL_COMPLETED',
          subtotalAmount: 0,
          serviceFee: 0,
          taxAmount: 0,
          platformFee: 0,
          netAmount: -wdAmount,
          balanceAfter: afterBal,
          description: `Disbursement pencairan cabang #${wdId}`,
          createdAt: requestedDate,
        })
      }
      fcWithdrawalCounter++
    }
  }

  // Insert withdrawal requests & balance logs
  await chunkedInsert(withdrawalRequests, allTenantWithdrawals, 500, 'Tenant Withdrawal Requests', false)
  await chunkedInsert(tenantBalanceLogs, allTenantBalanceLogs, 1000, 'Tenant Balance Logs', false)
  await chunkedInsert(foodCourtWithdrawals, allFcWithdrawals, 200, 'FC Withdrawals', false)
  await chunkedInsert(foodCourtBalanceLogs, allFoodCourtBalanceLogs, 1000, 'FC Balance Logs', false)

  // 13. UPDATE FINAL CURRENT BALANCES IN DATABASE TO MATCH LEDGERS EXACTLY
  console.log('\n[8/8] [BALANCE SYNC] Menyinkronkan saldo akhir tenant dan cabang food court...')
  for (const [tntId, finalBal] of tenantBalances.entries()) {
    await db.update(tenants).set({ balance: Math.max(0, finalBal) }).where(eq(tenants.id, tntId))
  }
  for (const [fcId, finalBal] of foodCourtBalances.entries()) {
    await db.update(foodCourts).set({ balance: Math.max(0, finalBal) }).where(eq(foodCourts.id, fcId))
  }

  const totalDurationSec = ((Date.now() - totalStartTime) / 1000).toFixed(1)
  console.log(`      [OK] ${totalOrders.toLocaleString()} pesanan historis, ${allTenantBalanceLogs.length.toLocaleString()} mutasi tenant, & ${allFoodCourtBalanceLogs.length.toLocaleString()} mutasi food court tersimpan (${totalDurationSec} detik)`)
}
