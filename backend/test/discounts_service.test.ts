import { describe, expect, it, beforeAll } from "bun:test";
import { db } from "../db";
import { discounts, foodCourts, menus, menuCategories, tenants, users } from "../db/schema";
import { discountService } from "../modules/discounts/service";
import { BadRequestError, NotFoundError } from "../common/errors";
import { eq } from "drizzle-orm";

describe("Discounts Service & Validation Engine", () => {
  let foodCourtId = "";
  let tenant1Id = "";
  let tenant2Id = "";
  let menu1Id = ""; // Tenant 1: Rp 50.000
  let menu2Id = ""; // Tenant 2: Rp 30.000
  let publicPercentDiscountId = "";
  let secretCodeDiscountId = "";
  let tenantDiscountId = "";
  let expiredDiscountId = "";
  let cappedPercentDiscountId = "";

  const timestamp = Date.now();

  beforeAll(async () => {
    // 1. Seed food court
    foodCourtId = crypto.randomUUID();
    await db.insert(foodCourts).values({
      id: foodCourtId,
      name: `Test Food Court ${timestamp}`,
      slug: `test-fc-${timestamp}`,
      status: "ACTIVE",
    });

    // 2. Seed tenants
    tenant1Id = crypto.randomUUID();
    await db.insert(tenants).values({
      id: tenant1Id,
      foodCourtId,
      name: `Tenant One ${timestamp}`,
      slug: `tenant-one-${timestamp}`,
      stallNumber: "A-01",
      isOpen: true,
    });

    tenant2Id = crypto.randomUUID();
    await db.insert(tenants).values({
      id: tenant2Id,
      foodCourtId,
      name: `Tenant Two ${timestamp}`,
      slug: `tenant-two-${timestamp}`,
      stallNumber: "B-02",
      isOpen: true,
    });

    // 3. Seed category & menus
    const catId = crypto.randomUUID();
    await db.insert(menuCategories).values({
      id: catId,
      tenantId: tenant1Id,
      name: "Food",
    });

    menu1Id = crypto.randomUUID();
    await db.insert(menus).values({
      id: menu1Id,
      tenantId: tenant1Id,
      categoryId: catId,
      name: "Special Beef Bowl",
      price: 50000,
      isAvailable: true,
    });

    menu2Id = crypto.randomUUID();
    await db.insert(menus).values({
      id: menu2Id,
      tenantId: tenant2Id,
      categoryId: catId,
      name: "Iced Tea Large",
      price: 30000,
      isAvailable: true,
    });

    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const wayPast = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // 4. Seed Discounts
    // A: 20% capped at 10.000, min 50.000
    cappedPercentDiscountId = crypto.randomUUID();
    await db.insert(discounts).values({
      id: cappedPercentDiscountId,
      foodCourtId,
      name: "Diskon 20% Capped 10rb",
      scope: "FOOD_COURT",
      type: "PERCENTAGE",
      value: 20,
      maxDiscountAmount: 10000,
      minOrderAmount: 50000,
      isPublic: true,
      startDate: past,
      endDate: future,
      status: "ACTIVE",
    });

    // B: Secret code discount PROMO15K (Fixed 15.000, min 50.000)
    secretCodeDiscountId = crypto.randomUUID();
    await db.insert(discounts).values({
      id: secretCodeDiscountId,
      foodCourtId,
      code: `PROMO15K_${timestamp}`,
      name: "Voucher Rahasia 15rb",
      scope: "FOOD_COURT",
      type: "FIXED_AMOUNT",
      value: 15000,
      minOrderAmount: 50000,
      isPublic: false,
      startDate: past,
      endDate: future,
      status: "ACTIVE",
    });

    // C: Tenant-specific discount: 50% for Tenant 1 only, min 40.000
    tenantDiscountId = crypto.randomUUID();
    await db.insert(discounts).values({
      id: tenantDiscountId,
      foodCourtId,
      tenantId: tenant1Id,
      name: "Tenant 1 Special 50%",
      scope: "TENANT",
      type: "PERCENTAGE",
      value: 50,
      maxDiscountAmount: 30000,
      minOrderAmount: 40000,
      isPublic: true,
      startDate: past,
      endDate: future,
      status: "ACTIVE",
    });

    // D: Expired discount
    expiredDiscountId = crypto.randomUUID();
    await db.insert(discounts).values({
      id: expiredDiscountId,
      foodCourtId,
      name: "Expired Promo",
      scope: "FOOD_COURT",
      type: "PERCENTAGE",
      value: 20,
      minOrderAmount: 10000,
      isPublic: true,
      startDate: wayPast,
      endDate: past,
      status: "EXPIRED",
    });
  });

  it("1. should validate active percentage discount with cap correctly", async () => {
    // 2x Beef Bowl = Rp 100.000. 20% of 100.000 = 20.000 -> capped at 10.000.
    const res = await discountService.validateDiscount({
      foodCourtId,
      discountId: cappedPercentDiscountId,
      items: [{ menuId: menu1Id, quantity: 2 }],
    });

    expect(res.valid).toBe(true);
    expect(res.subtotal).toBe(100000);
    expect(res.discountAmount).toBe(10000);
    expect(res.discountedSubtotal).toBe(90000);
    expect(res.serviceFee).toBe(2700); // 3% of 90.000
    expect(res.taxAmount).toBe(9000); // 10% of 90.000
    expect(res.totalAmount).toBe(101700);
  });

  it("2. should validate secret voucher code case-insensitively", async () => {
    // Subtotal 1x Beef Bowl = 50.000 -> Fixed 15.000 discount
    const res = await discountService.validateDiscount({
      foodCourtId,
      discountCode: `promo15k_${timestamp}`, // lowercase input
      items: [{ menuId: menu1Id, quantity: 1 }],
    });

    expect(res.valid).toBe(true);
    expect(res.discount.code).toBe(`PROMO15K_${timestamp}`);
    expect(res.discountAmount).toBe(15000);
    expect(res.discountedSubtotal).toBe(35000);
    expect(res.serviceFee).toBe(1050); // 3% of 35.000
    expect(res.taxAmount).toBe(3500); // 10% of 35.000
    expect(res.totalAmount).toBe(39550);
  });

  it("3. should reject discount if minOrderAmount is not reached", async () => {
    // 1x Iced Tea = 30.000 < minOrderAmount 50.000
    expect(
      discountService.validateDiscount({
        foodCourtId,
        discountId: cappedPercentDiscountId,
        items: [{ menuId: menu2Id, quantity: 1 }],
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it("4. should reject expired or inactive discount", async () => {
    expect(
      discountService.validateDiscount({
        foodCourtId,
        discountId: expiredDiscountId,
        items: [{ menuId: menu1Id, quantity: 2 }],
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it("5. should validate tenant-specific discount and only qualify items from that tenant", async () => {
    // Cart has: 1x Beef Bowl (Tenant 1: Rp 50.000) + 2x Iced Tea (Tenant 2: Rp 60.000)
    // Overall subtotal: 110.000
    // Tenant 1 qualifying subtotal: 50.000 >= minOrderAmount (40.000)
    // 50% discount on 50.000 = 25.000 (cap is 30.000)
    const res = await discountService.validateDiscount({
      foodCourtId,
      discountId: tenantDiscountId,
      items: [
        { menuId: menu1Id, quantity: 1 },
        { menuId: menu2Id, quantity: 2 },
      ],
    });

    expect(res.valid).toBe(true);
    expect(res.subtotal).toBe(110000);
    expect(res.qualifyingSubtotal).toBe(50000);
    expect(res.discountAmount).toBe(25000);
    expect(res.discountedSubtotal).toBe(85000);
  });

  it("6. should reject tenant-specific discount if no items from that tenant meet minOrderAmount", async () => {
    // Only items from Tenant 2 (Rp 60.000), Tenant 1 has 0
    expect(
      discountService.validateDiscount({
        foodCourtId,
        discountId: tenantDiscountId,
        items: [{ menuId: menu2Id, quantity: 2 }],
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it("7. should reject wrong discount code", async () => {
    expect(
      discountService.validateDiscount({
        foodCourtId,
        discountCode: "NONEXISTENT_CODE",
        items: [{ menuId: menu1Id, quantity: 2 }],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("8. should reject secret code discount when accessed via discountId without matching code", async () => {
    // secretCodeDiscountId is isPublic: false
    // Validating with discountId alone without code must be rejected
    expect(
      discountService.validateDiscount({
        foodCourtId,
        discountId: secretCodeDiscountId,
        items: [{ menuId: menu1Id, quantity: 2 }],
      }),
    ).rejects.toThrow("Voucher rahasia memerlukan kode promo yang valid");
  });

  it("9. should cap percentage discount to qualifying subtotal when discount value exceeds 100", async () => {
    // Seed a 150% discount
    const highPercentId = crypto.randomUUID();
    await db.insert(discounts).values({
      id: highPercentId,
      foodCourtId,
      name: "Super 150% Off",
      scope: "FOOD_COURT",
      type: "PERCENTAGE",
      value: 150,
      minOrderAmount: 0,
      isPublic: true,
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 3600000),
      status: "ACTIVE",
    });

    const res = await discountService.validateDiscount({
      foodCourtId,
      discountId: highPercentId,
      items: [{ menuId: menu1Id, quantity: 1 }], // 50.000
    });

    expect(res.discountAmount).toBe(50000); // Capped to 50.000 (not 75.000!)
    expect(res.discountedSubtotal).toBe(0);
  });

  it("10. should reject createDiscount when scope is TENANT but tenantId is missing", async () => {
    const adminUser = {
      id: "admin-disc-test-1",
      name: "Admin",
      email: "admin@disc.com",
      role: "admin" as const,
    };

    expect(
      discountService.createDiscount(
        {
          foodCourtId,
          name: "Invalid Tenant Scope",
          scope: "TENANT",
          tenantId: null,
          type: "PERCENTAGE",
          value: 10,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
        },
        adminUser,
      ),
    ).rejects.toThrow("Tenant harus dipilih untuk promo dengan lingkup TENANT");
  });

  it("11. should reject createDiscount when percentage value exceeds 100", async () => {
    const adminUser = {
      id: "admin-disc-test-1",
      name: "Admin",
      email: "admin@disc.com",
      role: "admin" as const,
    };

    expect(
      discountService.createDiscount(
        {
          foodCourtId,
          name: "Over 100%",
          scope: "FOOD_COURT",
          type: "PERCENTAGE",
          value: 110,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
        },
        adminUser,
      ),
    ).rejects.toThrow("Persentase diskon tidak boleh melebihi 100%");
  });

  it("12. should reject createDiscount when startDate is greater than or equal to endDate", async () => {
    const adminUser = {
      id: "admin-disc-test-1",
      name: "Admin",
      email: "admin@disc.com",
      role: "admin" as const,
    };

    expect(
      discountService.createDiscount(
        {
          foodCourtId,
          name: "Inverted Dates",
          scope: "FOOD_COURT",
          type: "FIXED_AMOUNT",
          value: 5000,
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date().toISOString(),
        },
        adminUser,
      ),
    ).rejects.toThrow("Tanggal mulai harus lebih awal dari tanggal berakhir");
  });
});
