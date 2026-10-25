import { Elysia, t } from "elysia";
import {
  authPlugin,
  requireAuth,
  requireRoles,
} from "../../common/middlewares/auth";
import {
  CreateTenantDTO,
  ProcessWithdrawalDTO,
  RejectWithdrawalDTO,
  RequestWithdrawalDTO,
  TenantQueryDTO,
  UpdateTenantDTO,
} from "./model";
import { tenantService } from "./service";
import { menuService } from "../menus/service";
import { foodCourtService } from "../food-courts/service";

export const tenantsController = new Elysia({ prefix: "/api/tenants" })
  .use(authPlugin)
  .get(
    "/",
    async ({ query, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const isOpen =
        query.isOpen === "true"
          ? true
          : query.isOpen === "false"
            ? false
            : undefined;
      const data = await tenantService.getAll(
        { isOpen, foodCourtId: query.foodCourtId },
        user,
      );
      return { data };
    },
    {
      query: TenantQueryDTO,
      detail: {
        tags: ["Tenants"],
        summary: "Get all food court tenants/stalls (Admin and Admin Food Court only)",
      },
    },
  )
  .get(
    "/mine",
    async ({ user }) => {
      requireRoles(user, ["tenant"]);
      const data = await tenantService.getByOwnerId(user.id);
      return { data };
    },
    {
      detail: {
        tags: ["Tenants"],
        summary: "Get current tenant stall for logged in tenant user",
      },
    },
  )
  .get(
    "/:id",
    async ({ params: { id } }) => {
      const data = await tenantService.getById(id);
      return { data };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Tenants"],
        summary: "Get tenant details with menus and categories",
      },
    },
  )

  .get(
    "/food-court/:id",
    async ({ params: { id }, query, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const isOpen =
        query.isOpen === "true"
          ? true
          : query.isOpen === "false"
            ? false
            : undefined;

      const data = await foodCourtService.getTenantsByFoodCourt(
        id,
        { isOpen, search: query.search },
        user,
      );

      return { data };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        isOpen: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
      detail: {
        hide: true,
      },
    },
  )
  .post(
    "/",
    async ({ body, user, set }) => {
      requireRoles(user, ["admin", "tenant", "admin-food-court"]);
      const newTenant = await tenantService.create(body, user);
      set.status = 201;
      return {
        message: "Tenant created successfully",
        data: newTenant,
      };
    },
    {
      body: CreateTenantDTO,
      detail: {
        tags: ["Tenants"],
        summary:
          "Create a new food court stall (Admin, Tenant, or Admin Food Court)",
      },
    },
  )
  .put(
    "/:id",
    async ({ params: { id }, body, user }) => {
      requireAuth(user);
      const updated = await tenantService.update(id, body, user);
      return {
        message: "Tenant updated successfully",
        data: updated,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateTenantDTO,
      detail: {
        tags: ["Tenants"],
        summary: "Update tenant details (Owner or Admin)",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params: { id }, user }) => {
      requireAuth(user);
      const result = await tenantService.delete(id, user);
      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Tenants"],
        summary: "Delete a tenant (Owner or Admin)",
      },
    },
  )
  .post(
    "/:id/resend-activation",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const result = await tenantService.resendActivation(id);
      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Tenants"],
        summary: "Resend activation email to tenant owner (Admin only)",
      },
    },
  )

  // ==========================================
  // TENANT WALLET & WITHDRAWAL ROUTES
  // ==========================================
  .get(
    "/wallet",
    async ({ query, user }) => {
      requireRoles(user, ["tenant", "admin", "admin-food-court"]);
      const data = await tenantService.getTenantWalletSummary(user, query.tenantId);
      return { data };
    },
    {
      query: t.Object({
        tenantId: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Tenants"],
        summary: "Get wallet balance and transaction logs for tenant",
      },
    },
  )
  .get(
    "/withdrawals",
    async ({ query, user }) => {
      requireRoles(user, ["tenant", "admin", "admin-food-court"]);
      const data = await tenantService.getTenantWithdrawals(user, query.tenantId);
      return { data };
    },
    {
      query: t.Object({
        tenantId: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Tenants"],
        summary: "Get withdrawal history for tenant",
      },
    },
  )
  .post(
    "/withdrawals",
    async ({ query, body, user, set }) => {
      requireRoles(user, ["tenant", "admin", "admin-food-court"]);
      const data = await tenantService.createWithdrawalRequest(user, body, query.tenantId);
      set.status = 201;
      return {
        message: "Pengajuan penarikan dana berhasil dibuat",
        data,
      };
    },
    {
      query: t.Object({
        tenantId: t.Optional(t.String()),
      }),
      body: RequestWithdrawalDTO,
      detail: {
        tags: ["Tenants"],
        summary: "Request a wallet withdrawal (Cash or Transfer)",
      },
    },
  )
  .patch(
    "/withdrawals/:id/confirm",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["tenant", "admin", "admin-food-court"]);
      const data = await tenantService.confirmWithdrawalReceipt(user, id);
      return {
        message: "Konfirmasi penerimaan dana berhasil dicatat",
        data,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Tenants"],
        summary: "Confirm that disbursed withdrawal funds have been received",
      },
    },
  );

// ==========================================
// ADMIN FOOD COURT WITHDRAWAL MANAGEMENT
// ==========================================
export const adminWithdrawalsController = new Elysia({
  prefix: "/api/admin/withdrawals",
})
  .use(authPlugin)
  .get(
    "/",
    async ({ query, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const data = await tenantService.listAdminWithdrawals(user, query.status);
      return { data };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Admin Food Court"],
        summary: "List all withdrawal requests from tenants",
      },
    },
  )
  .patch(
    "/:id/process",
    async ({ params: { id }, body, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const data = await tenantService.processAdminWithdrawal(user, id, body);
      return {
        message: "Pengajuan penarikan berhasil diproses",
        data,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: ProcessWithdrawalDTO,
      detail: {
        tags: ["Admin Food Court"],
        summary: "Disburse withdrawal with transfer proof or cash receipt",
      },
    },
  )
  .patch(
    "/:id/reject",
    async ({ params: { id }, body, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const data = await tenantService.rejectAdminWithdrawal(user, id, body.reason);
      return {
        message: "Pengajuan penarikan ditolak dan saldo dikembalikan ke tenant",
        data,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: RejectWithdrawalDTO,
      detail: {
        tags: ["Admin Food Court"],
        summary: "Reject withdrawal and automatically refund held balance to tenant",
      },
    },
  )
  .patch(
    "/:id/complete",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const data = await tenantService.completeAdminWithdrawal(user, id);
      return {
        message: "Pencairan tunai diselesaikan",
        data,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Admin Food Court"],
        summary: "Directly complete cash withdrawal delivered on-site",
      },
    },
  );

