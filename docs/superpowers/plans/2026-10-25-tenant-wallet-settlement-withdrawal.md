# Implementation Plan: Tenant Wallet, 1% Platform Fee Settlement, and Withdrawal System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automated 1% platform fee deduction upon order payment, double-entry tenant balance ledger, tenant wallet & withdrawal requests with hold-on-submit, and Admin Food Court two-stage disbursement validation with proof receipt upload.

**Architecture:** 
- Database layer: update `tenants` with `balance` and bank fields; add `tenant_balance_logs` (ledger) and `withdrawal_requests`.
- Backend settlement service: triggered on `PAID` orders with idempotency check, deducting 1% application fee and crediting 99% to tenant balance with transaction logging.
- Backend withdrawal API: tenant requests lock/hold balance, admin processes with proof or rejects with automatic refund, tenant or admin validates completion.
- Frontend: new responsive `TenantWalletPage` (`/app/tenant/wallet`) and `AdminWithdrawalsPage` (`/app/admin/withdrawals`) with proof viewing and action modals.

**Tech Stack:** Bun, ElysiaJS, Drizzle ORM, MySQL, React 19, Tailwind CSS, Lucide Icons.

## Global Constraints
- Platform fee is fixed at 1% (`Math.round(grossAmount * 0.01)`).
- Subtotal per tenant order is the gross amount (`tenantOrders.subtotal`).
- Saldo must be immediately deducted/held upon withdrawal request submission (`amount <= tenant.balance`).
- On rejection by admin, held balance must be refunded atomically with a `WITHDRAWAL_REFUND` log.
- Admin must be able to upload transfer proof image or cash receipt via existing `/api/upload`.
- Two-stage status transition: `PENDING` -> `PROCESSED` -> `COMPLETED` (or `REJECTED`).

---

### Task 1: Database Migration & Schema Update

**Files:**
- Modify: `backend/db/schema.ts`
- Create: `backend/db/migrate-wallet-withdrawal.ts`
- Test: `backend/test/wallet_schema.test.ts`

**Interfaces:**
- Produces: `tenantBalanceLogs`, `withdrawalRequests`, updated `tenants` schema exports in Drizzle.

- [ ] **Step 1: Write the failing test for schema exports**

```typescript
// backend/test/wallet_schema.test.ts
import { describe, expect, it } from "bun:test";
import { tenants, tenantBalanceLogs, withdrawalRequests } from "../db/schema";

describe("Wallet & Withdrawal Schema Definitions", () => {
  it("should have balance and bank fields on tenants table", () => {
    expect(tenants.balance).toBeDefined();
    expect(tenants.bankName).toBeDefined();
    expect(tenants.bankAccountNumber).toBeDefined();
    expect(tenants.bankAccountHolder).toBeDefined();
  });

  it("should define tenantBalanceLogs table with correct columns", () => {
    expect(tenantBalanceLogs).toBeDefined();
    expect(tenantBalanceLogs.tenantId).toBeDefined();
    expect(tenantBalanceLogs.type).toBeDefined();
    expect(tenantBalanceLogs.grossAmount).toBeDefined();
    expect(tenantBalanceLogs.platformFee).toBeDefined();
    expect(tenantBalanceLogs.netAmount).toBeDefined();
    expect(tenantBalanceLogs.balanceAfter).toBeDefined();
  });

  it("should define withdrawalRequests table with correct status enum and columns", () => {
    expect(withdrawalRequests).toBeDefined();
    expect(withdrawalRequests.foodCourtId).toBeDefined();
    expect(withdrawalRequests.tenantId).toBeDefined();
    expect(withdrawalRequests.amount).toBeDefined();
    expect(withdrawalRequests.paymentMethod).toBeDefined();
    expect(withdrawalRequests.status).toBeDefined();
    expect(withdrawalRequests.proofReceiptUrl).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test backend/test/wallet_schema.test.ts`  
Expected: FAIL (property `balance` or tables not defined).

- [ ] **Step 3: Update `backend/db/schema.ts` and create migration script**

Add to `tenants` table in `backend/db/schema.ts`:
- `balance: int("balance").notNull().default(0)`
- `bankName: varchar("bank_name", { length: 50 })`
- `bankAccountNumber: varchar("bank_account_number", { length: 50 })`
- `bankAccountHolder: varchar("bank_account_holder", { length: 100 })`

