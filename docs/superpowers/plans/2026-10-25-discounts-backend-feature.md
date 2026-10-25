# Backend Discount Engine (Food Court & Tenant, Public & Code-Based) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive backend discount engine supporting Food Court-wide and Tenant-specific promotions, with both Public and Voucher Code distribution models, real-time validation, order creation integration, and waterfall/spillover split bill distribution.

**Architecture:**
- **Database Schema:** Create a new `discounts` table in `backend/db/schema.ts` with relationships to `foodCourts` and `tenants`. Add `discountId` foreign key to `orders`. Add `discountAmount` column to `paymentGroups`.
- **Discount Core Model & DTOs:** Create `backend/modules/discounts/model.ts` defining types for discount creation, updating, validation, and public queries.
- **Service Layer (`discounts/service.ts`):** Handles validation logic:
  - Scope check: Food Court vs Tenant-specific.
  - Active date verification (`startDate <= now <= endDate`).
  - Quota verification (`usageCount < usageLimit`).
  - Minimum purchase verification (`minOrderAmount`).
  - Calculation: Percentage with `maxDiscountAmount` cap vs Fixed Amount.
- **Order Creation Integration (`orders/service.ts`):** `orderService.create()` accepts optional `discountCode` or `discountId`. Applies discount to calculate `discountedSubtotal`, computes PB1 10% and Service 3% on the discounted base, and increments discount `usageCount`.
- **Split Bill Distribution (`orders/service.ts`):** In `configureSplitBill()`, discount is split evenly (`basePerPerson`), with a spillover algorithm where if any participant's subtotal is smaller than their discount portion, their surplus discount automatically rolls over to other participants so zero discount is wasted and no participant owes negative amounts.
- **Public & Management APIs (`discounts/index.ts`):**
  - Public endpoints: `GET /api/discounts/public` (list public active vouchers) and `POST /api/discounts/validate` (pre-checkout discount validation and savings preview).
  - Admin & Tenant endpoints: `POST /api/discounts`, `GET /api/discounts`, `GET /api/discounts/:id`, `PUT /api/discounts/:id`, `DELETE /api/discounts/:id` with role-based authorization.

**Tech Stack:**
- Backend: ElysiaJS, Drizzle ORM, MySQL, Bun Test, Zod / TypeBox

## Global Constraints
- Maximum 1 discount per order (no stacking).
- Tax (PB1 10%) and Service (3%) are strictly computed from `discountedSubtotal` (`Math.max(0, subtotal - discountAmount)`).
- For tenant-specific discounts, only items from the specified `tenantId` count toward `minOrderAmount` and qualify for discount deduction.
- Split bill payment groups must sum up strictly to the master order's `totalAmount`.
- All backend integration tests must pass with 0 failures (`bun test`).

---

### Task 1: Database Migration & Schema Definition for Discounts

**Files:**
- Modify: `backend/db/schema.ts`
- Modify: `backend/modules/orders/model.ts`
- Create: `backend/test/discounts_schema.test.ts`

**Interfaces:**
- `discounts` table:
  ```ts
  id: varchar(36) PK
  foodCourtId: varchar(36) FK -> food_courts.id
  tenantId: varchar(36) NULLABLE FK -> tenants.id (null = food court global)
  code: varchar(50) NULLABLE UNIQUE (case-insensitive voucher code)
  name: varchar(150) NOT NULL
  description: text NULLABLE
  scope: enum('FOOD_COURT', 'TENANT') NOT NULL
  type: enum('PERCENTAGE', 'FIXED_AMOUNT') NOT NULL
  value: int NOT NULL (e.g. 20 for 20%, or 10000 for Rp 10.000)
  maxDiscountAmount: int NULLABLE (maximum cap in Rp, e.g. 10000)
  minOrderAmount: int NOT NULL DEFAULT 0 (minimum subtotal required in Rp)
  isPublic: boolean NOT NULL DEFAULT true (true = public voucher, false = secret code)
  usageLimit: int NULLABLE (total allowed uses)
  usageCount: int NOT NULL DEFAULT 0
  startDate: timestamp NOT NULL
  endDate: timestamp NOT NULL
  status: enum('ACTIVE', 'INACTIVE', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE'
  createdAt, updatedAt
  ```
- `orders` table: Add `discountId` (varchar 36, nullable, FK -> `discounts.id`).
- `paymentGroups` table: Add `discountAmount` (int, default 0).

- [ ] **Step 1: Write schema verification test**

