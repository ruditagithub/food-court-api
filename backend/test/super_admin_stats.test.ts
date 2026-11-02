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
  });
});
