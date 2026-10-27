import { t } from "elysia";

export const CreateKioskDTO = t.Object({
  foodCourtId: t.Optional(t.String()),
  kioskName: t.String({ minLength: 1, maxLength: 100 }),
  deviceCode: t.String({ minLength: 1, maxLength: 100 }),
  location: t.Optional(t.String({ maxLength: 100 })),
  status: t.Optional(t.Union([t.Literal("ACTIVE"), t.Literal("INACTIVE")])),
});

export const UpdateKioskDTO = t.Object({
  kioskName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  deviceCode: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  location: t.Optional(t.String({ maxLength: 100 })),
  status: t.Optional(t.Union([t.Literal("ACTIVE"), t.Literal("INACTIVE")])),
});

export const KioskQueryDTO = t.Object({
  status: t.Optional(t.String()),
  foodCourtId: t.Optional(t.String()),
});

export type CreateKioskDTOType = typeof CreateKioskDTO.static;
export type UpdateKioskDTOType = typeof UpdateKioskDTO.static;
export type KioskQueryDTOType = typeof KioskQueryDTO.static;
