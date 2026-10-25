import { describe, expect, it } from "bun:test";
import { app } from "../index";

describe("Admin Withdrawal Management Tests", () => {
  it("should require admin or admin-food-court role for admin withdrawals", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/admin/withdrawals", {
        headers: {
          // No auth header
        },
      }),
    );
    expect(res.status).toBe(401);
  });
});
