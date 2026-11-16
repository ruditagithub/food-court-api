import { eq } from 'drizzle-orm'
import { db, poolConnection } from '../index'
import { discounts, foodCourts, tenants } from '../schema'
import { rawBulkInsert, withFastBulkSession } from './helpers/batch-inserter'
import {
  clearCheckpoint,
  DEFAULT_CHECKPOINT_PATH,
  loadCheckpoint,
  saveCheckpoint,
  type SeedCheckpoint,
} from './helpers/checkpoint'
import {
  buildDailyOrderPlan,
  generateTimeInDay,
  getRandomInt,
  getSeedDateRange,
  type DailyOrderBucket,
} from './helpers/date-generator'
import {
  allocateSplitBillItems,
  BRANCH_TRAFFIC_WEIGHTS,
  BRANCH_TRAFFIC_WEIGHT_MAP,
  buildParetoWeights,
  createWeightedPicker,
  deterministicRankSort,
  distributeDayAcrossBranches,
} from './helpers/real-case-distributions'
import type { SeedUsersResult } from './01-users.seed'
import type { SeedFoodCourtsResult } from './02-food-courts.seed'
import type { SeedTablesKiosksResult } from './03-tables-kiosks.seed'
import type { SeedTenantsResult } from './04-tenants.seed'
import type { SeedMenusResult } from './05-menus.seed'
import type { SeedDiscountsResult } from './05b-discounts.seed'

export interface OrdersHistorySeedContext {
  foodCourtsData: SeedFoodCourtsResult
  tablesData: SeedTablesKiosksResult
  tenantsData: SeedTenantsResult
  menusData: SeedMenusResult
  usersData: SeedUsersResult
  discountsData: SeedDiscountsResult
}

export interface SeedOrdersOptions {
  resume?: boolean
  checkpointPath?: string
  endDate?: Date
}

export function buildCompactIds(orderSeq: number) {
  return {
    sessionId: `s-${orderSeq}`,
    participantId: (pIdx: number) => `p-${orderSeq}-${pIdx}`,
    orderId: `o-${orderSeq}`,
    tenantOrderId: (tIdx: number) => `to-${orderSeq}-${tIdx}`,
    orderItemId: (tIdx: number, itemIdx: number) => `oi-${orderSeq}-${tIdx}-${itemIdx}`,
    orderItemOptionId: (tIdx: number, itemIdx: number) => `oio-${orderSeq}-${tIdx}-${itemIdx}`,
    kitchenQueueId: (tIdx: number) => `kq-${orderSeq}-${tIdx}`,
    paymentGroupId: (pIdx: number) => `pg-${orderSeq}-${pIdx}`,
    paymentGroupItemId: (tIdx: number, itemIdx: number) => `pgi-${orderSeq}-${tIdx}-${itemIdx}`,
    paymentId: (pIdx: number) => `pay-${orderSeq}-${pIdx}`,
    orderStatusLogId: (logIdx: number) => `osl-${orderSeq}-${logIdx}`,
  }
}

interface BatchPayload {
  endDayIndex: number
  ordersProcessedInBatch: number
  checkpointSnapshot: SeedCheckpoint
  sessions: unknown[][]
  participants: unknown[][]
  orders: unknown[][]
  tenantOrders: unknown[][]
  orderItems: unknown[][]
  orderItemOptions: unknown[][]
  kitchenQueues: unknown[][]
  paymentGroups: unknown[][]
  paymentGroupItems: unknown[][]
  payments: unknown[][]
  statusLogs: unknown[][]
  tenantWithdrawals: unknown[][]
  tenantBalanceLogs: unknown[][]
  fcWithdrawals: unknown[][]
  fcBalanceLogs: unknown[][]
}

const COLS = {
  diningSessions: ['id', 'food_court_id', 'table_id', 'kiosk_id', 'session_code', 'order_type', 'status', 'started_at', 'created_at', 'updated_at'],
  sessionParticipants: ['id', 'session_id', 'user_id', 'name', 'is_host', 'joined_at', 'created_at', 'updated_at'],
  orders: ['id', 'session_id', 'order_number', 'subtotal', 'tax_amount', 'service_fee', 'discount_amount', 'discount_id', 'total_amount', 'payment_status', 'order_status', 'created_at', 'updated_at'],
  tenantOrders: ['id', 'order_id', 'tenant_id', 'subtotal', 'status', 'sent_to_kitchen_at', 'created_at', 'updated_at'],
  orderItems: ['id', 'tenant_order_id', 'menu_id', 'menu_name_snapshot', 'unit_price_snapshot', 'quantity', 'subtotal', 'notes', 'created_at', 'updated_at'],
  orderItemOptions: ['id', 'order_item_id', 'option_name_snapshot', 'price_adjustment_snapshot', 'created_at', 'updated_at'],
  kitchenQueues: ['id', 'tenant_order_id', 'queue_number', 'status', 'queued_at', 'started_at', 'finished_at', 'created_at', 'updated_at'],
  paymentGroups: ['id', 'order_id', 'participant_id', 'amount_due', 'amount_paid', 'discount_amount', 'status', 'created_at', 'updated_at'],
  paymentGroupItems: ['id', 'payment_group_id', 'order_item_id', 'allocated_amount', 'created_at', 'updated_at'],
  payments: ['id', 'payment_group_id', 'payment_reference', 'payment_method', 'provider', 'amount', 'cashier_id', 'cash_received', 'cash_change', 'status', 'paid_at', 'created_at', 'updated_at'],
  orderStatusLogs: ['id', 'order_id', 'status', 'description', 'created_at'],
  withdrawalRequests: ['id', 'food_court_id', 'tenant_id', 'amount', 'payment_method', 'bank_name', 'bank_account_number', 'bank_account_holder', 'status', 'proof_receipt_url', 'transfer_reference', 'admin_notes', 'processed_by', 'requested_at', 'processed_at', 'completed_at', 'created_at', 'updated_at'],
  tenantBalanceLogs: ['id', 'tenant_id', 'tenant_order_id', 'withdrawal_request_id', 'type', 'gross_amount', 'platform_fee', 'net_amount', 'balance_after', 'description', 'created_at'],
  foodCourtWithdrawals: ['id', 'food_court_id', 'amount', 'payment_method', 'bank_name', 'bank_account_number', 'bank_account_holder', 'status', 'proof_receipt_url', 'transfer_reference', 'admin_notes', 'requested_by', 'processed_by', 'requested_at', 'processed_at', 'completed_at', 'created_at', 'updated_at'],
  foodCourtBalanceLogs: ['id', 'food_court_id', 'order_id', 'withdrawal_id', 'type', 'subtotal_amount', 'service_fee', 'tax_amount', 'platform_fee', 'net_amount', 'balance_after', 'description', 'created_at'],
} as const

