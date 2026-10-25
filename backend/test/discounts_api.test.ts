import { describe, expect, it, beforeAll } from "bun:test";
import { app } from "../index";
import { db } from "../db";
import { foodCourts, menuCategories, menus, tenants, users } from "../db/schema";

describe("Discounts API Endpoints Integration Test", () => {
  let adminToken = "";
  let customerToken = "";
  let foodCourtId = "";
  let tenantId = "";
  let menuId = "";
  let createdDiscountId = "";
  let secretDiscountCode = "";

  const timestamp = Date.now();

  beforeAll(async () => {
    // 1. Register and login Admin
    const adminEmail = `admin_disc_${timestamp}@foodcourt.com`;
    await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Admin Discount",
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
        body: JSON.stringify({
          email: adminEmail,
          password: "password123",
        }),
      }),
    );
    const adminLoginBody = await adminLoginRes.json();
    adminToken = adminLoginBody.data.token;

    // 2. Register and login Customer
    const customerEmail = `cust_disc_${timestamp}@foodcourt.com`;
    await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Customer Discount",
          email: customerEmail,
          password: "password123",
          role: "customer",
        }),
      }),
    );

    const customerLoginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: customerEmail,
          password: "password123",
        }),
      }),
    );
    const customerLoginBody = await customerLoginRes.json();
    customerToken = customerLoginBody.data.token;

    // 3. Seed food court, tenant, and menu
    foodCourtId = crypto.randomUUID();
    await db.insert(foodCourts).values({
      id: foodCourtId,
      name: `Promo Food Court ${timestamp}`,
      slug: `promo-fc-${timestamp}`,
      status: "ACTIVE",
    });

    tenantId = crypto.randomUUID();
    await db.insert(tenants).values({
      id: tenantId,
      foodCourtId,
      name: `Promo Tenant ${timestamp}`,
      slug: `promo-tenant-${timestamp}`,
      stallNumber: "P-01",
      isOpen: true,
    });

    const categoryId = crypto.randomUUID();
    await db.insert(menuCategories).values({
      id: categoryId,
      tenantId,
      name: "Promo Dishes",
    });

    menuId = crypto.randomUUID();
    await db.insert(menus).values({
      id: menuId,
      tenantId,
      categoryId,
      name: "Promo Crispy Duck",
      price: 60000,
      stock: 50,
      isAvailable: true,
      status: "AVAILABLE",
    });

    secretDiscountCode = `SECRET_${timestamp}`;
  });

  it("1. should reject unauthenticated request when creating discount (401)", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodCourtId,
          name: "Promo Unauthorized",
          scope: "FOOD_COURT",
          type: "PERCENTAGE",
          value: 10,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
        }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("2. should reject customer role when creating discount (403)", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/discounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          foodCourtId,
          name: "Promo Customer",
          scope: "FOOD_COURT",
          type: "PERCENTAGE",
          value: 10,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
        }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("3. should allow admin to create a new discount (200)", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/discounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          foodCourtId,
          code: secretDiscountCode,
          name: "Admin Special 20% OFF",
          description: "Nikmati potongan 20% belanja hemat",
          scope: "FOOD_COURT",
          type: "PERCENTAGE",
          value: 20,
          maxDiscountAmount: 15000,
          minOrderAmount: 50000,
          isPublic: true,
          startDate: new Date(Date.now() - 3600000).toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBeDefined();
    expect(body.data.name).toBe("Admin Special 20% OFF");
    expect(body.data.value).toBe(20);

    createdDiscountId = body.data.id;
  });

  it("4. should list public active vouchers via GET /api/discounts/public", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/discounts/public?foodCourtId=${foodCourtId}`),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    const found = body.data.find((d: any) => d.id === createdDiscountId);
    expect(found).toBeDefined();
    expect(Boolean(found.isPublic)).toBe(true);
  });

  it("5. should validate discount via POST /api/discounts/validate", async () => {
    // 1x Duck = 60.000. 20% = 12.000. Capped at 15.000 -> 12.000 discount.
    // Discounted subtotal: 48.000. Service 3%: 1.440. Tax 10%: 4.800. Total: 54.240.
    const res = await app.handle(
      new Request("http://localhost/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodCourtId,
          discountCode: secretDiscountCode,
          items: [{ menuId, quantity: 1 }],
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.valid).toBe(true);
    expect(body.data.subtotal).toBe(60000);
    expect(body.data.discountAmount).toBe(12000);
    expect(body.data.discountedSubtotal).toBe(48000);
    expect(body.data.serviceFee).toBe(1440);
    expect(body.data.taxAmount).toBe(4800);
    expect(body.data.totalAmount).toBe(54240);
  });

  it("6. should get single discount detail via GET /api/discounts/:id", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/discounts/${createdDiscountId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(createdDiscountId);
    expect(body.data.name).toBe("Admin Special 20% OFF");
  });

  it("7. should update discount via PUT /api/discounts/:id", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/discounts/${createdDiscountId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "Admin Special 25% OFF",
          value: 25,
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Admin Special 25% OFF");
    expect(body.data.value).toBe(25);
  });

  it("8. should deactivate discount via DELETE /api/discounts/:id", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/discounts/${createdDiscountId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify it is no longer returned in public list
    const publicRes = await app.handle(
      new Request(`http://localhost/api/discounts/public?foodCourtId=${foodCourtId}`),
    );
    const publicBody = await publicRes.json();
    const found = publicBody.data.find((d: any) => d.id === createdDiscountId);
    expect(found).toBeUndefined();
  });
});
