import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { db, poolConnection } from '../db/index'
import { seedOrdersHistory, type OrdersHistorySeedContext } from '../db/seeds/06-orders-history.seed'
import { buildRawInsertStatements } from '../db/seeds/helpers/batch-inserter'
import {
  clearCheckpoint,
  loadCheckpoint,
  saveCheckpoint,
  type SeedCheckpoint,
} from '../db/seeds/helpers/checkpoint'
import { buildDailyOrderPlan, getSeedDateRange } from '../db/seeds/helpers/date-generator'

describe('Bulk SQL Builder & Checkpoint Persistence', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true })
    }
    tempDirs.length = 0
  })

  it('should build escaped multi-row INSERT statements split by maxBytesPerQuery', () => {
    const rows = [
      ['id-1', "Nasi O'Brien", null, 35000, true],
      ['id-2', 'Es Teh\nManis', undefined, 6000, false],
      ['id-3', 'Soto Ayam', 'Tanpa seledri', 32000, true],
    ]
    const stmts = buildRawInsertStatements(
      'test_table',
      ['id', 'name', 'notes', 'price', 'active'],
      rows,
      120
    )

    expect(stmts.length).toBeGreaterThanOrEqual(2)
    expect(stmts[0]).toContain('INSERT INTO `test_table` (`id`,`name`,`notes`,`price`,`active`) VALUES ')
    expect(stmts[0]).toContain("O\\'Brien")
    expect(stmts.join('\n')).toContain('NULL')
    expect(buildRawInsertStatements('test_table', ['id'], [])).toEqual([])
  })

  it('should save, overwrite, load, and clear SeedCheckpoint atomically', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fc-seed-cp-'))
    tempDirs.push(dir)
    const cpPath = join(dir, 'checkpoint.json')

    expect(await loadCheckpoint(cpPath)).toBeNull()
    await clearCheckpoint(cpPath) // no-op when missing

    const cp: SeedCheckpoint = {
      version: 1,
      targetOrders: 1000000,
      completedDays: 120,
      lastOrderSeq: 265000,
      lastTenantBalLogSeq: 300000,
      lastFcBalLogSeq: 233000,
      lastTenantWdSeq: 1200,
      lastFcWdSeq: 40,
      dailyPlan: [
        { dayIndex: 0, dateStr: '2025-08-24', dayStartIso: '2025-08-24T00:00:00.000Z', targetOrders: 1800 },
      ],
      tenantBalances: { 'tnt-rawon-siti-001': 12500000 },
      foodCourtBalances: { 'fc-grand-city-surabaya': 450000000 },
      discountUsageCounts: { 'dsc-fc-0001': 412 },
      updatedAt: new Date().toISOString(),
    }

    await saveCheckpoint(cp, cpPath)
    // Verify overwrite works cleanly on Windows
    cp.completedDays = 121
    cp.lastOrderSeq = 267000
    await saveCheckpoint(cp, cpPath)

    const loaded = await loadCheckpoint(cpPath)
    expect(loaded).not.toBeNull()
    expect(loaded?.completedDays).toBe(121)
    expect(loaded?.lastOrderSeq).toBe(267000)
    expect(loaded?.tenantBalances['tnt-rawon-siti-001']).toBe(12500000)

    await clearCheckpoint(cpPath)
    expect(await loadCheckpoint(cpPath)).toBeNull()
  })

  it('should execute producer-consumer pipeline end-to-end and reconcile balances + resume', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fc-seed-e2e-'))
    tempDirs.push(dir)
    const cpPath = join(dir, 'cp.json')

    const ctx: OrdersHistorySeedContext = {
      foodCourtsData: {
        foodCourtsList: [
          { id: 'fc-1', name: 'FC One', slug: 'fc-1', managerId: 'mgr-1', bankName: 'BCA', bankAccountNumber: '111', bankAccountHolder: 'PT 1' },
          { id: 'fc-2', name: 'FC Two', slug: 'fc-2', managerId: 'mgr-2', bankName: 'BCA', bankAccountNumber: '222', bankAccountHolder: 'PT 2' },
        ],
      },
      tablesData: {
        tablesList: [
          { id: 'tbl-1', foodCourtId: 'fc-1', tableNumber: 'T-01', qrToken: 'qr-1', capacity: 4, status: 'available' },
          { id: 'tbl-2', foodCourtId: 'fc-2', tableNumber: 'T-01', qrToken: 'qr-2', capacity: 4, status: 'available' },
        ],
        kiosksList: [
          { id: 'ksk-1', foodCourtId: 'fc-1', kioskName: 'Kiosk 1', deviceCode: 'DK-1', status: 'ACTIVE' },
        ],
      },
      tenantsData: {
        tenantsList: [
          { id: 'tnt-1', foodCourtId: 'fc-1', ownerId: 'own-1', name: 'T1', slug: 't1', stallNumber: 'A1', bankName: 'BCA', bankAccountNumber: '11', bankAccountHolder: 'O1' },
          { id: 'tnt-2', foodCourtId: 'fc-2', ownerId: 'own-2', name: 'T2', slug: 't2', stallNumber: 'A1', bankName: 'BCA', bankAccountNumber: '22', bankAccountHolder: 'O2' },
        ],
        tenantThemeMap: new Map(),
      },
      menusData: {
        categoriesList: [
          { id: 'cat-food', tenantId: 'tnt-1', name: 'Makanan', sortOrder: 1 },
          { id: 'cat-drink', tenantId: 'tnt-1', name: 'Minuman', sortOrder: 2 },
        ],
        menusList: [
          { id: 'm-1', tenantId: 'tnt-1', categoryId: 'cat-food', name: 'Rawon', price: 35000, status: 'AVAILABLE', isAvailable: true },
          { id: 'm-2', tenantId: 'tnt-1', categoryId: 'cat-drink', name: 'Es Teh', price: 8000, status: 'AVAILABLE', isAvailable: true },
          { id: 'm-3', tenantId: 'tnt-2', categoryId: 'cat-food', name: 'Soto', price: 30000, status: 'AVAILABLE', isAvailable: true },
        ],
        menusByTenantMap: new Map([
          ['tnt-1', [
            { id: 'm-1', tenantId: 'tnt-1', categoryId: 'cat-food', name: 'Rawon', price: 35000, status: 'AVAILABLE', isAvailable: true },
            { id: 'm-2', tenantId: 'tnt-1', categoryId: 'cat-drink', name: 'Es Teh', price: 8000, status: 'AVAILABLE', isAvailable: true },
          ]],
          ['tnt-2', [
            { id: 'm-3', tenantId: 'tnt-2', categoryId: 'cat-food', name: 'Soto', price: 30000, status: 'AVAILABLE', isAvailable: true },
          ]],
        ]),
        optionsByMenuMap: new Map([
          ['m-1', [{ id: 'opt-1', menuId: 'm-1', name: 'Pedas', priceAdjustment: 2000 }]],
        ]),
      },
      usersData: {
        superAdmin: { id: 'adm-1', name: 'Admin', email: 'a@b.c', passwordHash: 'h', role: 'admin', status: 'ACTIVE' },
        cashier: { id: 'csh-1', name: 'Cashier', email: 'c@b.c', passwordHash: 'h', role: 'cashier', status: 'ACTIVE' },
        managers: [],
        tenantOwners: [],
        customers: [
          { id: 'cust-1', name: 'Cust 1', email: 'c1@b.c', passwordHash: 'h', role: 'customer', status: 'ACTIVE' },
          { id: 'cust-2', name: 'Cust 2', email: 'c2@b.c', passwordHash: 'h', role: 'customer', status: 'ACTIVE' },
        ],
      },
      discountsData: {
        discountsList: [
          {
            id: 'dsc-1',
            foodCourtId: 'fc-1',
            tenantId: null,
            code: 'DISC1',
            name: 'Promo',
            scope: 'FOOD_COURT',
            type: 'FIXED_AMOUNT',
            value: 5000,
            minOrderAmount: 20000,
            usageLimit: 500,
            startDate: new Date('2025-01-01'),
            endDate: new Date('2027-01-01'),
            status: 'ACTIVE',
          },
        ],
        discountsByFcMap: new Map([
          ['fc-1', [
            {
              id: 'dsc-1',
              foodCourtId: 'fc-1',
              tenantId: null,
              code: 'DISC1',
              name: 'Promo',
              scope: 'FOOD_COURT',
              type: 'FIXED_AMOUNT',
              value: 5000,
              minOrderAmount: 20000,
              usageLimit: 500,
              startDate: new Date('2025-01-01'),
              endDate: new Date('2027-01-01'),
              status: 'ACTIVE',
            },
          ]],
        ]),
      },
    }

    const queries: string[] = []

    const connMock: any = {
      query: async (sql: string) => {
        queries.push(sql)
        return [[]]
      },
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    }

    const connSpy = spyOn(poolConnection, 'getConnection').mockResolvedValue(connMock)
    const updateSpy = spyOn(db, 'update').mockImplementation((() => ({
      set: () => ({
        where: async () => [{ affectedRows: 1 }],
      }),
    })) as any)

    try {
      await seedOrdersHistory(ctx, 500, { resume: false, checkpointPath: cpPath })

      const insertSqls = queries.filter((q) => q.startsWith('INSERT INTO '))
      expect(insertSqls.length).toBeGreaterThanOrEqual(10)

      // Sum inserted orders across INSERT INTO `orders` statements
      const orderInserts = insertSqls.filter((q) => q.startsWith('INSERT INTO `orders` '))
      expect(orderInserts.length).toBeGreaterThan(0)
      const orderTupleMatches = orderInserts.join('\n').match(/\('o-\d+'/g) || []
      expect(orderTupleMatches.length).toBe(500)

      // Verify split-bill groups & tenant balance logs were generated
      const pgInserts = insertSqls.filter((q) => q.startsWith('INSERT INTO `payment_groups` '))
      const pgMatches = pgInserts.join('\n').match(/\('pg-\d+-\d+'/g) || []
      expect(pgMatches.length).toBeGreaterThan(500)

      const tblInserts = insertSqls.filter((q) => q.startsWith('INSERT INTO `tenant_balance_logs` '))
      expect(tblInserts.length).toBeGreaterThan(0)

      // Cancelled orders must NEVER emit kitchen_queues rows; no CONFIRMED order can be PENDING payment
      const allOrdersSql = orderInserts.join('\n')
      expect(allOrdersSql).not.toContain("'PENDING','CONFIRMED'")
      const kqInserts = insertSqls.filter((q) => q.startsWith('INSERT INTO `kitchen_queues` '))
      const kqCount = (kqInserts.join('\n').match(/\('kq-\d+-\d+'/g) || []).length
      const toInserts = insertSqls.filter((q) => q.startsWith('INSERT INTO `tenant_orders` '))
      const cancelledToCount = (toInserts.join('\n').match(/,'CANCELLED',/g) || []).length
      const totalToCount = (toInserts.join('\n').match(/\('to-\d+-\d+'/g) || []).length
      expect(kqCount).toBe(totalToCount - cancelledToCount)

      // Verify occupied tables sync SQL ran
      expect(queries.some((q) => q.includes("UPDATE `tables` SET `status` = 'occupied'"))).toBe(true)

      // Checkpoint must be cleared on completion
      expect(await loadCheckpoint(cpPath)).toBeNull()

      // Test --resume from partial checkpoint
      queries.length = 0
      const endDate = new Date()
      const { startDate } = getSeedDateRange(450, endDate)
      const plan = buildDailyOrderPlan(400, startDate, endDate)
      const completedDays = Math.max(1, plan.length - 30)
      const alreadyDoneOrders = plan.slice(0, completedDays).reduce((s, b) => s + b.targetOrders, 0)
      const remainingOrders = 400 - alreadyDoneOrders

      await saveCheckpoint(
        {
          version: 1,
          targetOrders: 400,
          completedDays,
          lastOrderSeq: alreadyDoneOrders,
          lastTenantBalLogSeq: alreadyDoneOrders,
          lastFcBalLogSeq: alreadyDoneOrders,
          lastTenantWdSeq: 0,
          lastFcWdSeq: 0,
          endDateIso: endDate.toISOString(),
          dailyPlan: plan.map((b) => ({
            dayIndex: b.dayIndex,
            dateStr: b.dateStr,
            dayStartIso: b.dayStart.toISOString(),
            targetOrders: b.targetOrders,
          })),
          tenantBalances: { 'tnt-1': 500000, 'tnt-2': 300000 },
          foodCourtBalances: { 'fc-1': 100000, 'fc-2': 80000 },
          discountUsageCounts: { 'dsc-1': 10 },
          updatedAt: new Date().toISOString(),
        },
        cpPath
      )

      await seedOrdersHistory(ctx, 400, { resume: true, checkpointPath: cpPath })
      const resumedOrderInserts = queries.filter((q) => q.startsWith('INSERT INTO `orders` '))
      const resumedMatches = resumedOrderInserts.join('\n').match(/\('o-\d+'/g) || []
      expect(resumedMatches.length).toBe(remainingOrders)
      expect(await loadCheckpoint(cpPath)).toBeNull()
    } finally {
      connSpy.mockRestore()
      updateSpy.mockRestore()
    }
  })

  it('should propagate early getConnection errors cleanly without hanging producer', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fc-seed-err-'))
    tempDirs.push(dir)
    const cpPath = join(dir, 'cp-err.json')
    const connSpy = spyOn(poolConnection, 'getConnection').mockRejectedValue(
      new Error('Simulated DB connect error')
    )

    try {
      const minimalCtx: OrdersHistorySeedContext = {
        foodCourtsData: {
          foodCourtsList: [
            { id: 'fc-1', name: 'FC 1', slug: 'fc-1', managerId: null, bankName: 'BCA', bankAccountNumber: '1', bankAccountHolder: 'A' },
          ],
        },
        tablesData: { tablesList: [{ id: 'tbl-1', foodCourtId: 'fc-1', tableNumber: 'T-01', qrToken: 'qr-1' }], kiosksList: [] },
        tenantsData: { tenantsList: [{ id: 'tnt-1', foodCourtId: 'fc-1', ownerId: null, name: 'T1', slug: 't1', stallNumber: 'A1' }], tenantThemeMap: new Map() },
        menusData: {
          categoriesList: [],
          menusList: [{ id: 'm-1', tenantId: 'tnt-1', name: 'Rawon', price: 30000, status: 'AVAILABLE', isAvailable: true }],
          menusByTenantMap: new Map([['tnt-1', [{ id: 'm-1', tenantId: 'tnt-1', name: 'Rawon', price: 30000, status: 'AVAILABLE', isAvailable: true }]]]),
          optionsByMenuMap: new Map(),
        },
        usersData: {
          superAdmin: { id: 'adm-1', name: 'A', email: 'a@b.c', passwordHash: 'h', role: 'admin', status: 'ACTIVE' },
          cashier: { id: 'csh-1', name: 'C', email: 'c@b.c', passwordHash: 'h', role: 'cashier', status: 'ACTIVE' },
          managers: [],
          tenantOwners: [],
          customers: [{ id: 'cust-1', name: 'U1', email: 'u1@b.c', passwordHash: 'h', role: 'customer', status: 'ACTIVE' }],
        },
        discountsData: { discountsList: [], discountsByFcMap: new Map() },
      }

      await expect(
        seedOrdersHistory(minimalCtx, 50, { resume: false, checkpointPath: cpPath })
      ).rejects.toThrow('Simulated DB connect error')
    } finally {
      connSpy.mockRestore()
    }
  })
})
