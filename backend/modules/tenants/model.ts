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
  ownerName: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
  ownerEmail: t.Optional(t.String({ minLength: 3, maxLength: 191 })),
  isOpen: t.Optional(t.Boolean({ default: false })),
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
  bankName: t.Optional(t.String({ maxLength: 50 })),
  bankAccountNumber: t.Optional(t.String({ maxLength: 50 })),
  bankAccountHolder: t.Optional(t.String({ maxLength: 100 })),
});

export const TenantQueryDTO = t.Object({
  isOpen: t.Optional(t.String()),
  foodCourtId: t.Optional(t.String()),
});

export const RequestWithdrawalDTO = t.Object({
  amount: t.Integer({ minimum: 10000 }),
  paymentMethod: t.Union([t.Literal("CASH"), t.Literal("TRANSFER")]),
  bankName: t.Optional(t.String({ maxLength: 50 })),
  bankAccountNumber: t.Optional(t.String({ maxLength: 50 })),
  bankAccountHolder: t.Optional(t.String({ maxLength: 100 })),
});

export const ProcessWithdrawalDTO = t.Object({
  paymentMethod: t.Optional(t.Union([t.Literal("CASH"), t.Literal("TRANSFER")])),
  proofReceiptUrl: t.Optional(t.String({ maxLength: 255 })),
  transferReference: t.Optional(t.String({ maxLength: 100 })),
  adminNotes: t.Optional(t.String({ maxLength: 500 })),
});

export const RejectWithdrawalDTO = t.Object({
  reason: t.String({ minLength: 2, maxLength: 500 }),
});

export type CreateTenantDTOType = typeof CreateTenantDTO.static;
export type UpdateTenantDTOType = typeof UpdateTenantDTO.static;
export type RequestWithdrawalDTOType = typeof RequestWithdrawalDTO.static;
export type ProcessWithdrawalDTOType = typeof ProcessWithdrawalDTO.static;
export type RejectWithdrawalDTOType = typeof RejectWithdrawalDTO.static;

