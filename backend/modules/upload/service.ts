import path from "node:path";
import fs from "node:fs/promises";

export interface LocalUploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const ALLOWED_FOLDERS = ["menus", "tenants", "food-courts"];

export const localUploadService = {
  async saveFile(
    file: File,
    folder: string = "menus",
    baseUrl: string
  ): Promise<LocalUploadResult> {
    // Sanitize folder
    const safeFolder = ALLOWED_FOLDERS.includes(folder) ? folder : "menus";
    const uploadDir = path.join(process.cwd(), "uploads", safeFolder);

    // Create target directory if it does not exist
    await fs.mkdir(uploadDir, { recursive: true });

    // Extract & whitelist extension
    const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const ext = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : "jpg";

    // Generate random unguessable filename
    const uniqueFilename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const destinationPath = path.join(uploadDir, uniqueFilename);

    // Native Bun zero-copy file write
    await Bun.write(destinationPath, file);

    // Construct public access URL
    const relativeUrl = `/uploads/${safeFolder}/${uniqueFilename}`;
    const fullUrl = `${baseUrl.replace(/\/$/, "")}${relativeUrl}`;

    return {
      url: fullUrl,
      filename: uniqueFilename,
      size: file.size,
      mimeType: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
    };
  },
};
