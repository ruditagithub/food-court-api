import { and, eq } from "drizzle-orm";
import { ForbiddenError, NotFoundError } from "../../common/errors";
import type { AuthUser } from "../../common/middlewares/auth";
import { db } from "../../db";
import { foodCourts, tenants } from "../../db/schema";
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

  async getAll(filter?: { isOpen?: boolean }) {
    const conditions = [];
    if (typeof filter?.isOpen === "boolean") {
      conditions.push(eq(tenants.isOpen, filter.isOpen));
    }

    if (conditions.length > 0) {
      return db.query.tenants.findMany({
        where: and(...conditions),
        with: {
          categories: true,
        },
      });
    }

    return db.query.tenants.findMany({
      with: {
        categories: true,
      },
    });
  }

  async getById(id: string) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, id),
      with: {
        foodCourt: true,
        categories: {
          with: {
            menus: true,
          },
        },
        menus: true,
      },
    });

    if (!tenant) {
      throw new NotFoundError(`Tenant with id '${id}' not found`);
    }

    return tenant;
  }

  async create(data: CreateTenantDTOType, currentUser: AuthUser) {
    const foodCourtId =
      data.foodCourtId ?? (await this.getOrCreateDefaultFoodCourt());

    const id = crypto.randomUUID();
    const ownerId =
      currentUser.role === "admin" && data.ownerId
        ? data.ownerId
        : currentUser.id;

    const slug =
      data.slug ??
      `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`;

    const newTenant = {
      id,
      foodCourtId,
      name: data.name,
      slug,
      description: data.description ?? null,
      stallNumber: data.stallNumber,
      ownerId,
      isOpen: data.isOpen ?? true,
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

    if (currentUser.role !== "admin" && existing.ownerId !== currentUser.id) {
      throw new ForbiddenError(
        "You do not have permission to modify this tenant",
      );
    }

    const updateData: Partial<typeof tenants.$inferInsert> = {
      ...data,
      updatedAt: new Date(),
    };

    await db.update(tenants).set(updateData).where(eq(tenants.id, id));
    return this.getById(id);
  }

  async delete(id: string, currentUser: AuthUser) {
    const existing = await this.getById(id);

    if (currentUser.role !== "admin" && existing.ownerId !== currentUser.id) {
      throw new ForbiddenError(
        "You do not have permission to delete this tenant",
      );
    }

    await db.delete(tenants).where(eq(tenants.id, id));
    return { success: true, message: `Tenant '${existing.name}' deleted` };
  }
}

export const tenantService = new TenantService();
