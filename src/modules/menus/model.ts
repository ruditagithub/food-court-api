import { t } from "elysia";

export const CreateCategoryDTO = t.Object({
  tenantId: t.String(),
  name: t.String({ minLength: 2, maxLength: 50 }),
});

export const CreateMenuDTO = t.Object({
  tenantId: t.String(),
  categoryId: t.Optional(t.String()),
  name: t.String({ minLength: 2, maxLength: 100 }),
  description: t.Optional(t.String({ maxLength: 500 })),
  price: t.Numeric({ minimum: 0 }),
  imageUrl: t.Optional(t.String()),
  isAvailable: t.Optional(t.Boolean()),
});

export const UpdateMenuDTO = t.Object({
  categoryId: t.Optional(t.String()),
  name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
  description: t.Optional(t.String({ maxLength: 500 })),
  price: t.Optional(t.Numeric({ minimum: 0 })),
  imageUrl: t.Optional(t.String()),
  isAvailable: t.Optional(t.Boolean()),
});

export const MenuQueryDTO = t.Object({
  tenantId: t.Optional(t.String()),
  categoryId: t.Optional(t.String()),
  isAvailable: t.Optional(t.String()),
  search: t.Optional(t.String()),
});

export type CreateCategoryDTOType = typeof CreateCategoryDTO.static;
export type CreateMenuDTOType = typeof CreateMenuDTO.static;
export type UpdateMenuDTOType = typeof UpdateMenuDTO.static;
