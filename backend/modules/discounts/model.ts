import { t } from "elysia";
import type { discounts } from "../../db/schema";

export type Discount = typeof discounts.$inferSelect;
export type NewDiscount = typeof discounts.$inferInsert;

export const ValidateDiscountItemDTO = t.Object({
  menuId: t.String(),
  quantity: t.Integer({ minimum: 1, default: 1 }),
  optionIds: t.Optional(t.Array(t.String())),
});

export const ValidateDiscountDTO = t.Object({
  foodCourtId: t.String(),
  discountCode: t.Optional(t.String()),
  discountId: t.Optional(t.String()),
  items: t.Array(ValidateDiscountItemDTO, { minItems: 1 }),
});
export type ValidateDiscountInput = typeof ValidateDiscountDTO.static;

export const CreateDiscountDTO = t.Object({
  foodCourtId: t.String(),
  tenantId: t.Optional(t.Nullable(t.String())),
  code: t.Optional(t.Nullable(t.String({ maxLength: 50 }))),
  name: t.String({ minLength: 2, maxLength: 150 }),
  description: t.Optional(t.Nullable(t.String())),
  scope: t.Union([t.Literal("FOOD_COURT"), t.Literal("TENANT")]),
  type: t.Union([t.Literal("PERCENTAGE"), t.Literal("FIXED_AMOUNT")]),
  value: t.Integer({ minimum: 1 }),
  maxDiscountAmount: t.Optional(t.Nullable(t.Integer({ minimum: 1 }))),
  minOrderAmount: t.Optional(t.Integer({ minimum: 0, default: 0 })),
  isPublic: t.Optional(t.Boolean({ default: true })),
  usageLimit: t.Optional(t.Nullable(t.Integer({ minimum: 1 }))),
  startDate: t.String(),
  endDate: t.String(),
  status: t.Optional(
    t.Union([
      t.Literal("ACTIVE"),
      t.Literal("INACTIVE"),
      t.Literal("EXPIRED"),
    ]),
  ),
});
export type CreateDiscountInput = typeof CreateDiscountDTO.static;

export const UpdateDiscountDTO = t.Object({
  name: t.Optional(t.String({ minLength: 2, maxLength: 150 })),
  description: t.Optional(t.Nullable(t.String())),
  scope: t.Optional(t.Union([t.Literal("FOOD_COURT"), t.Literal("TENANT")])),
  tenantId: t.Optional(t.Nullable(t.String())),
  code: t.Optional(t.Nullable(t.String({ maxLength: 50 }))),
  type: t.Optional(
    t.Union([t.Literal("PERCENTAGE"), t.Literal("FIXED_AMOUNT")]),
  ),
  value: t.Optional(t.Integer({ minimum: 1 })),
  maxDiscountAmount: t.Optional(t.Nullable(t.Integer({ minimum: 1 }))),
  minOrderAmount: t.Optional(t.Integer({ minimum: 0 })),
  isPublic: t.Optional(t.Boolean()),
  usageLimit: t.Optional(t.Nullable(t.Integer({ minimum: 1 }))),
  startDate: t.Optional(t.String()),
  endDate: t.Optional(t.String()),
  status: t.Optional(
    t.Union([
      t.Literal("ACTIVE"),
      t.Literal("INACTIVE"),
      t.Literal("EXPIRED"),
    ]),
  ),
});
export type UpdateDiscountInput = typeof UpdateDiscountDTO.static;

export const PublicDiscountsQueryDTO = t.Object({
  foodCourtId: t.String(),
  tenantId: t.Optional(t.String()),
});
export type PublicDiscountsQueryInput = typeof PublicDiscountsQueryDTO.static;

export const GetDiscountsQueryDTO = t.Object({
  foodCourtId: t.Optional(t.String()),
  tenantId: t.Optional(t.String()),
  status: t.Optional(t.String()),
  isPublic: t.Optional(t.String()),
  search: t.Optional(t.String()),
});
export type GetDiscountsQueryInput = typeof GetDiscountsQueryDTO.static;

export interface DiscountCalculationResult {
  valid: boolean;
  discount: Discount;
  qualifyingSubtotal: number;
  discountAmount: number;
  subtotal: number;
  discountedSubtotal: number;
  serviceFee: number;
  taxAmount: number;
  totalAmount: number;
  message?: string;
}
