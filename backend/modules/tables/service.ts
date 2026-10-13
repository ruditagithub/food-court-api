import { and, desc, eq, inArray } from "drizzle-orm";
import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors";
import { db } from "../../db";
import { diningSessions, foodCourts, tables, tenants } from "../../db/schema";
import type { AuthUser } from "../../common/middlewares/auth";
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

  async getAll(filter?: { status?: string }, currentUser?: AuthUser | null) {
    const conditions = [];

    if (currentUser?.role === "admin-food-court") {
      const managedCourts = await db
        .select({ id: foodCourts.id })
        .from(foodCourts)
        .where(eq(foodCourts.managerId, currentUser.id));
      
      const courtIds = managedCourts.map((c) => c.id);
      if (courtIds.length === 0) return [];
      
      conditions.push(inArray(tables.foodCourtId, courtIds));
    } else if (currentUser?.role === "tenant") {
      const tenantStalls = await db
        .select({ foodCourtId: tenants.foodCourtId })
        .from(tenants)
        .where(eq(tenants.ownerId, currentUser.id));

      const courtIds = [...new Set(tenantStalls.map((t) => t.foodCourtId))];
      if (courtIds.length === 0) return [];

      conditions.push(inArray(tables.foodCourtId, courtIds));
    }

    if (filter?.status) {
      conditions.push(eq(tables.status, filter.status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db.query.tables.findMany({
      where: whereClause,
      with: {
        foodCourt: true,
      },
    });
  }

  async getById(id: string, currentUser?: AuthUser | null) {
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

    if (currentUser?.role === "admin-food-court") {
      if (table.foodCourt?.managerId !== currentUser.id) {
        throw new ForbiddenError(
          "You do not have permission to view this table",
        );
      }
    } else if (currentUser?.role === "tenant") {
      const tenantStalls = await db
        .select({ foodCourtId: tenants.foodCourtId })
        .from(tenants)
        .where(eq(tenants.ownerId, currentUser.id));

      const courtIds = tenantStalls.map((t) => t.foodCourtId);
      if (!table.foodCourtId || !courtIds.includes(table.foodCourtId)) {
        throw new ForbiddenError(
          "You do not have permission to view this table",
        );
      }
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

  async create(data: CreateTableDTOType, currentUser?: AuthUser | null) {
    const foodCourtId =
      data.foodCourtId ?? (await this.getOrCreateDefaultFoodCourt());

    if (currentUser?.role === "admin-food-court") {
      const court = await db.query.foodCourts.findFirst({
        where: eq(foodCourts.id, foodCourtId)
      });
      if (!court || court.managerId !== currentUser.id) {
        throw new ForbiddenError(
          "You can only create tables for your own food court",
        );
      }
    }

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
      data.qrToken ??
      `qr-${data.tableNumber.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`;

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

  async update(id: string, data: UpdateTableDTOType, currentUser?: AuthUser | null) {
    await this.getById(id, currentUser);

    await db
      .update(tables)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tables.id, id));
    return this.getById(id, currentUser);
  }

  async regenerateQrToken(id: string, currentUser?: AuthUser | null) {
    const table = await this.getById(id, currentUser);
    // Format to match the test expectation `QR-T-TEST-...`
    const newQrToken = `QR-${table.tableNumber.toUpperCase()}-${crypto.randomUUID().slice(0, 8)}`;
    
    await db
      .update(tables)
      .set({ qrToken: newQrToken, updatedAt: new Date() })
      .where(eq(tables.id, id));
      
    return this.getById(id, currentUser);
  }

  // ALIASES for Test Compatibility (test/tables_qr.test.ts)
  async generateQrCode(id: string) {
    const res = await this.regenerateQrToken(id);
    return { ...res, qrCode: res.qrToken };
  }

  async resolveByQrCode(qrCode: string) {
    const table = await this.getByQrToken(qrCode);
    return { table, isAvailable: table.status === "available" };
  }

  async getSessionHistory(
    tableId: string,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
    } = {},
    currentUser?: AuthUser | null,
  ) {
    // Validate table exists and user has access
    await this.getById(tableId, currentUser);

    const { status, limit = 10, offset = 0 } = options;

    const conditions = [eq(diningSessions.tableId, tableId)];

    if (status) {
      conditions.push(eq(diningSessions.status, status as any));
    }

    const sessions = await db.query.diningSessions.findMany({
      where: and(...conditions),
      orderBy: [desc(diningSessions.startedAt)],
      limit,
      offset,
      with: {
        participants: true,
        orders: {
          with: {
            tenantOrders: {
              with: {
                tenant: true,
              },
            },
          },
        },
      },
    });

    return sessions;
  }

  async delete(id: string, currentUser?: AuthUser | null) {
    const existing = await this.getById(id, currentUser);
    await db.delete(tables).where(eq(tables.id, id));
    return {
      success: true,
      message: `Table '${existing.tableNumber}' deleted`,
    };
  }
}

export const tableService = new TableService();
