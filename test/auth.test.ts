import { describe, expect, it } from "bun:test";
import { app } from "../src";

describe("Auth Module", () => {
  const testUser = {
    name: "Admin Budi",
    email: `admin_${Date.now()}@foodcourt.com`,
    password: "password123",
    role: "admin",
  };

  let authToken = "";

  it("should register a new user", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testUser),
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.email).toBe(testUser.email);
    expect(json.data.role).toBe("admin");
    expect(json.data.passwordHash).toBeUndefined(); // ensure password is not leaked
  });

  it("should prevent duplicate registration", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testUser),
      }),
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("ConflictError");
  });

  it("should login successfully and return token", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.token).toBeDefined();
    expect(json.data.user.email).toBe(testUser.email);
    authToken = json.data.token;

    // Verify token contains user name in payload
    const payloadBase64 = authToken.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString());
    expect(payload.name).toBe(testUser.name);
  });

  it("should get user profile with Bearer token", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/me", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.email).toBe(testUser.email);
    expect(json.data.name).toBe(testUser.name);
  });

  it("should reject unauthorized request without token", async () => {
    const res = await app.handle(new Request("http://localhost/api/auth/me"));

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("UnauthorizedError");
  });
});
