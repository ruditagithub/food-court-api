import { and, eq, inArray, ne } from "drizzle-orm";
import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors";
import type { AuthUser } from "../../common/middlewares/auth";
import { db } from "../../db";
import { foodCourts, menus, tenants } from "../../db/schema";
import { generateSlug } from "../food-courts/service";
import type { CreateTenantDTOType, UpdateTenantDTOType } from "./model";

export class TenantService {
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

  async getAll(
    filter?: { isOpen?: boolean; foodCourtId?: string },
    currentUser?: AuthUser | null,
  ) {
    const conditions = [];

    // Jika login sebagai admin-food-court, otomatis batasi hanya tenant yang berada di food court miliknya
    if (currentUser?.role === "admin-food-court") {
      const managedCourts = await db
        .select({ id: foodCourts.id })
        .from(foodCourts)
        .where(eq(foodCourts.managerId, currentUser.id));

      const courtIds = managedCourts.map((c) => c.id);
      if (courtIds.length === 0) {
        return [];
      }

      if (filter?.foodCourtId) {
        if (!courtIds.includes(filter.foodCourtId)) {
          return [];
        }
        conditions.push(eq(tenants.foodCourtId, filter.foodCourtId));
      } else {
        conditions.push(inArray(tenants.foodCourtId, courtIds));
      }
    } else if (filter?.foodCourtId) {
      conditions.push(eq(tenants.foodCourtId, filter.foodCourtId));
    }

    if (typeof filter?.isOpen === "boolean") {
      conditions.push(eq(tenants.isOpen, filter.isOpen));
    }

    if (conditions.length > 0) {
      return db.query.tenants.findMany({
        where: and(...conditions),
      });
    }

    return db.query.tenants.findMany();
  }

  async getById(id: string) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, id),
    });

    if (!tenant) {
      throw new NotFoundError(`Tenant with id '${id}' not found`);
    }

    return tenant;
  }

  async create(data: CreateTenantDTOType, currentUser: AuthUser) {
    let foodCourtId = data.foodCourtId;

    if (currentUser.role === "admin-food-court") {
      if (!foodCourtId) {
        const managed = await db.query.foodCourts.findFirst({
          where: eq(foodCourts.managerId, currentUser.id),
        });
        if (!managed) {
          throw new ForbiddenError(
            "You must register a food court before creating tenants",
          );
        }
        foodCourtId = managed.id;
      } else {
        const fc = await db.query.foodCourts.findFirst({
          where: eq(foodCourts.id, foodCourtId),
        });
        if (!fc || fc.managerId !== currentUser.id) {
          throw new ForbiddenError(
            "Forbidden to add tenant to this food court",
          );
        }
      }
    } else {
      foodCourtId =
        foodCourtId ?? (await this.getOrCreateDefaultFoodCourt());
    }

    // 1. Validasi keunikan stall number pada tenant yang aktif di food court yang sama
    const isOpen = data.isOpen ?? true;
    if (isOpen) {
      const activeStall = await db
        .select({ id: tenants.id, name: tenants.name })
        .from(tenants)
        .where(
          and(
            eq(tenants.foodCourtId, foodCourtId),
            eq(tenants.stallNumber, data.stallNumber),
            eq(tenants.isOpen, true),
          ),
        )
        .limit(1);

      if (activeStall.length > 0) {
        throw new ConflictError(
          `Stall number '${data.stallNumber}' is already occupied by active tenant '${activeStall[0].name}' in this food court`,
        );
      }
    }

    // 2. Generate slug otomatis dan pastikan unique per food court
    const baseSlug = generateSlug(data.name);
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existingSlug = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(
          and(
            eq(tenants.foodCourtId, foodCourtId),
            eq(tenants.slug, slug),
          ),
        )
        .limit(1);

      if (existingSlug.length === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const id = crypto.randomUUID();
    const ownerId = data.ownerId || currentUser.id;

    const newTenant = {
      id,
      foodCourtId,
      name: data.name,
      slug,
      description: data.description ?? null,
      stallNumber: data.stallNumber,
      ownerId,
      isOpen,
      logo: data.logo ?? null,
      openingTime: data.openingTime ?? null,
      closingTime: data.closingTime ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(tenants).values(newTenant);
    return newTenant;
  }

  async update(id: string, data: UpdateTenantDTOType, currentUser: AuthUser) {
    const existing = await this.getById(id);

    let isManager = false;
    if (currentUser.role === "admin-food-court") {
      const fc = await db.query.foodCourts.findFirst({
        where: eq(foodCourts.id, existing.foodCourtId),
      });
      isManager = fc?.managerId === currentUser.id;
    }

    if (
      currentUser.role !== "admin" &&
      existing.ownerId !== currentUser.id &&
      !isManager
    ) {
      throw new ForbiddenError(
        "You do not have permission to modify this tenant",
      );
    }

    // 1. Validasi keunikan stall number jika stallNumber atau isOpen diupdate
    const targetStallNumber = data.stallNumber ?? existing.stallNumber;
    const targetIsOpen =
      data.isOpen !== undefined ? data.isOpen : existing.isOpen;

    if (targetIsOpen) {
      const activeStall = await db
        .select({ id: tenants.id, name: tenants.name })
        .from(tenants)
        .where(
          and(
            eq(tenants.foodCourtId, existing.foodCourtId),
            eq(tenants.stallNumber, targetStallNumber),
            eq(tenants.isOpen, true),
            ne(tenants.id, id),
          ),
        )
        .limit(1);

      if (activeStall.length > 0) {
        throw new ConflictError(
          `Stall number '${targetStallNumber}' is already occupied by active tenant '${activeStall[0].name}' in this food court`,
        );
      }
    }

    // 2. Generate slug baru jika nama diubah
    let updatedSlug: string | undefined;
    if (data.name && data.name !== existing.name) {
      const baseSlug = generateSlug(data.name);
      updatedSlug = baseSlug;
      let counter = 1;
      while (true) {
        const existingSlug = await db
          .select({ id: tenants.id })
          .from(tenants)
          .where(
            and(
              eq(tenants.foodCourtId, existing.foodCourtId),
              eq(tenants.slug, updatedSlug),
              ne(tenants.id, id),
            ),
          )
          .limit(1);

        if (existingSlug.length === 0) break;
        updatedSlug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const updateData: Partial<typeof tenants.$inferInsert> = {
      ...data,
      ...(updatedSlug ? { slug: updatedSlug } : {}),
      updatedAt: new Date(),
    };

    await db.update(tenants).set(updateData).where(eq(tenants.id, id));
    return this.getById(id);
  }

  async delete(id: string, currentUser: AuthUser) {
    const existing = await this.getById(id);

    let isManager = false;
    if (currentUser.role === "admin-food-court") {
      const fc = await db.query.foodCourts.findFirst({
        where: eq(foodCourts.id, existing.foodCourtId),
      });
      isManager = fc?.managerId === currentUser.id;
    }

    if (
      currentUser.role !== "admin" &&
      existing.ownerId !== currentUser.id &&
      !isManager
    ) {
      throw new ForbiddenError(
        "You do not have permission to delete this tenant",
      );
    }

    await db.delete(tenants).where(eq(tenants.id, id));
    return { success: true, message: `Tenant '${existing.name}' deleted` };
  }
}

export const tenantService = new TenantService();
