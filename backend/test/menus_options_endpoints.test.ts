import { describe, expect, it, beforeAll } from "bun:test";
import { app } from "../index";
import { db } from "../db";
import { foodCourts, menus, menuOptions, tenants, users } from "../db/schema";

describe("Menu Options Sub-Resource Endpoints", () => {
  let adminToken = "";
  let ownerToken = "";
  let intruderTenantToken = "";
  let customerToken = "";
  let foodCourtId = "";
  let tenantId = "";
  let intruderTenantId = "";
  let menuId = "";
  let optionId = "";

  const timestamp = Date.now();

  beforeAll(async () => {
    // 1. Create and login Admin
    const adminEmail = `admin_opt_${timestamp}@foodcourt.com`;
    await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Admin Options",
          email: adminEmail,
          password: "password123",
          role: "admin",
        }),
      }),
    );
    const adminLoginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "password123" }),
      }),
    );
    adminToken = (await adminLoginRes.json()).data.token;

    // 2. Create and login Tenant Owner
    const ownerEmail = `owner_opt_${timestamp}@foodcourt.com`;
    const ownerRegisterRes = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Tenant Owner",
          email: ownerEmail,
          password: "password123",
          role: "tenant",
        }),
      }),
    );
    const ownerUserId = (await ownerRegisterRes.json()).data.id;
    const ownerLoginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ownerEmail, password: "password123" }),
      }),
    );
    ownerToken = (await ownerLoginRes.json()).data.token;

    // 3. Create and login Intruder Tenant
    const intruderEmail = `intruder_opt_${timestamp}@foodcourt.com`;
    const intruderRegisterRes = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Intruder Tenant",
          email: intruderEmail,
          password: "password123",
          role: "tenant",
        }),
      }),
    );
    const intruderUserId = (await intruderRegisterRes.json()).data.id;
    const intruderLoginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: intruderEmail, password: "password123" }),
      }),
    );
    intruderTenantToken = (await intruderLoginRes.json()).data.token;

    // 4. Create and login Customer
    const customerEmail = `cust_opt_${timestamp}@foodcourt.com`;
    await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Customer Options",
          email: customerEmail,
          password: "password123",
          role: "customer",
        }),
      }),
    );
    const custLoginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: customerEmail, password: "password123" }),
      }),
    );
    customerToken = (await custLoginRes.json()).data.token;

    // 5. Seed Food Court & Tenants
    foodCourtId = crypto.randomUUID();
    await db.insert(foodCourts).values({
      id: foodCourtId,
      name: `FC Options API ${timestamp}`,
      slug: `fc-options-api-${timestamp}`,
      status: "ACTIVE",
    });

    tenantId = crypto.randomUUID();
    await db.insert(tenants).values({
      id: tenantId,
      foodCourtId,
      ownerId: ownerUserId,
      name: `Owner Stall ${timestamp}`,
      slug: `owner-stall-${timestamp}`,
      stallNumber: "ST-01",
      isOpen: true,
    });

    intruderTenantId = crypto.randomUUID();
    await db.insert(tenants).values({
      id: intruderTenantId,
      foodCourtId,
      ownerId: intruderUserId,
      name: `Intruder Stall ${timestamp}`,
      slug: `intruder-stall-${timestamp}`,
      stallNumber: "ST-02",
      isOpen: true,
    });

    // 6. Seed a Menu
    menuId = crypto.randomUUID();
    await db.insert(menus).values({
      id: menuId,
      tenantId,
      name: "Soto Betawi",
      price: 30000,
      stock: 50,
      status: "AVAILABLE",
      isAvailable: true,
    });
  });

  it("POST /api/menus/:menuId/options should add an option by owner or admin", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/menus/${menuId}/options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          name: "Daging Tambahan",
          priceAdjustment: 10000,
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.name).toBe("Daging Tambahan");
    expect(body.data.priceAdjustment).toBe(10000);
    optionId = body.data.id;
  });

  it("POST /api/menus/:menuId/options should reject unauthorized tenant", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/menus/${menuId}/options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${intruderTenantToken}`,
        },
        body: JSON.stringify({
          name: "Hacked Option",
          priceAdjustment: 0,
        }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("GET /api/menus/:menuId/options should return all options for the menu", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/menus/${menuId}/options`, {
        method: "GET",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.some((o: any) => o.name === "Daging Tambahan")).toBe(true);
  });

  it("PUT /api/menus/options/:id should update option by owner", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/menus/options/${optionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          name: "Ekstra Daging Sapi",
          priceAdjustment: 12000,
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Ekstra Daging Sapi");
    expect(body.data.priceAdjustment).toBe(12000);
  });

  it("PUT /api/menus/:menuId/options/:id should also work and update option", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/menus/${menuId}/options/${optionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          name: "Ekstra Daging Sapi Jumbo",
          priceAdjustment: 15000,
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Ekstra Daging Sapi Jumbo");
    expect(body.data.priceAdjustment).toBe(15000);
  });

  it("PUT should reject unauthorized tenant", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/menus/options/${optionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${intruderTenantToken}`,
        },
        body: JSON.stringify({
          name: "Intruder Update",
        }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("DELETE should reject unauthorized tenant", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/menus/options/${optionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${intruderTenantToken}`,
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("DELETE /api/menus/options/:id should delete option by owner", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/menus/options/${optionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      }),
    );

    expect(res.status).toBe(200);

    // Verify option no longer exists
    const checkRes = await app.handle(
      new Request(`http://localhost/api/menus/${menuId}/options`),
    );
    const body = await checkRes.json();
    expect(body.data.some((o: any) => o.id === optionId)).toBe(false);
  });
});
