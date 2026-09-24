import { and, eq, inArray, like, or } from "drizzle-orm";
import { ForbiddenError, NotFoundError } from "../../common/errors";
import type { AuthUser } from "../../common/middlewares/auth";
import { db } from "../../db";
import { categories, foodCourts, menus, tenants } from "../../db/schema";
import type {
  CreateCategoryDTOType,
  CreateMenuDTOType,
  UpdateMenuDTOType,
} from "./model";

export class MenuService {
  private async checkTenantOwnership(tenantId: string, user: AuthUser) {
    if (user.role === "admin") return;

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      with: {
        foodCourt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundError(`Tenant '${tenantId}' not found`);
    }

    if (user.role === "admin-food-court") {
      if (tenant.foodCourt?.managerId !== user.id) {
        throw new ForbiddenError(
          "You do not have permission to manage this food court's menu",
        );
      }
      return;
    }

    if (tenant.ownerId !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to manage this tenant's menu",
      );
    }
  }

  async getAll(
    params: {
      tenantId?: string;
      categoryId?: string;
      isAvailable?: boolean;
      search?: string;
    },
    currentUser?: AuthUser | null,
  ) {
    const conditions = [];

    // Resolve tenantId if provided (support UUID or slug)
    let targetTenantId = params.tenantId;
    if (targetTenantId) {
      const foundTenant = await db.query.tenants.findFirst({
        where: or(
          eq(tenants.id, targetTenantId),
          eq(tenants.slug, targetTenantId),
        ),
      });
      if (foundTenant) {
        targetTenantId = foundTenant.id;
      }
    }

    if (currentUser?.role === "tenant") {
      // Akun tenant hanya melihat menu milik kios miliknya
      const ownedTenants = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.ownerId, currentUser.id));

      const ownedIds = ownedTenants.map((t) => t.id);
      if (ownedIds.length === 0) {
        return [];
      }

      if (targetTenantId) {
        if (!ownedIds.includes(targetTenantId)) {
          return [];
        }
        conditions.push(eq(menus.tenantId, targetTenantId));
      } else {
        conditions.push(inArray(menus.tenantId, ownedIds));
      }
    } else if (currentUser?.role === "admin-food-court") {
      // Akun admin-food-court hanya melihat menu dari tenant di food court miliknya
      const managedCourts = await db
        .select({ id: foodCourts.id })
        .from(foodCourts)
        .where(eq(foodCourts.managerId, currentUser.id));

      const courtIds = managedCourts.map((c) => c.id);
      if (courtIds.length === 0) {
        return [];
      }

      const courtTenants = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(inArray(tenants.foodCourtId, courtIds));

      const allowedTenantIds = courtTenants.map((t) => t.id);
      if (allowedTenantIds.length === 0) {
        return [];
      }

      if (targetTenantId) {
        if (!allowedTenantIds.includes(targetTenantId)) {
          return [];
        }
        conditions.push(eq(menus.tenantId, targetTenantId));
      } else {
        conditions.push(inArray(menus.tenantId, allowedTenantIds));
      }
    } else if (targetTenantId) {
      conditions.push(eq(menus.tenantId, targetTenantId));
    }

    if (params.categoryId) {
      conditions.push(eq(menus.categoryId, params.categoryId));
    }
    if (typeof params.isAvailable === "boolean") {
      conditions.push(eq(menus.isAvailable, params.isAvailable));
    }
    if (params.search) {
      conditions.push(like(menus.name, `%${params.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db.query.menus.findMany({
      where: whereClause,
      with: {
        category: true,
        tenant: true,
      },
    });
  }

  async getById(id: string) {
    const menu = await db.query.menus.findFirst({
      where: eq(menus.id, id),
      with: {
        category: true,
        tenant: true,
      },
    });

    if (!menu) {
      throw new NotFoundError(`Menu item with id '${id}' not found`);
    }

    return menu;
  }

  async create(data: CreateMenuDTOType, user: AuthUser) {
    await this.checkTenantOwnership(data.tenantId, user);

    let categoryId: string | null = null;
    const rawCategoryId = data.categoryId?.trim();
    if (rawCategoryId) {
      const category = await db.query.categories.findFirst({
        where: and(
          eq(categories.id, rawCategoryId),
          eq(categories.tenantId, data.tenantId),
        ),
      });

      if (!category) {
        throw new NotFoundError(
          `Category '${rawCategoryId}' not found for tenant '${data.tenantId}'`,
        );
      }
      categoryId = category.id;
    }

    const id = crypto.randomUUID();
    const newMenu = {
      id,
      tenantId: data.tenantId,
      categoryId,
      name: data.name,
      description: data.description?.trim() ? data.description.trim() : null,
      price: Number(data.price),
      imageUrl: data.imageUrl?.trim() ? data.imageUrl.trim() : null,
      isAvailable: data.isAvailable ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(menus).values(newMenu);
    return this.getById(id);
  }

  async update(id: string, data: UpdateMenuDTOType, user: AuthUser) {
    const existing = await this.getById(id);
    await this.checkTenantOwnership(existing.tenantId, user);

    let categoryId: string | null | undefined = undefined;
    if (data.categoryId !== undefined) {
      const rawCategoryId = data.categoryId?.trim();
      if (rawCategoryId) {
        const category = await db.query.categories.findFirst({
          where: and(
            eq(categories.id, rawCategoryId),
            eq(categories.tenantId, existing.tenantId),
          ),
        });

        if (!category) {
          throw new NotFoundError(
            `Category '${rawCategoryId}' not found for tenant '${existing.tenantId}'`,
          );
        }
        categoryId = category.id;
      } else {
        categoryId = null;
      }
    }

    const updateData: Partial<typeof menus.$inferInsert> = {
      ...data,
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(data.price !== undefined ? { price: Number(data.price) } : {}),
      ...(data.description !== undefined
        ? {
            description: data.description?.trim()
              ? data.description.trim()
              : null,
          }
        : {}),
      ...(data.imageUrl !== undefined
        ? { imageUrl: data.imageUrl?.trim() ? data.imageUrl.trim() : null }
        : {}),
      updatedAt: new Date(),
    };

    await db.update(menus).set(updateData).where(eq(menus.id, id));
    return this.getById(id);
  }

  async delete(id: string, user: AuthUser) {
    const existing = await this.getById(id);
    await this.checkTenantOwnership(existing.tenantId, user);

    await db.delete(menus).where(eq(menus.id, id));
    return { success: true, message: `Menu '${existing.name}' deleted` };
  }

  // Category management
  async createCategory(data: CreateCategoryDTOType, user: AuthUser) {
    await this.checkTenantOwnership(data.tenantId, user);

    const id = crypto.randomUUID();
    const newCategory = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      createdAt: new Date(),
    };

    await db.insert(categories).values(newCategory);
    return newCategory;
  }

  async getCategoriesByTenant(
    tenantIdOrSlug: string,
    currentUser?: AuthUser | null,
  ) {
    const tenant = await db.query.tenants.findFirst({
      where: or(
        eq(tenants.id, tenantIdOrSlug),
        eq(tenants.slug, tenantIdOrSlug),
      ),
      with: {
        foodCourt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundError(`Tenant '${tenantIdOrSlug}' not found`);
    }

    if (currentUser?.role === "admin-food-court") {
      if (tenant.foodCourt?.managerId !== currentUser.id) {
        throw new ForbiddenError(
          "You do not have permission to view categories for this tenant",
        );
      }
    } else if (currentUser?.role === "tenant") {
      if (tenant.ownerId !== currentUser.id) {
        throw new ForbiddenError(
          "You do not have permission to view categories for this tenant",
        );
      }
    }

    return db.query.categories.findMany({
      where: eq(categories.tenantId, tenant.id),
      with: {
        menus: {
          where: eq(menus.tenantId, tenant.id),
        },
      },
    });
  }

  async getMenusByTenant(
    tenantIdOrSlug: string,
    params?: {
      categoryId?: string;
      isAvailable?: boolean;
      search?: string;
    },
    currentUser?: AuthUser | null,
  ) {
    const tenant = await db.query.tenants.findFirst({
      where: or(
        eq(tenants.id, tenantIdOrSlug),
        eq(tenants.slug, tenantIdOrSlug),
      ),
      with: {
        foodCourt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundError(`Tenant '${tenantIdOrSlug}' not found`);
    }

    if (currentUser?.role === "admin-food-court") {
      if (tenant.foodCourt?.managerId !== currentUser.id) {
        throw new ForbiddenError(
          "You do not have permission to view menus for this tenant",
        );
      }
    } else if (currentUser?.role === "tenant") {
      if (tenant.ownerId !== currentUser.id) {
        throw new ForbiddenError(
          "You do not have permission to view menus for this tenant",
        );
      }
    }

    const conditions = [eq(menus.tenantId, tenant.id)];

    if (params?.categoryId) {
      conditions.push(eq(menus.categoryId, params.categoryId));
    }
    if (typeof params?.isAvailable === "boolean") {
      conditions.push(eq(menus.isAvailable, params.isAvailable));
    }
    if (params?.search) {
      conditions.push(like(menus.name, `%${params.search}%`));
    }

    return db.query.menus.findMany({
      where: and(...conditions),
      with: {
        category: true,
        tenant: true,
      },
    });
  }
}

export const menuService = new MenuService();
