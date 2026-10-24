import { describe, expect, it } from 'bun:test'
import { allCuratedThemes } from '../db/seeds/data/index'
import { generateRandomOrderDate, getRandomInt, SEED_START_DATE, SEED_END_DATE } from '../db/seeds/helpers/date-generator'

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

  it('should verify date generator bounds between August 2025 and October 2026', () => {
    for (let i = 0; i < 50; i++) {
      const d = generateRandomOrderDate()
      expect(d.getTime()).toBeGreaterThanOrEqual(SEED_START_DATE.getTime())
      expect(d.getTime()).toBeLessThanOrEqual(SEED_END_DATE.getTime() + 1000)
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
})
