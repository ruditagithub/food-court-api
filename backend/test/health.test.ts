import { describe, expect, it } from "bun:test";
import { app } from "../src";

describe("Health & Swagger Documentation", () => {
  it("should return health info at GET /", async () => {
    const res = await app.handle(new Request("http://localhost/"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.name).toBe("Food Court API");
    expect(body.status).toBe("online");
    expect(body.documentation).toBe("/swagger");
  });

  it("should return OpenAPI specification at GET /swagger/json", async () => {
    const res = await app.handle(new Request("http://localhost/swagger/json"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.openapi).toBeDefined();
    expect(body.info.title).toBe("Food Court API");
  });
});