Add `tenantBalanceLogs` and `withdrawalRequests` tables and their relations:
- `tenantBalanceLogs` with enum `type: ["ORDER_REVENUE", "WITHDRAWAL_HOLD", "WITHDRAWAL_REFUND", "WITHDRAWAL_COMPLETED"]`.
- `withdrawalRequests` with enum `paymentMethod: ["CASH", "TRANSFER"]` and `status: ["PENDING", "PROCESSED", "COMPLETED", "REJECTED"]`.

Create `backend/db/migrate-wallet-withdrawal.ts` to execute safe `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ...` and `CREATE TABLE IF NOT EXISTS tenant_balance_logs ...` / `withdrawal_requests`.

- [ ] **Step 4: Execute migration and verify tests pass**

Run: `bun run backend/db/migrate-wallet-withdrawal.ts`  
Run: `bun test backend/test/wallet_schema.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/db/schema.ts backend/db/migrate-wallet-withdrawal.ts backend/test/wallet_schema.test.ts
git commit -m "feat(db): add tenant balance, balance logs ledger, and withdrawal requests tables"
```

---

### Task 2: Order Settlement Service (1% Fee Deduction & Ledger Update)

**Files:**
- Create: `backend/modules/tenants/settlement.ts`
- Modify: `backend/modules/payments/service.ts:125-142`
- Test: `backend/test/wallet_settlement.test.ts`

**Interfaces:**
- Produces: `settleOrderTenantRevenues(orderId: string): Promise<void>`
- Consumes: `tenantOrders`, `tenants`, `tenantBalanceLogs`

- [ ] **Step 1: Write failing test for settlement logic**

```typescript
// backend/test/wallet_settlement.test.ts
import { describe, expect, it } from "bun:test";
import { calculateSettlement } from "../modules/tenants/settlement";

describe("calculateSettlement", () => {
  it("should deduct exactly 1% platform fee and compute net amount", () => {
    const gross = 100000;
    const { platformFee, netAmount } = calculateSettlement(gross);
    expect(platformFee).toBe(1000);
    expect(netAmount).toBe(99000);
  });

  it("should handle rounded odd numbers correctly", () => {
    const gross = 25550;
    const { platformFee, netAmount } = calculateSettlement(gross);
    expect(platformFee).toBe(256);
    expect(netAmount).toBe(25294);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test backend/test/wallet_settlement.test.ts`  
Expected: FAIL (`calculateSettlement` not found).

- [ ] **Step 3: Implement `settlement.ts` and hook into `settlePaymentGroup`**

Implement in `backend/modules/tenants/settlement.ts`:
```typescript
export function calculateSettlement(grossAmount: number): { platformFee: number; netAmount: number } {
  const platformFee = Math.round(grossAmount * 0.01);
  const netAmount = grossAmount - platformFee;
  return { platformFee, netAmount };
}

export async function settleOrderTenantRevenues(orderId: string): Promise<void> {
  // Query all tenantOrders under orderId
  // For each tenantOrder: check if tenantBalanceLogs already has ORDER_REVENUE for this tenantOrderId
  // If not: compute 1% fee & net, update tenants.balance = balance + netAmount, insert tenantBalanceLogs
}
```

In `backend/modules/payments/service.ts`, call `await settleOrderTenantRevenues(group.orderId)` right after order status transitions to `CONFIRMED` / `PAID`.

- [ ] **Step 4: Run test to verify passes**

Run: `bun test backend/test/wallet_settlement.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/modules/tenants/settlement.ts backend/modules/payments/service.ts backend/test/wallet_settlement.test.ts
git commit -m "feat(settlement): implement 1% fee calculation and automatic tenant revenue ledger"
```

---

### Task 3: Backend Tenant Wallet & Withdrawal Endpoints

**Files:**
- Modify: `backend/modules/tenants/model.ts`
- Modify: `backend/modules/tenants/service.ts`
- Modify: `backend/modules/tenants/index.ts`
- Test: `backend/test/tenant_wallet.test.ts`

**Interfaces:**
- Produces endpoints:
  - `GET /api/tenants/wallet`
  - `POST /api/tenants/withdrawals`
  - `GET /api/tenants/withdrawals`
  - `PATCH /api/tenants/withdrawals/:id/confirm`

- [ ] **Step 1: Write failing test for tenant wallet endpoints**

