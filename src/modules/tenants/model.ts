import { t } from "elysia";

export const CreateTenantDTO = t.Object({
  name: t.String({ minLength: 2, maxLength: 100 }),
  description: t.Optional(t.String({ maxLength: 500 })),
  stallNumber: t.String({ minLength: 1, maxLength: 20 }),
  ownerId: t.Optional(t.String()),
  isOpen: t.Optional(t.Boolean()),
});

export const UpdateTenantDTO = t.Object({
  name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
  description: t.Optional(t.String({ maxLength: 500 })),
  stallNumber: t.Optional(t.String({ minLength: 1, maxLength: 20 })),
  isOpen: t.Optional(t.Boolean()),
});

export const TenantQueryDTO = t.Object({
  isOpen: t.Optional(t.String()),
});

export type CreateTenantDTOType = typeof CreateTenantDTO.static;
export type UpdateTenantDTOType = typeof UpdateTenantDTO.static;
