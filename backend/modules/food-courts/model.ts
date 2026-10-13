import { t } from "elysia";

export const CreateFoodCourtDTO = t.Object({
  name: t.String({
    minLength: 2,
    maxLength: 150,
    default: "Grand Food Market",
  }),
  address: t.Optional(t.String({ default: "Jl. Sudirman No. 10" })),
  phone: t.Optional(t.String({ maxLength: 30, default: "08123456789" })),
  logo: t.Optional(t.String({ maxLength: 255 })),
});

export const UpdateFoodCourtDTO = t.Object({
  name: t.Optional(t.String({ minLength: 2, maxLength: 150 })),
  address: t.Optional(t.String()),
  phone: t.Optional(t.String({ maxLength: 30 })),
  logo: t.Optional(t.String({ maxLength: 255 })),
  status: t.Optional(t.Union([t.Literal("ACTIVE"), t.Literal("INACTIVE")])),
});

export const FoodCourtsQueryDTO = t.Object({
  status: t.Optional(t.String()),
  search: t.Optional(t.String()),
});

export type CreateFoodCourtDTOType = typeof CreateFoodCourtDTO.static;
export type UpdateFoodCourtDTOType = typeof UpdateFoodCourtDTO.static;
export type FoodCourtsQueryDTOType = typeof FoodCourtsQueryDTO.static;
