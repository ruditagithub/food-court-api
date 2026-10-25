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

- [x] **Step 1: Write the failing test for schema exports**
...
- [x] **Step 2: Run test to verify it fails**
...
- [x] **Step 3: Update `backend/db/schema.ts` and create migration script**
...
- [x] **Step 4: Execute migration and verify tests pass**
...
- [x] **Step 5: Commit**

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

- [x] **Step 1: Write failing test for settlement logic**
...
- [x] **Step 2: Run test to verify it fails**
...
- [x] **Step 3: Implement `settlement.ts` and hook into `settlePaymentGroup`**
...
- [x] **Step 4: Run test to verify passes**
...
- [x] **Step 5: Commit**

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

- [x] **Step 1: Write failing test for tenant wallet endpoints**
...
- [x] **Step 2: Run test to verify it fails**
...
- [x] **Step 3: Implement wallet service and routes in `backend/modules/tenants`**
...
- [x] **Step 4: Run test to verify it passes**
...
- [x] **Step 5: Commit**

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

- [x] **Step 1: Write failing test for admin withdrawal processing & rejection refund**
...
- [x] **Step 2: Run test to verify it fails**
...
- [x] **Step 3: Implement admin withdrawal management methods and routes**
...
- [x] **Step 4: Run test to verify it passes**
...
- [x] **Step 5: Commit**

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

- [x] **Step 1: Build `WithdrawalModal.tsx`**
...
- [x] **Step 2: Build `ReceiptViewerModal.tsx`**
...
- [x] **Step 3: Build `TenantWalletPage.tsx`**
...
- [x] **Step 4: Register route in `frontend/src/App.tsx` and test navigation**
...
- [x] **Step 5: Commit**

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

- [x] **Step 1: Build `ProcessWithdrawalModal.tsx`**
...
- [x] **Step 2: Build `AdminWithdrawalsPage.tsx`**
...
- [x] **Step 3: Register route in `frontend/src/App.tsx` and test navigation**
...
- [x] **Step 4: Verify full end-to-end integration via dev server**
...
- [x] **Step 5: Commit**

```bash
git add frontend/src/pages/admin/AdminWithdrawalsPage.tsx frontend/src/components/admin/ProcessWithdrawalModal.tsx frontend/src/App.tsx frontend/src/components/common/Header.tsx
git commit -m "feat(frontend): create admin withdrawals management page and process modal with proof upload"
```

---

## Plan Review & Handoff Checklist
- [x] Spec coverage verified (1% fee deduction, double-entry ledger, tenant balance column, withdrawal request, cash/transfer proof upload, 2-stage status validation).
- [x] No placeholder code, clear type signatures and endpoints specified.
- [x] Migration, backend services, tests, and frontend UI structured into modular tasks.
