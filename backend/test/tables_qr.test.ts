import { describe, expect, it } from "bun:test";
import { tableService } from "../modules/tables/service";

describe("Table QR Code Resolver & Generation", () => {
  it("should generate a QR code for a table and resolve it correctly", async () => {
    // 1. Create a table
    const tableNumber = `T-TEST-${Date.now().toString().slice(-4)}`;
    const created = await tableService.create({
      tableNumber,
      capacity: 4,
    });

    expect(created).toBeDefined();

    // 2. Generate QR code for this table
    const updated = await tableService.generateQrCode(created.id);
    expect(updated.qrCode).toBeDefined();
    expect(updated.qrCode?.startsWith(`QR-${tableNumber.toUpperCase()}`)).toBe(true);

    // 3. Resolve by QR Code scan
    const resolved = await tableService.resolveByQrCode(updated.qrCode!);
    expect(resolved).toBeDefined();
    expect(resolved.table.tableNumber).toBe(tableNumber);
    expect(resolved.isAvailable).toBe(true);

    // 4. Generate real SVG QR Code
    const svg = await tableService.generateQrSvg(created.id, "http://localhost:5173");
    expect(svg).toBeDefined();
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.includes("</svg>")).toBe(true);
    expect(svg.includes("viewBox=")).toBe(true);

    // Clean up
    await tableService.delete(created.id);
  });
});
