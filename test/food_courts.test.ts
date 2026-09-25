import { describe, expect, it } from "bun:test";
import { app } from "../src";

describe("Food Courts Module", () => {
  const timestamp = Date.now();
  let adminToken = "";
  let managerAToken = "";
  let managerBToken = "";
  let customerToken = "";
  let createdFoodCourtId = "";

  const adminUser = {
    name: "Platform Admin",
    email: `admin_${timestamp}@foodcourt.com`,
    password: "password123",
    role: "admin",
  };

  const managerA = {
    name: "Manager Plaza A",
    email: `managerA_${timestamp}@foodcourt.com`,
    password: "password123",
    role: "admin-food-court",
  };

  const managerB = {
    name: "Manager Mall B",
    email: `managerB_${timestamp}@foodcourt.com`,
    password: "password123",
    role: "admin-food-court",
  };

  const customerUser = {
    name: "Customer Budi",
    email: `customer_${timestamp}@foodcourt.com`,
    password: "password123",
    role: "customer",
  };

  it("should register and login users with various roles", async () => {
    for (const u of [adminUser, managerA, managerB, customerUser]) {
      const regRes = await app.handle(
        new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(u),
        }),
      );
      expect(regRes.status).toBe(201);

      const loginRes = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: u.email, password: u.password }),
        }),
      );
      expect(loginRes.status).toBe(200);
      const data = await loginRes.json();

      if (u.role === "admin") adminToken = data.data.token;
      if (u.name === managerA.name) managerAToken = data.data.token;
      if (u.name === managerB.name) managerBToken = data.data.token;
      if (u.role === "customer") customerToken = data.data.token;
    }

    expect(adminToken).toBeDefined();
    expect(managerAToken).toBeDefined();
    expect(managerBToken).toBeDefined();
    expect(customerToken).toBeDefined();
  });

  it("should reject customer from creating food court", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/food-courts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ name: "Unauthorized FC" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should reject customer from listing food courts", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/food-courts", {
        headers: {
          Authorization: `Bearer ${customerToken}`,
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should allow admin-food-court to register a food court", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/food-courts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({
          name: `Food Court A ${timestamp}`,
          address: "Jl. Merdeka No. 1",
          phone: "081234567890",
        }),
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe(`Food Court A ${timestamp}`);
    expect(json.data.manager.email).toBe(managerA.email.toLowerCase());
    createdFoodCourtId = json.data.id;
  });

  it("should prevent duplicate food court slug", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/food-courts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({
          name: `Food Court A ${timestamp}`,
        }),
      }),
    );

    expect(res.status).toBe(409);
  });

  it("should filter food courts list for manager to only their own", async () => {
    const resA = await app.handle(
      new Request("http://localhost/api/food-courts", {
        headers: {
          Authorization: `Bearer ${managerAToken}`,
        },
      }),
    );

    expect(resA.status).toBe(200);
    const jsonA = await resA.json();
    const hasFCA = jsonA.data.some(
      (fc: { id: string }) => fc.id === createdFoodCourtId,
    );
    expect(hasFCA).toBe(true);

    const resB = await app.handle(
      new Request("http://localhost/api/food-courts", {
        headers: {
          Authorization: `Bearer ${managerBToken}`,
        },
      }),
    );

    expect(resB.status).toBe(200);
    const jsonB = await resB.json();
    const hasInB = jsonB.data.some(
      (fc: { id: string }) => fc.id === createdFoodCourtId,
    );
    expect(hasInB).toBe(false);
  });

  it("should allow admin to see all food courts", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/food-courts", {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    const found = json.data.some(
      (fc: { id: string }) => fc.id === createdFoodCourtId,
    );
    expect(found).toBe(true);
  });

  it("should allow owning manager to get food court detail by id", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/food-courts/${createdFoodCourtId}`, {
        headers: {
          Authorization: `Bearer ${managerAToken}`,
        },
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(createdFoodCourtId);
  });

  it("should reject other manager from getting detail of foreign food court", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/food-courts/${createdFoodCourtId}`, {
        headers: {
          Authorization: `Bearer ${managerBToken}`,
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should allow admin to get food court detail by id", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/food-courts/${createdFoodCourtId}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(createdFoodCourtId);
    expect(json.data.manager).toBeDefined();
    expect(json.data.tenants).toBeDefined();
    expect(json.data.tables).toBeDefined();
  });

  it("should reject other manager from updating food court", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/food-courts/${createdFoodCourtId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerBToken}`,
        },
        body: JSON.stringify({ name: "Hacked Name" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should allow owning manager to update food court", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/food-courts/${createdFoodCourtId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({ address: "Jl. Baru No. 99" }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.address).toBe("Jl. Baru No. 99");
  });

  it("should reject manager from deleting food court (admin only)", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/food-courts/${createdFoodCourtId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${managerAToken}`,
        },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("should allow admin to delete food court", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/food-courts/${createdFoodCourtId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );

    expect(res.status).toBe(200);
  });

  it("should automatically generate clean slug from name with spaces and special characters", async () => {
    const specialName = `Food Court @Mega Mall & Cafe (Lantai #1)! ${Date.now()}`;
    const res = await app.handle(
      new Request("http://localhost/api/food-courts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerBToken}`,
        },
        body: JSON.stringify({
          name: specialName,
        }),
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    // Huruf kecil, spasi jadi -, karakter @, &, (, ), #, ! dibersihkan
    expect(json.data.slug).toMatch(/^food-court-mega-mall-cafe-lantai-1-\d+$/);

    // Cleanup
    await app.handle(
      new Request(`http://localhost/api/food-courts/${json.data.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
  });

  it("should isolate GET /api/tenants to only tenants in food courts managed by the caller", async () => {
    // 1. Manager A creates food court A
    const fcARes = await app.handle(
      new Request("http://localhost/api/food-courts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({ name: `FC Alpha ${Date.now()}` }),
      }),
    );
    const fcA = await fcARes.json();

    // 2. Manager B creates food court B
    const fcBRes = await app.handle(
      new Request("http://localhost/api/food-courts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerBToken}`,
        },
        body: JSON.stringify({ name: `FC Beta ${Date.now()}` }),
      }),
    );
    const fcB = await fcBRes.json();

    // 3. Manager A adds Tenant A1
    const tA1Res = await app.handle(
      new Request("http://localhost/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({
          foodCourtId: fcA.data.id,
          name: "Tenant Alpha 1",
          stallNumber: "A-01",
        }),
      }),
    );
    expect(tA1Res.status).toBe(201);
    const tA1 = await tA1Res.json();

    // 4. Manager B adds Tenant B1
    const tB1Res = await app.handle(
      new Request("http://localhost/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerBToken}`,
        },
        body: JSON.stringify({
          foodCourtId: fcB.data.id,
          name: "Tenant Beta 1",
          stallNumber: "B-01",
        }),
      }),
    );
    expect(tB1Res.status).toBe(201);
    const tB1 = await tB1Res.json();

    // 5. Manager A queries GET /api/tenants
    const listARes = await app.handle(
      new Request("http://localhost/api/tenants", {
        headers: {
          Authorization: `Bearer ${managerAToken}`,
        },
      }),
    );
    expect(listARes.status).toBe(200);
    const listA = await listARes.json();
    const idsInA = listA.data.map((t: { id: string }) => t.id);
    expect(idsInA).toContain(tA1.data.id);
    expect(idsInA).not.toContain(tB1.data.id);

    // 6. Manager B queries GET /api/tenants
    const listBRes = await app.handle(
      new Request("http://localhost/api/tenants", {
        headers: {
          Authorization: `Bearer ${managerBToken}`,
        },
      }),
    );
    expect(listBRes.status).toBe(200);
    const listB = await listBRes.json();
    const idsInB = listB.data.map((t: { id: string }) => t.id);
    expect(idsInB).toContain(tB1.data.id);
    expect(idsInB).not.toContain(tA1.data.id);

    // 7. Customer calling GET /api/tenants -> 403 Forbidden
    const listCustomerRes = await app.handle(
      new Request("http://localhost/api/tenants", {
        headers: { Authorization: `Bearer ${customerToken}` },
      }),
    );
    expect(listCustomerRes.status).toBe(403);

    // Cleanup
    await app.handle(
      new Request(`http://localhost/api/food-courts/${fcA.data.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    await app.handle(
      new Request(`http://localhost/api/food-courts/${fcB.data.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
  });

  it("should generate unique slug and enforce stallNumber uniqueness for active tenants", async () => {
    // 1. Create a food court
    const fcRes = await app.handle(
      new Request("http://localhost/api/food-courts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({ name: `FC Stall Test ${Date.now()}` }),
      }),
    );
    const fc = await fcRes.json();

    // 2. Create first tenant (active, stallNumber: "STAN-01")
    const t1Res = await app.handle(
      new Request("http://localhost/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({
          foodCourtId: fc.data.id,
          name: "Warung Sederhana",
          stallNumber: "STAN-01",
          isOpen: true,
        }),
      }),
    );
    expect(t1Res.status).toBe(201);
    const t1 = await t1Res.json();
    expect(t1.data.slug).toBe("warung-sederhana");

    // 3. Create second tenant with identical name (should get unique slug: "warung-sederhana-1")
    // and different stallNumber: "STAN-02"
    const t2Res = await app.handle(
      new Request("http://localhost/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({
          foodCourtId: fc.data.id,
          name: "Warung Sederhana",
          stallNumber: "STAN-02",
          isOpen: true,
        }),
      }),
    );
    expect(t2Res.status).toBe(201);
    const t2 = await t2Res.json();
    expect(t2.data.slug).toBe("warung-sederhana-1");

    // 4. Try to create third active tenant with duplicate stallNumber: "STAN-01" -> 409 Conflict
    const tDuplicateStallRes = await app.handle(
      new Request("http://localhost/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({
          foodCourtId: fc.data.id,
          name: "Bakso Berkah",
          stallNumber: "STAN-01",
          isOpen: true,
        }),
      }),
    );
    expect(tDuplicateStallRes.status).toBe(409);
    const dupJson = await tDuplicateStallRes.json();
    expect(dupJson.error).toBe("ConflictError");

    // 5. Create fourth tenant with duplicate stallNumber but inactive (isOpen: false) -> 201 OK
    const tInactiveRes = await app.handle(
      new Request("http://localhost/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({
          foodCourtId: fc.data.id,
          name: "Bakso Berkah Tutup",
          stallNumber: "STAN-01",
          isOpen: false,
        }),
      }),
    );
    expect(tInactiveRes.status).toBe(201);

    // 6. Test menu creation with empty string categoryId (e.g. from Swagger) vs invalid categoryId
    // 6a. Empty string categoryId -> null, 201 OK
    const menuEmptyCatRes = await app.handle(
      new Request("http://localhost/api/menus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({
          tenantId: t1.data.id,
          categoryId: "",
          name: "Sate Ayam Madura",
          description: "Sate bumbu kacang",
          price: "25000",
          imageUrl: "/sate.jpg",
          isAvailable: true,
        }),
      }),
    );
    expect(menuEmptyCatRes.status).toBe(201);
    const menuEmptyCatJson = await menuEmptyCatRes.json();
    expect(menuEmptyCatJson.data.categoryId).toBeNull();
    expect(menuEmptyCatJson.data.price).toBe(25000);

    // 6b. Invalid non-existent categoryId -> 404 NotFoundError
    const menuInvalidCatRes = await app.handle(
      new Request("http://localhost/api/menus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerAToken}`,
        },
        body: JSON.stringify({
          tenantId: t1.data.id,
          categoryId: "test",
          name: "Sate Kambing",
          price: 30000,
        }),
      }),
    );
    expect(menuInvalidCatRes.status).toBe(404);
    const invalidCatJson = await menuInvalidCatRes.json();
    expect(invalidCatJson.error).toBe("NotFoundError");

    // 6c. Unknown tenant -> 404 NotFound
    const catUnknownRes = await app.handle(
      new Request("http://localhost/api/menus/categories/unknown-tenant-id", {
        headers: { Authorization: `Bearer ${managerAToken}` },
      }),
    );
    expect(catUnknownRes.status).toBe(404);

    // 6d. Foreign manager accessing tenant categories -> 403 Forbidden
    const catForeignManagerRes = await app.handle(
      new Request(`http://localhost/api/menus/categories/${t1.data.id}`, {
        headers: { Authorization: `Bearer ${managerBToken}` },
      }),
    );
    expect(catForeignManagerRes.status).toBe(403);

    // 6e. Owning manager accessing tenant categories -> 200 OK with isolated tenant categories
    const catOwnerRes = await app.handle(
      new Request(`http://localhost/api/menus/categories/${t1.data.id}`, {
        headers: { Authorization: `Bearer ${managerAToken}` },
      }),
    );
    expect(catOwnerRes.status).toBe(200);

    // 6f. Accessing tenant categories by slug -> 200 OK
    const catSlugRes = await app.handle(
      new Request(`http://localhost/api/menus/categories/${t1.data.slug}`, {
        headers: { Authorization: `Bearer ${managerAToken}` },
      }),
    );
    expect(catSlugRes.status).toBe(200);

    // 7. Test GET /api/menus isolation
    // 7a. Manager A calling GET /api/menus should see menus from their tenant (t1)
    const menusManagerARes = await app.handle(
      new Request("http://localhost/api/menus", {
        headers: { Authorization: `Bearer ${managerAToken}` },
      }),
    );
    expect(menusManagerARes.status).toBe(200);
    const menusManagerAJson = await menusManagerARes.json();
    const menuIdsA = menusManagerAJson.data.map((m: any) => m.id);
    expect(menuIdsA).toContain(menuEmptyCatJson.data.id);

    // 7b. Foreign Manager B calling GET /api/menus should NOT see Manager A's tenant menus
    const menusManagerBRes = await app.handle(
      new Request("http://localhost/api/menus", {
        headers: { Authorization: `Bearer ${managerBToken}` },
      }),
    );
    expect(menusManagerBRes.status).toBe(200);
    const menusManagerBJson = await menusManagerBRes.json();
    const menuIdsB = menusManagerBJson.data.map((m: any) => m.id);
    expect(menuIdsB).not.toContain(menuEmptyCatJson.data.id);

    // 7c. Querying GET /api/menus?tenantId=<slug> returns tenant's menus
    const menusSlugRes = await app.handle(
      new Request(`http://localhost/api/menus?tenantId=${t1.data.slug}`, {
        headers: { Authorization: `Bearer ${managerAToken}` },
      }),
    );
    expect(menusSlugRes.status).toBe(200);
    const menusSlugJson = await menusSlugRes.json();
    expect(menusSlugJson.data.length).toBeGreaterThan(0);
    expect(menusSlugJson.data[0].tenantId).toBe(t1.data.id);

    // 7d. Foreign Manager B querying Manager A's tenantId returns empty array
    const menusForeignTenantRes = await app.handle(
      new Request(`http://localhost/api/menus?tenantId=${t1.data.id}`, {
        headers: { Authorization: `Bearer ${managerBToken}` },
      }),
    );
    expect(menusForeignTenantRes.status).toBe(200);
    const menusForeignTenantJson = await menusForeignTenantRes.json();
    expect(menusForeignTenantJson.data).toEqual([]);

    // 7e. Customer calling GET /api/menus -> 403 Forbidden
    const menusCustomerRes = await app.handle(
      new Request("http://localhost/api/menus", {
        headers: { Authorization: `Bearer ${customerToken}` },
      }),
    );
    expect(menusCustomerRes.status).toBe(403);

    // 8. Test new dedicated tenant menus endpoints
    // 8a. GET /api/menus/tenant/:tenantId with ID
    const dedicatedMenuRes = await app.handle(
      new Request(`http://localhost/api/menus/tenant/${t1.data.id}`, {
        headers: { Authorization: `Bearer ${managerAToken}` },
      }),
    );
    expect(dedicatedMenuRes.status).toBe(200);
    const dedicatedMenuJson = await dedicatedMenuRes.json();
    expect(dedicatedMenuJson.data.length).toBeGreaterThan(0);
    expect(dedicatedMenuJson.data[0].tenantId).toBe(t1.data.id);

    // 8b. GET /api/menus/tenant/:tenantId with Slug
    const dedicatedSlugRes = await app.handle(
      new Request(`http://localhost/api/menus/tenant/${t1.data.slug}`, {
        headers: { Authorization: `Bearer ${managerAToken}` },
      }),
    );
    expect(dedicatedSlugRes.status).toBe(200);
    const dedicatedSlugJson = await dedicatedSlugRes.json();
    expect(dedicatedSlugJson.data.length).toBeGreaterThan(0);
    expect(dedicatedSlugJson.data[0].tenantId).toBe(t1.data.id);

    // 8c. GET /api/menus/tenant/unknown-id -> 404
    const dedicatedUnknownRes = await app.handle(
      new Request("http://localhost/api/menus/tenant/non-existent-tenant-id", {
        headers: { Authorization: `Bearer ${managerAToken}` },
      }),
    );
    expect(dedicatedUnknownRes.status).toBe(404);

    // 8d. GET /api/menus/tenant/:tenantId with foreign manager -> 403
    const dedicatedForeignRes = await app.handle(
      new Request(`http://localhost/api/menus/tenant/${t1.data.id}`, {
        headers: { Authorization: `Bearer ${managerBToken}` },
      }),
    );
    expect(dedicatedForeignRes.status).toBe(403);

    // 8e. GET /api/tenants/:id/menus
    const tenantNestedMenusRes = await app.handle(
      new Request(`http://localhost/api/tenants/${t1.data.id}/menus`, {
        headers: { Authorization: `Bearer ${managerAToken}` },
      }),
    );
    expect(tenantNestedMenusRes.status).toBe(200);
    const tenantNestedMenusJson = await tenantNestedMenusRes.json();
    expect(tenantNestedMenusJson.data.length).toBeGreaterThan(0);
    expect(tenantNestedMenusJson.data[0].tenantId).toBe(t1.data.id);

    // 9. Test GET tenants by food court
    // 9a. GET /api/food-courts/:id/tenant with food court ID
    const fcTenantsByIdRes = await app.handle(
      new Request(`http://localhost/api/food-courts/${fc.data.id}/tenant`, {
        headers: { Authorization: `Bearer ${managerAToken}` },
      }),
    );
    expect(fcTenantsByIdRes.status).toBe(200);
    const fcTenantsByIdJson = await fcTenantsByIdRes.json();
    expect(Array.isArray(fcTenantsByIdJson.data)).toBe(true);
    expect(fcTenantsByIdJson.data.length).toBeGreaterThan(0);
    expect(fcTenantsByIdJson.data[0].foodCourtId).toBe(fc.data.id);

    // 9b. GET /api/food-courts/:id/tenant with food court Slug
    const fcTenantsBySlugRes = await app.handle(
      new Request(`http://localhost/api/food-courts/${fc.data.slug}/tenant`, {
        headers: { Authorization: `Bearer ${managerAToken}` },
      }),
    );
    expect(fcTenantsBySlugRes.status).toBe(200);
    const fcTenantsBySlugJson = await fcTenantsBySlugRes.json();
    expect(fcTenantsBySlugJson.data.length).toBeGreaterThan(0);
    expect(fcTenantsBySlugJson.data[0].foodCourtId).toBe(fc.data.id);

    // 9c. Plural alias: GET /api/food-courts/:id/tenants
    const fcTenantsPluralRes = await app.handle(
      new Request(`http://localhost/api/food-courts/${fc.data.id}/tenants`, {
        headers: { Authorization: `Bearer ${managerAToken}` },
      }),
    );
    expect(fcTenantsPluralRes.status).toBe(200);

    // 9d. Singular alias: GET /api/food-court/:id/tenant
    const fcSingularRes = await app.handle(
      new Request(`http://localhost/api/food-court/${fc.data.id}/tenant`, {
        headers: { Authorization: `Bearer ${managerAToken}` },
      }),
    );
    expect(fcSingularRes.status).toBe(200);

    // 9e. Tenants controller route: GET /api/tenants/food-court/:id
    const tenantsFcRouteRes = await app.handle(
      new Request(`http://localhost/api/tenants/food-court/${fc.data.id}`, {
        headers: { Authorization: `Bearer ${managerAToken}` },
      }),
    );
    expect(tenantsFcRouteRes.status).toBe(200);

    // 9f. Foreign manager accessing foreign food court's tenants -> 403 Forbidden
    const fcForeignManagerRes = await app.handle(
      new Request(`http://localhost/api/food-courts/${fc.data.id}/tenant`, {
        headers: { Authorization: `Bearer ${managerBToken}` },
      }),
    );
    expect(fcForeignManagerRes.status).toBe(403);

    // 9g. Customer accessing food court tenants -> 403 Forbidden
    const fcCustomerRes = await app.handle(
      new Request(`http://localhost/api/food-courts/${fc.data.id}/tenant`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      }),
    );
    expect(fcCustomerRes.status).toBe(403);

    // 9g. Unknown food court -> 404 NotFound
    const fcUnknownRes = await app.handle(
      new Request("http://localhost/api/food-courts/non-existent-fc-id/tenant", {
        headers: { Authorization: `Bearer ${managerAToken}` },
      }),
    );
    expect(fcUnknownRes.status).toBe(404);

    // Cleanup
    await app.handle(
      new Request(`http://localhost/api/food-courts/${fc.data.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
  });
});
