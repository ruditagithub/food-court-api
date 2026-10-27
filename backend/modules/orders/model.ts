import { t } from "elysia";

export const OrderItemInput = t.Object({
  menuId: t.String(),
  quantity: t.Integer({ minimum: 1, default: 1 }),
  specialNotes: t.Optional(t.String({ maxLength: 200 })),
  specialInstructions: t.Optional(t.String({ maxLength: 200 })),
  notes: t.Optional(t.String({ maxLength: 200 })),
  optionIds: t.Optional(t.Array(t.String())),
});

export const CreateOrderDTO = t.Object({
  tableId: t.Optional(t.String()),
  sessionId: t.Optional(t.String()),
  kioskId: t.Optional(t.String()),
  customerName: t.Optional(t.String({ minLength: 2, maxLength: 50 })),
  notes: t.Optional(t.String({ maxLength: 500 })),
  orderType: t.Optional(
    t.Union([t.Literal("DINE_IN"), t.Literal("TAKEAWAY")]),
  ),
  discountCode: t.Optional(t.String()),
  discountId: t.Optional(t.String()),
  items: t.Array(OrderItemInput, { minItems: 1 }),
});

export const JoinSessionDTO = t.Object({
  qrToken: t.Optional(t.String()),
  sessionCode: t.Optional(t.String()),
  name: t.String({ minLength: 2, maxLength: 100 }),
  deviceToken: t.Optional(t.String()),
});

export const UpdateOrderStatusDTO = t.Object({
  status: t.Union([
    t.Literal("pending"),
    t.Literal("confirmed"),
    t.Literal("cooking"),
    t.Literal("ready"),
    t.Literal("completed"),
    t.Literal("cancelled"),
    t.Literal("DRAFT"),
    t.Literal("CONFIRMED"),
    t.Literal("SENT_TO_KITCHEN"),
    t.Literal("COMPLETED"),
    t.Literal("CANCELLED"),
  ]),
});

export const UpdateTenantOrderStatusDTO = t.Object({
  status: t.Union([
    t.Literal("WAITING_PAYMENT"),
    t.Literal("QUEUED"),
    t.Literal("PREPARING"),
    t.Literal("READY"),
    t.Literal("COMPLETED"),
    t.Literal("CANCELLED"),
    t.Literal("cancelled"),
  ]),
  cookingStatus: t.Optional(t.String()),
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

export const SplitBillDTO = t.Object({
  groups: t.Array(
    t.Object({
      participantName: t.String({ minLength: 1, maxLength: 120 }),
      items: t.Array(
        t.Object({
          orderItemId: t.String(),
          // Omitted = the whole line quantity
          quantity: t.Optional(t.Integer({ minimum: 1 })),
        }),
        { minItems: 1 },
      ),
    }),
    { minItems: 1 },
  ),
});

export const OrderQueryDTO = t.Object({
  status: t.Optional(t.String()),
  tableId: t.Optional(t.String()),
  tenantId: t.Optional(t.String()),
  sessionId: t.Optional(t.String()),
});

export type OrderItemInputType = typeof OrderItemInput.static;
export type CreateOrderDTOType = typeof CreateOrderDTO.static;
export type JoinSessionDTOType = typeof JoinSessionDTO.static;
export type SplitBillDTOType = typeof SplitBillDTO.static;
export type UpdateOrderStatusDTOType = typeof UpdateOrderStatusDTO.static;
export type UpdateTenantOrderStatusDTOType =
  typeof UpdateTenantOrderStatusDTO.static;
export type UpdateOrderItemStatusDTOType =
  typeof UpdateOrderItemStatusDTO.static;
