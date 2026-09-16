import { eq } from "drizzle-orm";
import { ConflictError, NotFoundError } from "../../common/errors";
import { db } from "../../db";
import { foodCourts, tables } from "../../db/schema";
import type { CreateTableDTOType, UpdateTableDTOType } from "./model";

export class TableService {
  private async getOrCreateDefaultFoodCourt(): Promise<string> {
    const defaultCourt = await db.query.foodCourts.findFirst();
    if (defaultCourt) return defaultCourt.id;

    const id = crypto.randomUUID();
    await db.insert(foodCourts).values({
      id,
      name: "Food Court Utama",
      slug: "food-court-utama",
      status: "ACTIVE",
    });
    return id;
  }

  async getAll(statusFilter?: "available" | "occupied" | "disabled") {
    if (statusFilter) {
      return db.query.tables.findMany({
        where: eq(tables.status, statusFilter),
      });
    }
    return db.query.tables.findMany();
  }

  async getById(id: string) {
    const table = await db.query.tables.findFirst({
      where: eq(tables.id, id),
      with: {
        foodCourt: true,
        diningSessions: {
          limit: 5,
        },
      },
    });

    if (!table) {
      throw new NotFoundError(`Table with id '${id}' not found`);
    }

    return table;
  }

  async getByQrToken(qrToken: string) {
    const table = await db.query.tables.findFirst({
      where: eq(tables.qrToken, qrToken),
      with: {
        foodCourt: true,
        diningSessions: {
          limit: 1,
        },
      },
    });

    if (!table) {
      throw new NotFoundError(`Table with QR token '${qrToken}' not found`);
    }

    return table;
  }

  async create(data: CreateTableDTOType) {
    const foodCourtId =
      data.foodCourtId ?? (await this.getOrCreateDefaultFoodCourt());

    const [existing] = await db
      .select()
      .from(tables)
      .where(eq(tables.tableNumber, data.tableNumber))
      .limit(1);

    if (existing) {
      throw new ConflictError(
        `Table number '${data.tableNumber}' already exists`,
      );
    }

    const id = crypto.randomUUID();
    const qrToken =
      data.qrToken ?? `qr-${data.tableNumber.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`;

    const newTable = {
      id,
      foodCourtId,
      tableNumber: data.tableNumber,
      capacity: data.capacity ?? 4,
      status: data.status ?? ("available" as const),
      qrToken,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(tables).values(newTable);
    return newTable;
  }

  async update(id: string, data: UpdateTableDTOType) {
    await this.getById(id);

    await db
      .update(tables)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tables.id, id));
    return this.getById(id);
  }

  async delete(id: string) {
    const existing = await this.getById(id);
    await db.delete(tables).where(eq(tables.id, id));
    return {
      success: true,
      message: `Table '${existing.tableNumber}' deleted`,
    };
  }
}

export const tableService = new TableService();