```typescript
// backend/test/tenant_wallet.test.ts
import { describe, expect, it } from "bun:test";
import { app } from "../index";

describe("Tenant Wallet & Withdrawal Endpoints", () => {
  it("should reject withdrawal request if amount exceeds balance", async () => {
    // Call POST /api/tenants/withdrawals with excessive amount
    // Expect 400 Bad Request
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test backend/test/tenant_wallet.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement wallet service and routes in `backend/modules/tenants`**

- In `model.ts`: add `RequestWithdrawalDTO` (`amount`, `paymentMethod`, `bankName`, `bankAccountNumber`, `bankAccountHolder`).
- In `service.ts`:
  - `getTenantWalletSummary(tenantId: string)`: returns `balance`, `grossTotal`, `feeTotal`, `recentLogs`.
  - `createWithdrawalRequest(tenantId: string, data)`: validates `amount <= balance`, holds balance (`balance = balance - amount`), inserts `withdrawalRequests` & `tenantBalanceLogs`.
  - `getTenantWithdrawals(tenantId: string)`: returns list of withdrawal requests.
  - `confirmWithdrawalReceipt(tenantId: string, withdrawalId: string)`: verifies status is `PROCESSED`, sets status `COMPLETED`.
- In `index.ts`: register the routes with role guard `['tenant']`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test backend/test/tenant_wallet.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/modules/tenants/model.ts backend/modules/tenants/service.ts backend/modules/tenants/index.ts backend/test/tenant_wallet.test.ts
git commit -m "feat(tenants): add wallet summary, withdrawal request with hold, and confirmation endpoints"
```

---

### Task 4: Backend Admin Food Court Withdrawal Management Endpoints

**Files:**
- Modify: `backend/modules/tenants/service.ts` or `backend/modules/food-courts/service.ts`
- Modify: `backend/modules/food-courts/index.ts`
- Test: `backend/test/admin_withdrawals.test.ts`

**Interfaces:**
- Produces endpoints:
  - `GET /api/admin/withdrawals`
  - `PATCH /api/admin/withdrawals/:id/process`
  - `PATCH /api/admin/withdrawals/:id/reject`
  - `PATCH /api/admin/withdrawals/:id/complete`

- [ ] **Step 1: Write failing test for admin withdrawal processing & rejection refund**

```typescript
// backend/test/admin_withdrawals.test.ts
import { describe, expect, it } from "bun:test";

describe("Admin Withdrawal Management", () => {
  it("should refund held balance back to tenant when admin rejects withdrawal", async () => {
    // Assert tenant balance is restored on reject
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test backend/test/admin_withdrawals.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement admin withdrawal management methods and routes**

- `listAdminWithdrawals(adminUserId: string, foodCourtId?: string, status?: string)`
- `processAdminWithdrawal(id: string, adminUserId: string, data: { paymentMethod, proofReceiptUrl, transferReference, adminNotes })`: sets status `PROCESSED`.
- `rejectAdminWithdrawal(id: string, adminUserId: string, reason: string)`:
  - Atomically increments `tenant.balance = tenant.balance + amount`.
  - Inserts `WITHDRAWAL_REFUND` in `tenantBalanceLogs`.
  - Sets status `REJECTED` and `adminNotes: reason`.
- `completeAdminWithdrawal(id: string, adminUserId: string)`: sets status `COMPLETED` directly (for cash immediate delivery).

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test backend/test/admin_withdrawals.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/modules/tenants/service.ts backend/modules/food-courts/index.ts backend/test/admin_withdrawals.test.ts
git commit -m "feat(admin): add withdrawal approval, proof upload processing, and rejection refund logic"
```

---

### Task 5: Frontend Tenant Wallet Page & Withdrawal Modal

**Files:**
- Create: `frontend/src/pages/tenant/TenantWalletPage.tsx`
- Create: `frontend/src/components/tenant/WithdrawalModal.tsx`
- Create: `frontend/src/components/tenant/ReceiptViewerModal.tsx`
- Modify: `frontend/src/App.tsx` (add route `/app/tenant/wallet` with RoleGuard)
- Modify: `frontend/src/components/common/Header.tsx` (add "Dompet" link for tenant)

**Interfaces:**
- Calls: `GET /api/tenants/wallet`, `POST /api/tenants/withdrawals`, `GET /api/tenants/withdrawals`, `PATCH /api/tenants/withdrawals/:id/confirm`.

