import { t } from "elysia";

export const CreateTenantDTO = t.Object({
  foodCourtId: t.Optional(t.String()),
  name: t.String({
    minLength: 2,
    maxLength: 100,
    default: "Stan Nasi Padang",
  }),
  description: t.Optional(t.String({ maxLength: 500 })),
  stallNumber: t.String({
    minLength: 1,
    maxLength: 20,
    default: "A-01",
  }),
  logo: t.Optional(t.String()),
  ownerId: t.Optional(t.String()),
  isOpen: t.Optional(t.Boolean({ default: true })),
  openingTime: t.Optional(t.String({ default: "09:00:00" })),
  closingTime: t.Optional(t.String({ default: "21:00:00" })),
});

export const UpdateTenantDTO = t.Object({
  name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
  description: t.Optional(t.String({ maxLength: 500 })),
  stallNumber: t.Optional(t.String({ minLength: 1, maxLength: 20 })),
  logo: t.Optional(t.String()),
  isOpen: t.Optional(t.Boolean()),
  openingTime: t.Optional(t.String()),
  closingTime: t.Optional(t.String()),
});

export const TenantQueryDTO = t.Object({
  isOpen: t.Optional(t.String()),
  foodCourtId: t.Optional(t.String()),
});

export type CreateTenantDTOType = typeof CreateTenantDTO.static;
export type UpdateTenantDTOType = typeof UpdateTenantDTO.static;
