import { Elysia, t } from "elysia";
import { authPlugin, requireRoles } from "../../common/middlewares/auth";
import { CreateTableDTO, SessionHistoryQueryDTO, TableQueryDTO, UpdateTableDTO } from "./model";
import { tableService } from "./service";

export const tablesController = new Elysia({ prefix: "/api/tables" })
  .use(authPlugin)
  .get(
    "/scan/:qrToken",
    async ({ params: { qrToken } }) => {
      const data = await tableService.getByQrToken(qrToken);
      return { data };
    },
    {
      params: t.Object({
        qrToken: t.String(),
      }),
      detail: {
        tags: ["Tables"],
        summary: "Get table details by QR token (Public)",
      },
    },
  )
  .get(
    "/",
    async ({ query, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
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
      requireRoles(user, ["admin", "admin-food-court"]);
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
  .get(
    "/:id/sessions",
    async ({ params: { id }, query, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const data = await tableService.getSessionHistory(
        id,
        {
          status: query.status,
          limit: query.limit ? parseInt(query.limit) : undefined,
          offset: query.offset ? parseInt(query.offset) : undefined,
        },
        user,
      );
      return { data };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: SessionHistoryQueryDTO,
      detail: {
        tags: ["Tables"],
        summary:
          "Get dining session history for a table (Admin, Admin Food Court, Tenant)",
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
  .post(
    "/:id/regenerate-qr",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const updated = await tableService.regenerateQrToken(id, user);
      return {
        message: "QR Token regenerated successfully",
        data: updated,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Tables"],
        summary: "Regenerate QR token for a table (Admin, Admin Food Court)",
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
