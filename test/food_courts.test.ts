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
});
