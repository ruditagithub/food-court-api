import { eq } from "drizzle-orm";
import { ForbiddenError, NotFoundError } from "../../common/errors";
import type { AuthUser } from "../../common/middlewares/auth";
import { db } from "../../db";
import { tenants } from "../../db/schema";
import type { CreateTenantDTOType, UpdateTenantDTOType } from "./model";

export class TenantService {
  async getAll(isOpenFilter?: boolean) {
    if (typeof isOpenFilter === "boolean") {
      return db.query.tenants.findMany({
        where: eq(tenants.isOpen, isOpenFilter),
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
    const id = crypto.randomUUID();
    const ownerId =
      currentUser.role === "admin" && data.ownerId
        ? data.ownerId
        : currentUser.id;

    const newTenant = {
      id,
      name: data.name,
      description: data.description ?? null,
      stallNumber: data.stallNumber,
      ownerId,
      isOpen: data.isOpen ?? true,
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
