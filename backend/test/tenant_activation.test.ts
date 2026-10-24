import { describe, expect, it } from "bun:test";
import { authService } from "../modules/auth/service";
import { tenantService } from "../modules/tenants/service";
import { db } from "../db";
import { tenants, users } from "../db/schema";
import { eq } from "drizzle-orm";

describe("1 Account = 1 Tenant and Email Activation Flow", () => {
  it("should create tenant + pending user, send activation token, and enforce 1:1 constraint", async () => {
    const testEmail = `test.tenant.${Date.now()}@example.com`;
    const stallNumber = `STAN-TEST-${Math.floor(Math.random() * 9000 + 1000)}`;

    const adminUser = {
      id: "usr-super-admin-001",
      name: "Super Admin",
      email: "admin@amici.food",
      role: "admin" as const,
    };

    // 1. Create tenant with ownerName and ownerEmail
    const tenant = await tenantService.create(
      {
        name: "Stan Soto Ayam Uji",
        stallNumber,
        ownerName: "Pak Slamet",
        ownerEmail: testEmail,
        isOpen: false,
      },
      adminUser
    );

    expect(tenant).toBeDefined();
    expect(tenant.name).toBe("Stan Soto Ayam Uji");
    expect(tenant.isOpen).toBe(false);

    // 2. Verify user was created in PENDING_ACTIVATION state
    const createdUser = await db.query.users.findFirst({
      where: eq(users.email, testEmail),
    });

    expect(createdUser).toBeDefined();
    expect(createdUser?.role).toBe("tenant");
    expect(createdUser?.status).toBe("PENDING_ACTIVATION");
    expect(createdUser?.activationToken).toBeDefined();
    expect(typeof createdUser?.activationToken).toBe("string");

    // 3. Enforce 1:1 rule - attempting to register another tenant with same email MUST fail
    let duplicateFailed = false;
    try {
      await tenantService.create(
        {
          name: "Stan Soto Kedua",
          stallNumber: `${stallNumber}-2`,
          ownerName: "Pak Slamet",
          ownerEmail: testEmail,
        },
        adminUser
      );
    } catch (err: any) {
      duplicateFailed = true;
      expect(err.statusCode).toBe(409);
      expect(err.message).toContain("sudah terdaftar sebagai pemilik gerai");
    }
    expect(duplicateFailed).toBe(true);

    // 4. Verify activation token
    const token = createdUser!.activationToken!;
    const verification = await authService.verifyActivationToken(token);
    expect(verification.valid).toBe(true);
    expect(verification.data.email).toBe(testEmail);
    expect(verification.data.tenantName).toBe("Stan Soto Ayam Uji");

    // 5. Activate account with new password
    const activated = await authService.activateAccount(token, "rahasia12345");
    expect(activated.email).toBe(testEmail);

    // 6. Check user is now ACTIVE and token cleared
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.email, testEmail),
    });
    expect(updatedUser?.status).toBe("ACTIVE");
    expect(updatedUser?.activationToken).toBeNull();

    // 7. Test login with new password
    const loginRes = await authService.login({
      email: testEmail,
      password: "rahasia12345",
    });
    expect(loginRes.id).toBe(createdUser!.id);

    // Clean up
    await db.delete(tenants).where(eq(tenants.id, tenant.id));
    await db.delete(users).where(eq(users.id, createdUser!.id));
  });
});
