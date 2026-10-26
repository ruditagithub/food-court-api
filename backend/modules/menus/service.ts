import { and, eq, inArray, like, or } from "drizzle-orm";
import { ForbiddenError, NotFoundError } from "../../common/errors";
import type { AuthUser } from "../../common/middlewares/auth";
import { db } from "../../db";
import { categories, foodCourts, menuOptions, menus, tenants } from "../../db/schema";
import type {
  CreateCategoryDTOType,
  CreateMenuDTOType,
  CreateMenuOptionDTOType,
  UpdateCategoryDTOType,
  UpdateMenuDTOType,
  UpdateMenuOptionDTOType,
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
        options: true,
      },
    });
  }

  async getById(id: string) {
    const menu = await db.query.menus.findFirst({
      where: eq(menus.id, id),
      with: {
        category: true,
        tenant: true,
        options: true,
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
      stock: data.stock !== undefined ? Number(data.stock) : 100,
      status: (data.stock !== undefined && data.stock <= 0) ? "OUT_OF_STOCK" as const : "AVAILABLE" as const,
      imageUrl: data.imageUrl?.trim() ? data.imageUrl.trim() : null,
      isAvailable: data.isAvailable ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(menus).values(newMenu);

    if (data.options && data.options.length > 0) {
      for (const opt of data.options) {
        await db.insert(menuOptions).values({
          id: crypto.randomUUID(),
          menuId: id,
          name: opt.name.trim(),
          priceAdjustment:
            opt.priceAdjustment !== undefined
              ? Number(opt.priceAdjustment)
              : 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

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

    const { options, ...restData } = data;
    const updateData: Partial<typeof menus.$inferInsert> = {
      ...restData,
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(data.price !== undefined ? { price: Number(data.price) } : {}),
      ...(data.stock !== undefined
        ? {
            stock: Number(data.stock),
            status: Number(data.stock) <= 0 ? "OUT_OF_STOCK" : "AVAILABLE",
          }
        : {}),
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

    if (options !== undefined) {
      const existingOptions = await db.query.menuOptions.findMany({
        where: eq(menuOptions.menuId, id),
      });

      const existingMap = new Map(existingOptions.map((o) => [o.id, o]));
      const keepingIds: string[] = [];

      for (const opt of options) {
        if (opt.id && existingMap.has(opt.id)) {
          keepingIds.push(opt.id);
          await db
            .update(menuOptions)
            .set({
              name: opt.name.trim(),
              priceAdjustment:
                opt.priceAdjustment !== undefined
                  ? Number(opt.priceAdjustment)
                  : 0,
              updatedAt: new Date(),
            })
            .where(eq(menuOptions.id, opt.id));
        } else {
          const newOptId = crypto.randomUUID();
          keepingIds.push(newOptId);
          await db.insert(menuOptions).values({
            id: newOptId,
            menuId: id,
            name: opt.name.trim(),
            priceAdjustment:
              opt.priceAdjustment !== undefined
                ? Number(opt.priceAdjustment)
                : 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      const toDelete = existingOptions.filter((o) => !keepingIds.includes(o.id));
      if (toDelete.length > 0) {
        await db
          .delete(menuOptions)
          .where(inArray(menuOptions.id, toDelete.map((o) => o.id)));
      }
    }

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
      name: data.name.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(categories).values(newCategory);
    return newCategory;
  }

  async updateCategory(id: string, data: UpdateCategoryDTOType, user: AuthUser) {
    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    if (!existing) {
      throw new NotFoundError(`Category with id '${id}' not found`);
    }

    await this.checkTenantOwnership(existing.tenantId, user);

    const updateData: Partial<typeof categories.$inferInsert> = {
      name: data.name.trim(),
      updatedAt: new Date(),
    };

    await db.update(categories).set(updateData).where(eq(categories.id, id));

    return db.query.categories.findFirst({
      where: eq(categories.id, id),
      with: {
        menus: true,
        tenant: true,
      },
    });
  }

  async deleteCategory(id: string, user: AuthUser) {
    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    if (!existing) {
      throw new NotFoundError(`Category with id '${id}' not found`);
    }

    await this.checkTenantOwnership(existing.tenantId, user);

    // Set categoryId to null for all menus in this category
    await db.update(menus).set({ categoryId: null }).where(eq(menus.categoryId, id));

    await db.delete(categories).where(eq(categories.id, id));
    return { success: true, message: `Category '${existing.name}' deleted successfully` };
  }

  async getAllCategories(
    tenantId?: string,
    currentUser?: AuthUser | null,
  ) {
    const conditions = [];

    let targetTenantId = tenantId;
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
      const ownedTenants = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.ownerId, currentUser.id));

      const ownedIds = ownedTenants.map((t) => t.id);
      if (ownedIds.length === 0) return [];

      if (targetTenantId) {
        if (!ownedIds.includes(targetTenantId)) return [];
        conditions.push(eq(categories.tenantId, targetTenantId));
      } else {
        conditions.push(inArray(categories.tenantId, ownedIds));
      }
    } else if (currentUser?.role === "admin-food-court") {
      const managedCourts = await db
        .select({ id: foodCourts.id })
        .from(foodCourts)
        .where(eq(foodCourts.managerId, currentUser.id));

      const courtIds = managedCourts.map((c) => c.id);
      if (courtIds.length === 0) return [];

      const courtTenants = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(inArray(tenants.foodCourtId, courtIds));

      const allowedTenantIds = courtTenants.map((t) => t.id);
      if (allowedTenantIds.length === 0) return [];

      if (targetTenantId) {
        if (!allowedTenantIds.includes(targetTenantId)) return [];
        conditions.push(eq(categories.tenantId, targetTenantId));
      } else {
        conditions.push(inArray(categories.tenantId, allowedTenantIds));
      }
    } else if (targetTenantId) {
      conditions.push(eq(categories.tenantId, targetTenantId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db.query.categories.findMany({
      where: whereClause,
      with: {
        menus: true,
        tenant: {
          with: {
            foodCourt: true,
          },
        },
      },
    });
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
        options: true,
      },
    });
  }

  // Sub-resource Menu Options management
  async getOptionsByMenu(menuId: string) {
    const menu = await db.query.menus.findFirst({
      where: eq(menus.id, menuId),
    });

    if (!menu) {
      throw new NotFoundError(`Menu item with id '${menuId}' not found`);
    }

    return db.query.menuOptions.findMany({
      where: eq(menuOptions.menuId, menuId),
    });
  }

  async addOption(
    menuId: string,
    data: CreateMenuOptionDTOType,
    user: AuthUser,
  ) {
    const menu = await db.query.menus.findFirst({
      where: eq(menus.id, menuId),
    });

    if (!menu) {
      throw new NotFoundError(`Menu item with id '${menuId}' not found`);
    }

    await this.checkTenantOwnership(menu.tenantId, user);

    const id = crypto.randomUUID();
    const newOption = {
      id,
      menuId,
      name: data.name.trim(),
      priceAdjustment:
        data.priceAdjustment !== undefined ? Number(data.priceAdjustment) : 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(menuOptions).values(newOption);
    return newOption;
  }

  async updateOption(
    optionId: string,
    data: UpdateMenuOptionDTOType,
    user: AuthUser,
  ) {
    const existing = await db.query.menuOptions.findFirst({
      where: eq(menuOptions.id, optionId),
      with: {
        menu: true,
      },
    });

    if (!existing) {
      throw new NotFoundError(`Menu option with id '${optionId}' not found`);
    }

    await this.checkTenantOwnership(existing.menu.tenantId, user);

    const updateData: Partial<typeof menuOptions.$inferInsert> = {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.priceAdjustment !== undefined
        ? { priceAdjustment: Number(data.priceAdjustment) }
        : {}),
      updatedAt: new Date(),
    };

    await db
      .update(menuOptions)
      .set(updateData)
      .where(eq(menuOptions.id, optionId));

    return db.query.menuOptions.findFirst({
      where: eq(menuOptions.id, optionId),
    });
  }

  async deleteOption(optionId: string, user: AuthUser) {
    const existing = await db.query.menuOptions.findFirst({
      where: eq(menuOptions.id, optionId),
      with: {
        menu: true,
      },
    });

    if (!existing) {
      throw new NotFoundError(`Menu option with id '${optionId}' not found`);
    }

    await this.checkTenantOwnership(existing.menu.tenantId, user);

    await db.delete(menuOptions).where(eq(menuOptions.id, optionId));
    return {
      success: true,
      message: `Menu option '${existing.name}' deleted successfully`,
    };
  }
}

export const menuService = new MenuService();
