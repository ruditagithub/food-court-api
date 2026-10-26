import { describe, expect, it, beforeAll } from "bun:test";
import { db } from "../db";
import { foodCourts, menuOptions, menus, tenants, users, orderItemOptions } from "../db/schema";
import { orderService } from "../modules/orders/service";
import { BadRequestError } from "../common/errors";
import { eq } from "drizzle-orm";

describe("Order Creation with Menu Options", () => {
  let foodCourtId: string;
  let tenantId: string;
  let menuAId: string;
  let menuBId: string;
  let optA1Id: string;
  let optA2Id: string;
  let optB1Id: string;
  const timestamp = Date.now();

  beforeAll(async () => {
    // 1. Food court & tenant
    foodCourtId = crypto.randomUUID();
    await db.insert(foodCourts).values({
      id: foodCourtId,
      name: `FC Order Opts ${timestamp}`,
      slug: `fc-order-opts-${timestamp}`,
      status: "ACTIVE",
    });

    tenantId = crypto.randomUUID();
    await db.insert(tenants).values({
      id: tenantId,
      foodCourtId,
      name: `Tenant Order Opts ${timestamp}`,
      slug: `tenant-order-opts-${timestamp}`,
      stallNumber: "ORD-01",
      isOpen: true,
    });

    // 2. Menu A (Rp 25.000) with 2 options
    menuAId = crypto.randomUUID();
    await db.insert(menus).values({
      id: menuAId,
      tenantId,
      name: "Nasi Goreng Spesial",
      price: 25000,
      stock: 100,
      isAvailable: true,
      status: "AVAILABLE",
    });

    optA1Id = crypto.randomUUID();
    await db.insert(menuOptions).values({
      id: optA1Id,
      menuId: menuAId,
      name: "Level Pedas 2",
      priceAdjustment: 2000,
    });

    optA2Id = crypto.randomUUID();
    await db.insert(menuOptions).values({
      id: optA2Id,
      menuId: menuAId,
      name: "Extra Telur Mata Sapi",
      priceAdjustment: 4000,
    });

    // 3. Menu B (Rp 15.000) with 1 option
    menuBId = crypto.randomUUID();
    await db.insert(menus).values({
      id: menuBId,
      tenantId,
      name: "Es Jeruk Murni",
      price: 15000,
      stock: 100,
      isAvailable: true,
      status: "AVAILABLE",
    });

    optB1Id = crypto.randomUUID();
    await db.insert(menuOptions).values({
      id: optB1Id,
      menuId: menuBId,
      name: "Less Sugar",
      priceAdjustment: 0,
    });
  });

  it("should calculate effective unit price including option price adjustments and create orderItemOptions snapshots", async () => {
    const order = await orderService.createOrder({
      orderType: "TAKEAWAY",
      customerName: "Budi Santoso",
      items: [
        {
          menuId: menuAId,
          quantity: 2,
          optionIds: [optA1Id, optA2Id],
        },
      ],
    });

    expect(order.id).toBeDefined();

    // Base price = 25.000, Option 1 = +2.000, Option 2 = +4.000 => Effective = 31.000
    // Quantity 2 => Subtotal = 62.000
    const item = order.items[0];
    expect(item).toBeDefined();
    expect(item.unitPriceSnapshot).toBe(31000);
    expect(item.subtotal).toBe(62000);

    // Verify eager-loaded options in order item
    expect(item.options).toBeDefined();
    expect(item.options.length).toBe(2);

    const optSnapshots = item.options.map((o: any) => ({
      name: o.optionNameSnapshot,
      adjustment: o.priceAdjustmentSnapshot,
    }));

    expect(optSnapshots).toContainEqual({
      name: "Level Pedas 2",
      adjustment: 2000,
    });
    expect(optSnapshots).toContainEqual({
      name: "Extra Telur Mata Sapi",
      adjustment: 4000,
    });

    // Check direct database row in order_item_options table
    const dbSnapshots = await db.query.orderItemOptions.findMany({
      where: eq(orderItemOptions.orderItemId, item.id),
    });
    expect(dbSnapshots.length).toBe(2);
  });

  it("should reject order if optionId does not belong to the requested menu", async () => {
    expect(
      orderService.createOrder({
        orderType: "TAKEAWAY",
        customerName: "Hacker Option",
        items: [
          {
            menuId: menuAId,
            quantity: 1,
            optionIds: [optB1Id], // optB1 belongs to Menu B, not Menu A
          },
        ],
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it("should reject order if optionId does not exist", async () => {
    expect(
      orderService.createOrder({
        orderType: "TAKEAWAY",
        customerName: "Ghost Option",
        items: [
          {
            menuId: menuAId,
            quantity: 1,
            optionIds: ["non-existent-option-id"],
          },
        ],
      }),
    ).rejects.toThrow(BadRequestError);
  });
});