Create `backend/test/discounts_schema.test.ts`:
```ts
import { describe, expect, it } from "bun:test";
import { db } from "../db";
import { discounts, orders, paymentGroups } from "../db/schema";
import { eq } from "drizzle-orm";

describe("Discounts Database Schema", () => {
  it("should have discounts table with proper fields", async () => {
    expect(discounts).toBeDefined();
    expect(discounts.foodCourtId).toBeDefined();
    expect(discounts.tenantId).toBeDefined();
    expect(discounts.code).toBeDefined();
    expect(discounts.isPublic).toBeDefined();
    expect(discounts.maxDiscountAmount).toBeDefined();
    expect(discounts.minOrderAmount).toBeDefined();
    expect(orders.discountId).toBeDefined();
    expect(paymentGroups.discountAmount).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && bun test test/discounts_schema.test.ts`
Expected: FAIL (`discounts` not defined, columns missing).

- [ ] **Step 3: Update `backend/db/schema.ts`**

In `backend/db/schema.ts`:
1. Define `discounts` table with columns, indexes, and relations to `foodCourts`, `tenants`, and `orders`.
2. Add `discountId: varchar("discount_id", { length: 36 }).references(() => discounts.id, { onDelete: "set null" })` to `orders`.
3. Add `discountAmount: int("discount_amount").notNull().default(0)` to `paymentGroups`.
4. Update relations for `foodCourts`, `tenants`, and `orders`.

- [ ] **Step 4: Run MySQL migration command to create table and columns**

Execute migration SQL using Bun script or direct connection:
```sql
CREATE TABLE IF NOT EXISTS discounts (
  id VARCHAR(36) PRIMARY KEY,
  food_court_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NULL,
  code VARCHAR(50) NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  scope ENUM('FOOD_COURT', 'TENANT') NOT NULL DEFAULT 'FOOD_COURT',
  type ENUM('PERCENTAGE', 'FIXED_AMOUNT') NOT NULL DEFAULT 'PERCENTAGE',
  value INT NOT NULL,
  max_discount_amount INT NULL,
  min_order_amount INT NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  usage_limit INT NULL,
  usage_count INT NOT NULL DEFAULT 0,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (food_court_id) REFERENCES food_courts(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_id VARCHAR(36) NULL;
ALTER TABLE payment_groups ADD COLUMN IF NOT EXISTS discount_amount INT NOT NULL DEFAULT 0;
```

- [ ] **Step 5: Run schema test to verify it passes**

Run: `cd backend && bun test test/discounts_schema.test.ts`
Expected: PASS.

---

### Task 2: Discount Service & Real-time Validation Engine

**Files:**
- Create: `backend/modules/discounts/model.ts`
- Create: `backend/modules/discounts/service.ts`
- Create: `backend/test/discounts_service.test.ts`

**Interfaces:**
- `ValidateDiscountDTO`:
  ```ts
  {
    foodCourtId: string
    discountCode?: string
    discountId?: string
    items: Array<{ menuId: string; quantity: number }>
  }
  ```
- `DiscountCalculationResult`:
  ```ts
  {
    valid: boolean
    discount: Discount
    qualifyingSubtotal: number
    discountAmount: number
    subtotal: number
    discountedSubtotal: number
    serviceFee: number
    taxAmount: number
    totalAmount: number
    message?: string
  }
  ```
- Methods on `DiscountService`:
  - `validateDiscount(input: ValidateDiscountDTO): Promise<DiscountCalculationResult>`
  - `getPublicDiscounts(foodCourtId: string, tenantId?: string): Promise<Discount[]>`
  - `createDiscount(data: CreateDiscountDTO, user: AuthUser): Promise<Discount>`
  - `getDiscounts(query: GetDiscountsQuery, user: AuthUser): Promise<Discount[]>`
  - `getDiscountById(id: string): Promise<Discount>`
  - `updateDiscount(id: string, data: UpdateDiscountDTO, user: AuthUser): Promise<Discount>`
  - `deleteDiscount(id: string, user: AuthUser): Promise<{ success: boolean }>`

- [ ] **Step 1: Write tests for discount validation and calculation in `discounts_service.test.ts`**

Test scenarios:
1. Validate active public percentage discount with cap (e.g. 20% max 10.000, subtotal 100.000 -> discount 10.000).
2. Validate voucher code discount (case-insensitive `PROMO10K` -> Rp 10.000).
3. Reject discount if `minOrderAmount` is not reached.
4. Reject expired discount or inactive discount.
5. Reject tenant-specific discount if order has no items from that tenant or tenant items subtotal < `minOrderAmount`.
6. Reject secret code if user does not provide the code or code is wrong.

