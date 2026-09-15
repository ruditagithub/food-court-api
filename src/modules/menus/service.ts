import { and, eq, like } from "drizzle-orm";
import { ForbiddenError, NotFoundError } from "../../common/errors";
import type { AuthUser } from "../../common/middlewares/auth";
import { db } from "../../db";
import { categories, menus, tenants } from "../../db/schema";
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
    });

    if (!tenant) {
      throw new NotFoundError(`Tenant '${tenantId}' not found`);
    }

    if (tenant.ownerId !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to manage this tenant's menu",
      );
    }
  }

  async getAll(params: {
    tenantId?: string;
    categoryId?: string;
    isAvailable?: boolean;
    search?: string;
  }) {
    const conditions = [];

    if (params.tenantId) {
      conditions.push(eq(menus.tenantId, params.tenantId));
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

    const id = crypto.randomUUID();
    const newMenu = {
      id,
      tenantId: data.tenantId,
      categoryId: data.categoryId ?? null,
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      imageUrl: data.imageUrl ?? null,
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

    const updateData: Partial<typeof menus.$inferInsert> = {
      ...data,
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

  async getCategoriesByTenant(tenantId: string) {
    return db.query.categories.findMany({
      where: eq(categories.tenantId, tenantId),
      with: {
        menus: true,
      },
    });
  }
}

export const menuService = new MenuService();
