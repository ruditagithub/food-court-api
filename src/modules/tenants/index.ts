import { Elysia, t } from "elysia";
import {
  authPlugin,
  requireAuth,
  requireRoles,
} from "../../common/middlewares/auth";
import { CreateTenantDTO, TenantQueryDTO, UpdateTenantDTO } from "./model";
import { tenantService } from "./service";

export const tenantsController = new Elysia({ prefix: "/api/tenants" })
  .use(authPlugin)
  .get(
    "/",
    async ({ query }) => {
      const isOpen =
        query.isOpen === "true"
          ? true
          : query.isOpen === "false"
            ? false
            : undefined;
      const data = await tenantService.getAll(isOpen);
      return { data };
    },
    {
      query: TenantQueryDTO,
      detail: {
        tags: ["Tenants"],
        summary: "Get all food court tenants/stalls",
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
  .post(
    "/",
    async ({ body, user, set }) => {
      requireRoles(user, ["admin", "tenant"]);
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
        summary: "Create a new food court stall (Admin or Tenant)",
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
