import { Elysia, t } from "elysia";
import { authPlugin, requireAuth } from "../../common/middlewares/auth";
import {
  CreateOrderDTO,
  JoinSessionDTO,
  OrderQueryDTO,
  UpdateOrderItemStatusDTO,
  UpdateOrderStatusDTO,
  UpdateTenantOrderStatusDTO,
} from "./model";
import { orderService } from "./service";

export const ordersController = new Elysia({ prefix: "/api/orders" })
  .use(authPlugin)
  .post(
    "/",
    async ({ body, user, set }) => {
      const order = await orderService.create(body, user);
      set.status = 201;
      return {
        message: "Order placed successfully",
        data: order,
      };
    },
    {
      body: CreateOrderDTO,
      detail: {
        tags: ["Orders"],
        summary:
          "Place a new order (multi-tier, dining sessions, and snapshots)",
      },
    },
  )
  .get(
    "/",
    async ({ query, user }) => {
      const data = await orderService.getAll(user, {
        status: query.status,
        tableId: query.tableId,
        sessionId: query.sessionId,
      });
      return { data };
    },
    {
      query: OrderQueryDTO,
      detail: {
        tags: ["Orders"],
        summary: "Get orders list (filtered by role, table, or session)",
      },
    },
  )
  .get(
    "/track/:orderNumber",
    async ({ params: { orderNumber } }) => {
      const data = await orderService.trackByOrderNumber(orderNumber);
      return { data };
    },
    {
      params: t.Object({
        orderNumber: t.String(),
      }),
      detail: {
        tags: ["Orders"],
        summary: "Public tracking of order status and kitchen queue",
      },
    },
  )
  .post(
    "/sessions/join",
    async ({ body, user, set }) => {
      const result = await orderService.joinSession(body, user);
      set.status = 200;
      return {
        message: "Joined dining session successfully",
        data: result,
      };
    },
    {
      body: JoinSessionDTO,
      detail: {
        tags: ["Orders"],
        summary: "Join an active dining table session",
      },
    },
  )
  .get(
    "/:id",
    async ({ params: { id } }) => {
      const data = await orderService.getById(id);
      return { data };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Orders"],
        summary: "Get full order details with tenant sub-orders and bills",
      },
    },
  )
  .patch(
    "/:id/status",
    async ({ params: { id }, body, user }) => {
      requireAuth(user);
      const updated = await orderService.updateStatus(id, body, user);
      return {
        message: "Order status updated successfully",
        data: updated,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateOrderStatusDTO,
      detail: {
        tags: ["Orders"],
        summary:
          "Update overall order status and close session/release table (Admin or Tenant involved)",
      },
    },
  )
  .patch(
    "/tenant-orders/:id/status",
    async ({ params: { id }, body, user }) => {
      requireAuth(user);
      const updated = await orderService.updateTenantOrderStatus(id, body, user);
      return {
        message: "Tenant order status updated successfully",
        data: updated,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateTenantOrderStatusDTO,
      detail: {
        tags: ["Orders"],
        summary:
          "Update cooking status of tenant sub-order (Tenant stall owner)",
      },
    },
  )
  .patch(
    "/items/:itemId/status",
    async ({ params: { itemId }, body, user }) => {
      requireAuth(user);
      const updated = await orderService.updateItemStatus(itemId, body, user);
      return {
        message: "Order item status updated successfully",
        data: updated,
      };
    },
    {
      params: t.Object({
        itemId: t.String(),
      }),
      body: UpdateOrderItemStatusDTO,
      detail: {
        tags: ["Orders"],
        summary: "Update item-level status (Tenant owner)",
      },
    },
  );
