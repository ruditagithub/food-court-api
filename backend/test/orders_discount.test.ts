import { describe, expect, it, beforeAll } from "bun:test";
import { db } from "../db";
import { discounts, foodCourts, menus, menuCategories, orders, tables, tenants } from "../db/schema";
import { orderService } from "../modules/orders/service";
import { eq } from "drizzle-orm";

describe("Order Creation with Discount & Financial Recalculation", () => {
  let foodCourtId = "";
  let tableId = "";
  let tenantId = "";
  let menuId = "";
  let discountId = "";

  const timestamp = Date.now();

  beforeAll(async () => {
    // 1. Setup food court and table
    foodCourtId = crypto.randomUUID();
    await db.insert(foodCourts).values({
      id: foodCourtId,
      name: `Discount Order FC ${timestamp}`,
      slug: `discount-order-fc-${timestamp}`,
      status: "ACTIVE",
    });

    tableId = crypto.randomUUID();
    await db.insert(tables).values({
      id: tableId,
      foodCourtId,
      tableNumber: `D-${Math.floor(100 + Math.random() * 900)}`,
      qrToken: `qr_order_discount_${timestamp}`,
      status: "available",
    });

    // 2. Setup tenant and menu item
    tenantId = crypto.randomUUID();
    await db.insert(tenants).values({
      id: tenantId,
      foodCourtId,
      name: `Discount Stall ${timestamp}`,
      slug: `discount-stall-${timestamp}`,
      stallNumber: "DS-01",
      isOpen: true,
    });

    const categoryId = crypto.randomUUID();
    await db.insert(menuCategories).values({
      id: categoryId,
      tenantId,
      name: "Main",
    });

    menuId = crypto.randomUUID();
    await db.insert(menus).values({
      id: menuId,
      tenantId,
      categoryId,
      name: "Special Nasi Goreng",
      price: 50000,
      stock: 100,
      isAvailable: true,
      status: "AVAILABLE",
    });

    // 3. Setup Discount: 20% capped at 10.000, minOrder 50.000
    discountId = crypto.randomUUID();
    await db.insert(discounts).values({
      id: discountId,
      foodCourtId,
      name: "Voucher 20% Cap 10k",
      code: `PROMO20K_${timestamp}`,
      scope: "FOOD_COURT",
      type: "PERCENTAGE",
      value: 20,
      maxDiscountAmount: 10000,
      minOrderAmount: 50000,
      isPublic: true,
      usageLimit: 5,
      usageCount: 0,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    });
  });

  it("should create order with discount, recalculate tax and service, and increment usage count", async () => {
    // 2x Nasi Goreng = Rp 100.000
    // Discount: 20% of 100.000 = 20.000, capped at 10.000 -> 10.000
    // Discounted Subtotal: 90.000
    // Service 3%: 2.700
    // PB1 Tax 10%: 9.000
    // Total: 90.000 + 2.700 + 9.000 = 101.700
    const orderResult = await orderService.create(
      {
        tableId,
        customerName: "Aldi",
        discountId,
        items: [{ menuId, quantity: 2 }],
      },
      null,
    );

    expect(orderResult).toBeDefined();
    expect(orderResult.id).toBeDefined();

    const createdOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderResult.id),
      with: {
        paymentGroups: true,
      },
    });

    expect(createdOrder).toBeDefined();
    expect(createdOrder!.subtotal).toBe(100000);
    expect(createdOrder!.discountAmount).toBe(10000);
    expect(createdOrder!.discountId).toBe(discountId);
    expect(createdOrder!.serviceFee).toBe(2700);
    expect(createdOrder!.taxAmount).toBe(9000);
    expect(createdOrder!.totalAmount).toBe(101700);

    // Default payment group checks
    expect(createdOrder!.paymentGroups.length).toBe(1);
    expect(createdOrder!.paymentGroups[0].amountDue).toBe(101700);
    expect(createdOrder!.paymentGroups[0].discountAmount).toBe(10000);

    // Discount usageCount check
    const updatedDiscount = await db.query.discounts.findFirst({
      where: eq(discounts.id, discountId),
    });
    expect(updatedDiscount!.usageCount).toBe(1);
  });

  it("should enforce usageLimit quota and reject order creation when limit is exhausted", async () => {
    // Create a discount with usageLimit = 1
    const singleUseDiscountId = crypto.randomUUID();
    await db.insert(discounts).values({
      id: singleUseDiscountId,
      foodCourtId,
      name: "Single Use Promo",
      scope: "FOOD_COURT",
      type: "FIXED_AMOUNT",
      value: 5000,
      minOrderAmount: 10000,
      usageLimit: 1,
      usageCount: 0,
      isPublic: true,
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 3600000),
      status: "ACTIVE",
    });

    // First use: should succeed
    const firstOrder = await orderService.create(
      {
        tableId,
        customerName: "First Customer",
        discountId: singleUseDiscountId,
        items: [{ menuId, quantity: 1 }],
      },
      null,
    );
    expect(firstOrder.id).toBeDefined();

    // Verify usageCount is now 1
    const discAfterFirst = await db.query.discounts.findFirst({
      where: eq(discounts.id, singleUseDiscountId),
    });
    expect(discAfterFirst!.usageCount).toBe(1);

    // Second use: must be rejected with quota exceeded error
    expect(
      orderService.create(
        {
          tableId,
          customerName: "Second Customer",
          discountId: singleUseDiscountId,
          items: [{ menuId, quantity: 1 }],
        },
        null,
      ),
    ).rejects.toThrow("Kuota pemakaian voucher telah habis");

    // Cancel first order: should restore usage quota
    const adminUser = {
      id: "usr-admin-disc",
      name: "Admin",
      email: "admin@fc.com",
      role: "admin" as const,
    };
    await orderService.updateStatus(firstOrder.id, { status: "CANCELLED" as any }, adminUser);

    const discAfterCancel = await db.query.discounts.findFirst({
      where: eq(discounts.id, singleUseDiscountId),
    });
    expect(discAfterCancel!.usageCount).toBe(0);

    // Now third use should succeed because quota was restored!
    const thirdOrder = await orderService.create(
      {
        tableId,
        customerName: "Third Customer",
        discountId: singleUseDiscountId,
        items: [{ menuId, quantity: 1 }],
      },
      null,
    );
    expect(thirdOrder.id).toBeDefined();
  });
});
