import { Elysia, t } from "elysia";
import { authPlugin, requireAuth } from "../../common/middlewares/auth";
import {
  CreateOrderDTO,
  OrderQueryDTO,
  UpdateOrderItemStatusDTO,
  UpdateOrderStatusDTO,
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
          "Place a new order (multi-tenant supported, guest or logged in)",
      },
    },
  )
  .get(
    "/",
    async ({ query, user }) => {
      const data = await orderService.getAll(user, {
        status: query.status,
        tableId: query.tableId,
      });
      return { data };
    },
    {
      query: OrderQueryDTO,
      detail: {
        tags: ["Orders"],
        summary: "Get orders list (filtered by role or query)",
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
        summary: "Get full order details by id",
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
        summary: "Update overall order status (Admin only)",
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
        summary:
          "Update cooking/serving status of an order item (Tenant owner)",
      },
    },
  );
