import { t } from "elysia";

export const CreateCategoryDTO = t.Object({
  tenantId: t.String(),
  name: t.String({ minLength: 2, maxLength: 80 }),
});

export const UpdateCategoryDTO = t.Object({
  name: t.String({ minLength: 2, maxLength: 80 }),
});

export const MenuOptionItemDTO = t.Object({
  id: t.Optional(t.String()),
  name: t.String({ minLength: 1, maxLength: 100 }),
  priceAdjustment: t.Optional(t.Numeric({ default: 0 })),
});

export const CreateMenuDTO = t.Object({
  tenantId: t.String(),
  categoryId: t.Optional(t.String()),
  name: t.String({ minLength: 2, maxLength: 100 }),
  description: t.Optional(t.String({ maxLength: 500 })),
  price: t.Numeric({ minimum: 0 }),
  stock: t.Optional(t.Integer({ minimum: 0 })),
  imageUrl: t.Optional(t.String()),
  isAvailable: t.Optional(t.Boolean()),
  options: t.Optional(t.Array(MenuOptionItemDTO)),
});

export const UpdateMenuDTO = t.Object({
  categoryId: t.Optional(t.String()),
  name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
  description: t.Optional(t.String({ maxLength: 500 })),
  price: t.Optional(t.Numeric({ minimum: 0 })),
  stock: t.Optional(t.Integer({ minimum: 0 })),
  imageUrl: t.Optional(t.String()),
  isAvailable: t.Optional(t.Boolean()),
  options: t.Optional(t.Array(MenuOptionItemDTO)),
});

export const CreateMenuOptionDTO = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  priceAdjustment: t.Optional(t.Numeric({ default: 0 })),
});

export const UpdateMenuOptionDTO = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  priceAdjustment: t.Optional(t.Numeric()),
});

export const MenuQueryDTO = t.Object({
  tenantId: t.Optional(t.String()),
  categoryId: t.Optional(t.String()),
  isAvailable: t.Optional(t.String()),
  search: t.Optional(t.String()),
});

export type CreateCategoryDTOType = typeof CreateCategoryDTO.static;
export type UpdateCategoryDTOType = typeof UpdateCategoryDTO.static;
export type MenuOptionItemDTOType = typeof MenuOptionItemDTO.static;
export type CreateMenuDTOType = typeof CreateMenuDTO.static;
export type UpdateMenuDTOType = typeof UpdateMenuDTO.static;
export type CreateMenuOptionDTOType = typeof CreateMenuOptionDTO.static;
export type UpdateMenuOptionDTOType = typeof UpdateMenuOptionDTO.static;
