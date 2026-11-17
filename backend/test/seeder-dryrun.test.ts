import { describe, expect, it } from 'bun:test'
import { parseSeedCliArgs } from '../db/seed'
import { allCuratedThemes } from '../db/seeds/data/index'
import {
  buildDailyOrderPlan,
  generateRandomOrderDate,
  generateTimeInDay,
  getRandomInt,
  getSeedDateRange,
  SEED_END_DATE,
  SEED_START_DATE,
} from '../db/seeds/helpers/date-generator'

describe('Seeder Data Bank & Generator Validation', () => {
  it('should have at least 30 unique culinary themes', () => {
    expect(allCuratedThemes.length).toBeGreaterThanOrEqual(30)

    const genres = new Set(allCuratedThemes.map((t) => t.genre))
    expect(genres.size).toBe(allCuratedThemes.length) // All unique genres
  })

  it('should verify all themes contain valid categories and dishes with realistic prices', () => {
    let totalDishes = 0
    for (const theme of allCuratedThemes) {
      expect(theme.nameTemplate.length).toBeGreaterThan(3)
      expect(theme.descTemplate.length).toBeGreaterThan(10)
      expect(theme.categories.length).toBeGreaterThanOrEqual(2)

      for (const cat of theme.categories) {
        expect(cat.name.length).toBeGreaterThan(2)
        expect(cat.items.length).toBeGreaterThan(0)

        for (const item of cat.items) {
          totalDishes++
          expect(item.name.length).toBeGreaterThan(3)
          expect(item.basePrice).toBeGreaterThanOrEqual(4000)
          expect(item.basePrice).toBeLessThanOrEqual(95000)
          expect(item.desc.length).toBeGreaterThan(5)
        }
      }
    }

    // Verify there are over 100 unique handcrafted dishes across all themes
    expect(totalDishes).toBeGreaterThan(150)
  })

  it('should verify dynamic seed date range ends near now (~450 days window)', () => {
    const { startDate, endDate } = getSeedDateRange(450)
    const diffDays = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBeGreaterThanOrEqual(449)
    expect(diffDays).toBeLessThanOrEqual(451)

    for (let i = 0; i < 50; i++) {
      const d = generateRandomOrderDate()
      expect(d.getTime()).toBeGreaterThanOrEqual(SEED_START_DATE.getTime())
      expect(d.getTime()).toBeLessThanOrEqual(SEED_END_DATE.getTime() + 1000)
    }
  })

  it('should allocate exact totalOrders across chronological days with weekend and payday lift', () => {
    const start = new Date('2025-09-01T00:00:00.000Z')
    const end = new Date('2026-11-16T18:00:00.000Z')
    const plan = buildDailyOrderPlan(100000, start, end)

    expect(plan.length).toBeGreaterThan(400)
    const totalAllocated = plan.reduce((sum, b) => sum + b.targetOrders, 0)
    expect(totalAllocated).toBe(100000)

    for (let i = 1; i < plan.length; i++) {
      expect(plan[i].dayStart.getTime()).toBeGreaterThan(plan[i - 1].dayStart.getTime())
    }

    expect(buildDailyOrderPlan(0, start, end)).toEqual([])
    const smallPlan = buildDailyOrderPlan(5, start, end)
    expect(smallPlan.reduce((s, b) => s + b.targetOrders, 0)).toBe(5)
  })

  it('should clamp generated timestamps to maxAllowedTime within operating hours on the final day', () => {
    const dayStart = new Date(2026, 10, 16, 0, 0, 0, 0)
    const openTime = new Date(2026, 10, 16, 9, 30, 0, 0)
    const maxTime = new Date(2026, 10, 16, 13, 30, 0, 0)
    for (let i = 0; i < 100; i++) {
      const ts = generateTimeInDay(dayStart, maxTime)
      expect(ts.getTime()).toBeGreaterThanOrEqual(openTime.getTime())
      expect(ts.getTime()).toBeLessThanOrEqual(maxTime.getTime())
    }
  })

  it('should generate random menu counts strictly between 10 and 40', () => {
    for (let i = 0; i < 50; i++) {
      const count = getRandomInt(10, 40)
      expect(count).toBeGreaterThanOrEqual(10)
      expect(count).toBeLessThanOrEqual(40)
    }
  })

  it('should generate random table counts strictly between 25 and 80 per food court', () => {
    for (let i = 0; i < 50; i++) {
      const count = getRandomInt(25, 80)
      expect(count).toBeGreaterThanOrEqual(25)
      expect(count).toBeLessThanOrEqual(80)
    }
  })

  it('should parse CLI flags --orders and --resume with env fallbacks', () => {
    expect(parseSeedCliArgs([], {})).toEqual({
      totalOrders: 12000,
      resume: false,
    })
    expect(parseSeedCliArgs(['--orders=1000000', '--resume'], {})).toEqual({
      totalOrders: 1000000,
      resume: true,
    })
    expect(parseSeedCliArgs([], { SEED_ORDERS_COUNT: '50000' })).toEqual({
      totalOrders: 50000,
      resume: false,
    })
    expect(parseSeedCliArgs(['--orders=invalid'], {})).toEqual({
      totalOrders: 12000,
      resume: false,
    })
  })
})
