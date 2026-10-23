import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { env } from "../config/env";
import { app } from "../index";

describe("Upload Module & Security", () => {
  let token = "";

  it("should setup auth token for upload tests without database dependency", async () => {
    const signerApp = new Elysia()
      .use(jwt({ name: "jwt", secret: env.JWT_SECRET, exp: "7d" }))
      .get("/token", ({ jwt }) =>
        jwt.sign({
          id: "usr-upload-test-01",
          name: "Upload Tester",
          email: "uploader@foodcourt.com",
          role: "admin",
        })
      );

    const res = await signerApp.handle(new Request("http://localhost/token"));
    token = await res.text();
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(10);
  });

  it("should reject upload without authorization token (401)", async () => {
    const formData = new FormData();
    const blob = new Blob(["fake image data"], { type: "image/jpeg" });
    formData.append("file", blob, "test.jpg");

    const res = await app.handle(
      new Request("http://localhost/api/upload", {
        method: "POST",
        body: formData,
      })
    );

    expect(res.status).toBe(401);
  });

  it("should successfully upload a valid image under 1 MB", async () => {
    const formData = new FormData();
    const smallBlob = new Blob(["small valid fake image content"], {
      type: "image/jpeg",
    });
    formData.append("file", smallBlob, "sample_rawon.jpg");
    formData.append("folder", "menus");

    const res = await app.handle(
      new Request("http://localhost/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.url).toBeDefined();
    expect(json.data.url).toContain("/uploads/menus/");
    expect(json.data.filename).toBeDefined();

    // Verify static serving works for this uploaded file
    const staticRes = await app.handle(new Request(json.data.url));
    expect(staticRes.status).toBe(200);
    expect(staticRes.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("should reject an oversized file exceeding 1 MB limit", async () => {
    const formData = new FormData();
    // 1.2 MB file (1.2 * 1024 * 1024 bytes)
    const largeBuffer = new Uint8Array(1.2 * 1024 * 1024);
    const largeBlob = new Blob([largeBuffer], { type: "image/jpeg" });
    formData.append("file", largeBlob, "large_photo.jpg");

    const res = await app.handle(
      new Request("http://localhost/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
    );

    // TypeBox or controller check returns 422 or 400
    expect([400, 422]).toContain(res.status);
    const json = await res.json();
    expect(json.message).toBeDefined();
  });

  it("should reject non-image file formats", async () => {
    const formData = new FormData();
    const textBlob = new Blob(["echo malicious"], { type: "text/plain" });
    formData.append("file", textBlob, "script.sh");

    const res = await app.handle(
      new Request("http://localhost/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
    );

    expect([400, 422]).toContain(res.status);
  });

  it("should reject path traversal attempts on GET /uploads/* (403)", async () => {
    const res = await app.handle(
      new Request("http://localhost/uploads/menus/%2E%2E%2F%2E%2E%2Fconfig/env.ts")
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("ForbiddenError");
  });

  it("should return 404 for non-existent uploaded files", async () => {
    const res = await app.handle(
      new Request("http://localhost/uploads/menus/non-existent-image-12345.jpg")
    );

    expect(res.status).toBe(404);
  });
});
