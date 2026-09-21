import { t } from "elysia";

export const CreateTableDTO = t.Object({
  foodCourtId: t.Optional(t.String()),
  tableNumber: t.String({ minLength: 1, maxLength: 20 }),
  capacity: t.Optional(t.Integer({ minimum: 1, default: 4 })),
  status: t.Optional(
    t.Union([
      t.Literal("available"),
      t.Literal("occupied"),
      t.Literal("disabled"),
    ]),
  ),
  qrToken: t.Optional(t.String()),
});

export const UpdateTableDTO = t.Object({
  capacity: t.Optional(t.Integer({ minimum: 1 })),
  status: t.Optional(
    t.Union([
      t.Literal("available"),
      t.Literal("occupied"),
      t.Literal("disabled"),
    ]),
  ),
  qrToken: t.Optional(t.String()),
});

export const TableQueryDTO = t.Object({
  status: t.Optional(t.String()),
  foodCourtId: t.Optional(t.String()),
});

export type CreateTableDTOType = typeof CreateTableDTO.static;
export type UpdateTableDTOType = typeof UpdateTableDTO.static;
