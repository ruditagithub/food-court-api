import { describe, expect, it } from "bun:test";
import { app } from "../index";
import { generateAuthToken } from "./test_helpers";

describe("GET /api/admin/food-court/dashboard-stats", () => {
  it("should return 401 when unauthenticated", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/admin/food-court/dashboard-stats")
    );
    expect(res.status).toBe(401);
  });

  it("should return 403 when called by unauthorized role (e.g. tenant)", async () => {
    const tenantToken = await generateAuthToken("tenant");
    const res = await app.handle(
      new Request("http://localhost/api/admin/food-court/dashboard-stats", {
        headers: { token: tenantToken },
      })
    );
    expect(res.status).toBe(403);
  });

  it("should return 200 with branch scoped data for admin-food-court", async () => {
    const managerToken = await generateAuthToken("admin-food-court");
    const res = await app.handle(
      new Request("http://localhost/api/admin/food-court/dashboard-stats?range=today", {
        headers: { token: managerToken },
      })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.foodCourtInfo).toBeDefined();
    expect(json.data.financialSummary).toBeDefined();
    expect(typeof json.data.financialSummary.totalBranchRevenue).toBe("number");
    expect(json.data.floorAndTables).toBeDefined();
    expect(typeof json.data.floorAndTables.averageDiningDurationMinutes).toBe("number");
    expect(json.data.floorAndTables.averageDiningDurationMinutes).toBeGreaterThanOrEqual(0);
    expect(typeof json.data.tenantAndKitchen.kitchenQueueOverview.busiestTenantName).toBe("string");
    expect(json.data.tenantAndKitchen).toBeDefined();
    expect(Array.isArray(json.data.tenantAndKitchen.topTenants)).toBe(true);
    expect(json.data.channelBreakdown).toBeDefined();
    expect(Array.isArray(json.data.trends)).toBe(true);
  });

  it("should support range=7d and range=30d for manager", async () => {
    const managerToken = await generateAuthToken("admin-food-court");
    for (const range of ["7d", "30d"]) {
      const res = await app.handle(
        new Request(`http://localhost/api/admin/food-court/dashboard-stats?range=${range}`, {
          headers: { token: managerToken },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.financialSummary).toBeDefined();
      expect(typeof json.data.financialSummary.totalBranchRevenue).toBe("number");
    }
  });
});
