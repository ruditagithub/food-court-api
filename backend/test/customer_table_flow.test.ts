import { describe, expect, it } from "bun:test";
import { app } from "../index";

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
    const tableNumber = `T-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
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
          stallNumber: `S-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
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

  it("4b. Customer scans QR token and resolves table, public stalls, and stall menus", async () => {
    const scanRes = await app.handle(
      new Request(`http://localhost/api/tables/scan/${qrToken}`),
    );
    expect(scanRes.status).toBe(200);
    const scanBody = await scanRes.json();
    expect(scanBody.data.id).toBe(tableId);
    const foodCourtId = scanBody.data.foodCourtId;
    expect(foodCourtId).toBeDefined();

    // Verify singular /api/food-court/:id/tenant/public route
    const singularStallsRes = await app.handle(
      new Request(`http://localhost/api/food-court/${foodCourtId}/tenant/public`),
    );
    expect(singularStallsRes.status).toBe(200);
    const singularStallsBody = await singularStallsRes.json();
    expect(Array.isArray(singularStallsBody.data)).toBe(true);

    // Verify plural /api/food-courts/:id/tenant/public route
    const pluralStallsRes = await app.handle(
      new Request(`http://localhost/api/food-courts/${foodCourtId}/tenant/public`),
    );
    expect(pluralStallsRes.status).toBe(200);

    // Verify tenant menus route returns both categorized and uncategorized menus
    const menusRes = await app.handle(
      new Request(`http://localhost/api/menus/tenant/${tenantId}`),
    );
    expect(menusRes.status).toBe(200);
    const menusBody = await menusRes.json();
    expect(menusBody.data.length).toBe(2);
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
    expect(body.data.subtotal).toBe(75000);
    expect(body.data.serviceFee).toBe(2250);
    expect(body.data.taxAmount).toBe(7500);
    expect(body.data.totalAmount).toBe(84750);
    expect(body.data.totalPrice).toBe(84750);
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
      new Request(`http://localhost/api/tables/${tableId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
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

  it("6b. Second customer at the same active table places an order with order-level notes and preserves their own customerName", async () => {
    const secondOrderRes = await app.handle(
      new Request("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          customerName: "Sinta Maharani",
          notes: "Tolong sendok ekstra",
          items: [
            {
              menuId: tehMenuId,
              quantity: 1,
              notes: "Es sedikit",
            },
          ],
        }),
      }),
    );
    expect(secondOrderRes.status).toBe(201);
    const secondOrderBody = await secondOrderRes.json();
    expect(secondOrderBody.data.customerName).toBe("Sinta Maharani");

    const secondTrackRes = await app.handle(
      new Request(`http://localhost/api/orders/track/${secondOrderBody.data.orderNumber}`),
    );
    expect(secondTrackRes.status).toBe(200);
    const secondTrackBody = await secondTrackRes.json();
    expect(secondTrackBody.data.customerName).toBe("Sinta Maharani");
    expect(secondTrackBody.data.stalls[0].items[0].notes).toBe(
      "Es sedikit",
    );

    // Complete second order's tenantOrder so test 10 can verify full session completion
    const secondTenantOrderId = secondOrderBody.data.tenantOrders[0].id;
    await app.handle(
      new Request(
        `http://localhost/api/orders/tenant-orders/${secondTenantOrderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tenantToken}`,
          },
          body: JSON.stringify({ status: "COMPLETED" }),
        },
      ),
    );
  });

  it("7. Public tracking: Customer tracks status via orderNumber", async () => {
    const trackRes = await app.handle(
      new Request(`http://localhost/api/orders/track/${orderNumber}`),
    );
    expect(trackRes.status).toBe(200);
    const trackBody = await trackRes.json();

    expect(trackBody.data.orderNumber).toBe(orderNumber);
    expect(trackBody.data.customerName).toBe("Rudi Hartono");
    expect(trackBody.data.foodCourtName).toBeDefined();
    expect(trackBody.data.orderStatus).toBe("DRAFT");
    expect(trackBody.data.paymentStatus).toBe("PENDING");
    expect(trackBody.data.subtotal).toBe(75000);
    expect(trackBody.data.serviceFee).toBe(2250);
    expect(trackBody.data.taxAmount).toBe(7500);
    expect(trackBody.data.totalAmount).toBe(84750);
    expect(trackBody.data.stalls.length).toBe(1);
    expect(trackBody.data.stalls[0].subtotal).toBe(75000);
    expect(trackBody.data.stalls[0].items.length).toBe(2);
    expect(trackBody.data.stalls[0].items[0].unitPrice).toBeDefined();
    expect(trackBody.data.stalls[0].items[0].subtotal).toBeDefined();
  });

  it("8. Payment: Customer pays order via QRIS", async () => {
    const payRes = await app.handle(
      new Request("http://localhost/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentMethod: "QRIS",
          amount: 84750,
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

    // Verify KDS endpoint (GET /api/orders as tenant) includes customerName
    const kdsRes = await app.handle(
      new Request("http://localhost/api/orders", {
        headers: { Authorization: `Bearer ${tenantToken}` },
      }),
    );
    expect(kdsRes.status).toBe(200);
    const kdsBody = await kdsRes.json();
    const rudiTicket = kdsBody.data.find((t: any) => t.id === tenantOrderId);
    expect(rudiTicket).toBeDefined();
    expect(rudiTicket.customerName).toBe("Rudi Hartono");
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
      new Request(`http://localhost/api/tables/${tableId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const tableBody = await tableRes.json();
    expect(tableBody.data.status).toBe("available");
  });

  it("11. Edge Cases: Rejects order exceeding stock or targeting a closed stall", async () => {
    // 1. Requesting 999 quantity when stock is ~98 -> 400 Insufficient stock
    const overStockRes = await app.handle(
      new Request("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          customerName: "Budi Overstock",
          items: [{ menuId: rawonMenuId, quantity: 999 }],
        }),
      }),
    );
    expect(overStockRes.status).toBe(400);
    const overStockBody = await overStockRes.json();
    expect(overStockBody.message).toContain("Insufficient stock");

    // 2. Tenant closes stall -> ordering fails with 400
    const closeStallRes = await app.handle(
      new Request(`http://localhost/api/tenants/${tenantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({ isOpen: false }),
      }),
    );
    expect(closeStallRes.status).toBe(200);

    const closedStallRes = await app.handle(
      new Request("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          customerName: "Budi Closed",
          items: [{ menuId: rawonMenuId, quantity: 1 }],
        }),
      }),
    );
    expect(closedStallRes.status).toBe(400);
    const closedStallBody = await closedStallRes.json();
    expect(closedStallBody.message).toContain("currently closed");
  });

  it("12. Split Bill Flow: Configure per-menu split bill, partial payment (PARTIALLY_PAID), and full payment", async () => {
    // 1. Re-open stall
    await app.handle(
      new Request(`http://localhost/api/tenants/${tenantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantToken}`,
        },
        body: JSON.stringify({ isOpen: true }),
      }),
    );

    // 2. Place order with 2x rawon (45k each) and 1x es teh (5k) -> total 95k
    const placeRes = await app.handle(
      new Request("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          customerName: "Nanda & Friends",
          items: [
            { menuId: rawonMenuId, quantity: 2, notes: "1 pedas, 1 tidak pedas" },
            { menuId: tehMenuId, quantity: 1, notes: "Es manis" },
          ],
        }),
      }),
    );
    expect(placeRes.status).toBe(201);
    const placeBody = await placeRes.json();
    const splitOrderId = placeBody.data.id;
    expect(placeBody.data.subtotal).toBe(75000);
    expect(placeBody.data.serviceFee).toBe(2250);
    expect(placeBody.data.taxAmount).toBe(7500);
    expect(placeBody.data.totalAmount).toBe(84750);

    const rawonItemId = placeBody.data.tenantOrders[0].items.find(
      (it: any) => it.menuId === rawonMenuId,
    ).id;
    const tehItemId = placeBody.data.tenantOrders[0].items.find(
      (it: any) => it.menuId === tehMenuId,
    ).id;

    // 3. Configure Split Bill:
    // Nanda: 1x Rawon (45k) + 1x Es Teh (5k) = 50k
    // Putra: 1x Rawon (45k) = 45k
    const splitRes = await app.handle(
      new Request(`http://localhost/api/orders/${splitOrderId}/split-bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: [
            {
              participantName: "Nanda",
              items: [
                { orderItemId: rawonItemId, quantity: 1 },
                { orderItemId: tehItemId, quantity: 1 },
              ],
            },
            {
              participantName: "Putra",
              items: [{ orderItemId: rawonItemId, quantity: 1 }],
            },
          ],
        }),
      }),
    );
    expect(splitRes.status).toBe(200);
    const splitBody = await splitRes.json();
    expect(splitBody.data.paymentGroups.length).toBe(2);

    const nandaGroup = splitBody.data.paymentGroups.find(
      (g: any) => g.participantName === "Nanda",
    );
    const putraGroup = splitBody.data.paymentGroups.find(
      (g: any) => g.participantName === "Putra",
    );
    expect(nandaGroup).toBeDefined();
    expect(putraGroup).toBeDefined();
    expect(nandaGroup.subtotal).toBe(40000);
    expect(nandaGroup.serviceFee).toBe(1200);
    expect(nandaGroup.taxAmount).toBe(4000);
    expect(nandaGroup.amountDue).toBe(45200);

    expect(putraGroup.subtotal).toBe(35000);
    expect(putraGroup.serviceFee).toBe(1050);
    expect(putraGroup.taxAmount).toBe(3500);
    expect(putraGroup.amountDue).toBe(39550);

    // 3b. Cashier looks up Nanda and Putra's bills by pass code (CSH-<orderNumber>-<participant>)
    const lookupNandaPass = await app.handle(
      new Request(`http://localhost/api/payments/cashier/lookup/CSH-${placeBody.data.orderNumber}-NANDA`),
    );
    expect(lookupNandaPass.status).toBe(200);
    const nandaPassBody = await lookupNandaPass.json();
    expect(nandaPassBody.data.paymentGroupId).toBe(nandaGroup.id);
    expect(nandaPassBody.data.participantName).toBe("Nanda");
    expect(nandaPassBody.data.amountDue).toBe(45200);

    const lookupPutraPass = await app.handle(
      new Request(`http://localhost/api/payments/cashier/lookup/CSH-${placeBody.data.orderNumber}-PUTRA`),
    );
    expect(lookupPutraPass.status).toBe(200);
    const putraPassBody = await lookupPutraPass.json();
    expect(putraPassBody.data.paymentGroupId).toBe(putraGroup.id);
    expect(putraPassBody.data.participantName).toBe("Putra");
    expect(putraPassBody.data.amountDue).toBe(39550);

    // 4. Pay Nanda's bill (50k) -> Order paymentStatus becomes PARTIALLY_PAID
    const payNandaRes = await app.handle(
      new Request("http://localhost/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: splitOrderId,
          paymentGroupId: nandaGroup.id,
          paymentMethod: "CASH",
          amount: 45200,
        }),
      }),
    );
    expect(payNandaRes.status).toBe(201);

    const trackPartialRes = await app.handle(
      new Request(`http://localhost/api/orders/track/${placeBody.data.orderNumber}`),
    );
    expect(trackPartialRes.status).toBe(200);
    const trackPartialBody = await trackPartialRes.json();
    expect(trackPartialBody.data.paymentStatus).toBe("PARTIALLY_PAID");
    expect(trackPartialBody.data.paymentGroups.find((g: any) => g.id === nandaGroup.id).status).toBe("PAID");
    expect(trackPartialBody.data.paymentGroups.find((g: any) => g.id === putraGroup.id).status).toBe("PENDING");

    // 4b. Verify that reconfiguring split bill after partial payment is rejected with 400
    const reconfigRes = await app.handle(
      new Request(`http://localhost/api/orders/${splitOrderId}/split-bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: [
            {
              participantName: "Nanda & Putra",
              items: [{ orderItemId: rawonItemId, quantity: 2 }],
            },
          ],
        }),
      }),
    );
    expect(reconfigRes.status).toBe(400);
    const reconfigBody = await reconfigRes.json();
    expect(reconfigBody.message).toContain("already");

    // 5. Pay Putra's bill (45k) -> Order paymentStatus becomes PAID & kitchen status QUEUED
    const payPutraRes = await app.handle(
      new Request("http://localhost/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: splitOrderId,
          paymentGroupId: putraGroup.id,
          paymentMethod: "CASH",
          amount: 39550,
        }),
      }),
    );
    expect(payPutraRes.status).toBe(201);

    const trackFullRes = await app.handle(
      new Request(`http://localhost/api/orders/track/${placeBody.data.orderNumber}`),
    );
    expect(trackFullRes.status).toBe(200);
    const trackFullBody = await trackFullRes.json();
    expect(trackFullBody.data.paymentStatus).toBe("PAID");
    expect(trackFullBody.data.orderStatus).toBe("CONFIRMED");
    expect(trackFullBody.data.stalls[0].status).toBe("QUEUED");

    // 5b. Verify that reconfiguring split bill after full payment is also rejected with 400
    const reconfigFullRes = await app.handle(
      new Request(`http://localhost/api/orders/${splitOrderId}/split-bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: [
            {
              participantName: "Nanda & Putra",
              items: [{ orderItemId: rawonItemId, quantity: 2 }],
            },
          ],
        }),
      }),
    );
    expect(reconfigFullRes.status).toBe(400);
    const reconfigFullBody = await reconfigFullRes.json();
    expect(reconfigFullBody.message).toContain("already");
  });

  it("13. Cashier POS: Cashier looks up bill, confirms payment with cash received and change", async () => {
    const cashierEmail = `kasir-${Date.now()}@foodcourt.com`;
    // Register or login a cashier user
    const cashierRes = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Kasir Food Court",
          email: cashierEmail,
          password: "password123",
          role: "cashier",
        }),
      }),
    );
    expect([200, 201]).toContain(cashierRes.status);

    const cashierLogin = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cashierEmail,
          password: "password123",
        }),
      }),
    );
    const cashierAuth = await cashierLogin.json();
    const cashierToken = cashierAuth.data?.token || cashierAuth.token;
    expect(cashierToken).toBeDefined();

    // Create a new order to test cashier flow
    const newOrdRes = await app.handle(
      new Request("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          customerName: "Budi Cashier Test",
          items: [{ menuId: rawonMenuId, quantity: 1 }],
        }),
      }),
    );
    expect(newOrdRes.status).toBe(201);
    const newOrdBody = await newOrdRes.json();
    const testOrderId = newOrdBody.data.id;
    const testOrderNumber = newOrdBody.data.orderNumber;
    // Subtotal 35.000, service 3% (1050), tax 10% (3500), total = 39.550
    expect(newOrdBody.data.totalAmount).toBe(39550);

    // Cashier checks pending bills with CSH- prefix filter
    const pendingRes = await app.handle(
      new Request(`http://localhost/api/payments/cashier/pending?q=CSH-${testOrderNumber}`, {
        headers: { Authorization: `Bearer ${cashierToken}` },
      }),
    );
    expect(pendingRes.status).toBe(200);
    const pendingBody = await pendingRes.json();
    expect(pendingBody.data.length).toBe(1);
    expect(pendingBody.data[0].orderNumber).toBe(testOrderNumber);

    // Cashier looks up bill by CSH- code
    const lookupRes = await app.handle(
      new Request(`http://localhost/api/payments/cashier/lookup/CSH-${testOrderNumber}`, {
        headers: { Authorization: `Bearer ${cashierToken}` },
      }),
    );
    expect(lookupRes.status).toBe(200);
    const lookupBody = await lookupRes.json();
    expect(lookupBody.data.amountDue).toBe(39550);
    expect(lookupBody.data.subtotal).toBe(35000);
    expect(lookupBody.data.serviceFee).toBe(1050);
    expect(lookupBody.data.taxAmount).toBe(3500);

    // Cashier confirms cash payment: Bill is 39.550, customer pays 50.000 -> change 10.450
    const confirmRes = await app.handle(
      new Request("http://localhost/api/payments/cashier/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cashierToken}`,
        },
        body: JSON.stringify({
          orderId: testOrderId,
          cashReceived: 50000,
        }),
      }),
    );
    expect(confirmRes.status).toBe(200);
    const confirmBody = await confirmRes.json();
    expect(confirmBody.data.amountDue).toBe(39550);
    expect(confirmBody.data.cashReceived).toBe(50000);
    expect(confirmBody.data.cashChange).toBe(10450);
    expect(confirmBody.data.subtotal).toBe(35000);
    expect(confirmBody.data.serviceFee).toBe(1050);
    expect(confirmBody.data.taxAmount).toBe(3500);
    expect(confirmBody.data.items.length).toBe(1);
    expect(confirmBody.data.paymentReference).toBeDefined();

    // Cashier looks up completed receipt by payment reference (reprint flow)
    const reprintRes = await app.handle(
      new Request(`http://localhost/api/payments/cashier/lookup/${confirmBody.data.paymentReference}`, {
        headers: { Authorization: `Bearer ${cashierToken}` },
      }),
    );
    expect(reprintRes.status).toBe(200);
    const reprintBody = await reprintRes.json();
    expect(reprintBody.data.amountDue).toBe(39550);
    expect(reprintBody.data.items.length).toBe(1);

    // Cashier views history
    const historyRes = await app.handle(
      new Request("http://localhost/api/payments/cashier/history", {
        headers: { Authorization: `Bearer ${cashierToken}` },
      }),
    );
    expect(historyRes.status).toBe(200);
    const historyBody = await historyRes.json();
    expect(historyBody.data.summary.totalCashToday).toBeGreaterThan(0);
  });
});
