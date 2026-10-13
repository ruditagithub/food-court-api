import { describe, expect, it } from "bun:test";
import { app } from "../src";

describe("Food Court End-to-End Workflow", () => {
  let adminToken = "";
  let tenantToken = "";
  let tableId = "";
  let tenantId = "";
  let rawonMenuId = "";
  let esJerukMenuId = "";
  let orderId = "";
  let rawonItemId = "";

  const timestamp = Date.now();

  it("1. Setup: Admin registration and login", async () => {
    const adminEmail = `admin_${timestamp}@foodcourt.com`;
    const regRes = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Supervisor Andi",
          email: adminEmail,
          password: "adminPassword123",
          role: "admin",
        }),
      }),
    );
    expect(regRes.status).toBe(201);

    const loginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          password: "adminPassword123",
        }),
      }),
    );
    expect(loginRes.status).toBe(200);
    const body = await loginRes.json();
    adminToken = body.data.token;
    expect(adminToken).toBeDefined();
  });

  it("2. Setup: Admin creates a dining table (T-10)", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          tableNumber: `T-${timestamp.toString().slice(-4)}`,
          capacity: 4,
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    tableId = body.data.id;
    expect(tableId).toBeDefined();
    expect(body.data.status).toBe("available");
  });

  it("3. Setup: Tenant registration and stall creation", async () => {
    const tenantEmail = `tenant_${timestamp}@foodcourt.com`;
    await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Pak Bambang Rawon",
          email: tenantEmail,
          password: "tenantPassword123",
          role: "tenant",
        }),
      }),
    );

    const loginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: tenantEmail,
          password: "tenantPassword123",
        }),
      }),
    );
    const loginBody = await loginRes.json();
    tenantToken = loginBody.data.token;

    // Create stall / tenant
    const stallRes = await app.handle(
      new Request("http://localhost/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({
          name: "Soto & Rawon Mak Nyus",
          stallNumber: `A-${timestamp.toString().slice(-3)}`,
          description: "Spesialis masakan rawon khas Jawa Timur",
          isOpen: true,
        }),
      }),
    );
    expect(stallRes.status).toBe(201);
    const stallBody = await stallRes.json();
    tenantId = stallBody.data.id;
    expect(tenantId).toBeDefined();
  });

  it("4. Tenant adds category and menu items", async () => {
    // Add Category
    const catRes = await app.handle(
      new Request("http://localhost/api/menus/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({
          tenantId,
          name: "Makanan Utama",
        }),
      }),
    );
    expect(catRes.status).toBe(201);
    const catBody = await catRes.json();
    const categoryId = catBody.data.id;

    // Add Menu 1: Rawon (Rp 30.000)
    const rawonRes = await app.handle(
      new Request("http://localhost/api/menus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({
          tenantId,
          categoryId,
          name: "Rawon Daging Sapi",
          price: 30000,
          description: "Rawon daging sapi kuah hitam mantap",
          isAvailable: true,
        }),
      }),
    );
    expect(rawonRes.status).toBe(201);
    const rawonBody = await rawonRes.json();
    rawonMenuId = rawonBody.data.id;

    // Add Menu 2: Es Jeruk (Rp 7.000)
    const jerukRes = await app.handle(
      new Request("http://localhost/api/menus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({
          tenantId,
          name: "Es Jeruk Peras Segar",
          price: 7000,
          isAvailable: true,
        }),
      }),
    );
    expect(jerukRes.status).toBe(201);
    const jerukBody = await jerukRes.json();
    esJerukMenuId = jerukBody.data.id;
  });

  it("5. Customer searches and filters menus", async () => {
    // 5a. Unauthenticated / Customer is rejected from GET /api/menus
    const unauthRes = await app.handle(
      new Request("http://localhost/api/menus?search=Rawon"),
    );
    expect(unauthRes.status).toBe(401);

    // 5b. Tenant can search their own menus via GET /api/menus
    const tenantMenuRes = await app.handle(
      new Request("http://localhost/api/menus?search=Rawon", {
        headers: { Authorization: `Bearer ${tenantToken}` },
      }),
    );
    expect(tenantMenuRes.status).toBe(200);
    const tenantBody = await tenantMenuRes.json();
    expect(tenantBody.data.length).toBeGreaterThan(0);
    expect(tenantBody.data[0].name).toContain("Rawon");

    // 5c. Customer can view menus of specific tenant via GET /api/menus/tenant/:tenantId
    const publicTenantMenuRes = await app.handle(
      new Request(`http://localhost/api/menus/tenant/${tenantId}?search=Rawon`),
    );
    expect(publicTenantMenuRes.status).toBe(200);
    const publicBody = await publicTenantMenuRes.json();
    expect(publicBody.data.length).toBeGreaterThan(0);
    expect(publicBody.data[0].name).toContain("Rawon");
  });

  it("6. Customer places multi-item order for the table", async () => {
    const orderPayload = {
      tableId,
      customerName: "Budi Santoso",
      items: [
        { menuId: rawonMenuId, quantity: 2, specialNotes: "Kecambah banyak" },
        { menuId: esJerukMenuId, quantity: 1, specialNotes: "Sedikit es" },
      ],
    };

    const res = await app.handle(
      new Request("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    orderId = body.data.id;
    // Calculation: (30,000 * 2) + (7,000 * 1) = 67,000
    expect(body.data.totalPrice).toBe(67000);
    expect(body.data.status).toBe("pending");
    expect(body.data.items.length).toBe(2);

    rawonItemId = body.data.items.find(
      (i: { menuId: string }) => i.menuId === rawonMenuId,
    ).id;

    // Check that table is now marked occupied
    const tableRes = await app.handle(
      new Request(`http://localhost/api/tables/${tableId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const tableBody = await tableRes.json();
    expect(tableBody.data.status).toBe("occupied");
  });

  it("7. Customer processes payment via QRIS", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentMethod: "qris",
          amount: 67000,
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.paymentStatus).toBe("paid");
    expect(body.data.amount).toBe(67000);

    // Order status should automatically update to confirmed
    const orderRes = await app.handle(
      new Request(`http://localhost/api/orders/${orderId}`),
    );
    const orderBody = await orderRes.json();
    expect(orderBody.data.status).toBe("confirmed");
  });

  it("8. Tenant updates item status (cooking -> ready)", async () => {
    const resCooking = await app.handle(
      new Request(`http://localhost/api/orders/items/${rawonItemId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({
          itemStatus: "cooking",
        }),
      }),
    );
    expect(resCooking.status).toBe(200);

    const resReady = await app.handle(
      new Request(`http://localhost/api/orders/items/${rawonItemId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({
          itemStatus: "ready",
        }),
      }),
    );
    expect(resReady.status).toBe(200);
  });

  it("9. Admin completes order and frees table", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: "completed",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("completed");

    // Table should now be available again
    const tableRes = await app.handle(
      new Request(`http://localhost/api/tables/${tableId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const tableBody = await tableRes.json();
    expect(tableBody.data.status).toBe("available");
  });
});
