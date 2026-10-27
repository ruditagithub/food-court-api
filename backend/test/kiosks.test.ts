import { describe, expect, it } from "bun:test";
import { app } from "../index";

describe("Kiosks Module Integration Tests", () => {
  const timestamp = Date.now();
  let adminToken = "";
  let managerAToken = "";
  let managerBToken = "";
  let customerToken = "";
  let foodCourtAId = "";
  let foodCourtBId = "";
  let kioskAId = "";
  const deviceCodeA = `DEV-KSK-TEST-${timestamp}-A`;
  const deviceCodeB = `DEV-KSK-TEST-${timestamp}-B`;

  let tenantToken = "";
  let tenantAId = "";
  let menuAId = "";

  const adminUser = {
    name: "Super Admin",
    email: `kiosk_admin_${timestamp}@foodcourt.com`,
    password: "password123",
    role: "admin",
  };

  const managerA = {
    name: "Manager Sentra A",
    email: `kiosk_mgr_a_${timestamp}@foodcourt.com`,
    password: "password123",
    role: "admin-food-court",
  };

  const managerB = {
    name: "Manager Sentra B",
    email: `kiosk_mgr_b_${timestamp}@foodcourt.com`,
    password: "password123",
    role: "admin-food-court",
  };

  const tenantUser = {
    name: "Pak Slamet Kiosk Tenant",
    email: `kiosk_tenant_${timestamp}@foodcourt.com`,
    password: "password123",
    role: "tenant",
  };

  const customerUser = {
    name: "Customer Maya",
    email: `kiosk_cust_${timestamp}@foodcourt.com`,
    password: "password123",
    role: "customer",
  };

  it("should setup users, food courts, and a menu item", async () => {
    // 1. Register & Login
    for (const [userObj, setter] of [
      [adminUser, (t: string) => (adminToken = t)],
      [managerA, (t: string) => (managerAToken = t)],
      [managerB, (t: string) => (managerBToken = t)],
      [tenantUser, (t: string) => (tenantToken = t)],
      [customerUser, (t: string) => (customerToken = t)],
    ] as const) {
      const reg = await app.handle(
        new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userObj),
        })
      );
      expect([200, 201]).toContain(reg.status);

      const login = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userObj.email, password: userObj.password }),
        })
      );
      expect(login.status).toBe(200);
      const data = await login.json();
      setter(data.data.token);
    }

    // 2. Manager A creates Food Court A
    const fcARes = await app.handle(
      new Request("http://localhost/api/food-courts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({
          name: `Food Court Kiosk Alpha ${timestamp}`,
          address: "Jl. Pemuda No. 1",
        }),
      })
    );
    expect(fcARes.status).toBe(201);
    const fcAData = await fcARes.json();
    foodCourtAId = fcAData.data.id;

    // 3. Manager B creates Food Court B
    const fcBRes = await app.handle(
      new Request("http://localhost/api/food-courts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerBToken}`,
        },
        body: JSON.stringify({
          name: `Food Court Kiosk Beta ${timestamp}`,
          address: "Jl. Basuki Rahmat No. 2",
        }),
      })
    );
    expect(fcBRes.status).toBe(201);
    const fcBData = await fcBRes.json();
    foodCourtBId = fcBData.data.id;

    // 4. Tenant registers stall in Food Court A
    const stallRes = await app.handle(
      new Request("http://localhost/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({
          foodCourtId: foodCourtAId,
          name: "Stan Soto Ayam Alpha",
          stallNumber: `STA-${timestamp.toString().slice(-4)}`,
          isOpen: true,
        }),
      })
    );
    expect(stallRes.status).toBe(201);
    const stallBody = await stallRes.json();
    tenantAId = stallBody.data.id;

    // 5. Tenant creates Menu Item
    const menuRes = await app.handle(
      new Request("http://localhost/api/menus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({
          tenantId: tenantAId,
          name: "Soto Lamongan Mantap",
          price: 25000,
          stock: 50,
          isAvailable: true,
        }),
      })
    );
    expect(menuRes.status).toBe(201);
    const menuBody = await menuRes.json();
    menuAId = menuBody.data.id;
  });

  it("should create a new Kiosk terminal for Food Court A", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/kiosks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({
          kioskName: "Kiosk Lobby Utama",
          deviceCode: deviceCodeA,
          location: "Pintu Masuk Barat Lobby",
          foodCourtId: foodCourtAId,
        }),
      })
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.deviceCode).toBe(deviceCodeA);
    expect(json.data.kioskName).toBe("Kiosk Lobby Utama");
    expect(json.data.status).toBe("ACTIVE");
    kioskAId = json.data.id;
  });

  it("should reject duplicate deviceCode with ConflictError (409)", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/kiosks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({
          kioskName: "Kiosk Duplikat",
          deviceCode: deviceCodeA, // Same code
          location: "Pintu Timur",
          foodCourtId: foodCourtAId,
        }),
      })
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("ConflictError");
  });

  it("should publicly resolve kiosk by deviceCode with food court details", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/kiosks/resolve/${deviceCodeA}`)
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.kiosk.deviceCode).toBe(deviceCodeA);
    expect(json.data.kiosk.kioskName).toBe("Kiosk Lobby Utama");
    expect(json.data.foodCourt.id).toBe(foodCourtAId);
    expect(Array.isArray(json.data.tenants)).toBe(true);
    expect(Array.isArray(json.data.menus)).toBe(true);
  });

  it("should enforce authorization: customer cannot manage kiosks", async () => {
    const listRes = await app.handle(
      new Request("http://localhost/api/kiosks", {
        headers: { Authorization: `Bearer ${customerToken}` },
      })
    );
    expect(listRes.status).toBe(403);

    const createRes = await app.handle(
      new Request("http://localhost/api/kiosks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          kioskName: "Kiosk Ilegal",
          deviceCode: `DEV-ILLEGAL-${timestamp}`,
        }),
      })
    );
    expect(createRes.status).toBe(403);
  });

  it("should isolate food courts: Manager B cannot access or update Manager A's kiosk", async () => {
    const getRes = await app.handle(
      new Request(`http://localhost/api/kiosks/${kioskAId}`, {
        headers: { Authorization: `Bearer ${managerBToken}` },
      })
    );
    expect(getRes.status).toBe(403);

    const updateRes = await app.handle(
      new Request(`http://localhost/api/kiosks/${kioskAId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerBToken}`,
        },
        body: JSON.stringify({
          kioskName: "Kiosk Hack",
        }),
      })
    );
    expect(updateRes.status).toBe(403);
  });

  it("should allow Manager A to update kiosk details and toggle status to INACTIVE", async () => {
    const updateRes = await app.handle(
      new Request(`http://localhost/api/kiosks/${kioskAId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({
          kioskName: "Kiosk Lobby Utama (Renovasi)",
          status: "INACTIVE",
          location: "Area Belakang",
        }),
      })
    );

    expect(updateRes.status).toBe(200);
    const json = await updateRes.json();
    expect(json.data.kioskName).toBe("Kiosk Lobby Utama (Renovasi)");
    expect(json.data.status).toBe("INACTIVE");
    expect(json.data.location).toBe("Area Belakang");
  });

  it("should list kiosks filtered by managed food court", async () => {
    const listRes = await app.handle(
      new Request("http://localhost/api/kiosks", {
        headers: { Authorization: `Bearer ${managerAToken}` },
      })
    );

    expect(listRes.status).toBe(200);
    const json = await listRes.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.some((k: any) => k.id === kioskAId)).toBe(true);

    // Manager B's list should NOT contain kiosk A
    const listBRes = await app.handle(
      new Request("http://localhost/api/kiosks", {
        headers: { Authorization: `Bearer ${managerBToken}` },
      })
    );
    expect(listBRes.status).toBe(200);
    const jsonB = await listBRes.json();
    expect(jsonB.data.some((k: any) => k.id === kioskAId)).toBe(false);
  });

  it("should reject order placement on INACTIVE kiosk with BadRequestError (400)", async () => {
    const orderRes = await app.handle(
      new Request("http://localhost/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          orderType: "TAKEAWAY",
          kioskId: kioskAId,
          customerName: "Pelanggan Kiosk",
          items: [{ menuId: menuAId, quantity: 1 }],
        }),
      })
    );

    expect(orderRes.status).toBe(400);
    const json = await orderRes.json();
    expect(json.success).toBe(false);
    expect(json.message).toContain("sedang tidak aktif");
  });

  it("should reactivate kiosk and allow placing a takeaway order linked to kiosk", async () => {
    // 1. Reactivate kiosk
    const updateRes = await app.handle(
      new Request(`http://localhost/api/kiosks/${kioskAId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({
          status: "ACTIVE",
        }),
      })
    );
    expect(updateRes.status).toBe(200);

    // 2. Place order via Kiosk
    const orderRes = await app.handle(
      new Request("http://localhost/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          orderType: "TAKEAWAY",
          kioskId: kioskAId,
          customerName: "Pelanggan Kiosk Maya",
          items: [{ menuId: menuAId, quantity: 2 }],
        }),
      })
    );

    expect(orderRes.status).toBe(201);
    const orderJson = await orderRes.json();
    const order = orderJson.data;
    expect(order.orderNumber).toBeDefined();

    // Verify session linkage
    const getOrderRes = await app.handle(
      new Request(`http://localhost/api/orders/${order.id}`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      })
    );
    expect(getOrderRes.status).toBe(200);
    const getOrderJson = await getOrderRes.json();
    expect(getOrderJson.data.session.kioskId).toBe(kioskAId);
    expect(getOrderJson.data.session.orderType).toBe("TAKEAWAY");
    expect(getOrderJson.data.session.foodCourtId).toBe(foodCourtAId);

    // 3. Test cashier lookup with CSH-TK- code
    const cleanNumber = order.orderNumber.replace(/[^A-Za-z0-9]/g, "");
    const cashSlipCode = `CSH-TK-${cleanNumber}`;
    const lookupRes = await app.handle(
      new Request(`http://localhost/api/payments/cashier/lookup/${cashSlipCode}`)
    );
    expect(lookupRes.status).toBe(200);
    const lookupJson = await lookupRes.json();
    expect(lookupJson.data.orderNumber).toBe(order.orderNumber);

    // 4. Pay via Cashier confirm
    const payRes = await app.handle(
      new Request("http://localhost/api/payments/cashier/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          cashReceived: order.totalAmount,
        }),
      })
    );
    expect(payRes.status).toBe(200);
  });

  it("should get kiosk stats reflecting real placed orders and revenue", async () => {
    const statsRes = await app.handle(
      new Request(`http://localhost/api/kiosks/${kioskAId}/stats`, {
        headers: { Authorization: `Bearer ${managerAToken}` },
      })
    );

    expect(statsRes.status).toBe(200);
    const json = await statsRes.json();
    expect(json.data.kioskId).toBe(kioskAId);
    expect(json.data.totalSessions).toBeGreaterThanOrEqual(1);
    expect(json.data.totalOrders).toBeGreaterThanOrEqual(1);
    expect(json.data.totalRevenue).toBeGreaterThan(0);
  });

  it("should allow deleting a kiosk", async () => {
    const delRes = await app.handle(
      new Request(`http://localhost/api/kiosks/${kioskAId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${managerAToken}` },
      })
    );

    expect(delRes.status).toBe(200);
    const json = await delRes.json();
    expect(json.success).toBe(true);

    // Verify it is gone
    const getRes = await app.handle(
      new Request(`http://localhost/api/kiosks/${kioskAId}`, {
        headers: { Authorization: `Bearer ${managerAToken}` },
      })
    );
    expect(getRes.status).toBe(404);
  });
});
