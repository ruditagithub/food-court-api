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

// Food Court Wallet & Withdrawal DTOs
export const RequestFoodCourtWithdrawalDTO = t.Object({
  amount: t.Integer({
    minimum: 50000,
    error: "Nominal penarikan minimal Rp 50.000 (bilangan bulat)",
  }),
  bankName: t.String({
    minLength: 2,
    maxLength: 50,
    error: "Nama bank tujuan wajib diisi",
  }),
  bankAccountNumber: t.String({
    minLength: 4,
    maxLength: 50,
    error: "Nomor rekening wajib diisi (minimal 4 digit)",
  }),
  bankAccountHolder: t.String({
    minLength: 2,
    maxLength: 100,
    error: "Nama pemilik rekening wajib diisi",
  }),
});

export const ProcessFoodCourtWithdrawalDTO = t.Object({
  proofReceiptUrl: t.String({
    minLength: 1,
    error: "Bukti transfer / struk pencairan wajib diunggah",
  }),
  transferReference: t.Optional(t.String({ maxLength: 100 })),
  adminNotes: t.Optional(t.String()),
});

export const RejectFoodCourtWithdrawalDTO = t.Object({
  reason: t.String({
    minLength: 3,
    error: "Alasan penolakan penarikan dana wajib disertakan (minimal 3 karakter)",
  }),
});

export type RequestFoodCourtWithdrawalDTOType =
  typeof RequestFoodCourtWithdrawalDTO.static;
export type ProcessFoodCourtWithdrawalDTOType =
  typeof ProcessFoodCourtWithdrawalDTO.static;
export type RejectFoodCourtWithdrawalDTOType =
  typeof RejectFoodCourtWithdrawalDTO.static;

