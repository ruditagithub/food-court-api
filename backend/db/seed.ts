import { eq } from "drizzle-orm";
import { db } from "./index";
import { users, foodCourts, tables, tenants, menuCategories, menus } from "./schema";

async function seed() {
  console.log("🌱 Memulai seeding akun dan data pengujian...");

  // 1. Password hash untuk seluruh user pengujian
  const defaultPassword = "password123";
  const passwordHash = await Bun.password.hash(defaultPassword, {
    algorithm: "argon2id",
  });

  const seedUsers = [
    {
      id: "usr-super-admin-001",
      name: "Super Admin Amici",
      email: "admin@foodcourt.com",
      passwordHash,
      role: "admin" as const,
    },
    {
      id: "usr-manager-fc-002",
      name: "Manajer Grand City",
      email: "manager@foodcourt.com",
      passwordHash,
      role: "admin-food-court" as const,
    },
    {
      id: "usr-tenant-owner-003",
      name: "Ibu Siti (Warung Rawon)",
      email: "tenant@foodcourt.com",
      passwordHash,
      role: "tenant" as const,
    },
    {
      id: "usr-customer-004",
      name: "Rizky Ramadhan",
      email: "customer@foodcourt.com",
      passwordHash,
      role: "customer" as const,
    },
  ];

  for (const u of seedUsers) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, u.email))
      .limit(1);

    if (!existing) {
      await db.insert(users).values(u);
      console.log(`✅ User dibuat: ${u.email} (${u.role})`);
    } else {
      console.log(`ℹ️ User sudah ada: ${u.email} (${existing.role})`);
    }
  }

  // 2. Sample Food Court
  const foodCourtId = "fc-grand-city-001";
  const [existingFc] = await db
    .select()
    .from(foodCourts)
    .where(eq(foodCourts.id, foodCourtId))
    .limit(1);

  if (!existingFc) {
    await db.insert(foodCourts).values({
      id: foodCourtId,
      name: "Amici Food Court Grand City",
      slug: "amici-food-court-grand-city",
      managerId: "usr-manager-fc-002",
      address: "Jl. Pemuda No. 10 Lantai 2, Surabaya",
      phone: "081234567890",
      status: "ACTIVE",
    });
    console.log("✅ Food Court sampel dibuat: Amici Food Court Grand City");
  }

  // 3. Sample Tables
  const sampleTables = [
    {
      id: "tbl-01-gc",
      foodCourtId,
      tableNumber: "T-01",
      qrToken: "QR-MEJA-T01-SURABAYA",
      capacity: 4,
      status: "available" as const,
    },
    {
      id: "tbl-02-gc",
      foodCourtId,
      tableNumber: "T-02",
      qrToken: "QR-MEJA-T02-SURABAYA",
      capacity: 6,
      status: "available" as const,
    },
  ];

  for (const tbl of sampleTables) {
    const [existingTbl] = await db
      .select()
      .from(tables)
      .where(eq(tables.id, tbl.id))
      .limit(1);

    if (!existingTbl) {
      await db.insert(tables).values(tbl);
      console.log(`✅ Meja sampel dibuat: ${tbl.tableNumber} (QR Token: ${tbl.qrToken})`);
    }
  }

  // 4. Sample Tenant
  const tenantId = "tnt-rawon-siti-001";
  const [existingTenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!existingTenant) {
    await db.insert(tenants).values({
      id: tenantId,
      foodCourtId,
      ownerId: "usr-tenant-owner-003",
      name: "Warung Rawon Bu Siti",
      slug: "warung-rawon-bu-siti",
      stallNumber: "STAN-A01",
      description: "Rawon kuah hitam kental daging sapi empal khas Surabaya",
      isOpen: true,
      openingTime: "09:00",
      closingTime: "21:00",
    });
    console.log("✅ Tenant sampel dibuat: Warung Rawon Bu Siti (STAN-A01)");
  }

  // 5. Sample Category
  const catId = "cat-makanan-001";
  const [existingCat] = await db
    .select()
    .from(menuCategories)
    .where(eq(menuCategories.id, catId))
    .limit(1);

  if (!existingCat) {
    await db.insert(menuCategories).values({
      id: catId,
      tenantId,
      name: "Makanan Utama",
      sortOrder: 1,
    });
    console.log("✅ Kategori menu dibuat: Makanan Utama");
  }

  // 6. Sample Menus
  const sampleMenus = [
    {
      id: "menu-rawon-001",
      tenantId,
      categoryId: catId,
      name: "Rawon Daging Spesial",
      description: "Daging empal empuk dengan kuah rawon kluwek kaya rempah",
      price: 32000,
      stock: 40,
      status: "AVAILABLE" as const,
      isAvailable: true,
    },
    {
      id: "menu-es-teh-002",
      tenantId,
      categoryId: catId,
      name: "Es Teh Manis Segar",
      description: "Teh melati wangi dengan es batu segar",
      price: 5000,
      stock: 100,
      status: "AVAILABLE" as const,
      isAvailable: true,
    },
  ];

  for (const m of sampleMenus) {
    const [existingMenu] = await db
      .select()
      .from(menus)
      .where(eq(menus.id, m.id))
      .limit(1);

    if (!existingMenu) {
      await db.insert(menus).values(m);
      console.log(`✅ Menu sampel dibuat: ${m.name} (${m.price})`);
    }
  }

  console.log("\n✨ Seeding selesai sukses! Seluruh akun siap digunakan.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Gagal seeding:", err);
  process.exit(1);
});
