# Technical Design Specification: Food Court Wallet, 1% Platform Fee Reallocation, and Super Admin Disbursement

**Date:** 2026-10-27  
**Status:** DRAFT (Ready for Review)  
**Author:** Antigravity Engineering  

---

## 1. Executive Summary & Problem Context

In the previous implementation of the settlement system:
- A 1% platform fee was deducted from the **tenant's gross sales** (`netAmount = grossAmount - 1%`).
- This was identified as a business model misconception: Tenants already pay rent to the Food Court. The party subscribing to / renting the digital platform application is the **Food Court**, not the individual tenants.
- Furthermore, Food Courts did not have their own internal wallet or withdrawal system to withdraw their accumulated earnings (service fees, revenue share, and operational surpluses) to their management bank accounts.

### Objectives:
1. **Reallocate 1% Platform Fee:**
   - Tenant receives **100% of their gross item sales** (zero deduction).
   - The 1% application fee is calculated from total order spend (`subtotal`) and absorbed by the **Food Court**.
   - Auto-adjustment mechanism to reconcile past transactions so tenant ledgers and balances reflect 100% gross earnings.
2. **Food Court Wallet & Ledger (`food_courts` & `food_court_balance_logs`):**
   - Track Food Court net balance, earnings from orders (`serviceFee + taxAmount - 1% platform fee`), and expense deductions.
   - Record comprehensive ledger entries with running balance.
3. **Food Court Withdrawal System (`food_court_withdrawals`):**
   - Food Court manager can request withdrawal exclusively via **Bank Transfer** with bank name, account number, and holder name.
   - Balance is placed on hold (`WITHDRAWAL_HOLD`) immediately upon submission to prevent overdraft.
   - Super Admin reviews, executes the transfer from the central escrow account, uploads receipt proof (`proofReceiptUrl`), and inputs reference notes (`PROCESSED`).
   - If rejected by Super Admin, funds are automatically refunded (`WITHDRAWAL_REFUND`).
   - Food Court manager confirms receipt or completes the process (`COMPLETED`).
   - Service design is modular and ready for automatic integration with Midtrans Iris / Xendit Disbursements when API credentials are provided.
4. **Dedicated Frontends & Dashboards:**
   - **Admin Food Court:** New dedicated page **Dompet Cabang** (`/app/admin/wallet`) and updated dashboard cards & withdrawal banner.
   - **Super Admin:** New dedicated page **Pencairan Cabang Food Court** (`/app/super-admin/withdrawals`) with proof upload & approval workflow, plus **Pendapatan Platform** metrics (accumulated 1% fee tracking).

---

## 2. Financial Architecture & Calculation Model

### 2.1 Order Settlement Flow
When an order is successfully completed (`COMPLETED`):
- `order.subtotal`: Sum of all items across all tenants in the order.
- `order.serviceFee`: 3% service fee.
- `order.taxAmount`: 10% PB1 tax.
- `platformFee`: `Math.round(order.subtotal * 0.01)` (1% application fee).

#### Allocations:
1. **Per Tenant Order (`tenantOrders`):**
   - Each tenant receives $100\%$ of their stall's sales:
     $$\text{Tenant Revenue} = \text{tOrder.subtotal}$$
   - Logged in `tenant_balance_logs` as `ORDER_REVENUE` with `grossAmount: tOrder.subtotal`, `platformFee: 0`, `netAmount: tOrder.subtotal`.
   - `tenants.balance = tenants.balance + tOrder.subtotal`.

2. **Food Court Wallet (`food_courts.balance`):**
   - Net incoming funds to Food Court from the order:
     $$\text{Food Court Net} = \text{order.serviceFee} + \text{order.taxAmount} - \text{platformFee}$$
   - Logged in `food_court_balance_logs` as `ORDER_SETTLEMENT` with:
     - `subtotalAmount: order.subtotal`
     - `serviceFee: order.serviceFee`
     - `taxAmount: order.taxAmount`
     - `platformFee: platformFee`
     - `netAmount: (serviceFee + taxAmount - platformFee)`
   - `food_courts.balance = food_courts.balance + netAmount`.

3. **Super Admin Platform Revenue:**
   - Central platform records cumulative earned platform fees from all transactions:
     $$\text{Super Admin Earned Fee} = \sum \text{platformFee}$$

---

## 3. Database Schema Design (MySQL / Drizzle ORM)

### 3.1 Alter `food_courts` Table
Add financial balance and default disbursement bank credentials:
```typescript
balance: int("balance").notNull().default(0),
bankName: varchar("bank_name", { length: 50 }),
bankAccountNumber: varchar("bank_account_number", { length: 50 }),
bankAccountHolder: varchar("bank_account_holder", { length: 100 }),
```

