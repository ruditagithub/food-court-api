import { describe, expect, it, beforeAll } from "bun:test";
import { db } from "../db";
import { foodCourts, menus, menuOptions, tenants, users } from "../db/schema";
import { menuService } from "../modules/menus/service";
import type { AuthUser } from "../common/middlewares/auth";
import { eq } from "drizzle-orm";

describe("Menu Options Service Integration", () => {
  let adminUser: AuthUser;
  let tenantUser: AuthUser;
  let foodCourtId: string;
  let tenantId: string;
  const timestamp = Date.now();

  beforeAll(async () => {
    // 1. Seed users
    const adminId = crypto.randomUUID();
    await db.insert(users).values({
      id: adminId,
      name: "Admin User",
      email: `admin_${timestamp}@example.com`,
      passwordHash: "hashed",
      role: "admin",
      status: "ACTIVE",
    });
    adminUser = { id: adminId, name: "Admin User", email: `admin_${timestamp}@example.com`, role: "admin" };

    const tenantOwnerId = crypto.randomUUID();
    await db.insert(users).values({
      id: tenantOwnerId,
      name: "Tenant Owner",
      email: `tenant_${timestamp}@example.com`,
      passwordHash: "hashed",
      role: "tenant",
      status: "ACTIVE",
    });
    tenantUser = { id: tenantOwnerId, name: "Tenant Owner", email: `tenant_${timestamp}@example.com`, role: "tenant" };

    // 2. Seed food court & tenant
    foodCourtId = crypto.randomUUID();
    await db.insert(foodCourts).values({
      id: foodCourtId,
      name: `FC Options ${timestamp}`,
      slug: `fc-options-${timestamp}`,
      status: "ACTIVE",
    });

    tenantId = crypto.randomUUID();
    await db.insert(tenants).values({
      id: tenantId,
      foodCourtId,
      ownerId: tenantOwnerId,
      name: `Tenant Options ${timestamp}`,
      slug: `tenant-opts-${timestamp}`,
      stallNumber: "OP-01",
      isOpen: true,
    });
  });

  it("should create menu with options and retrieve them in getById and getAll", async () => {
    const created = await menuService.create(
      {
        tenantId,
        name: "Mie Ayam Spesial",
        price: 25000,
        options: [
          { name: "Porsi Standar", priceAdjustment: 0 },
          { name: "Porsi Jumbo", priceAdjustment: 5000 },
        ],
      },
      tenantUser,
    );

    expect(created.id).toBeDefined();
    expect(created.options).toBeDefined();
    expect(created.options.length).toBe(2);
    expect(created.options.map((o) => o.name)).toContain("Porsi Standar");
    expect(created.options.map((o) => o.name)).toContain("Porsi Jumbo");

    // Eager-loading in getById
    const fetchedById = await menuService.getById(created.id);
    expect(fetchedById.options).toBeDefined();
    expect(fetchedById.options.length).toBe(2);

    // Eager-loading in getAll
    const allMenus = await menuService.getAll({ tenantId });
    const foundMenu = allMenus.find((m) => m.id === created.id);
    expect(foundMenu).toBeDefined();
    expect(foundMenu?.options).toBeDefined();
    expect(foundMenu?.options.length).toBe(2);
  });

  it("should smart-sync options during update (update existing, insert new, prune deleted)", async () => {
    // 1. Create initial menu with 2 options
    const created = await menuService.create(
      {
        tenantId,
        name: "Bakso Sapi",
        price: 20000,
        options: [
          { name: "Opsi A", priceAdjustment: 1000 },
          { name: "Opsi B", priceAdjustment: 2000 },
        ],
      },
      tenantUser,
    );

    const optA = created.options.find((o) => o.name === "Opsi A")!;
    const optB = created.options.find((o) => o.name === "Opsi B")!;

    // 2. Update menu:
    // - Update optA (change price to 1500)
    // - Omit optB (should be deleted)
    // - Add optC (new option without id)
    const updated = await menuService.update(
      created.id,
      {
        name: "Bakso Sapi Kuah",
        options: [
          { id: optA.id, name: "Opsi A Modif", priceAdjustment: 1500 },
          { name: "Opsi C", priceAdjustment: 3000 },
        ],
      },
      tenantUser,
    );

    expect(updated.name).toBe("Bakso Sapi Kuah");
    expect(updated.options.length).toBe(2);

    const updatedOptA = updated.options.find((o) => o.id === optA.id);
    expect(updatedOptA).toBeDefined();
    expect(updatedOptA?.name).toBe("Opsi A Modif");
    expect(updatedOptA?.priceAdjustment).toBe(1500);

    const newOptC = updated.options.find((o) => o.name === "Opsi C");
    expect(newOptC).toBeDefined();
    expect(newOptC?.id).toBeDefined();
    expect(newOptC?.priceAdjustment).toBe(3000);

    // Verify optB was pruned from DB
    const deletedOptB = await db.query.menuOptions.findFirst({
      where: eq(menuOptions.id, optB.id),
    });
    expect(deletedOptB).toBeUndefined();
  });

  it("should not modify options if options array is not provided in update", async () => {
    const created = await menuService.create(
      {
        tenantId,
        name: "Es Teh",
        price: 5000,
        options: [{ name: "Manis", priceAdjustment: 0 }],
      },
      tenantUser,
    );

    const updated = await menuService.update(
      created.id,
      {
        price: 6000,
      },
      tenantUser,
    );

    expect(updated.price).toBe(6000);
    expect(updated.options.length).toBe(1);
    expect(updated.options[0].name).toBe("Manis");
  });

  it("should prune all options when options array is empty", async () => {
    const created = await menuService.create(
      {
        tenantId,
        name: "Nasi Putih",
        price: 5000,
        options: [{ name: "Setengah Porsi", priceAdjustment: -1000 }],
      },
      tenantUser,
    );

    const updated = await menuService.update(
      created.id,
      {
        options: [],
      },
      tenantUser,
    );

    expect(updated.options.length).toBe(0);
    const inDb = await db.query.menuOptions.findMany({
      where: eq(menuOptions.menuId, created.id),
    });
    expect(inDb.length).toBe(0);
  });

  it("should reject creating or updating menu options with whitespace-only name", async () => {
    // 1. In create
    expect(
      menuService.create(
        {
          tenantId,
          name: "Sate Ayam",
          price: 15000,
          options: [{ name: "   ", priceAdjustment: 0 }],
        },
        tenantUser,
      ),
    ).rejects.toThrow();

    // 2. In update
    const menu = await menuService.create(
      {
        tenantId,
        name: "Sate Kambing",
        price: 25000,
      },
      tenantUser,
    );

    expect(
      menuService.update(
        menu.id,
        {
          options: [{ name: "   ", priceAdjustment: 1000 }],
        },
        tenantUser,
      ),
    ).rejects.toThrow();
  });

  it("should eager-load options on menus when querying getCategoriesByTenant and getAllCategories", async () => {
    // Create a category
    const cat = await menuService.createCategory(
      {
        tenantId,
        name: `Minuman ${Date.now()}`,
      },
      tenantUser,
    );

    // Create a menu with category and options
    const createdMenu = await menuService.create(
      {
        tenantId,
        categoryId: cat.id,
        name: "Jus Alpukat",
        price: 18000,
        options: [{ name: "Ekstra Susu Cokelat", priceAdjustment: 2000 }],
      },
      tenantUser,
    );

    // Test getCategoriesByTenant
    const tenantCats = await menuService.getCategoriesByTenant(tenantId, tenantUser);
    const foundTenantCat = tenantCats.find((c) => c.id === cat.id);
    expect(foundTenantCat).toBeDefined();
    const foundMenuInCat = foundTenantCat?.menus.find((m: any) => m.id === createdMenu.id);
    expect(foundMenuInCat).toBeDefined();
    expect(foundMenuInCat?.options).toBeDefined();
    expect(foundMenuInCat?.options.length).toBe(1);
    expect(foundMenuInCat?.options[0].name).toBe("Ekstra Susu Cokelat");

    // Test getAllCategories
    const allCats = await menuService.getAllCategories(tenantId, tenantUser);
    const foundAllCat = allCats.find((c) => c.id === cat.id);
    expect(foundAllCat).toBeDefined();
    const foundAllMenu = foundAllCat?.menus.find((m: any) => m.id === createdMenu.id);
    expect(foundAllMenu).toBeDefined();
    expect(foundAllMenu?.options).toBeDefined();
    expect(foundAllMenu?.options.length).toBe(1);
  });
});
