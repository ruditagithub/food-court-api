import { describe, expect, it } from "bun:test";
import { app } from "../index";
import { generateAuthToken } from "./test_helpers";

describe("GET /api/tenants/dashboard-stats", () => {
  it("should return 401 when token missing", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/tenants/dashboard-stats")
    );
    expect(res.status).toBe(401);
  });

  it("should return 403 when called by non-tenant and non-admin role (e.g. customer)", async () => {
    const customerToken = await generateAuthToken("customer");
    const res = await app.handle(
      new Request("http://localhost/api/tenants/dashboard-stats", {
        headers: { token: customerToken },
      })
    );
    expect(res.status).toBe(403);
  });

  it("should return 200 with stall scoped data for tenant role", async () => {
    const tenantToken = await generateAuthToken("tenant");
    const res = await app.handle(
      new Request("http://localhost/api/tenants/dashboard-stats?range=7d", {
        headers: { token: tenantToken },
      })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.tenantInfo).toBeDefined();
    expect(json.data.summary).toBeDefined();
    expect(typeof json.data.summary.totalRevenue).toBe("number");
    expect(json.data.menuIntelligence).toBeDefined();
    expect(Array.isArray(json.data.menuIntelligence.topSellingMenus)).toBe(true);
    if (json.data.menuIntelligence.topSellingMenus.length > 0) {
      expect(typeof json.data.menuIntelligence.topSellingMenus[0].popularOption).toBe("string");
    }
    expect(json.data.peakHoursAndTrends).toBeDefined();
    expect(typeof json.data.peakHoursAndTrends.peakHour).toBe("string");
    expect(Array.isArray(json.data.peakHoursAndTrends.hourlyBreakdown)).toBe(true);
    expect(Array.isArray(json.data.recentWithdrawals)).toBe(true);
  });

  it("should handle multi-range queries for tenant (today, 30d, year)", async () => {
    const tenantToken = await generateAuthToken("tenant");
    for (const range of ["today", "30d", "year"]) {
      const res = await app.handle(
        new Request(`http://localhost/api/tenants/dashboard-stats?range=${range}`, {
          headers: { token: tenantToken },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.summary).toBeDefined();
      expect(typeof json.data.summary.totalRevenue).toBe("number");
    }
  });
});