### 3.2 New Table: `food_court_balance_logs`
Tracks every credit and debit to the food court's account:
```typescript
export const foodCourtBalanceLogs = mysqlTable("food_court_balance_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  foodCourtId: varchar("food_court_id", { length: 36 })
    .notNull()
    .references(() => foodCourts.id, { onDelete: "cascade" }),
  orderId: varchar("order_id", { length: 36 }).references(() => orders.id, {
    onDelete: "set null",
  }),
  withdrawalId: varchar("withdrawal_id", { length: 36 }).references(
    () => foodCourtWithdrawals.id,
    { onDelete: "set null" }
  ),
  type: mysqlEnum("type", [
    "ORDER_SETTLEMENT",
    "ADJUSTMENT",
    "WITHDRAWAL_HOLD",
    "WITHDRAWAL_REFUND",
    "WITHDRAWAL_COMPLETED",
  ]).notNull(),
  subtotalAmount: int("subtotal_amount").notNull().default(0),
  serviceFee: int("service_fee").notNull().default(0),
  taxAmount: int("tax_amount").notNull().default(0),
  platformFee: int("platform_fee").notNull().default(0),
  netAmount: int("net_amount").notNull(),
  balanceAfter: int("balance_after").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### 3.3 New Table: `food_court_withdrawals`
```typescript
export const foodCourtWithdrawals = mysqlTable("food_court_withdrawals", {
  id: varchar("id", { length: 36 }).primaryKey(),
  foodCourtId: varchar("food_court_id", { length: 36 })
    .notNull()
    .references(() => foodCourts.id, { onDelete: "cascade" }),
  amount: int("amount").notNull(),
  paymentMethod: mysqlEnum("payment_method", ["TRANSFER"]).notNull().default("TRANSFER"),
  bankName: varchar("bank_name", { length: 50 }).notNull(),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }).notNull(),
  bankAccountHolder: varchar("bank_account_holder", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["PENDING", "PROCESSED", "COMPLETED", "REJECTED"])
    .notNull()
    .default("PENDING"),
  proofReceiptUrl: varchar("proof_receipt_url", { length: 255 }),
  transferReference: varchar("transfer_reference", { length: 100 }),
  adminNotes: text("admin_notes"),
  requestedBy: varchar("requested_by", { length: 36 }).references(() => users.id, {
    onDelete: "set null",
  }),
  processedBy: varchar("processed_by", { length: 36 }).references(() => users.id, {
    onDelete: "set null",
  }),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
```

---

## 4. API Endpoints Design

### 4.1 Food Court Manager Endpoints (`/api/admin/food-court/wallet`)
- `GET /api/admin/food-court/wallet`: Returns wallet balance, total withdrawn, pending withdrawals, and recent ledger logs.
- `POST /api/admin/food-court/withdrawals`: Create new withdrawal request (minimum Rp 50.000). Deducts balance immediately with `WITHDRAWAL_HOLD`.
- `GET /api/admin/food-court/withdrawals`: List historical and active withdrawal requests for caller's food court.
- `POST /api/admin/food-court/withdrawals/:id/confirm`: Confirm receipt of funds once status is `PROCESSED`.

### 4.2 Super Admin Endpoints (`/api/super-admin/withdrawals` & `/api/super-admin/platform-revenue`)
- `GET /api/super-admin/withdrawals`: List all food court withdrawal requests across branches with status filter.
- `POST /api/super-admin/withdrawals/:id/process`: Upload receipt proof, enter transfer reference, update status to `PROCESSED`.
- `POST /api/super-admin/withdrawals/:id/reject`: Reject with reason; restores `food_courts.balance` automatically with `WITHDRAWAL_REFUND`.
- `POST /api/super-admin/withdrawals/:id/complete`: Finalize withdrawal to `COMPLETED`.
- `GET /api/super-admin/platform-revenue`: Aggregated metrics for cumulative 1% platform fee income, breakdown per branch, and monthly charts.

### 4.3 Historical Data Adjustment Endpoint
- `POST /api/admin/system/reconcile-tenant-fees` (Super Admin only):
  - Scans past `tenant_balance_logs` where `platformFee > 0`.
  - Credits the deducted amount back to `tenants.balance`.
  - Records an adjustment log `FEE_REIMBURSEMENT` in tenant ledger.
  - Updates Food Court ledger with corresponding platform fee allocations.

---

## 5. Frontend & UI Design

### 5.1 Admin Food Court: "Dompet Cabang" (`/app/admin/wallet`)
- **Key Cards:**
  1. **Saldo Bersih Cabang:** Withdrawable balance with "Tarik Dana" CTA button.
  2. **Total Fee Aplikasi Disetorkan (1%):** Transparansi kontribusi platform sentra.
  3. **Antrean Pencairan Aktif:** Status live pengajuan penarikan ke Super Admin.
- **Components:**
  - `FoodCourtWithdrawalModal.tsx`: Transfer destination form (BCA, Mandiri, BRI, BNI, Jago, dll.), bank account number, account holder, quick chips.
  - `FoodCourtReceiptModal.tsx`: View Super Admin's transfer proof and download receipt.
  - 2-Tab Navigation: **Mutasi Buku Kas** & **Riwayat Penarikan Dana**.

### 5.2 Super Admin: "Pencairan Cabang Food Court" (`/app/super-admin/withdrawals`)
- Filter by Food Court branch, status (`PENDING`, `PROCESSED`, `COMPLETED`, `REJECTED`), and date range.
- **Process Modal:**
  - Shows Food Court branch name, manager details, bank information.
  - File upload for proof of transfer (`/api/upload`).
  - Transfer reference number input.
  - Rejection tab with required explanation note.

### 5.3 Super Admin Platform Revenue Dashboard & Metrics
- Integrated into `DashboardPage.tsx` and sidebar navigation for `admin` role.
- Metric card: "Total Akumulasi Fee Aplikasi (1%)".
- Branch-by-branch fee contribution breakdown table.

---

## 6. Verification & Testing Strategy
- **Unit Tests:**
  - `settlement.test.ts`: Verify tenant receives exact 100% gross without 1% deduction.
  - `food_court_wallet.test.ts`: Verify food court balance correctly credits `serviceFee + taxAmount - 1% subtotal`.
  - `food_court_withdrawal.test.ts`: Verify balance locking, bank transfer requirement, rejection refund, and confirmation flow.
- **Build Verification:**
  - `bun run --cwd frontend build` -> exit code 0.
  - `bun test` in backend and frontend.
