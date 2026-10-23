import { Elysia, t } from "elysia";
import {
  authPlugin,
  requireAuth,
  requireRoles,
} from "../../common/middlewares/auth";
import {
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CreateMenuDTO,
  MenuQueryDTO,
  UpdateMenuDTO,
} from "./model";
import { menuService } from "./service";

export const menusController = new Elysia({ prefix: "/api/menus" })
  .use(authPlugin)
  .get(
    "/",
    async ({ query, user }) => {
      requireRoles(user, ["admin", "admin-food-court", "tenant"]);
      const isAvailable =
        query.isAvailable === "true"
          ? true
          : query.isAvailable === "false"
            ? false
            : undefined;

      const data = await menuService.getAll(
        {
          tenantId: query.tenantId,
          categoryId: query.categoryId,
          isAvailable,
          search: query.search,
        },
        user,
      );

      return { data };
    },
    {
      query: MenuQueryDTO,
      detail: {
        tags: ["Menus"],
        summary:
          "Get list of menu items with optional filters (Admin, Admin Food Court, and Tenant only)",
      },
    },
  )
  .get(
    "/categories",
    async ({ query, user }) => {
      requireRoles(user, ["admin", "admin-food-court", "tenant"]);
      const data = await menuService.getAllCategories(query.tenantId, user);
      return { data };
    },
    {
      query: t.Object({
        tenantId: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Menus"],
        summary: "Get list of menu categories (Admin, Admin Food Court, and Tenant)",
      },
    },
  )
  .get(
    "/categories/:tenantId",
    async ({ params: { tenantId }, user }) => {
      const data = await menuService.getCategoriesByTenant(tenantId, user);
      return { data };
    },
    {
      params: t.Object({
        tenantId: t.String(),
      }),
      detail: {
        tags: ["Menus"],
        summary: "Get all categories for a specific tenant",
      },
    },
  )
  .get(
    "/tenant/:tenantId",
    async ({ params: { tenantId }, query, user }) => {
      const isAvailable =
        query.isAvailable === "true"
          ? true
          : query.isAvailable === "false"
            ? false
            : undefined;

      const data = await menuService.getMenusByTenant(
        tenantId,
        {
          categoryId: query.categoryId,
          isAvailable,
          search: query.search,
        },
        user,
      );

      return { data };
    },
    {
      params: t.Object({
        tenantId: t.String(),
      }),
      query: t.Object({
        categoryId: t.Optional(t.String()),
        isAvailable: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Menus"],
        summary: "Get all menu items for a specific tenant (by tenant ID or slug)",
      },
    },
  )
  .post(
    "/categories",
    async ({ body, user, set }) => {
      requireRoles(user, ["admin", "tenant", "admin-food-court"]);
      const category = await menuService.createCategory(body, user);
      set.status = 201;
      return {
        message: "Category created successfully",
        data: category,
      };
    },
    {
      body: CreateCategoryDTO,
      detail: {
        tags: ["Menus"],
        summary: "Create a new category for a tenant's menu",
      },
    },
  )
  .put(
    "/categories/:id",
    async ({ params: { id }, body, user }) => {
      requireRoles(user, ["admin", "tenant", "admin-food-court"]);
      const updated = await menuService.updateCategory(id, body, user);
      return {
        message: "Category updated successfully",
        data: updated,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateCategoryDTO,
      detail: {
        tags: ["Menus"],
        summary: "Update a menu category by id (Tenant owner or Admin)",
      },
    },
  )
  .delete(
    "/categories/:id",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin", "tenant", "admin-food-court"]);
      const result = await menuService.deleteCategory(id, user);
      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Menus"],
        summary: "Delete a menu category by id (Tenant owner or Admin)",
      },
    },
  )
  .get(
    "/:id",
    async ({ params: { id } }) => {
      const data = await menuService.getById(id);
      return { data };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Menus"],
        summary: "Get menu item by id",
      },
    },
  )
  .post(
    "/",
    async ({ body, user, set }) => {
      requireRoles(user, ["admin", "tenant", "admin-food-court"]);
      const newMenu = await menuService.create(body, user);
      set.status = 201;
      return {
        message: "Menu item created successfully",
        data: newMenu,
      };
    },
    {
      body: CreateMenuDTO,
      detail: {
        tags: ["Menus"],
        summary: "Create a new menu item (Tenant owner or Admin)",
      },
    },
  )
  .put(
    "/:id",
    async ({ params: { id }, body, user }) => {
      requireAuth(user);
      const updated = await menuService.update(id, body, user);
      return {
        message: "Menu item updated successfully",
        data: updated,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateMenuDTO,
      detail: {
        tags: ["Menus"],
        summary: "Update a menu item (Tenant owner or Admin)",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params: { id }, user }) => {
      requireAuth(user);
      const result = await menuService.delete(id, user);
      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Menus"],
        summary: "Delete a menu item (Tenant owner or Admin)",
      },
    },
  );
