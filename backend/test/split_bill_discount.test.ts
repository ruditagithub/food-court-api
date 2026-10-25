import { describe, expect, it, beforeAll } from "bun:test";
import { db } from "../db";
import { discounts, foodCourts, menus, menuCategories, orders, sessionParticipants, tables, tenants } from "../db/schema";
import { orderService } from "../modules/orders/service";
import { eq } from "drizzle-orm";

describe("Split Bill Discount Distribution (Waterfall / Spillover)", () => {
  let foodCourtId = "";
  let tableId = "";
  let tenantId = "";
  let expensiveMenuId = ""; // Rp 70.000
  let cheapMenuId = "";    // Rp 30.000
  let tinyMenuId = "";     // Rp 3.000
  let discountId = "";

  const timestamp = Date.now();

  beforeAll(async () => {
    foodCourtId = crypto.randomUUID();
    await db.insert(foodCourts).values({
      id: foodCourtId,
      name: `Split Bill FC ${timestamp}`,
      slug: `split-bill-fc-${timestamp}`,
      status: "ACTIVE",
    });

    tableId = crypto.randomUUID();
    await db.insert(tables).values({
      id: tableId,
      foodCourtId,
      tableNumber: `SB-${Math.floor(100 + Math.random() * 900)}`,
      qrToken: `qr_split_bill_${timestamp}`,
      status: "available",
    });

    tenantId = crypto.randomUUID();
    await db.insert(tenants).values({
      id: tenantId,
      foodCourtId,
      name: `Split Bill Stall ${timestamp}`,
      slug: `split-bill-stall-${timestamp}`,
      stallNumber: "SB-01",
      isOpen: true,
    });

    const categoryId = crypto.randomUUID();
    await db.insert(menuCategories).values({
      id: categoryId,
      tenantId,
      name: "General",
    });

    expensiveMenuId = crypto.randomUUID();
    await db.insert(menus).values({
      id: expensiveMenuId,
      tenantId,
      categoryId,
      name: "Steak Wagyu",
      price: 70000,
      stock: 100,
      isAvailable: true,
      status: "AVAILABLE",
    });

    cheapMenuId = crypto.randomUUID();
    await db.insert(menus).values({
      id: cheapMenuId,
      tenantId,
      categoryId,
      name: "Pasta Carbonara",
      price: 30000,
      stock: 100,
      isAvailable: true,
      status: "AVAILABLE",
    });

    tinyMenuId = crypto.randomUUID();
    await db.insert(menus).values({
      id: tinyMenuId,
      tenantId,
      categoryId,
      name: "Kerupuk Kulit",
      price: 3000,
      stock: 100,
      isAvailable: true,
      status: "AVAILABLE",
    });

    // Discount 10.000 fixed
    discountId = crypto.randomUUID();
    await db.insert(discounts).values({
      id: discountId,
      foodCourtId,
      name: "Voucher 10k Flat",
      code: `FLAT10K_${timestamp}`,
      scope: "FOOD_COURT",
      type: "FIXED_AMOUNT",
      value: 10000,
      minOrderAmount: 30000,
      isPublic: true,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    });
  });

  it("1. should evenly split discount between two participants when both subtotals > base discount", async () => {
    // Nanda orders Pasta (30.000), Putra orders Steak (70.000). Overall: 100.000.
    // Discount: 10.000. Discounted subtotal: 90.000. Svc 2.700, Tax 9.000, Total: 101.700.
    const created = await orderService.create(
      {
        tableId,
        customerName: "Nanda",
        discountId,
        items: [
          { menuId: cheapMenuId, quantity: 1 },
          { menuId: expensiveMenuId, quantity: 1 },
        ],
      },
      null,
    );

    const pastaItem = created.tenantOrders[0].items.find(
      (it: any) => it.menuId === cheapMenuId,
    )!;
    const steakItem = created.tenantOrders[0].items.find(
      (it: any) => it.menuId === expensiveMenuId,
    )!;

    // Configure split bill: Nanda pays pasta, Putra pays steak
    const splitResult = await orderService.configureSplitBill(created.id, {
      groups: [
        {
          participantName: "Nanda",
          items: [{ orderItemId: pastaItem.id, quantity: 1 }],
        },
        {
          participantName: "Putra",
          items: [{ orderItemId: steakItem.id, quantity: 1 }],
        },
      ],
    });

    expect(splitResult.paymentGroups.length).toBe(2);

    const nandaGroup = splitResult.paymentGroups.find(
      (g: any) => g.participantName === "Nanda",
    )!;
    const putraGroup = splitResult.paymentGroups.find(
      (g: any) => g.participantName === "Putra",
    )!;

    expect(nandaGroup).toBeDefined();
    expect(putraGroup).toBeDefined();

    // Nanda: Subtotal 30.000, Discount 5.000 -> Discounted 25.000 -> Svc 750, Tax 2.500 -> Due: 28.250
    expect(nandaGroup.subtotal).toBe(30000);
    expect(nandaGroup.discountAmount).toBe(5000);
    expect(nandaGroup.discountedSubtotal).toBe(25000);
    expect(nandaGroup.serviceFee).toBe(750);
    expect(nandaGroup.taxAmount).toBe(2500);
    expect(nandaGroup.amountDue).toBe(28250);

    // Putra: Subtotal 70.000, Discount 5.000 -> Discounted 65.000 -> Svc 1.950, Tax 6.500 -> Due: 73.450
    expect(putraGroup.subtotal).toBe(70000);
    expect(putraGroup.discountAmount).toBe(5000);
    expect(putraGroup.discountedSubtotal).toBe(65000);
    expect(putraGroup.serviceFee).toBe(1950);
    expect(putraGroup.taxAmount).toBe(6500);
    expect(putraGroup.amountDue).toBe(73450);

    // Exact sum match
    expect(nandaGroup.amountDue + putraGroup.amountDue).toBe(created.totalAmount);
  });

  it("2. should spill over unused discount from small spender to large spender (waterfall)", async () => {
    // Participant C orders Kerupuk (Rp 3.000), Participant D orders Steak (Rp 70.000)
    // Overall subtotal: 73.000.
    // Flat discount: 10.000. Discounted subtotal: 63.000.
    // Svc 3%: 1.890, Tax 10%: 6.300. Total: 71.190.
    const created = await orderService.create(
      {
        tableId,
        customerName: "Participant C",
        discountId,
        items: [
          { menuId: tinyMenuId, quantity: 1 },
          { menuId: expensiveMenuId, quantity: 1 },
        ],
      },
      null,
    );

    const kerupukItem = created.tenantOrders[0].items.find(
      (it: any) => it.menuId === tinyMenuId,
    )!;
    const steakItem = created.tenantOrders[0].items.find(
      (it: any) => it.menuId === expensiveMenuId,
    )!;

    // Split bill: 2 participants. Base discount is 10.000 / 2 = 5.000 each.
    // C only spent 3.000! C discount capped to 3.000 (Due = 0).
    // Surplus 2.000 rolls over to D! D gets 5.000 + 2.000 = 7.000 discount!
    const splitResult = await orderService.configureSplitBill(created.id, {
      groups: [
        {
          participantName: "Participant C",
          items: [{ orderItemId: kerupukItem.id, quantity: 1 }],
        },
        {
          participantName: "Participant D",
          items: [{ orderItemId: steakItem.id, quantity: 1 }],
        },
      ],
    });

    const cGroup = splitResult.paymentGroups.find(
      (g: any) => g.participantName === "Participant C",
    )!;
    const dGroup = splitResult.paymentGroups.find(
      (g: any) => g.participantName === "Participant D",
    )!;

    expect(cGroup).toBeDefined();
    expect(dGroup).toBeDefined();

    // C: subtotal 3.000, discount 3.000, discountedSubtotal 0, svc 0, tax 0, amountDue 0
    expect(cGroup.subtotal).toBe(3000);
    expect(cGroup.discountAmount).toBe(3000);
    expect(cGroup.discountedSubtotal).toBe(0);
    expect(cGroup.amountDue).toBe(0);

    // D: subtotal 70.000, discount 7.000 -> discounted 63.000
    // Svc 3%: 1.890, Tax 10%: 6.300 -> Due: 71.190
    expect(dGroup.subtotal).toBe(70000);
    expect(dGroup.discountAmount).toBe(7000);
    expect(dGroup.discountedSubtotal).toBe(63000);
    expect(dGroup.serviceFee).toBe(1890);
    expect(dGroup.taxAmount).toBe(6300);
    expect(dGroup.amountDue).toBe(71190);

    // Sum matches created.totalAmount
    expect(cGroup.amountDue + dGroup.amountDue).toBe(created.totalAmount);
  });

  it("3. should handle multi-participant cascading spillover with multiple small spenders", async () => {
    // 4 participants: A (Rp 3.000), B (Rp 3.000), C (Rp 30.000), D (Rp 70.000)
    // Overall subtotal: 106.000
    // Flat discount: 40.000 (Base discount = 10.000 each)
    // A and B spend 3.000 each (< 10.000). A gets 3.000, B gets 3.000.
    // Unused: 7.000 + 7.000 = 14.000 rolls over to C and D (+7.000 each).
    // C gets 10.000 + 7.000 = 17.000 discount (subtotal 30.000).
    // D gets 10.000 + 7.000 = 17.000 discount (subtotal 70.000).
    // Total discount: 3.000 + 3.000 + 17.000 + 17.000 = 40.000!
    const bigDiscountId = crypto.randomUUID();
    await db.insert(discounts).values({
      id: bigDiscountId,
      foodCourtId,
      name: "Voucher 40k Flat",
      code: `FLAT40K_${Date.now()}`,
      scope: "FOOD_COURT",
      type: "FIXED_AMOUNT",
      value: 40000,
      minOrderAmount: 50000,
      isPublic: true,
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 3600000),
      status: "ACTIVE",
    });

    const created = await orderService.create(
      {
        tableId,
        customerName: "Group Host",
        discountId: bigDiscountId,
        items: [
          { menuId: tinyMenuId, quantity: 2 }, // 2x 3.000 = 6.000 (split across A & B)
          { menuId: cheapMenuId, quantity: 1 }, // 1x 30.000 (C)
          { menuId: expensiveMenuId, quantity: 1 }, // 1x 70.000 (D)
        ],
      },
      null,
    );

    const tinyItems = created.tenantOrders[0].items.filter(
      (it: any) => it.menuId === tinyMenuId,
    );
    const pastaItem = created.tenantOrders[0].items.find(
      (it: any) => it.menuId === cheapMenuId,
    )!;
    const steakItem = created.tenantOrders[0].items.find(
      (it: any) => it.menuId === expensiveMenuId,
    )!;

    const splitResult = await orderService.configureSplitBill(created.id, {
      groups: [
        {
          participantName: "Participant A",
          items: [{ orderItemId: tinyItems[0].id, quantity: 1 }], // 3.000
        },
        {
          participantName: "Participant B",
          items: [{ orderItemId: tinyItems[0].id, quantity: 1 }], // 3.000
        },
        {
          participantName: "Participant C",
          items: [{ orderItemId: pastaItem.id, quantity: 1 }], // 30.000
        },
        {
          participantName: "Participant D",
          items: [{ orderItemId: steakItem.id, quantity: 1 }], // 70.000
        },
      ],
    });

    expect(splitResult.paymentGroups.length).toBe(4);

    const gA = splitResult.paymentGroups.find((g: any) => g.participantName === "Participant A")!;
    const gB = splitResult.paymentGroups.find((g: any) => g.participantName === "Participant B")!;
    const gC = splitResult.paymentGroups.find((g: any) => g.participantName === "Participant C")!;
    const gD = splitResult.paymentGroups.find((g: any) => g.participantName === "Participant D")!;

    expect(gA.discountAmount).toBe(3000);
    expect(gA.amountDue).toBe(0);

    expect(gB.discountAmount).toBe(3000);
    expect(gB.amountDue).toBe(0);

    expect(gC.discountAmount).toBe(17000);
    expect(gC.discountedSubtotal).toBe(13000);

    expect(gD.discountAmount).toBe(17000);
    expect(gD.discountedSubtotal).toBe(53000);

    // Sum of discounts allocated equals total order discount
    const totalAllocatedDiscount =
      gA.discountAmount + gB.discountAmount + gC.discountAmount + gD.discountAmount;
    expect(totalAllocatedDiscount).toBe(40000);

    // Sum of amountDue across all 4 participants matches order.totalAmount
    const totalDue = gA.amountDue + gB.amountDue + gC.amountDue + gD.amountDue;
    expect(totalDue).toBe(created.totalAmount);
  });
});
