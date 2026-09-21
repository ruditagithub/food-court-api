import { describe, expect, it } from "bun:test";
import { app } from "../src";

describe("Customer & Table Ordering Flow (Alur 1 E2E)", () => {
  let adminToken = "";
  let tenantToken = "";
  let tableId = "";
  let qrToken = "";
  let tenantId = "";
  let rawonMenuId = "";
  let sambalOptionId = "";
  let tehMenuId = "";
  let orderId = "";
  let orderNumber = "";
  let tenantOrderId = "";

  const timestamp = Date.now();

  it("1. Setup: Admin registers and logs in", async () => {
    const email = `admin_flow_${timestamp}@foodcourt.com`;
    const regRes = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Supervisor Dewi",
          email,
          password: "password123",
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
          email,
          password: "password123",
        }),
      }),
    );
    expect(loginRes.status).toBe(200);
    const body = await loginRes.json();
    adminToken = body.data.token;
    expect(adminToken).toBeDefined();
  });

  it("2. Setup: Admin creates a table with auto-generated qrToken", async () => {
    const tableNumber = `T-${timestamp.toString().slice(-4)}`;
    const res = await app.handle(
      new Request("http://localhost/api/tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          tableNumber,
          capacity: 4,
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    tableId = body.data.id;
    qrToken = body.data.qrToken;
    expect(tableId).toBeDefined();
    expect(qrToken).toBeDefined();
    expect(body.data.status).toBe("available");
  });

  it("3. Setup: Tenant registers and creates food stall", async () => {
    const email = `tenant_flow_${timestamp}@foodcourt.com`;
    await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Bu Siti Soto & Rawon",
          email,
          password: "password123",
          role: "tenant",
        }),
      }),
    );

    const loginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: "password123",
        }),
      }),
    );
    const loginBody = await loginRes.json();
    tenantToken = loginBody.data.token;

    const stallRes = await app.handle(
      new Request("http://localhost/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({
          name: "Warung Rawon Bu Siti",
          stallNumber: `S-${timestamp.toString().slice(-3)}`,
          description: "Rawon khas Surabaya rempah hitam gurih",
          isOpen: true,
        }),
      }),
    );
    expect(stallRes.status).toBe(201);
    const stallBody = await stallRes.json();
    tenantId = stallBody.data.id;
    expect(tenantId).toBeDefined();
  });

  it("4. Setup: Tenant adds category, menu, and options", async () => {
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
          name: "Spesial Rawon",
        }),
      }),
    );
    expect(catRes.status).toBe(201);
    const catBody = await catRes.json();
    const categoryId = catBody.data.id;

    // Add Menu 1: Rawon (Rp 35.000)
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
          name: "Rawon Komplit Daging",
          price: 35000,
          description: "Rawon komplit empal sapi lembut",
          isAvailable: true,
        }),
      }),
    );
    expect(rawonRes.status).toBe(201);
    const rawonBody = await rawonRes.json();
    rawonMenuId = rawonBody.data.id;

    // Add Menu 2: Es Teh Manis (Rp 5.000)
    const tehRes = await app.handle(
      new Request("http://localhost/api/menus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({
          tenantId,
          name: "Es Teh Manis Segar",
          price: 5000,
          isAvailable: true,
        }),
      }),
    );
    expect(tehRes.status).toBe(201);
    const tehBody = await tehRes.json();
    tehMenuId = tehBody.data.id;
  });

  it("5. Customer places order via tableId (multi-item with snapshots)", async () => {
    const orderPayload = {
      tableId,
      customerName: "Rudi Hartono",
      items: [
        {
          menuId: rawonMenuId,
          quantity: 2,
          notes: "Kuah dipisah",
        },
        {
          menuId: tehMenuId,
          quantity: 1,
          notes: "Manis sedang",
        },
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
    expect(body.data.id).toBeDefined();
    orderId = body.data.id;
    orderNumber = body.data.orderNumber;
    expect(orderNumber).toMatch(/^FC-/);

    // Total: (35.000 * 2) + (5.000 * 1) = 75.000
    expect(body.data.totalPrice).toBe(75000);
    expect(body.data.orderStatus).toBe("DRAFT");
    expect(body.data.paymentStatus).toBe("PENDING");

    // Check tenant sub-orders partitioned
    expect(body.data.tenantOrders.length).toBe(1);
    tenantOrderId = body.data.tenantOrders[0].id;
    expect(body.data.tenantOrders[0].status).toBe("WAITING_PAYMENT");

    // Check kitchen queue initial state
    expect(body.data.tenantOrders[0].kitchenQueue).toBeDefined();
    expect(body.data.tenantOrders[0].kitchenQueue.status).toBe("QUEUED");

    // Check item snapshot
    const rawonItem = body.data.tenantOrders[0].items.find(
      (i: { menuId: string }) => i.menuId === rawonMenuId,
    );
    expect(rawonItem.menuNameSnapshot).toBe("Rawon Komplit Daging");
    expect(rawonItem.unitPriceSnapshot).toBe(35000);

    // Check table status is now occupied
    const tableRes = await app.handle(
      new Request(`http://localhost/api/tables/${tableId}`),
    );
    const tableBody = await tableRes.json();
    expect(tableBody.data.status).toBe("occupied");
  });

  it("6. Another customer joins the same table dining session via qrToken", async () => {
    const joinRes = await app.handle(
      new Request("http://localhost/api/orders/sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken,
          name: "Sinta Maharani",
        }),
      }),
    );

    expect(joinRes.status).toBe(200);
    const joinBody = await joinRes.json();
    expect(joinBody.data.sessionId).toBeDefined();
    expect(joinBody.data.sessionCode).toBeDefined();
  });

  it("7. Public tracking: Customer tracks status via orderNumber", async () => {
    const trackRes = await app.handle(
      new Request(`http://localhost/api/orders/track/${orderNumber}`),
    );
    expect(trackRes.status).toBe(200);
    const trackBody = await trackRes.json();

    expect(trackBody.data.orderNumber).toBe(orderNumber);
    expect(trackBody.data.orderStatus).toBe("DRAFT");
    expect(trackBody.data.paymentStatus).toBe("PENDING");
    expect(trackBody.data.totalAmount).toBe(75000);
    expect(trackBody.data.stalls.length).toBe(1);
    expect(trackBody.data.stalls[0].items.length).toBe(2);
  });

  it("8. Payment: Customer pays order via QRIS", async () => {
    const payRes = await app.handle(
      new Request("http://localhost/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentMethod: "QRIS",
          amount: 75000,
        }),
      }),
    );

    expect(payRes.status).toBe(201);
    const payBody = await payRes.json();
    expect(payBody.data.paymentStatus).toBe("paid");

    // Check that order status moved to CONFIRMED and tenant order moved to QUEUED
    const orderRes = await app.handle(
      new Request(`http://localhost/api/orders/${orderId}`),
    );
    const orderBody = await orderRes.json();
    expect(orderBody.data.orderStatus).toBe("CONFIRMED");
    expect(orderBody.data.paymentStatus).toBe("PAID");
    expect(orderBody.data.tenantOrders[0].status).toBe("QUEUED");
  });

  it("9. Kitchen: Tenant updates cooking progress (QUEUED -> PREPARING -> READY)", async () => {
    // Tenant starts cooking
    const cookRes = await app.handle(
      new Request(
        `http://localhost/api/orders/tenant-orders/${tenantOrderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tenantToken}`,
          },
          body: JSON.stringify({
            status: "PREPARING",
          }),
        },
      ),
    );
    expect(cookRes.status).toBe(200);

    // Tenant finishes cooking (READY)
    const readyRes = await app.handle(
      new Request(
        `http://localhost/api/orders/tenant-orders/${tenantOrderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tenantToken}`,
          },
          body: JSON.stringify({
            status: "READY",
          }),
        },
      ),
    );
    expect(readyRes.status).toBe(200);
  });

  it("10. Completion by Tenant: Tenant marks sub-order COMPLETED, frees table automatically", async () => {
    const compRes = await app.handle(
      new Request(
        `http://localhost/api/orders/tenant-orders/${tenantOrderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tenantToken}`,
          },
          body: JSON.stringify({
            status: "COMPLETED",
          }),
        },
      ),
    );
    expect(compRes.status).toBe(200);
    const compBody = await compRes.json();
    expect(compBody.data.orderStatus).toBe("COMPLETED");

    // Verify table is released and available again
    const tableRes = await app.handle(
      new Request(`http://localhost/api/tables/${tableId}`),
    );
    const tableBody = await tableRes.json();
    expect(tableBody.data.status).toBe("available");
  });
});
