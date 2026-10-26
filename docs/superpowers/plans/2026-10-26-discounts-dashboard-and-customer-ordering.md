# Discounts & Promo Management Dashboard and Customer Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full frontend visual interfaces for discount & promo management across Super Admin, Admin Food Court, and Tenant dashboards, as well as interactive voucher selection, manual coupon input, and live pre-checkout validation on the customer ordering flow.

**Architecture:** 
- Unified adaptive dashboard page (`DiscountsManagementPage.tsx`) using role-based filtering and scoping for `admin`, `admin-food-court`, and `tenant`.
- Modal forms for creating and editing discounts (`DiscountFormModal.tsx`) with comprehensive field validation matching backend DTOs.
- Customer-facing voucher picker modal (`VoucherPickerModal.tsx`) querying active public vouchers, supporting manual secret promo code entry, and invoking pre-checkout validation (`POST /api/discounts/validate`).
- Seamless checkout integration in `CheckoutPage.tsx` with dynamic savings calculation, and discount visibility on `OrderTrackingPage.tsx` and `ReceiptModal.tsx`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide Icons, ElysiaJS, Drizzle ORM, Bun.

## Global Constraints
- Unified dashboard must support 3 distinct roles: `admin` (global), `admin-food-court` (branch-scoped), and `tenant` (stall-scoped).
- Tenant discount creation must be strictly constrained to their own stall (`scope: "TENANT"`, `tenantId: tenant.id`).
- All 7 backend discount endpoints must be integrated: `GET /api/discounts`, `POST /api/discounts`, `GET /api/discounts/:id`, `PUT /api/discounts/:id`, `DELETE /api/discounts/:id`, `GET /api/discounts/public`, and `POST /api/discounts/validate`.
- Customer checkout must update price breakdown dynamically (subtotal, discount deduction, service fee, PB1 tax, and total) before order submission.
- Do NOT commit piecemeal mid-task or push to remote repository without explicit user consent.

---

### Task 1: TypeScript Interfaces & Model Definitions

**Files:**
- Modify: `frontend/src/types/index.ts`

**Interfaces:**
- Produces:
  - `Discount`: complete discount record interface matching backend schema.
  - `DiscountCalculationResult`: result structure returned by `POST /api/discounts/validate`.
  - `CreateDiscountDTO` & `UpdateDiscountDTO`: form payload types.

- [x] **Step 1: Add discount type definitions to `frontend/src/types/index.ts`**
...
- [x] **Step 2: Verify TypeScript compiles**

Run: `bun run --cwd frontend build`  
Expected: Type check passes without error.

---

### Task 2: Discount UI Components (Card & Form Modal)

**Files:**
- Create: `frontend/src/components/discount/DiscountCard.tsx`
- Create: `frontend/src/components/discount/DiscountFormModal.tsx`

**Interfaces:**
- Produces:
  - `<DiscountCard discount={d} onEdit={...} onToggleStatus={...} currentRole={...} />`
  - `<DiscountFormModal isOpen={...} onClose={...} onSave={...} initialData={...} userRole={...} />`

- [x] **Step 1: Build `DiscountCard.tsx`**
...
- [x] **Step 2: Build `DiscountFormModal.tsx`**
...
- [x] **Step 3: Test component build**

Run: `bun run --cwd frontend build`  
Expected: PASS.

---

### Task 3: Unified Discounts Management Dashboard Page

**Files:**
- Create: `frontend/src/pages/dashboard/DiscountsManagementPage.tsx`

**Interfaces:**
- Consumes:
  - `GET /api/discounts`
  - `POST /api/discounts`
  - `PUT /api/discounts/:id`
  - `DELETE /api/discounts/:id`
  - `GET /api/food-courts` (for Super Admin food court picker)
  - `GET /api/tenants` (for tenant picker)

- [x] **Step 1: Build `DiscountsManagementPage.tsx`**
...
- [x] **Step 2: Verify page build**

Run: `bun run --cwd frontend build`  
Expected: PASS.

---

### Task 4: Routes & Sidebar Navigation Updates

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/InternalSidebar.tsx`

**Interfaces:**
- Produces routes:
  - `/app/super-admin/discounts` (Super Admin)
  - `/app/admin/discounts` (Admin Food Court)
  - `/app/tenant/discounts` (Tenant)

- [x] **Step 1: Add routes in `frontend/src/App.tsx`**
...
- [x] **Step 2: Update `InternalSidebar.tsx`**
...
- [x] **Step 3: Test routing build**

Run: `bun run --cwd frontend build`  
Expected: PASS.

---

### Task 5: Customer Checkout Voucher Selection & Live Validation

**Files:**
- Create: `frontend/src/components/customer/VoucherPickerModal.tsx`
- Modify: `frontend/src/pages/customer/CheckoutPage.tsx`

**Interfaces:**
- Consumes:
  - `GET /api/discounts/public?foodCourtId=...`
  - `POST /api/discounts/validate`
  - `POST /api/orders` (passes `discountCode` / `discountId`)

- [x] **Step 1: Build `VoucherPickerModal.tsx`**
...
- [x] **Step 2: Integrate into `CheckoutPage.tsx`**
...
- [x] **Step 3: Verify checkout build**

Run: `bun run --cwd frontend build`  
Expected: PASS.

---

### Task 6: Order Tracking & Receipt Modal Display

**Files:**
- Modify: `frontend/src/pages/customer/OrderTrackingPage.tsx`
- Modify: `frontend/src/components/payment/ReceiptModal.tsx`

- [x] **Step 1: Update `OrderTrackingPage.tsx`**
...
- [x] **Step 2: Update `ReceiptModal.tsx`**
...
- [x] **Step 3: Test compilation**

Run: `bun run --cwd frontend build`  
Expected: PASS.

---

### Task 7: Full Test Suite & Build Verification

**Files:**
- Test backend: `backend/test/discounts_*.test.ts`, `backend/test/orders_discount.test.ts`
- Test frontend: `bun run --cwd frontend build`

- [x] **Step 1: Run backend tests unsandboxed**
...
- [x] **Step 2: Run frontend production build**
...
- [x] **Step 3: Final Git Commit (When user confirms)**

```bash
git add frontend/ docs/superpowers/
git commit -m "feat(discounts): implement unified discount dashboard and customer checkout integration"
```

---

## Plan Review & Handoff Checklist
- [x] Full spec coverage: Super Admin, Admin Food Court, Tenant dashboards, and Customer checkout.
- [x] All 7 backend endpoints mapped to visual user interfaces.
- [x] No placeholders, complete component signatures and types.
- [x] Single unified adaptive dashboard approach matching user recommendation.