- [ ] **Step 2: Implement `backend/modules/discounts/model.ts`**

Define TypeBox validation schemas:
- `CreateDiscountDTO`
- `UpdateDiscountDTO`
- `ValidateDiscountDTO`
- `PublicDiscountsQueryDTO`
- `GetDiscountsQueryDTO`

- [ ] **Step 3: Implement `backend/modules/discounts/service.ts`**

Core calculation logic:
```ts
// 1. Find discount by id or code
// 2. Check foodCourtId matches
// 3. Check status is ACTIVE and now is between startDate and endDate
// 4. Check usageLimit (if set, usageCount < usageLimit)
// 5. Calculate qualifying subtotal:
let qualifyingSubtotal = 0;
let overallSubtotal = 0;
for (const it of itemsWithMenu) {
  const lineTotal = it.price * it.quantity;
  overallSubtotal += lineTotal;
  if (!discount.tenantId || it.tenantId === discount.tenantId) {
    qualifyingSubtotal += lineTotal;
  }
}

if (qualifyingSubtotal < discount.minOrderAmount) {
  throw new BadRequestError(`Minimal belanja untuk promo ini adalah Rp ${discount.minOrderAmount.toLocaleString('id-ID')}`);
}

// 6. Compute raw discount
let discountAmount = 0;
if (discount.type === "PERCENTAGE") {
  const raw = Math.round((qualifyingSubtotal * discount.value) / 100);
  discountAmount = discount.maxDiscountAmount ? Math.min(raw, discount.maxDiscountAmount) : raw;
} else {
  discountAmount = Math.min(discount.value, qualifyingSubtotal);
}

// 7. Compute tax & service
const discountedSubtotal = Math.max(0, overallSubtotal - discountAmount);
const serviceFee = Math.round(discountedSubtotal * 0.03);
const taxAmount = Math.round(discountedSubtotal * 0.10);
const totalAmount = discountedSubtotal + serviceFee + taxAmount;
```

- [ ] **Step 4: Run test to verify `discounts_service.test.ts` passes**

Run: `cd backend && bun test test/discounts_service.test.ts`
Expected: All validation test scenarios PASS.

---

### Task 3: Order Creation with Discount & PB1/Service Recalculation

**Files:**
- Modify: `backend/modules/orders/model.ts`
- Modify: `backend/modules/orders/service.ts`
- Test: `backend/test/orders_discount.test.ts`

**Interfaces:**
- `CreateOrderDTO`: Add optional `discountCode?: string` and `discountId?: string`.
- `orderService.create()`:
  - If discount provided: validates and calculates discount.
  - Stores `orders.discountId = discount.id` and `orders.discountAmount = discountAmount`.
  - Calculates `masterTaxAmount = Math.round((masterSubtotal - discountAmount) * 0.10)`.
  - Calculates `masterServiceFee = Math.round((masterSubtotal - discountAmount) * 0.03)`.
  - Sets `masterTotalAmount = (masterSubtotal - discountAmount) + masterServiceFee + masterTaxAmount`.
  - Sets default `paymentGroups[0].amountDue = masterTotalAmount` and `discountAmount = discountAmount`.
  - Increments `discounts.usageCount` by 1.

- [ ] **Step 1: Write integration test for order creation with discount in `orders_discount.test.ts`**

Test creating an order with a 20% discount (capped at Rp 10.000):
- Subtotal: Rp 100.000
- Discount: Rp 10.000
- Discounted Subtotal: Rp 90.000
- Service (3%): Rp 2.700
- PB1 Tax (10%): Rp 9.000
- Total: Rp 101.700
- Check `order.discountAmount === 10000`, `order.totalAmount === 101700`.

- [ ] **Step 2: Update `backend/modules/orders/model.ts`**

Add `discountCode: t.Optional(t.String())` and `discountId: t.Optional(t.String())` to `CreateOrderDTO`.

- [ ] **Step 3: Update `backend/modules/orders/service.ts` in `create()`**

Integrate `discountService.validateDiscount()`, compute final financial numbers, update `usageCount`, and set `discountId`.

- [ ] **Step 4: Run test to verify `orders_discount.test.ts` passes**

Run: `cd backend && bun test test/orders_discount.test.ts`
Expected: PASS.

---

### Task 4: Split Bill Discount Distribution (Waterfall / Spillover Algorithm)

**Files:**
- Modify: `backend/modules/orders/service.ts:1230-1320`
- Test: `backend/test/split_bill_discount.test.ts`