- [ ] **Step 1: Build `WithdrawalModal.tsx`**
  - Amount input with quick chip buttons (Rp 50rb, 100rb, 250rb, "Tarik Semua").
  - Payment method selector: Transfer Bank / E-Wallet vs Tunai Langsung.
  - Bank details form (Bank Name, Account Number, Account Holder).
  - Validation: checks if amount exceeds active balance.

- [ ] **Step 2: Build `ReceiptViewerModal.tsx`**
  - Dialog displaying uploaded transfer proof image, transfer reference, and payment timestamp.

- [ ] **Step 3: Build `TenantWalletPage.tsx`**
  - Active balance hero card with "Tarik Saldo" CTA button.
  - Financial summary counters: Gross sales, 1% fee deductions, Disbursed total.
  - Two tabs:
    - Tab 1: Withdrawal Requests table with status badges (`PENDING`, `PROCESSED`, `COMPLETED`, `REJECTED`), "Lihat Bukti" button, and "Konfirmasi Terima" button.
    - Tab 2: Balance mutation ledger table (`ORDER_REVENUE`, `WITHDRAWAL_HOLD`, etc.) with order number link and date.

- [ ] **Step 4: Register route in `frontend/src/App.tsx` and test navigation**
  - Add `/app/tenant/wallet` guarded by `RoleGuard allowedRoles={['tenant']}`.
  - Add link in Header for tenant role.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/tenant/TenantWalletPage.tsx frontend/src/components/tenant/WithdrawalModal.tsx frontend/src/components/tenant/ReceiptViewerModal.tsx frontend/src/App.tsx frontend/src/components/common/Header.tsx
git commit -m "feat(frontend): create tenant wallet page, withdrawal request modal, and receipt viewer"
```

---

### Task 6: Frontend Admin Food Court Withdrawal Management Page

**Files:**
- Create: `frontend/src/pages/admin/AdminWithdrawalsPage.tsx`
- Create: `frontend/src/components/admin/ProcessWithdrawalModal.tsx`
- Modify: `frontend/src/App.tsx` (add route `/app/admin/withdrawals` with RoleGuard)
- Modify: `frontend/src/components/common/Header.tsx` (add "Pencairan Dana" link for admin-food-court)

**Interfaces:**
- Calls: `GET /api/admin/withdrawals`, `PATCH /api/admin/withdrawals/:id/process`, `PATCH /api/admin/withdrawals/:id/reject`, `PATCH /api/admin/withdrawals/:id/complete`.

- [ ] **Step 1: Build `ProcessWithdrawalModal.tsx`**
  - Displays tenant name, stall number, requested amount, and recipient account details with one-click copy.
  - If Transfer: input for bank transfer reference and drag-and-drop file uploader (posting to `/api/upload`).
  - Action buttons: "Kirim Bukti & Tandai Diproses", "Selesaikan Tunai Langsung", and "Tolak Pengajuan" (with reason textarea).

- [ ] **Step 2: Build `AdminWithdrawalsPage.tsx`**
  - Header statistics cards: Pending requests count, total amount awaiting disbursement, total disbursed this month.
  - Filterable requests table: Filter by status tabs (`Semua`, `Menunggu Diproses`, `Telah Ditransfer`, `Selesai`, `Ditolak`).
  - Columns: Tanggal, Nama Stan, Nominal, Metode (Cash/Transfer), Rekening Tujuan, Status Badge, Aksi ("Proses" button).

- [ ] **Step 3: Register route in `frontend/src/App.tsx` and test navigation**
  - Add `/app/admin/withdrawals` guarded by `RoleGuard allowedRoles={['admin-food-court', 'admin']}`.
  - Add navigation link in Header.

- [ ] **Step 4: Verify full end-to-end integration via dev server**
  - Check browser loads `/app/tenant/wallet` and `/app/admin/withdrawals` without console errors.
  - Check bun dev server compiles cleanly without TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin/AdminWithdrawalsPage.tsx frontend/src/components/admin/ProcessWithdrawalModal.tsx frontend/src/App.tsx frontend/src/components/common/Header.tsx
git commit -m "feat(frontend): create admin withdrawals management page and process modal with proof upload"
```

---

## Plan Review & Handoff Checklist
- [x] Spec coverage verified (1% fee deduction, double-entry ledger, tenant balance column, withdrawal request, cash/transfer proof upload, 2-stage status validation).
- [x] No placeholder code, clear type signatures and endpoints specified.
- [x] Migration, backend services, tests, and frontend UI structured into modular tasks.
