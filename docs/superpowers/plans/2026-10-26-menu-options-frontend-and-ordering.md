# Implementation Plan: Menu Options Frontend & Customer Ordering Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Menu Options (`menu_options`) into the frontend for both the **Tenant Dashboard** (managing dish variants and extra prices) and the **Customer Ordering Flow** (selecting options in menu modal, composite cart differentiation, option price adjustments, checkout API submission, and receipt/tracking breakdown).

**Architecture:**
- **Types Layer (`frontend/src/types/index.ts`):** Define `MenuOption` interface and associate with `Menu` and `CartItem`.
- **Tenant Management (`frontend/src/components/tenant/MenuFormDialog.tsx`):** Add dynamic variant builder rows ([Nama Varian], [Harga Tambahan]) supporting smart upsert and prune synchronization via existing `POST / PUT /api/menus`.
- **Customer Menu Modal (`frontend/src/components/customer/ItemDetailModal.tsx`):** Render variant selection pills/checkboxes with dynamic price adjustment recalculation.
- **Customer Cart Logic (`frontend/src/pages/customer/CustomerMenuPage.tsx`):** Separate distinct variant combinations into separate cart items while capping stock per menu. Intercept Quick Add (`+`) for items with options to open the modal.
- **Cart & Checkout Display (`frontend/src/components/customer/CartDrawer.tsx`, `frontend/src/pages/customer/CheckoutPage.tsx`):** Display option tags under item titles and pass `optionIds` into `POST /api/orders` payload.
- **Receipts & Tracking (`frontend/src/pages/customer/OrderTrackingPage.tsx`, `frontend/src/components/common/ReceiptModal.tsx`):** Display historical option snapshots from `orderItemOptions`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite, Bun Test.

---

### Task 1: Frontend Domain Models & Types for Menu Options
**Files:**
- Modify: `frontend/src/types/index.ts`
- Test: `frontend/test/menus.test.ts`

- [x] **Step 1: Update `frontend/src/types/index.ts`**
  - Add `MenuOption` interface (`id`, `menuId`, `name`, `priceAdjustment`).
  - Add `options?: MenuOption[]` to `Menu`.
  - Add `selectedOptions?: Array<{ id: string; name: string; priceAdjustment: number }>` to `CartItem`.
- [x] **Step 2: Run frontend test to verify compilation**
  - `cd frontend && bun test test/menus.test.ts`

---

### Task 2: Tenant Dashboard Menu Option Builder in `MenuFormDialog`
**Files:**
- Modify: `frontend/src/components/tenant/MenuFormDialog.tsx`

- [x] **Step 1: Add options state & row management in `MenuFormDialog.tsx`**
  - State `options: Array<{ id?: string; name: string; priceAdjustment: number }>`.
  - Populate from `initialData.options` when in edit mode.
  - Add handlers: `handleAddOptionRow`, `handleRemoveOptionRow`, `handleOptionChange`.
- [x] **Step 2: Add UI section for Varian / Opsi Tambahan**
  - Inputs for Nama Varian and Harga Tambahan (+Rp).
  - Validation: Ensure names are non-empty and prices >= 0.
- [x] **Step 3: Include `options` array in save payload**
  - Forward sanitized `options` to `POST /api/menus` or `PUT /api/menus/:id`.

---

### Task 3: Customer Menu Detail Modal Option Selector
**Files:**
- Modify: `frontend/src/components/customer/ItemDetailModal.tsx`

- [x] **Step 1: Add option selection state and dynamic calculation**
  - State: `selectedOptions: Set<string>`.
  - Calculate `effectivePrice = item.price + sum(selectedAdjustments)`.
  - Update `totalPrice = effectivePrice * quantity`.
- [x] **Step 2: Render option selectors**
  - Checkbox pills showing option name and `+Rp X` (or `Gratis`).
- [x] **Step 3: Pass selected options on `handleAdd`**
  - Pass `selectedOptions` array to `onAddToCart`.

---

### Task 4: Customer Menu Page Composite Cart State & Quick Add Intercept
**Files:**
- Modify: `frontend/src/pages/customer/CustomerMenuPage.tsx`

- [x] **Step 1: Update `handleAddToCart` for composite items**
  - Match item by `menuId + sortedOptionIds + notes`.
  - Compute `ci.price = item.price + sum(options.priceAdjustment)`.
- [x] **Step 2: Intercept Quick Add for optioned items**
  - If `item.options && item.options.length > 0`, open `ItemDetailModal`.
  - Otherwise, quick add 1 qty.

---

### Task 5: Cart Drawer & Checkout Integration
**Files:**
- Modify: `frontend/src/components/customer/CartDrawer.tsx`
- Modify: `frontend/src/pages/customer/CheckoutPage.tsx`

- [x] **Step 1: Render option pills in `CartDrawer.tsx`**
- [x] **Step 2: Render option pills in `CheckoutPage.tsx` summary list**
- [x] **Step 3: Forward `optionIds` in `handleSubmitOrder` payload**
  - `optionIds: ci.selectedOptions?.map(o => o.id) || ci.optionIds || undefined`.

---

### Task 6: Tracking & Receipt Option Snapshot Display
**Files:**
- Modify: `frontend/src/pages/customer/OrderTrackingPage.tsx`
- Modify: `frontend/src/components/common/ReceiptModal.tsx` (implemented in `frontend/src/components/payment/ReceiptModal.tsx`)

- [x] **Step 1: Display option snapshots in `OrderTrackingPage.tsx`**
- [x] **Step 2: Display option snapshots in `ReceiptModal.tsx` thermal print & modal**

---

### Task 7: Automated Regression & Build Verification
- [x] **Step 1: Run full backend test suite (`cd backend && bun test`)**
- [x] **Step 2: Run full frontend test suite (`cd frontend && bun test`)**
- [x] **Step 3: Run production build (`cd frontend && bun run build`)**