**Interfaces:**
- In `configureSplitBill(orderId: string, data: SplitBillDTOType)`:
  - Read `order.discountAmount`.
  - If `order.discountAmount > 0`:
    - Even split base: `baseDiscount = Math.floor(order.discountAmount / preparedGroups.length)`.
    - Apply waterfall / rollover:
      1. For each participant, initial discount is `min(baseDiscount, participantSubtotal)`.
      2. If any participant had `participantSubtotal < baseDiscount`, the unallocated surplus goes into `spilloverPool`.
      3. Distribute `spilloverPool` to remaining participants who still have unpaid subtotal.
    - Each group calculates:
      `groupDiscountedSubtotal = Math.max(0, groupSubtotal - groupDiscount)`
      `groupServiceFee = Math.round(groupDiscountedSubtotal * 0.03)`
      `groupTaxAmount = Math.round(groupDiscountedSubtotal * 0.10)`
      `groupAmountDue = groupDiscountedSubtotal + groupServiceFee + groupTaxAmount`
      Store `discountAmount = groupDiscount` in `paymentGroups`.
    - Assert that sum of all `groupAmountDue` equals `order.totalAmount` (with 1-2 rupiah round adjustment if necessary).

- [ ] **Step 1: Write unit test for the waterfall split bill discount distribution**

Create `backend/test/split_bill_discount.test.ts`:
- Order Subtotal Rp 100.000, Discount Rp 10.000, Total Rp 101.700.
- Split bill between Nanda (Rp 30.000) and Putra (Rp 70.000):
  - Base discount: Rp 5.000 each.
  - Nanda subtotal Rp 30.000 - Rp 5.000 = Rp 25.000 -> Svc 750, Tax 2.500 -> Due: 28.250.
  - Putra subtotal Rp 70.000 - Rp 5.000 = Rp 65.000 -> Svc 1.950, Tax 6.500 -> Due: 73.450.
  - Total due: 28.250 + 73.450 = 101.700 (Exact match with master order total!).
- Edge Case: Participant C orders only Rp 3.000, base discount is Rp 5.000:
  - C gets Rp 3.000 discount (Free, due = 0).
  - Unused Rp 2.000 spills over to participant D!

- [ ] **Step 2: Implement the waterfall algorithm in `configureSplitBill`**

In `backend/modules/orders/service.ts`:
Implement the spillover distribution logic so discount allocation is 100% fair, transparent, and never leaves unallocated discount or negative amounts.

- [ ] **Step 3: Run test to verify it passes**

Run: `cd backend && bun test test/split_bill_discount.test.ts`
Expected: PASS.

---

### Task 5: REST Endpoints & Elysia Route Registration

**Files:**
- Create: `backend/modules/discounts/index.ts`
- Modify: `backend/index.ts`
- Test: `backend/test/discounts_api.test.ts`

**Endpoints:**
- `GET /api/discounts/public`: Public, lists active public vouchers for food court / tenant.
- `POST /api/discounts/validate`: Public / customer, validates voucher and returns pricing preview.
- `POST /api/discounts`: Protected (`admin`, `admin-food-court`, `tenant`), creates discount.
- `GET /api/discounts`: Protected, lists all discounts (including secret code vouchers and inactive ones for management).
- `GET /api/discounts/:id`: Protected, gets discount details.
- `PUT /api/discounts/:id`: Protected, updates discount details / status.
- `DELETE /api/discounts/:id`: Protected, deactivates / deletes discount.

- [ ] **Step 1: Write integration API test in `backend/test/discounts_api.test.ts`**

Cover authentication, tenant authorization (tenant can only manage own discounts), validation endpoint, and public listing endpoint.

- [ ] **Step 2: Implement `backend/modules/discounts/index.ts` with Elysia route handlers**

Mount routes with TypeBox schemas and auth middleware (`roleGuard(["admin", "admin-food-court", "tenant"])`).

- [ ] **Step 3: Register discount module in `backend/index.ts`**

Mount `.use(discountRoutes)`.

- [ ] **Step 4: Run all test suites**

Run: `cd backend && bun test`
Expected: All tests pass (including existing ordering, cashier POS, and new discounts tests).

---

### Task 6: Automated Regression Verification

**Files:**
- Test: `backend/test/customer_table_flow.test.ts`
- Test: `backend/test/tables_qr.test.ts`
- Test: `backend/test/discounts_api.test.ts`

- [ ] **Step 1: Run complete backend test suite**

Run: `cd backend && bun test`
Expected: 100% pass, 0 failures.

- [ ] **Step 2: Run frontend build to ensure client compatibility**

Run: `cd frontend && bun run build`
Expected: 0 TypeScript errors.
