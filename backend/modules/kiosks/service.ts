import { and, desc, eq, inArray, not } from "drizzle-orm";
import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors";
import { db } from "../../db";
import { diningSessions, foodCourts, kiosks, menuCategories, menus, tenants } from "../../db/schema";
import type { AuthUser } from "../../common/middlewares/auth";
import type { CreateKioskDTOType, UpdateKioskDTOType } from "./model";

export class KioskService {
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

  async resolveKioskByDeviceCode(deviceCode: string) {
    const kiosk = await db.query.kiosks.findFirst({
      where: eq(kiosks.deviceCode, deviceCode),
      with: {
        foodCourt: true,
      },
    });

    if (!kiosk) {
      throw new NotFoundError(`Kiosk with device code '${deviceCode}' not found`);
    }

    // Load active tenants in this food court
    const courtTenants = await db.query.tenants.findMany({
      where: and(
        eq(tenants.foodCourtId, kiosk.foodCourtId),
        eq(tenants.isOpen, true)
      ),
      orderBy: [tenants.stallNumber],
    });

    const tenantIds = courtTenants.map((t) => t.id);

    let courtCategories: any[] = [];
    let courtMenus: any[] = [];

    if (tenantIds.length > 0) {
      courtCategories = await db.query.menuCategories.findMany({
        where: inArray(menuCategories.tenantId, tenantIds),
        orderBy: [menuCategories.sortOrder],
      });

      courtMenus = await db.query.menus.findMany({
        where: and(
          inArray(menus.tenantId, tenantIds),
          eq(menus.isAvailable, true),
          not(eq(menus.status, "HIDDEN"))
        ),
        with: {
          options: true,
          category: true,
          tenant: true,
        },
      });
    }

    return {
      kiosk,
      foodCourt: kiosk.foodCourt,
      tenants: courtTenants,
      categories: courtCategories,
      menus: courtMenus,
    };
  }

  async getAll(filter?: { status?: string; foodCourtId?: string }, currentUser?: AuthUser | null) {
    const conditions = [];

    if (currentUser?.role === "admin-food-court") {
      const managedCourts = await db
        .select({ id: foodCourts.id })
        .from(foodCourts)
        .where(eq(foodCourts.managerId, currentUser.id));

      const courtIds = managedCourts.map((c) => c.id);
      if (courtIds.length === 0) return [];

      conditions.push(inArray(kiosks.foodCourtId, courtIds));
    }

    if (filter?.foodCourtId) {
      conditions.push(eq(kiosks.foodCourtId, filter.foodCourtId));
    }

    if (filter?.status) {
      conditions.push(eq(kiosks.status, filter.status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db.query.kiosks.findMany({
      where: whereClause,
      with: {
        foodCourt: true,
      },
      orderBy: [desc(kiosks.createdAt)],
    });
  }

  async getById(id: string, currentUser?: AuthUser | null) {
    const kiosk = await db.query.kiosks.findFirst({
      where: eq(kiosks.id, id),
      with: {
        foodCourt: true,
      },
    });

    if (!kiosk) {
      throw new NotFoundError(`Kiosk with id '${id}' not found`);
    }

    if (currentUser?.role === "admin-food-court") {
      if (kiosk.foodCourt?.managerId !== currentUser.id) {
        throw new ForbiddenError("You do not have permission to access this kiosk");
      }
    }

    return kiosk;
  }

  async create(data: CreateKioskDTOType, currentUser?: AuthUser | null) {
    let foodCourtId = data.foodCourtId;

    if (currentUser?.role === "admin-food-court") {
      const managedCourt = await db.query.foodCourts.findFirst({
        where: eq(foodCourts.managerId, currentUser.id),
      });

      if (!managedCourt) {
        throw new ForbiddenError("You do not manage any food courts");
      }

      if (foodCourtId && foodCourtId !== managedCourt.id) {
        throw new ForbiddenError("You can only create kiosks for your own food court");
      }

      foodCourtId = managedCourt.id;
    } else if (!foodCourtId) {
      foodCourtId = await this.getOrCreateDefaultFoodCourt();
    }

    const existingCode = await db.query.kiosks.findFirst({
      where: eq(kiosks.deviceCode, data.deviceCode),
    });

    if (existingCode) {
      throw new ConflictError(`Device code '${data.deviceCode}' already exists`);
    }

    const id = crypto.randomUUID();
    const newKiosk = {
      id,
      foodCourtId,
      kioskName: data.kioskName,
      deviceCode: data.deviceCode,
      location: data.location ?? null,
      status: data.status ?? ("ACTIVE" as const),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(kiosks).values(newKiosk);

    return this.getById(id, currentUser);
  }

  async update(id: string, data: UpdateKioskDTOType, currentUser?: AuthUser | null) {
    const existing = await this.getById(id, currentUser);

    if (data.deviceCode && data.deviceCode !== existing.deviceCode) {
      const collision = await db.query.kiosks.findFirst({
        where: and(
          eq(kiosks.deviceCode, data.deviceCode),
          not(eq(kiosks.id, id))
        ),
      });
      if (collision) {
        throw new ConflictError(`Device code '${data.deviceCode}' already exists`);
      }
    }

    await db
      .update(kiosks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(kiosks.id, id));

    return this.getById(id, currentUser);
  }

  async delete(id: string, currentUser?: AuthUser | null) {
    const existing = await this.getById(id, currentUser);
    await db.delete(kiosks).where(eq(kiosks.id, id));
    return {
      success: true,
      message: `Kiosk '${existing.kioskName}' deleted successfully`,
    };
  }

  async getStats(id: string, currentUser?: AuthUser | null) {
    const kiosk = await this.getById(id, currentUser);

    const sessions = await db.query.diningSessions.findMany({
      where: eq(diningSessions.kioskId, id),
      with: {
        orders: true,
      },
    });

    const totalOrders = sessions.reduce((acc, s) => acc + s.orders.length, 0);
    const totalRevenue = sessions.reduce(
      (acc, s) =>
        acc +
        s.orders.reduce(
          (oAcc, ord) => (ord.paymentStatus === "PAID" ? oAcc + ord.totalAmount : oAcc),
          0
        ),
      0
    );

    return {
      kioskId: kiosk.id,
      kioskName: kiosk.kioskName,
      deviceCode: kiosk.deviceCode,
      totalSessions: sessions.length,
      totalOrders,
      totalRevenue,
    };
  }
}

export const kioskService = new KioskService();
