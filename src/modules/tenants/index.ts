import { Elysia, t } from "elysia";
import {
  authPlugin,
  requireAuth,
  requireRoles,
} from "../../common/middlewares/auth";
import { CreateTenantDTO, TenantQueryDTO, UpdateTenantDTO } from "./model";
import { tenantService } from "./service";
import { menuService } from "../menus/service";
import { foodCourtService } from "../food-courts/service";

export const tenantsController = new Elysia({ prefix: "/api/tenants" })
  .use(authPlugin)
  .get(
    "/",
    async ({ query, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const isOpen =
        query.isOpen === "true"
          ? true
          : query.isOpen === "false"
            ? false
            : undefined;
      const data = await tenantService.getAll(
        { isOpen, foodCourtId: query.foodCourtId },
        user,
      );
      return { data };
    },
    {
      query: TenantQueryDTO,
      detail: {
        tags: ["Tenants"],
        summary: "Get all food court tenants/stalls (Admin and Admin Food Court only)",
      },
    },
  )
  .get(
    "/:id",
    async ({ params: { id } }) => {
      const data = await tenantService.getById(id);
      return { data };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Tenants"],
        summary: "Get tenant details with menus and categories",
      },
    },
  )
  .get(
    "/:id/menus",
    async ({ params: { id }, query, user }) => {
      const isAvailable =
        query.isAvailable === "true"
          ? true
          : query.isAvailable === "false"
            ? false
            : undefined;

      const data = await menuService.getMenusByTenant(
        id,
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
        id: t.String(),
      }),
      query: t.Object({
        categoryId: t.Optional(t.String()),
        isAvailable: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Tenants"],
        summary: "Get all menu items for a specific tenant",
      },
    },
  )
  .get(
    "/food-court/:id",
    async ({ params: { id }, query, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const isOpen =
        query.isOpen === "true"
          ? true
          : query.isOpen === "false"
            ? false
            : undefined;

      const data = await foodCourtService.getTenantsByFoodCourt(
        id,
        { isOpen, search: query.search },
        user,
      );

      return { data };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        isOpen: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
      detail: {
        hide: true,
      },
    },
  )
  .post(
    "/",
    async ({ body, user, set }) => {
      requireRoles(user, ["admin", "tenant", "admin-food-court"]);
      const newTenant = await tenantService.create(body, user);
      set.status = 201;
      return {
        message: "Tenant created successfully",
        data: newTenant,
      };
    },
    {
      body: CreateTenantDTO,
      detail: {
        tags: ["Tenants"],
        summary:
          "Create a new food court stall (Admin, Tenant, or Admin Food Court)",
      },
    },
  )
  .put(
    "/:id",
    async ({ params: { id }, body, user }) => {
      requireAuth(user);
      const updated = await tenantService.update(id, body, user);
      return {
        message: "Tenant updated successfully",
        data: updated,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateTenantDTO,
      detail: {
        tags: ["Tenants"],
        summary: "Update tenant details (Owner or Admin)",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params: { id }, user }) => {
      requireAuth(user);
      const result = await tenantService.delete(id, user);
      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Tenants"],
        summary: "Delete a tenant (Owner or Admin)",
      },
    },
  );