const NOTES_POOL = [
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
] as const

const PAYMENT_METHODS = [
  'QRIS', 'QRIS', 'QRIS', 'QRIS', 'QRIS', 'QRIS', // 60%
  'E_WALLET', 'E_WALLET',                          // 20%
  'CASH',                                          // 10%
  'CARD',                                          // 10%
] as const

const PROVIDERS = {
  QRIS: ['Midtrans-QRIS', 'BCA-QRIS', 'ShopeePay-QRIS'],
  E_WALLET: ['GoPay', 'OVO', 'DANA', 'ShopeePay'],
  CASH: ['Kasir-Amici'],
  CARD: ['BCA-Debit', 'Mandiri-Debit', 'Visa-Credit'],
} as const

const WITHDRAWAL_RECEIPT_URL =
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80'

const DRINK_CAT_RE = /minuman|pereda pedas|susu kedelai|kembang tahu|jus buah|kombinasi buah|cold-pressed|smoothies minuman|kopi & teh/i
const DRINK_NAME_RE = /(\bes\b|jus|teh|kopi|ocha|matcha|susu|milkshake|soda|lemonade|wedang|bir pletok|affogato|espresso|latte|tea|tahwa|liang|luo han|cha yen|milo|sirap)/i

function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s'
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

export async function seedOrdersHistory(
  ctx: OrdersHistorySeedContext,
  totalOrders = 12000,
  options?: SeedOrdersOptions
): Promise<void> {
  const checkpointPath = options?.checkpointPath || DEFAULT_CHECKPOINT_PATH
  const isResume = Boolean(options?.resume)
  const totalStartTime = Date.now()

  let endDate = options?.endDate || new Date()
  let startDate = getSeedDateRange(450, endDate).startDate
  let dailyPlan: DailyOrderBucket[] = []
  let completedDays = 0
  let orderSeqCounter = 0
  let tenantBalLogSeq = 0
  let fcBalLogSeq = 0
  let tenantWdSeq = 0
  let fcWdSeq = 0
  let effectiveTotalOrders = totalOrders

  const tenantBalances = new Map<string, number>()
  for (const tnt of ctx.tenantsData.tenantsList) tenantBalances.set(tnt.id, 0)

  const foodCourtBalances = new Map<string, number>()
  for (const fc of ctx.foodCourtsData.foodCourtsList) foodCourtBalances.set(fc.id, 0)

  const discountUsageCounts = new Map<string, number>()
  for (const d of ctx.discountsData.discountsList) discountUsageCounts.set(d.id, 0)

  if (isResume) {
    const cp = await loadCheckpoint(checkpointPath)
    if (!cp) {
      throw new Error('Checkpoint tidak ditemukan. Jalankan seed baru terlebih dahulu.')
    }
    effectiveTotalOrders = cp.targetOrders
    completedDays = cp.completedDays
    orderSeqCounter = cp.lastOrderSeq
    tenantBalLogSeq = cp.lastTenantBalLogSeq
    fcBalLogSeq = cp.lastFcBalLogSeq
    tenantWdSeq = cp.lastTenantWdSeq
    fcWdSeq = cp.lastFcWdSeq
    if (cp.endDateIso) endDate = new Date(cp.endDateIso)
    dailyPlan = cp.dailyPlan.map((b) => ({
      dayIndex: b.dayIndex,
      dateStr: b.dateStr,
      dayStart: new Date(b.dayStartIso),
      targetOrders: b.targetOrders,
    }))
    if (dailyPlan.length > 0) startDate = dailyPlan[0].dayStart
    for (const [k, v] of Object.entries(cp.tenantBalances)) tenantBalances.set(k, v)
    for (const [k, v] of Object.entries(cp.foodCourtBalances)) foodCourtBalances.set(k, v)
    for (const [k, v] of Object.entries(cp.discountUsageCounts)) discountUsageCounts.set(k, v)

    console.log(
      `\n[7/8] [RESUME] Melanjutkan seeding dari hari ke-${completedDays}/${dailyPlan.length} (order #${orderSeqCounter.toLocaleString()} / ${effectiveTotalOrders.toLocaleString()})...`
    )
  } else {
    const range = getSeedDateRange(450, endDate)
    startDate = range.startDate
    endDate = range.endDate
    dailyPlan = buildDailyOrderPlan(effectiveTotalOrders, startDate, endDate)
    console.log(
      `\n[7/8] [ORDERS HISTORY & FINANCIAL LEDGERS] Simulasi kronologis ${dailyPlan.length} hari (${effectiveTotalOrders.toLocaleString()} pesanan)...`
    )
    console.log(`      Rentang Tanggal: ${startDate.toISOString().slice(0, 10)} s/d ${endDate.toISOString().slice(0, 10)}`)
  }

  // Pre-index lookup structures
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

  const categoryNameById = new Map<string, string>()
  for (const cat of ctx.menusData.categoriesList) {
    if (cat.id) categoryNameById.set(cat.id, cat.name)
  }

  // Pareto pickers per Food Court branch (deterministic rank across --resume; demo tenant pinned near top)
  const fcById = new Map(ctx.foodCourtsData.foodCourtsList.map((fc) => [fc.id, fc]))
  const fcIds = ctx.foodCourtsData.foodCourtsList.map((fc) => fc.id)
  const fcWeights = fcIds.map(
    (id, idx) => BRANCH_TRAFFIC_WEIGHT_MAP[id] ?? BRANCH_TRAFFIC_WEIGHTS[idx] ?? 1 / Math.max(1, fcIds.length)
  )
  const tenantPickerByFc = new Map<string, () => (typeof ctx.tenantsData.tenantsList)[0]>()
  for (const [fcId, tList] of tenantsByFc.entries()) {
    const ordered = deterministicRankSort(tList, (t) => t.id)
    const idx = ordered.findIndex((t) => t.id === 'tnt-rawon-siti-001')
    if (idx > 1) {
      const [demoTenant] = ordered.splice(idx, 1)
      ordered.splice(1, 0, demoTenant)
    }
    tenantPickerByFc.set(fcId, createWeightedPicker(ordered, buildParetoWeights(ordered.length, 1.15)))
  }

  // Pareto pickers per Tenant (foods & drinks separated for realistic drink pairing)
  type MenuRow = (typeof ctx.menusData.menusList)[0]
  const menuPickersByTenant = new Map<
    string,
    { allPicker: () => MenuRow; foodPicker: () => MenuRow; drinkPicker: (() => MenuRow) | null }
  >()
  for (const tnt of ctx.tenantsData.tenantsList) {
    const rawMenus = ctx.menusData.menusByTenantMap.get(tnt.id) || []
    if (rawMenus.length === 0) continue
    const availableMenus = rawMenus.filter((m) => m.isAvailable !== false && m.status === 'AVAILABLE')
    const pool = availableMenus.length > 0 ? availableMenus : rawMenus
    const ranked = deterministicRankSort(pool, (m) => m.id)

    const foods: MenuRow[] = []
    const drinks: MenuRow[] = []
    for (const m of ranked) {
      const catName = m.categoryId ? categoryNameById.get(m.categoryId) || '' : ''
      if (DRINK_CAT_RE.test(catName) || DRINK_NAME_RE.test(m.name)) {
        drinks.push(m)
      } else {
        foods.push(m)
      }
    }

    const allPicker = createWeightedPicker(ranked, buildParetoWeights(ranked.length, 1.15))
    const foodPicker = foods.length > 0
      ? createWeightedPicker(foods, buildParetoWeights(foods.length, 1.15))
      : allPicker
    const drinkPicker = drinks.length > 0
      ? createWeightedPicker(drinks, buildParetoWeights(drinks.length, 1.1))
      : null

    menuPickersByTenant.set(tnt.id, { allPicker, foodPicker, drinkPicker })
  }

  const serializedPlan = dailyPlan.map((b) => ({
    dayIndex: b.dayIndex,
    dateStr: b.dateStr,
    dayStartIso: b.dayStart.toISOString(),
    targetOrders: b.targetOrders,
  }))
  const endDateIso = endDate.toISOString()
  const threeHoursAgoMs = endDate.getTime() - 3 * 60 * 60 * 1000
  const endMs = endDate.getTime()
  const customers = ctx.usersData.customers
  const customerCount = customers.length

  // Bounded Producer-Consumer queue (max 2 batches buffered)
  const MAX_QUEUE = 2
  const TARGET_BATCH_ORDERS = 4000
  const queue: BatchPayload[] = []
  let producerDone = false
  let stopRequested = false
  let pipelineError: unknown = null
  let notifyConsumer: (() => void) | null = null
  let notifyProducer: (() => void) | null = null

  const wakeConsumer = () => {
    if (notifyConsumer) {
      const fn = notifyConsumer
      notifyConsumer = null
      fn()
    }
  }
  const wakeProducer = () => {
    if (notifyProducer) {
      const fn = notifyProducer
      notifyProducer = null
      fn()
    }
  }

  const onSigInt = () => {
    if (!stopRequested) {
      stopRequested = true
      console.log('\n[SIGINT] Menyelesaikan commit batch aktif dan menyimpan checkpoint sebelum berhenti...')
      wakeProducer()
      wakeConsumer()
    }
  }
  process.on('SIGINT', onSigInt)

  const producerTask = (async () => {
    try {
      let dayCursor = completedDays
      while (dayCursor < dailyPlan.length && !stopRequested && !pipelineError) {
        while (queue.length >= MAX_QUEUE && !stopRequested && !pipelineError) {
          await new Promise<void>((res) => {
            notifyProducer = res
          })
        }
        if (stopRequested || pipelineError) break

        const batch: BatchPayload = {
          endDayIndex: dayCursor,
          ordersProcessedInBatch: 0,
          checkpointSnapshot: null as unknown as SeedCheckpoint,
          sessions: [],
          participants: [],
          orders: [],
          tenantOrders: [],
          orderItems: [],
          orderItemOptions: [],
          kitchenQueues: [],
          paymentGroups: [],
          paymentGroupItems: [],
          payments: [],
          statusLogs: [],
          tenantWithdrawals: [],
          tenantBalanceLogs: [],
          fcWithdrawals: [],
          fcBalanceLogs: [],
        }

        while (dayCursor < dailyPlan.length) {
          const bucket = dailyPlan[dayCursor]
          const yyyymmdd = bucket.dateStr.replace(/-/g, '')
          const isFinalDay = dayCursor === dailyPlan.length - 1
          const maxTimeForDay = isFinalDay ? endDate : undefined

          // Daily reset kitchen queue counter per tenant
          const dailyTenantQueueCounter = new Map<string, number>()

          // Distribute day's quota across Food Courts by branch share
          const branchCounts = distributeDayAcrossBranches(
            bucket.targetOrders,
            fcIds,
            fcWeights
          )

          // Build chronological order events for this day
          const dayEvents: { fcId: string; ts: Date }[] = []
          for (const [fcId, cnt] of branchCounts.entries()) {
            for (let k = 0; k < cnt; k++) {
              dayEvents.push({ fcId, ts: generateTimeInDay(bucket.dayStart, maxTimeForDay) })
            }
          }
          dayEvents.sort((a, b) => a.ts.getTime() - b.ts.getTime())

          for (let eIdx = 0; eIdx < dayEvents.length; eIdx++) {
            const ev = dayEvents[eIdx]
            const orderSeq = ++orderSeqCounter
            const ids = buildCompactIds(orderSeq)
            const orderDate = ev.ts
            const fc = fcById.get(ev.fcId)!
            const branchTables = tablesByFc.get(fc.id) || []
            const branchKiosks = kiosksByFc.get(fc.id) || []
            const branchTenants = tenantsByFc.get(fc.id) || []
            const branchDiscounts = ctx.discountsData.discountsByFcMap.get(fc.id) || []
            const tenantPicker = tenantPickerByFc.get(fc.id)!

            // Channel: 72% Table QR, 18% Kiosk, 10% Cashier
            const chRoll = Math.random()
            let isKiosk = false
            let isCashierCounter = false
            let table = null
            let kiosk = null

            if (chRoll < 0.72 && branchTables.length > 0) {
              table = branchTables[orderSeq % branchTables.length]
            } else if (chRoll < 0.90 && branchKiosks.length > 0) {
              isKiosk = true
              kiosk = branchKiosks[orderSeq % branchKiosks.length]
            } else {
              isCashierCounter = true
            }

            const orderType: 'DINE_IN' | 'TAKEAWAY' = isKiosk
              ? Math.random() < 0.6 ? 'TAKEAWAY' : 'DINE_IN'
              : isCashierCounter
              ? Math.random() < 0.5 ? 'TAKEAWAY' : 'DINE_IN'
              : 'DINE_IN'

            // Status: recent 3h has live active orders (paid in-kitchen or awaiting payment); historical is terminal
            const isRecent = orderDate.getTime() >= threeHoursAgoMs
            const stRoll = Math.random()
            const isCompleted = isRecent ? stRoll < 0.78 : stRoll < 0.92
            const isCancelled = isRecent ? !isCompleted && stRoll < 0.84 : !isCompleted
            const isActive = !isCompleted && !isCancelled
            const isPaidActive = isActive && Math.random() < 0.75
            const isPaid = isCompleted || isPaidActive

            const sessionStatus = isCompleted
              ? 'COMPLETED'
              : isCancelled
              ? 'CANCELLED'
              : isPaidActive
              ? 'ACTIVE'
              : 'PAYMENT_PENDING'
            const orderStatus = isCompleted
              ? 'COMPLETED'
              : isCancelled
              ? 'CANCELLED'
              : isPaidActive
              ? 'CONFIRMED'
              : 'DRAFT'
            const paymentStatus = isPaid ? 'PAID' : isCancelled ? 'REFUNDED' : 'PENDING'

            const sessionPrefix = isKiosk ? 'K' : isCashierCounter ? 'C' : 'S'
            const sessionCode = `${sessionPrefix}${yyyymmdd.slice(2)}-${String(orderSeq).padStart(7, '0')}`
            const orderNumber = `ORD-${yyyymmdd}-${String(orderSeq).padStart(7, '0')}`

            const prepDurationMs = getRandomInt(6, 23) * 60000
            const sessionEndMs = isCompleted
              ? Math.min(endMs, orderDate.getTime() + getRandomInt(20, 55) * 60000)
              : orderDate.getTime()
            const sessionUpdatedAt = new Date(sessionEndMs)
            const orderUpdatedAt = isCompleted
              ? new Date(Math.min(endMs, orderDate.getTime() + prepDurationMs))
              : orderDate

            batch.sessions.push([
              ids.sessionId,
              fc.id,
              table?.id || null,
              kiosk?.id || null,
              sessionCode,
              orderType,
              sessionStatus,
              orderDate,
              orderDate,
              sessionUpdatedAt,
            ])

            // Split-bill: ~18% of Table QR sessions have 2-4 participants
            const wantSplitBill = !isKiosk && !isCashierCounter && Math.random() < 0.18
            const targetParticipantCount = wantSplitBill ? getRandomInt(2, 4) : 1

            // Pick 1 or 2 tenants via Pareto curve
            const tenantCount = branchTenants.length > 1 && Math.random() < 0.28 ? 2 : 1
            const chosenTenants: (typeof branchTenants)[0][] = []
            const t1 = tenantPicker()
            chosenTenants.push(t1)
            if (tenantCount === 2) {
              for (let tries = 0; tries < 3; tries++) {
                const t2 = tenantPicker()
                if (t2.id !== t1.id) {
                  chosenTenants.push(t2)
                  break
                }
              }
            }

            let masterSubtotal = 0
            const orderTenantOrders: { id: string; tenantId: string; subtotal: number }[] = []
            const flatOrderItems: { id: string; subtotal: number }[] = []

            for (let tIdx = 0; tIdx < chosenTenants.length; tIdx++) {
              const tnt = chosenTenants[tIdx]
              const pickers = menuPickersByTenant.get(tnt.id)
              if (!pickers) continue

              const tenantOrderId = ids.tenantOrderId(tIdx + 1)
              let tenantSubtotal = 0

              const minItems = wantSplitBill && tIdx === 0 ? 2 : 1
              const foodCount = getRandomInt(minItems, 3)
              const pickedMenus: MenuRow[] = []
              for (let f = 0; f < foodCount; f++) {
                pickedMenus.push(pickers.foodPicker())
              }
              if (pickers.drinkPicker && Math.random() < 0.45) {
                pickedMenus.push(pickers.drinkPicker())
              }

              for (let mIdx = 0; mIdx < pickedMenus.length; mIdx++) {
                const menu = pickedMenus[mIdx]
                const menuOpts = ctx.menusData.optionsByMenuMap.get(menu.id) || []
                const chosenOpt =
                  menuOpts.length > 0 && Math.random() < 0.35
                    ? menuOpts[getRandomInt(0, menuOpts.length - 1)]
                    : null
                const optAdj = chosenOpt?.priceAdjustment || 0

                const qty = Math.random() < 0.8 ? 1 : 2
                const unitPrice = menu.price + optAdj
                const itemSubtotal = unitPrice * qty
                const itemId = ids.orderItemId(tIdx + 1, mIdx + 1)

                tenantSubtotal += itemSubtotal
                flatOrderItems.push({ id: itemId, subtotal: itemSubtotal })

                batch.orderItems.push([
                  itemId,
                  tenantOrderId,
                  menu.id,
                  menu.name,
                  unitPrice,
                  qty,
                  itemSubtotal,
                  NOTES_POOL[getRandomInt(0, NOTES_POOL.length - 1)],
                  orderDate,
                  orderDate,
                ])

                if (chosenOpt) {
                  batch.orderItemOptions.push([
                    ids.orderItemOptionId(tIdx + 1, mIdx + 1),
                    itemId,
                    chosenOpt.name,
                    chosenOpt.priceAdjustment,
                    orderDate,
                    orderDate,
                  ])
                }
              }

              masterSubtotal += tenantSubtotal
              orderTenantOrders.push({ id: tenantOrderId, tenantId: tnt.id, subtotal: tenantSubtotal })

              const tenantOrderStatus = isCompleted
                ? 'COMPLETED'
                : isCancelled
                ? 'CANCELLED'
                : isPaidActive
                ? (Math.random() < 0.6 ? 'PREPARING' : 'QUEUED')
                : 'WAITING_PAYMENT'

              batch.tenantOrders.push([
                tenantOrderId,
                ids.orderId,
                tnt.id,
                tenantSubtotal,
                tenantOrderStatus,
                isCompleted || isPaidActive ? orderDate : null,
                orderDate,
                orderUpdatedAt,
              ])

              const qSeq = (dailyTenantQueueCounter.get(tnt.id) || 0) + 1
              dailyTenantQueueCounter.set(tnt.id, qSeq)

              if (!isCancelled) {
                const kqStatus = isCompleted
                  ? 'PICKED_UP'
                  : isPaidActive && tenantOrderStatus === 'PREPARING'
                  ? 'COOKING'
                  : 'QUEUED'
                const kqStartedAt = isCompleted || kqStatus === 'COOKING' ? orderDate : null
                const kqFinishedAt = isCompleted
                  ? new Date(Math.min(endMs, orderDate.getTime() + prepDurationMs))
                  : null

                batch.kitchenQueues.push([
                  ids.kitchenQueueId(tIdx + 1),
                  tenantOrderId,
                  `Q-${String(qSeq).padStart(3, '0')}`,
                  kqStatus,
                  orderDate,
                  kqStartedAt,
                  kqFinishedAt,
                  orderDate,
                  orderUpdatedAt,
                ])
              }
            }

            // Voucher discount (respecting tenant scope, qualifyingSubtotal, & usageLimit; skip cancelled)
            let appliedDiscountId: string | null = null
            let discountAmount = 0
            if (!isCancelled && branchDiscounts.length > 0 && Math.random() < 0.20) {
              const cand = branchDiscounts[orderSeq % branchDiscounts.length]
              const used = discountUsageCounts.get(cand.id) || 0
              const withinLimit = cand.usageLimit == null || used < cand.usageLimit
              const qualifyingSubtotal = cand.tenantId
                ? orderTenantOrders.find((to) => to.tenantId === cand.tenantId)?.subtotal || 0
                : masterSubtotal
              if (withinLimit && qualifyingSubtotal > 0 && qualifyingSubtotal >= (cand.minOrderAmount ?? 0)) {
                appliedDiscountId = cand.id
                discountUsageCounts.set(cand.id, used + 1)
                if (cand.type === 'PERCENTAGE') {
                  const raw = Math.round((qualifyingSubtotal * cand.value) / 100)
                  discountAmount = Math.min(cand.maxDiscountAmount || raw, raw)
                } else {
                  discountAmount = cand.value
                }
                discountAmount = Math.min(discountAmount, qualifyingSubtotal)
              }
            }

            // Pricing matching backend/modules/orders/service.ts (3% serviceFee, 10% PB1)
            const discountedSubtotal = Math.max(0, masterSubtotal - discountAmount)
            const serviceFee = Math.round(discountedSubtotal * 0.03)
            const taxAmount = Math.round(discountedSubtotal * 0.10)
            const totalAmount = discountedSubtotal + serviceFee + taxAmount

            batch.orders.push([
              ids.orderId,
              ids.sessionId,
              orderNumber,
              masterSubtotal,
              taxAmount,
              serviceFee,
              discountAmount,
              appliedDiscountId,
              totalAmount,
              paymentStatus,
              orderStatus,
              orderDate,
              orderUpdatedAt,
            ])

            // Participants & Split-Bill allocations
            const allocations = allocateSplitBillItems(
              flatOrderItems,
              targetParticipantCount,
              taxAmount,
              serviceFee,
              discountAmount
            )

            let primaryMethod: (typeof PAYMENT_METHODS)[number] = 'QRIS'
            let primaryProvider = 'Midtrans-QRIS'

            for (let pIdx = 0; pIdx < allocations.length; pIdx++) {
              const alloc = allocations[pIdx]
              const participantId = ids.participantId(pIdx + 1)

              let userId: string | null = null
              let participantName: string
              if (isCashierCounter) {
                participantName = `Pelanggan Walk-In #${orderSeq}`
              } else if (Math.random() < 0.40) {
                participantName = isKiosk
                  ? `Pengunjung Kiosk #${(orderSeq % 900) + 100}`
                  : `Tamu ${table?.tableNumber || 'Meja'}`
              } else {
                const cust = customers[(orderSeq + pIdx * 13) % customerCount]
                userId = cust.id
                participantName = cust.name
              }

              batch.participants.push([
                participantId,
                ids.sessionId,
                userId,
                participantName,
                pIdx === 0,
                orderDate,
                orderDate,
                orderDate,
              ])

              const pgId = ids.paymentGroupId(pIdx + 1)
              batch.paymentGroups.push([
                pgId,
                ids.orderId,
                participantId,
                alloc.amountDue,
                isPaid ? alloc.amountDue : 0,
                alloc.discountAmount,
                isPaid ? 'PAID' : isCancelled ? 'CANCELLED' : 'PENDING',
                orderDate,
                orderUpdatedAt,
              ])

              for (let ai = 0; ai < alloc.itemAllocations.length; ai++) {
                const itemAlloc = alloc.itemAllocations[ai]
                batch.paymentGroupItems.push([
                  ids.paymentGroupItemId(pIdx + 1, ai + 1),
                  pgId,
                  itemAlloc.orderItemId,
                  itemAlloc.allocatedAmount,
                  orderDate,
                  orderDate,
                ])
              }

              const method = isCashierCounter
                ? 'CASH'
                : PAYMENT_METHODS[(orderSeq + pIdx) % PAYMENT_METHODS.length]
              const methodProviders = PROVIDERS[method]
              const provider = methodProviders[(orderSeq + pIdx) % methodProviders.length]
              if (pIdx === 0) {
                primaryMethod = method
                primaryProvider = provider
              }

              let cashierId: string | null = null
              let cashReceived: number | null = null
              let cashChange: number | null = null
              if (method === 'CASH') {
                cashierId = ctx.usersData.cashier.id
                cashReceived = Math.ceil(alloc.amountDue / 10000) * 10000
                cashChange = cashReceived - alloc.amountDue
              }

              batch.payments.push([
                ids.paymentId(pIdx + 1),
                pgId,
                `PAY-${yyyymmdd}-${String(orderSeq).padStart(7, '0')}-${pIdx + 1}`,
                method,
                provider,
                alloc.amountDue,
                cashierId,
                cashReceived,
                cashChange,
                isPaid ? 'SUCCESS' : isCancelled ? 'REFUNDED' : 'PENDING',
                isPaid ? orderDate : null,
                orderDate,
                orderUpdatedAt,
              ])
            }

            // Order status logs
            batch.statusLogs.push([
              ids.orderStatusLogId(1),
              ids.orderId,
              'ORDER_CREATED',
              `Pesanan #${orderNumber} dibuat (${orderType})`,
              orderDate,
            ])

            if (isPaid) {
              batch.statusLogs.push([
                ids.orderStatusLogId(2),
                ids.orderId,
                'PAYMENT_SUCCESS',
                `Pembayaran ${primaryMethod} (${primaryProvider}) sebesar Rp ${totalAmount.toLocaleString()} sukses`,
                orderDate,
              ])

              // Tenant revenue settlement (100% gross sales, matching settlement.ts)
              for (const tOrd of orderTenantOrders) {
                const newBal = (tenantBalances.get(tOrd.tenantId) || 0) + tOrd.subtotal
                tenantBalances.set(tOrd.tenantId, newBal)
                batch.tenantBalanceLogs.push([
                  `tbl-${String(++tenantBalLogSeq).padStart(8, '0')}`,
                  tOrd.tenantId,
                  tOrd.id,
                  null,
                  'ORDER_REVENUE',
                  tOrd.subtotal,
                  0,
                  tOrd.subtotal,
                  newBal,
                  `Pendapatan pesanan #${orderNumber} (${tOrd.id})`,
                  orderDate,
                ])
              }

              // Food Court settlement (serviceFee + taxAmount - 1% platformFee, matching settlement.ts)
              const fcPlatformFee = Math.round(masterSubtotal * 0.01)
              const fcNetAmount = serviceFee + taxAmount - fcPlatformFee
              const newFcBal = (foodCourtBalances.get(fc.id) || 0) + fcNetAmount
              foodCourtBalances.set(fc.id, newFcBal)
              batch.fcBalanceLogs.push([
                `fcl-${String(++fcBalLogSeq).padStart(8, '0')}`,
                fc.id,
                ids.orderId,
                null,
                'ORDER_SETTLEMENT',
                masterSubtotal,
                serviceFee,
                taxAmount,
                fcPlatformFee,
                fcNetAmount,
                newFcBal,
                `Settlement pesanan #${orderNumber}`,
                orderDate,
              ])
            }

            batch.ordersProcessedInBatch++
          }

          // Weekly periodic withdrawals (every 7th simulation day)
          if ((dayCursor + 1) % 7 === 0) {
            const wdTime = new Date(
              Math.min(endMs, bucket.dayStart.getTime() + 21 * 3600000 + 30 * 60000)
            )
            const isFinalWeek = dayCursor >= dailyPlan.length - 7

            for (const tnt of ctx.tenantsData.tenantsList) {
              const curBal = tenantBalances.get(tnt.id) || 0
              if (curBal < 1500000) continue

              const ratio = 0.50 + Math.random() * 0.30
              const wdAmount = Math.min(
                curBal - 100000,
                Math.floor((curBal * ratio) / 10000) * 10000
              )
              if (wdAmount < 100000) continue

              const isPending = isFinalWeek && Math.random() < 0.25
              const status = isPending ? 'PENDING' : 'COMPLETED'
              const wdSeq = ++tenantWdSeq
              const wdId = `wd-tnt-${String(wdSeq).padStart(6, '0')}`

              batch.tenantWithdrawals.push([
                wdId,
                tnt.foodCourtId,
                tnt.id,
                wdAmount,
                'TRANSFER',
                tnt.bankName || 'BCA',
                tnt.bankAccountNumber || '5271890001',
                tnt.bankAccountHolder || tnt.name,
                status,
                status === 'COMPLETED' ? WITHDRAWAL_RECEIPT_URL : null,
                status === 'COMPLETED' ? `TRF-TNT-${String(wdSeq).padStart(6, '0')}` : null,
                status === 'COMPLETED' ? 'Pencairan dana omzet mingguan ditransfer via BI-FAST' : null,
                status === 'COMPLETED' ? ctx.usersData.superAdmin.id : null,
                wdTime,
                status === 'COMPLETED' ? wdTime : null,
                status === 'COMPLETED' ? wdTime : null,
                wdTime,
                wdTime,
              ])

              const afterBal = curBal - wdAmount
              tenantBalances.set(tnt.id, afterBal)
              batch.tenantBalanceLogs.push([
                `tbl-${String(++tenantBalLogSeq).padStart(8, '0')}`,
                tnt.id,
                null,
                wdId,
                isPending ? 'WITHDRAWAL_HOLD' : 'WITHDRAWAL_COMPLETED',
                0,
                0,
                -wdAmount,
                afterBal,
                isPending
                  ? `Pengajuan pencairan dana tenant #${wdId} (Saldo ditahan)`
                  : `Pencairan dana tenant #${wdId} berhasil`,
                wdTime,
              ])
            }

            for (const fc of ctx.foodCourtsData.foodCourtsList) {
              const curBal = foodCourtBalances.get(fc.id) || 0
              if (curBal < 10000000) continue

              const ratio = 0.40 + Math.random() * 0.30
              const wdAmount = Math.min(
                curBal - 1000000,
                Math.floor((curBal * ratio) / 10000) * 10000
              )
              if (wdAmount < 500000) continue

              const isPending = isFinalWeek && Math.random() < 0.20
              const status = isPending ? 'PENDING' : 'COMPLETED'
              const wdSeq = ++fcWdSeq
              const wdId = `wd-fc-${String(wdSeq).padStart(6, '0')}`

              batch.fcWithdrawals.push([
                wdId,
                fc.id,
                wdAmount,
                'TRANSFER',
                fc.bankName || 'BCA',
                fc.bankAccountNumber || '88301982001',
                fc.bankAccountHolder || fc.name,
                status,
                status === 'COMPLETED' ? WITHDRAWAL_RECEIPT_URL : null,
                status === 'COMPLETED' ? `TRF-FC-${String(wdSeq).padStart(6, '0')}` : null,
                status === 'COMPLETED'
                  ? 'Penyaluran dana pendapatan operasional cabang ke rekening holding'
                  : null,
                fc.managerId || null,
                status === 'COMPLETED' ? ctx.usersData.superAdmin.id : null,
                wdTime,
                status === 'COMPLETED' ? wdTime : null,
                status === 'COMPLETED' ? wdTime : null,
                wdTime,
                wdTime,
              ])

              const afterBal = curBal - wdAmount
              foodCourtBalances.set(fc.id, afterBal)
              batch.fcBalanceLogs.push([
                `fcl-${String(++fcBalLogSeq).padStart(8, '0')}`,
                fc.id,
                null,
                wdId,
                isPending ? 'WITHDRAWAL_HOLD' : 'WITHDRAWAL_COMPLETED',
                0,
                0,
                0,
                0,
                -wdAmount,
                afterBal,
                isPending
                  ? `Pengajuan disbursement cabang #${wdId} (Saldo ditahan)`
                  : `Disbursement pencairan cabang #${wdId}`,
                wdTime,
              ])
            }
          }

          dayCursor++
          batch.endDayIndex = dayCursor

          if (batch.ordersProcessedInBatch >= TARGET_BATCH_ORDERS) {
            break
          }
          // Yield to event loop between days so Consumer DB I/O stays responsive
          await Bun.sleep(0)
        }

        batch.checkpointSnapshot = {
          version: 1,
          targetOrders: effectiveTotalOrders,
          completedDays: batch.endDayIndex,
          lastOrderSeq: orderSeqCounter,
          lastTenantBalLogSeq: tenantBalLogSeq,
          lastFcBalLogSeq: fcBalLogSeq,
          lastTenantWdSeq: tenantWdSeq,
          lastFcWdSeq: fcWdSeq,
          endDateIso,
          dailyPlan: serializedPlan,
          tenantBalances: Object.fromEntries(tenantBalances),
          foodCourtBalances: Object.fromEntries(foodCourtBalances),
          discountUsageCounts: Object.fromEntries(discountUsageCounts),
          updatedAt: new Date().toISOString(),
        }

        queue.push(batch)
        wakeConsumer()
      }
    } catch (err) {
      pipelineError = err
      wakeConsumer()
      throw err
    } finally {
      producerDone = true
      wakeConsumer()
    }
  })()

  const consumerTask = (async () => {
    try {
      await withFastBulkSession(poolConnection, async (conn) => {
        let sessionOrdersWritten = 0
        while (true) {
          while (queue.length === 0 && !producerDone && !pipelineError) {
            await new Promise<void>((res) => {
              notifyConsumer = res
            })
          }

          if (pipelineError || (queue.length === 0 && producerDone)) {
            break
          }

          const batch = queue.shift()!
          wakeProducer()

          try {
            await conn.beginTransaction()
            await rawBulkInsert(conn, 'dining_sessions', COLS.diningSessions, batch.sessions)
            await rawBulkInsert(conn, 'session_participants', COLS.sessionParticipants, batch.participants)
            await rawBulkInsert(conn, 'orders', COLS.orders, batch.orders)
            await rawBulkInsert(conn, 'tenant_orders', COLS.tenantOrders, batch.tenantOrders)
            await rawBulkInsert(conn, 'order_items', COLS.orderItems, batch.orderItems)
            await rawBulkInsert(conn, 'order_item_options', COLS.orderItemOptions, batch.orderItemOptions)
            await rawBulkInsert(conn, 'kitchen_queues', COLS.kitchenQueues, batch.kitchenQueues)
            await rawBulkInsert(conn, 'payment_groups', COLS.paymentGroups, batch.paymentGroups)
            await rawBulkInsert(conn, 'payment_group_items', COLS.paymentGroupItems, batch.paymentGroupItems)
            await rawBulkInsert(conn, 'payments', COLS.payments, batch.payments)
            await rawBulkInsert(conn, 'order_status_logs', COLS.orderStatusLogs, batch.statusLogs)
            await rawBulkInsert(conn, 'withdrawal_requests', COLS.withdrawalRequests, batch.tenantWithdrawals)
            await rawBulkInsert(conn, 'tenant_balance_logs', COLS.tenantBalanceLogs, batch.tenantBalanceLogs)
            await rawBulkInsert(conn, 'food_court_withdrawals', COLS.foodCourtWithdrawals, batch.fcWithdrawals)
            await rawBulkInsert(conn, 'food_court_balance_logs', COLS.foodCourtBalanceLogs, batch.fcBalanceLogs)
            await conn.commit()
          } catch (err) {
            await conn.rollback().catch(() => {})
            throw err
          }

          await saveCheckpoint(batch.checkpointSnapshot, checkpointPath)

          sessionOrdersWritten += batch.ordersProcessedInBatch
          const processed = batch.checkpointSnapshot.lastOrderSeq
          const elapsedSec = Math.max(0.1, (Date.now() - totalStartTime) / 1000)
          const pct = Math.min(100, Math.round((processed / Math.max(1, effectiveTotalOrders)) * 100))
          const rate = Math.round(sessionOrdersWritten / elapsedSec)
          const remainingOrders = Math.max(0, effectiveTotalOrders - processed)
          const eta = rate > 0 ? formatEta(remainingOrders / rate) : '...'

          console.log(
            `      [PROGRESS] Hari ${batch.endDayIndex}/${dailyPlan.length} | ${processed.toLocaleString()} / ${effectiveTotalOrders.toLocaleString()} orders (${pct}%) | ${rate.toLocaleString()} ord/s | ETA ${eta}`
          )

          if (stopRequested) {
            break
          }
        }
      })
    } catch (err) {
      pipelineError = err
      wakeProducer()
      throw err
    }
  })()

  try {
    await Promise.all([producerTask, consumerTask])
  } finally {
    process.off('SIGINT', onSigInt)
  }

  if (stopRequested) {
    console.log('\n[PAUSED] Seeding dihentikan dengan aman. Jalankan `bun run seed:resume` untuk melanjutkan.')
    return
  }

  // Final balance, occupied table & discount usage sync
  console.log('\n[8/8] [BALANCE & VOUCHER SYNC] Menyinkronkan saldo akhir, status meja aktif, dan kuota voucher...')
  for (const [tntId, finalBal] of tenantBalances.entries()) {
    await db.update(tenants).set({ balance: finalBal }).where(eq(tenants.id, tntId))
  }
  for (const [fcId, finalBal] of foodCourtBalances.entries()) {
    await db.update(foodCourts).set({ balance: finalBal }).where(eq(foodCourts.id, fcId))
  }
  for (const [dscId, usedCount] of discountUsageCounts.entries()) {
    if (usedCount > 0) {
      await db.update(discounts).set({ usageCount: usedCount }).where(eq(discounts.id, dscId))
    }
  }
  await withFastBulkSession(poolConnection, async (conn) => {
    await conn.query(
      "UPDATE `tables` SET `status` = 'occupied' WHERE `id` IN (SELECT DISTINCT `table_id` FROM `dining_sessions` WHERE `status` IN ('ACTIVE', 'PAYMENT_PENDING') AND `table_id` IS NOT NULL);"
    )
  })

  await clearCheckpoint(checkpointPath)

  const totalDurationSec = ((Date.now() - totalStartTime) / 1000).toFixed(1)
  console.log(
    `      [OK] ${orderSeqCounter.toLocaleString()} pesanan historis, ${tenantBalLogSeq.toLocaleString()} mutasi tenant, & ${fcBalLogSeq.toLocaleString()} mutasi food court tersimpan (${totalDurationSec} detik)`
  )
}
