import { describe, expect, it } from "bun:test";
import {
  users,
  foodCourts,
  tables,
  kiosks,
  tenants,
  menuCategories,
  menus,
  menuOptions,
  diningSessions,
  sessionParticipants,
  orders,
  tenantOrders,
  orderItems,
  orderItemOptions,
  kitchenQueues,
  orderStatusLogs,
  paymentGroups,
  paymentGroupItems,
  payments,
} from "../src/db/schema";

describe("Drizzle Schema Integrity Check", () => {
  it("harus mengekspor seluruh 19 tabel yang didefinisikan", () => {
    expect(users).toBeDefined();
    expect(foodCourts).toBeDefined();
    expect(tables).toBeDefined();
    expect(kiosks).toBeDefined();
    expect(tenants).toBeDefined();
    expect(menuCategories).toBeDefined();
    expect(menus).toBeDefined();
    expect(menuOptions).toBeDefined();
    expect(diningSessions).toBeDefined();
    expect(sessionParticipants).toBeDefined();
    expect(orders).toBeDefined();
    expect(tenantOrders).toBeDefined();
    expect(orderItems).toBeDefined();
    expect(orderItemOptions).toBeDefined();
    expect(kitchenQueues).toBeDefined();
    expect(orderStatusLogs).toBeDefined();
    expect(paymentGroups).toBeDefined();
    expect(paymentGroupItems).toBeDefined();
    expect(payments).toBeDefined();
  });
});
