import { Elysia, t } from "elysia";
import { authPlugin, requireRoles } from "../../common/middlewares/auth";
import {
  ProcessFoodCourtWithdrawalDTO,
  RejectFoodCourtWithdrawalDTO,
  RequestFoodCourtWithdrawalDTO,
} from "./model";
import { foodCourtWalletService } from "./wallet.service";

// ==========================================
// 1. ADMIN FOOD COURT WALLET CONTROLLER
// ==========================================
export const adminFoodCourtWalletController = new Elysia({
  prefix: "/api/admin/food-court",
})
  .use(authPlugin)
  .get(
    "/wallet",
    async ({ query, user }) => {
      requireRoles(user, ["admin-food-court", "admin"]);
      const data = await foodCourtWalletService.getFoodCourtWalletSummary(
        user,
        query.foodCourtId,
      );
      return { data };
    },
    {
      query: t.Object({
        foodCourtId: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Food Court Wallet"],
        summary: "Get wallet balance and mutation ledger for a food court branch",
      },
    },
  )
  .get(
    "/withdrawals",
    async ({ query, user }) => {
      requireRoles(user, ["admin-food-court", "admin"]);
      const data = await foodCourtWalletService.listFoodCourtWithdrawals(
        user,
        query.foodCourtId,
        query.status,
      );
      return { data };
    },
    {
      query: t.Object({
        foodCourtId: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Food Court Wallet"],
        summary: "Get withdrawal history for a food court branch",
      },
    },
  )
  .post(
    "/withdrawals",
    async ({ query, body, user, set }) => {
      requireRoles(user, ["admin-food-court", "admin"]);
      const data = await foodCourtWalletService.createFoodCourtWithdrawal(
        user,
        body,
        query.foodCourtId,
      );
      set.status = 201;
      return {
        message: "Pengajuan penarikan dana cabang berhasil dibuat",
        data,
      };
    },
    {
      query: t.Object({
        foodCourtId: t.Optional(t.String()),
      }),
      body: RequestFoodCourtWithdrawalDTO,
      detail: {
        tags: ["Food Court Wallet"],
        summary: "Request a wallet withdrawal via Bank Transfer (Min Rp 50.000)",
      },
    },
  )
  .post(
    "/withdrawals/:id/confirm",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin-food-court", "admin"]);
      const data = await foodCourtWalletService.confirmFoodCourtWithdrawal(user, id);
      return {
        message: "Konfirmasi penerimaan pencairan dana berhasil dicatat",
        data,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Food Court Wallet"],
        summary: "Confirm receipt of disbursed withdrawal funds",
      },
    },
  )
  .patch(
    "/withdrawals/:id/confirm",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin-food-court", "admin"]);
      const data = await foodCourtWalletService.confirmFoodCourtWithdrawal(user, id);
      return {
        message: "Konfirmasi penerimaan pencairan dana berhasil dicatat",
        data,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Food Court Wallet"],
        summary: "Confirm receipt of disbursed withdrawal funds (PATCH)",
      },
    },
  );

// ==========================================
// 2. SUPER ADMIN DISBURSEMENTS CONTROLLER
// ==========================================
export const superAdminWithdrawalsController = new Elysia({
  prefix: "/api/super-admin",
})
  .use(authPlugin)
  .get(
    "/withdrawals",
    async ({ query, user }) => {
      requireRoles(user, ["admin"]);
      const data = await foodCourtWalletService.listSuperAdminWithdrawals(user, query);
      return { data };
    },
    {
      query: t.Object({
        foodCourtId: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Super Admin"],
        summary: "List all food court withdrawal requests across branches",
      },
    },
  )
  .post(
    "/withdrawals/:id/process",
    async ({ params: { id }, body, user }) => {
      requireRoles(user, ["admin"]);
      const data = await foodCourtWalletService.processSuperAdminWithdrawal(
        user,
        id,
        body,
      );
      return {
        message: "Pengajuan pencairan dana berhasil diproses",
        data,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: ProcessFoodCourtWithdrawalDTO,
      detail: {
        tags: ["Super Admin"],
        summary: "Process food court withdrawal with transfer receipt proof",
      },
    },
  )
  .patch(
    "/withdrawals/:id/process",
    async ({ params: { id }, body, user }) => {
      requireRoles(user, ["admin"]);
      const data = await foodCourtWalletService.processSuperAdminWithdrawal(
        user,
        id,
        body,
      );
      return {
        message: "Pengajuan pencairan dana berhasil diproses",
        data,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: ProcessFoodCourtWithdrawalDTO,
      detail: {
        tags: ["Super Admin"],
        summary: "Process food court withdrawal (PATCH)",
      },
    },
  )
  .post(
    "/withdrawals/:id/reject",
    async ({ params: { id }, body, user }) => {
      requireRoles(user, ["admin"]);
      const data = await foodCourtWalletService.rejectSuperAdminWithdrawal(
        user,
        id,
        body.reason,
      );
      return {
        message: "Pengajuan pencairan dana ditolak dan saldo dikembalikan ke food court",
        data,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: RejectFoodCourtWithdrawalDTO,
      detail: {
        tags: ["Super Admin"],
        summary: "Reject food court withdrawal and refund balance automatically",
      },
    },
  )
  .patch(
    "/withdrawals/:id/reject",
    async ({ params: { id }, body, user }) => {
      requireRoles(user, ["admin"]);
      const data = await foodCourtWalletService.rejectSuperAdminWithdrawal(
        user,
        id,
        body.reason,
      );
      return {
        message: "Pengajuan pencairan dana ditolak dan saldo dikembalikan ke food court",
        data,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: RejectFoodCourtWithdrawalDTO,
      detail: {
        tags: ["Super Admin"],
        summary: "Reject food court withdrawal (PATCH)",
      },
    },
  )
  .post(
    "/withdrawals/:id/complete",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin"]);
      const data = await foodCourtWalletService.completeSuperAdminWithdrawal(user, id);
      return {
        message: "Pencairan dana food court diselesaikan",
        data,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Super Admin"],
        summary: "Finalize food court withdrawal to COMPLETED",
      },
    },
  )
  .patch(
    "/withdrawals/:id/complete",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin"]);
      const data = await foodCourtWalletService.completeSuperAdminWithdrawal(user, id);
      return {
        message: "Pencairan dana food court diselesaikan",
        data,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Super Admin"],
        summary: "Finalize food court withdrawal to COMPLETED (PATCH)",
      },
    },
  )
  .get(
    "/platform-revenue",
    async ({ user }) => {
      requireRoles(user, ["admin"]);
      const data = await foodCourtWalletService.getPlatformRevenue(user);
      return { data };
    },
    {
      detail: {
        tags: ["Super Admin"],
        summary: "Get accumulated 1% platform revenue and branch fee contributions",
      },
    },
  );

// ==========================================
// 3. SYSTEM RECONCILIATION CONTROLLER
// ==========================================
export const systemReconcileController = new Elysia({
  prefix: "/api/admin/system",
})
  .use(authPlugin)
  .post(
    "/reconcile-tenant-fees",
    async ({ user }) => {
      requireRoles(user, ["admin"]);
      const result = await foodCourtWalletService.reconcileTenantFees(user);
      return result;
    },
    {
      detail: {
        tags: ["System Reconcile"],
        summary: "Reconcile past tenant platform fees and credit back to tenant balance",
      },
    },
  );
