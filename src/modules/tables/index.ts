import { Elysia, t } from "elysia";
import { authPlugin, requireRoles } from "../../common/middlewares/auth";
import { CreateTableDTO, TableQueryDTO, UpdateTableDTO } from "./model";
import { tableService } from "./service";

export const tablesController = new Elysia({ prefix: "/api/tables" })
  .use(authPlugin)
  .get(
    "/",
    async ({ query, user }) => {
      requireRoles(user, ["admin", "admin-food-court", "tenant"]);
      const data = await tableService.getAll(
        { status: query.status },
        user
      );
      return { data };
    },
    {
      query: TableQueryDTO,
      detail: {
        tags: ["Tables"],
        summary: "Get list of tables (optionally filter by status)",
      },
    },
  )
  .get(
    "/:id",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin", "admin-food-court", "tenant"]);
      const data = await tableService.getById(id, user);
      return { data };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Tables"],
        summary: "Get table details by id",
      },
    },
  )
  .post(
    "/",
    async ({ body, user, set }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const table = await tableService.create(body, user);
      set.status = 201;
      return {
        message: "Table created successfully",
        data: table,
      };
    },
    {
      body: CreateTableDTO,
      detail: {
        tags: ["Tables"],
        summary: "Create a new table (Admin, Admin Food Court)",
      },
    },
  )
  .put(
    "/:id",
    async ({ params: { id }, body, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const updated = await tableService.update(id, body, user);
      return {
        message: "Table updated successfully",
        data: updated,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateTableDTO,
      detail: {
        tags: ["Tables"],
        summary: "Update table status or capacity (Admin, Admin Food Court)",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const result = await tableService.delete(id, user);
      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Tables"],
        summary: "Delete table (Admin, Admin Food Court)",
      },
    },
  );
