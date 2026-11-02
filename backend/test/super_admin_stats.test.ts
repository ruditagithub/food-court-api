import { describe, expect, it } from "bun:test";
import { app } from "../index";
import { generateAuthToken } from "./test_helpers";

describe("GET /api/super-admin/dashboard-stats", () => {
  it("should return 401 when token is missing", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/super-admin/dashboard-stats")
    );
    expect(res.status).toBe(401);
  });

  it("should return 403 when called by non-admin (e.g. tenant)", async () => {
    const tenantToken = await generateAuthToken("tenant");
    const res = await app.handle(
      new Request("http://localhost/api/super-admin/dashboard-stats", {
        headers: { token: tenantToken },
      })
    );
    expect(res.status).toBe(403);
  });

  it("should return 200 with structured analytics data for super admin", async () => {
    const adminToken = await generateAuthToken("admin");
    const res = await app.handle(
      new Request("http://localhost/api/super-admin/dashboard-stats?range=30d", {
        headers: { token: adminToken },
      })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data).toBeDefined();
    expect(json.data.summary).toBeDefined();
    expect(typeof json.data.summary.totalGmv).toBe("number");
    expect(Array.isArray(json.data.branchLeaderboard)).toBe(true);
    expect(json.data.operational).toBeDefined();
    expect(json.data.operational.channelDistribution).toBeDefined();
    expect(typeof json.data.operational.kitchenSla.averageCookingTimeMinutes).toBe("number");
    expect(json.data.operational.kitchenSla.onTimePercentage).toBeGreaterThanOrEqual(0);
    expect(json.data.operational.kitchenSla.onTimePercentage).toBeLessThanOrEqual(100);
  });

  it("should support specific foodCourtId filter without cartesian data duplication", async () => {
    const adminToken = await generateAuthToken("admin");
    // First get all branches to get a valid branch ID
    const initialRes = await app.handle(
      new Request("http://localhost/api/super-admin/dashboard-stats?range=30d", {
        headers: { token: adminToken },
      })
    );
    const initialJson = (await initialRes.json()) as any;
    const firstBranch = initialJson.data.branchLeaderboard[0];

    if (firstBranch) {
      const res = await app.handle(
        new Request(
          `http://localhost/api/super-admin/dashboard-stats?range=30d&foodCourtId=${firstBranch.foodCourtId}`,
          {
            headers: { token: adminToken },
          }
        )
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.branchLeaderboard.length).toBe(1);
      expect(json.data.branchLeaderboard[0].foodCourtId).toBe(firstBranch.foodCourtId);
      // Ensure totalGmv for single branch does not exceed initial totalGmv
      expect(json.data.branchLeaderboard[0].totalGmv).toBe(firstBranch.totalGmv);
    }
  });

  it("should handle different date ranges gracefully", async () => {
    const adminToken = await generateAuthToken("admin");
    for (const range of ["today", "7d", "year"]) {
      const res = await app.handle(
        new Request(`http://localhost/api/super-admin/dashboard-stats?range=${range}`, {
          headers: { token: adminToken },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.summary).toBeDefined();
      expect(typeof json.data.summary.totalGmv).toBe("number");
    }
  });
});
