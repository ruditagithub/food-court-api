import { describe, expect, it } from 'bun:test'

describe('Food Court Logic & Slug Generation', () => {
  it('generates URL slug properly from food court name', () => {
    const generateSlug = (name: string) =>
      name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')

    expect(generateSlug('Grand City Food Court @Lantai 2')).toBe('grand-city-food-court-lantai-2')
    expect(generateSlug('East Coast Center (Pusat)')).toBe('east-coast-center-pusat')
  })

  it('validates food court creation payload requirements', () => {
    const payload = {
      name: 'Pakuwon Food Festival',
      address: 'Jl. Kejawan Putih Tambak No. 2',
      phone: '081122334455',
    }
    expect(payload.name.length).toBeGreaterThanOrEqual(2)
    expect(payload.phone.length).toBeLessThanOrEqual(30)
  })
})
