import { users } from '../schema'
import { firstNames, lastNames, foodCourtConfigs } from './helpers/indonesian-names'
import { chunkedInsert } from './helpers/batch-inserter'

export interface SeedUsersResult {
  superAdmin: typeof users.$inferInsert
  cashier: typeof users.$inferInsert
  managers: typeof users.$inferInsert[]
  tenantOwners: typeof users.$inferInsert[]
  customers: typeof users.$inferInsert[]
}

export async function seedUsers(): Promise<SeedUsersResult> {
  console.log('\n[2/7] [USERS] Melakukan hashing password dan seeding akun pengguna...')
  const startTime = Date.now()

  // 1. Pre-hash password satu kali untuk seluruh akun pengujian
  const defaultPassword = 'password123'
  const passwordHash = await Bun.password.hash(defaultPassword, {
    algorithm: 'argon2id',
  })

  // 2. Akun default pengujian utama
  const superAdmin: typeof users.$inferInsert = {
    id: 'usr-super-admin-001',
    name: 'Super Admin Amici',
    email: 'admin@foodcourt.com',
    passwordHash,
    role: 'admin',
  }

  // 2b. Akun Kasir Pengujian
  const cashier: typeof users.$inferInsert = {
    id: 'usr-cashier-001',
    name: 'Kasir Amici',
    email: 'cashier@foodcourt.com',
    passwordHash,
    role: 'cashier',
  }

  // 3. 5 Akun Manajer Food Court (1 default + 4 regional)
  const managers: typeof users.$inferInsert[] = foodCourtConfigs.map((fc, idx) => ({
    id: `usr-manager-fc-${String(idx + 1).padStart(3, '0')}`,
    name: fc.managerName,
    email: fc.managerEmail,
    passwordHash,
    role: 'admin-food-court',
  }))

  // 4. 105 Akun Pemilik Kios / Tenant Owner
  const tenantOwners: typeof users.$inferInsert[] = []
  // Tenant pertama adalah akun default 'tenant@foodcourt.com'
  tenantOwners.push({
    id: 'usr-tenant-owner-001',
    name: 'Ibu Siti (Warung Rawon)',
    email: 'tenant@foodcourt.com',
    passwordHash,
    role: 'tenant',
  })

  for (let i = 2; i <= 105; i++) {
    const fn = firstNames[(i * 7) % firstNames.length]
    const ln = lastNames[(i * 11) % lastNames.length]
    tenantOwners.push({
      id: `usr-tenant-owner-${String(i).padStart(3, '0')}`,
      name: `${fn} ${ln}`,
      email: `tenant.${String(i).padStart(3, '0')}@foodcourt.com`,
      passwordHash,
      role: 'tenant',
    })
  }

  // 5. 200 Akun Pelanggan (Customer)
  const customers: typeof users.$inferInsert[] = []
  // Customer pertama adalah akun default 'customer@foodcourt.com'
  customers.push({
    id: 'usr-customer-001',
    name: 'Rizky Ramadhan',
    email: 'customer@foodcourt.com',
    passwordHash,
    role: 'customer',
  })

  for (let i = 2; i <= 200; i++) {
    const fn = firstNames[(i * 3 + 5) % firstNames.length]
    const ln = lastNames[(i * 5 + 7) % lastNames.length]
    customers.push({
      id: `usr-customer-${String(i).padStart(3, '0')}`,
      name: `${fn} ${ln}`,
      email: `customer.${String(i).padStart(3, '0')}@foodcourt.com`,
      passwordHash,
      role: 'customer',
    })
  }

  const allUsers: typeof users.$inferInsert[] = [
    superAdmin,
    cashier,
    ...managers,
    ...tenantOwners,
    ...customers,
  ]

  await chunkedInsert(users, allUsers, 500, 'Akun Pengguna', false)
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`      [OK] ${allUsers.length} akun pengguna berhasil disimpan (${durationSec} detik)`)

  return {
    superAdmin,
    cashier,
    managers,
    tenantOwners,
    customers,
  }
}
