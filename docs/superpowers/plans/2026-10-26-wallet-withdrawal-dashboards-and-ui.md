# Implementation Plan: Tenant & Admin Food Court Wallet, Withdrawal UI, and Dashboard Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive frontend UI and integration for the **Tenant Wallet & Withdrawal System** and **Admin Food Court Disbursement Management**, including dedicated role dashboards in `DashboardPage.tsx`, financial ledger tracking, multi-method disbursement (Bank Transfer with receipt proof upload vs On-Site Cash delivery), and automatic refund on rejection.

**Architecture:**
- **API Client Layer (`frontend/src/api/client.ts`):** Safe body serialization (prevent double JSON stringification) and automatic fallback to `getToken()`.
- **Tenant Dashboard (`frontend/src/pages/dashboard/DashboardPage.tsx`):** Saldo Bersih Dompet Card, direct "Tarik Saldo" modal trigger, and active request banner with live status.
- **Admin Food Court Dashboard (`frontend/src/pages/dashboard/DashboardPage.tsx`):** Stat card for pending withdrawal requests/amounts and Quick Queue Table with direct "Proses" action.
- **Tenant Wallet Management (`frontend/src/pages/tenant/TenantWalletPage.tsx`, `WithdrawalModal.tsx`, `ReceiptViewerModal.tsx`):** Complete wallet overview, 2-tab ledger & requests, account info, and confirmation of received funds.
- **Admin Disbursement Management (`frontend/src/pages/admin/AdminWithdrawalsPage.tsx`, `ProcessWithdrawalModal.tsx`):** Queue filtering, proof upload via `/api/upload`, rejection with automatic refund, and direct cash completion.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Bun Test, Vite.

---

### Task 1: API Client Token Fallback & Serialization Fix
**Files:**
- Modify: `frontend/src/api/client.ts`

- [x] **Step 1: Update `apiFetch` in `frontend/src/api/client.ts`**
  - Default `token = options.token ?? getToken() ?? undefined`.
  - Handle `body: typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined`.
- [x] **Step 2: Verify `bun test` in frontend passes**

---

### Task 2: Tenant Dashboard Wallet & Withdrawal Integration
**Files:**
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`

- [x] **Step 1: Fetch wallet and latest withdrawal in `loadDashboardData()` for `isTenant`**
  - Call `/api/tenants/wallet` and `/api/tenants/withdrawals`.
  - Store in `walletSummary` and `latestWithdrawal` states.
- [x] **Step 2: Add Saldo Bersih Dompet Card**
  - Render with live pulse badge, net withdrawable amount (`wallet.balance`), and action button "Tarik Saldo".
- [x] **Step 3: Add Active Withdrawal Banner**
  - If `latestWithdrawal?.status === 'PENDING'` or `'PROCESSED'`, display status banner.
  - If `PROCESSED`, provide quick "Konfirmasi Sudah Terima" button.
- [x] **Step 4: Mount `WithdrawalModal` on the dashboard**
  - Allows tenant to initiate withdrawal directly from the dashboard.

---

### Task 3: Admin Food Court Dashboard Quick Queue Widget
**Files:**
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`

- [x] **Step 1: Fetch withdrawal requests in `loadDashboardData()` for `isFoodCourtManager`**
  - Call `/api/admin/withdrawals`.
  - Calculate `pendingWithdrawals = data.filter(w => w.status === 'PENDING')`.
- [x] **Step 2: Add Stat Card Antrean Pencairan Dana**
  - Display count of pending requests and total Rupiah waiting for disbursement.
- [x] **Step 3: Add Quick Queue Table Widget**
  - Render top 3-5 pending requests (Nama Stan, No. Stan, Nominal, Metode, Waktu).
  - One-click "Proses" button opening `ProcessWithdrawalModal`.
  - "Lihat Semua Antrean" link navigating to `/app/admin/withdrawals`.
- [x] **Step 4: Mount `ProcessWithdrawalModal` on the dashboard**

---

### Task 4: Tenant Wallet Page & Modals Refinement
**Files:**
- Modify: `frontend/src/pages/tenant/TenantWalletPage.tsx`
- Modify: `frontend/src/components/tenant/WithdrawalModal.tsx`
- Modify: `frontend/src/components/tenant/ReceiptViewerModal.tsx`

- [x] **Step 1: Fix payload serialization in `TenantWalletPage.tsx`**
  - Pass plain object to `apiFetch`, eliminate redundant `JSON.stringify`.
- [x] **Step 2: Polish `WithdrawalModal.tsx`**
  - Method switcher (Transfer vs Tunai), quick amount chips, destination bank inputs.
- [x] **Step 3: Polish `ReceiptViewerModal.tsx`**
  - Image preview with fallback placeholder and transfer reference display.

---

### Task 5: Admin Withdrawals Page & Process Modal Refinement
**Files:**
- Modify: `frontend/src/pages/admin/AdminWithdrawalsPage.tsx`
- Modify: `frontend/src/components/admin/ProcessWithdrawalModal.tsx`

- [x] **Step 1: Fix payload serialization in `AdminWithdrawalsPage.tsx`**
  - Pass plain object in `handleProcess`, `handleReject`, and `handleCompleteDirect`.
- [x] **Step 2: Polish `ProcessWithdrawalModal.tsx`**
  - Transfer tab with proof upload (`uploadFile`), cash completion tab, and rejection tab with refund.

---

### Task 6: Automated Testing & Build Verification
**Files:**
- Create: `frontend/test/wallet.test.ts`

- [x] **Step 1: Write frontend unit tests in `frontend/test/wallet.test.ts`**
  - Test 1% platform fee calculation (`Math.round(gross * 0.01)`).
  - Test withdrawal DTO constraints (min 10.000, bank info required for transfer).
  - Test queue filtering logic.
- [x] **Step 2: Run frontend test suite (`cd frontend && bun test`)**
- [x] **Step 3: Run backend test suite (`cd backend && bun test`)**
- [x] **Step 4: Run production build (`cd frontend && bun run build`)**
