import { t } from "elysia";

export const OrderItemInput = t.Object({
  menuId: t.String(),
  quantity: t.Integer({ minimum: 1, default: 1 }),
  specialNotes: t.Optional(t.String({ maxLength: 200 })),
});

export const CreateOrderDTO = t.Object({
  tableId: t.Optional(t.String()),
  customerName: t.Optional(t.String({ minLength: 2, maxLength: 50 })),
  notes: t.Optional(t.String({ maxLength: 500 })),
  items: t.Array(OrderItemInput, { minItems: 1 }),
});

export const UpdateOrderStatusDTO = t.Object({
  status: t.Union([
    t.Literal("pending"),
    t.Literal("confirmed"),
    t.Literal("cooking"),
    t.Literal("ready"),
    t.Literal("completed"),
    t.Literal("cancelled"),
  ]),
});

export const UpdateOrderItemStatusDTO = t.Object({
  itemStatus: t.Union([
    t.Literal("pending"),
    t.Literal("cooking"),
    t.Literal("ready"),
    t.Literal("served"),
    t.Literal("cancelled"),
  ]),
});

export const OrderQueryDTO = t.Object({
  status: t.Optional(t.String()),
  tableId: t.Optional(t.String()),
  tenantId: t.Optional(t.String()),
});

export type CreateOrderDTOType = typeof CreateOrderDTO.static;
export type UpdateOrderStatusDTOType = typeof UpdateOrderStatusDTO.static;
export type UpdateOrderItemStatusDTOType =
  typeof UpdateOrderItemStatusDTO.static;
