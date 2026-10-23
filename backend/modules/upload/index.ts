import { Elysia, t } from "elysia";
import path from "node:path";
import { authPlugin, requireAuth } from "../../common/middlewares/auth";
import { localUploadService } from "./service";
import { BadRequestError, NotFoundError } from "../../common/errors";

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB (1.048.576 bytes)
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const uploadController = new Elysia()
  .use(authPlugin)
  // 1. Upload File Endpoint (Protected with JWT)
  .post(
    "/api/upload",
    async ({ body, user, request }) => {
      requireAuth(user);

      const file = body.file as File;

      // Double-check file existence
      if (!file) {
        throw new BadRequestError("File gambar wajib dilampirkan");
      }

      // 1. Strict Size Check (1 MB limit)
      if (file.size > MAX_FILE_SIZE) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        throw new BadRequestError(
          `Ukuran file melebihi batas maksimal 1 MB (Terdeteksi ${sizeMb} MB). Silakan kompres gambar terlebih dahulu.`
        );
      }

      // 2. Strict Mime Type Check
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new BadRequestError(
          "Format file tidak didukung! Hanya file gambar JPG, PNG, dan WebP yang diizinkan."
        );
      }

      // Determine Base URL (e.g. http://localhost:3000)
      const urlObj = new URL(request.url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

      const result = await localUploadService.saveFile(
        file,
        body.folder || "menus",
        baseUrl
      );

      return {
        message: "File berhasil disimpan di server",
        data: result,
      };
    },
    {
      body: t.Object({
        file: t.File({
          maxSize: 1 * 1024 * 1024, // 1 MB TypeBox guard
          types: ["image/jpeg", "image/png", "image/webp"],
        }),
        folder: t.Optional(
          t.Union([
            t.Literal("menus"),
            t.Literal("tenants"),
            t.Literal("food-courts"),
          ])
        ),
      }),
      detail: {
        tags: ["Upload"],
        summary: "Unggah gambar ke penyimpanan lokal server (Maks. 1 MB, JPG/PNG/WebP)",
      },
    }
  )
  // 2. Public Static File Stream (Path Traversal Protected)
  .get(
    "/uploads/*",
    async ({ params, set }) => {
      let rawPath = params["*"] || "";
      try {
        rawPath = decodeURIComponent(rawPath);
      } catch {
        // ignore malformed URI
      }
      const uploadRoot = path.resolve(process.cwd(), "uploads");
      const resolvedPath = path.resolve(uploadRoot, rawPath);

      // Defense against Path Traversal: Ensure path is strictly inside uploadRoot
      if (!resolvedPath.startsWith(uploadRoot)) {
        set.status = 403;
        return {
          success: false,
          error: "ForbiddenError",
          message: "Akses path tidak diizinkan",
        };
      }

      const bunFile = Bun.file(resolvedPath);
      const exists = await bunFile.exists();

      if (!exists) {
        throw new NotFoundError("File gambar tidak ditemukan di server");
      }

      // Safe headers
      set.headers["x-content-type-options"] = "nosniff";
      set.headers["cache-control"] = "public, max-age=86400";

      return bunFile;
    },
    {
      detail: {
        tags: ["Upload"],
        summary: "Akses file gambar statis publik dari penyimpanan lokal server",
      },
    }
  );
