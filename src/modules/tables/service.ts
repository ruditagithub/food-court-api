import { eq } from "drizzle-orm";
import { ConflictError, NotFoundError } from "../../common/errors";
import { db } from "../../db";
import { tables } from "../../db/schema";
import type { CreateTableDTOType, UpdateTableDTOType } from "./model";

export class TableService {
  async getAll(statusFilter?: "available" | "occupied" | "reserved") {
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
        orders: {
          limit: 5,
        },
      },
    });

    if (!table) {
      throw new NotFoundError(`Table with id '${id}' not found`);
    }

    return table;
  }

  async create(data: CreateTableDTOType) {
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
    const newTable = {
      id,
      tableNumber: data.tableNumber,
      capacity: data.capacity ?? 4,
      status: data.status ?? ("available" as const),
      qrCode: data.qrCode ?? `foodcourt://table/${data.tableNumber}`,
      createdAt: new Date(),
    };

    await db.insert(tables).values(newTable);
    return newTable;
  }

  async update(id: string, data: UpdateTableDTOType) {
    await this.getById(id);

    await db.update(tables).set(data).where(eq(tables.id, id));
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
