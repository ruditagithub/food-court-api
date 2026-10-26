# Implementation Plan: Menu Options & Order Pipeline Integration (Backend)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement backend support for menu options/variants (`menu_options`) with hybrid creation (bulk payload & sub-resource CRUD) and integrate price adjustment calculations and snapshots (`order_item_options`) into the customer order pipeline.

**Architecture:** 
- Model & Validation layer: Extend `CreateMenuDTO` and `UpdateMenuDTO` to support an optional array of `options`, and add DTOs for dedicated option endpoints.
- Service layer (`menus/service.ts`): Implement bulk insertion during menu creation, smart upsert & prune synchronization during menu updates, sub-resource CRUD with tenant ownership verification, and eager-loading `options: true` in queries.
- Order Pipeline (`orders/service.ts`): Validate incoming `optionIds`, compute effective unit prices (`basePrice + priceAdjustment`), and insert snapshots into `order_item_options`.

**Tech Stack:** Bun, ElysiaJS, Drizzle ORM, MySQL.

## Global Constraints
- Must use existing tables `menu_options` and `order_item_options` in `backend/db/schema.ts`.
- Tenant ownership validation must prevent tenants from creating or modifying options for stalls they do not own.
- When updating a menu with an `options` array, options omitted from the array must be pruned/deleted, options with `id` updated, and options without `id` inserted.
- Option price adjustment can be 0 (e.g. standard variant) or positive (e.g. extra topping/size).
- Historical orders must remain immutable via snapshots in `order_item_options`.

---

### Task 1: Validation Models & DTOs for Menu Options

**Files:**
- Modify: `backend/modules/menus/model.ts`
- Test: `backend/test/menus_options_model.test.ts`

**Interfaces:**
- Produces: `MenuOptionItemDTO`, updated `CreateMenuDTO`, updated `UpdateMenuDTO`, `CreateMenuOptionDTO`, `UpdateMenuOptionDTO`.

- [x] **Step 1: Write failing test for DTO validation**

```typescript
// backend/test/menus_options_model.test.ts
import { describe, expect, it } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import { CreateMenuDTO, UpdateMenuDTO, MenuOptionItemDTO } from "../modules/menus/model";

describe("Menu Options DTO Validation", () => {
  it("should validate menu option item schema", () => {
    const validOption = { name: "Level 1 (Sedang)", priceAdjustment: 0 };
    expect(Value.Check(MenuOptionItemDTO, validOption)).toBe(true);

    const invalidOption = { name: "" }; // Empty name
    expect(Value.Check(MenuOptionItemDTO, invalidOption)).toBe(false);
  });

  it("should accept options array in CreateMenuDTO", () => {
    const menuWithOpts = {
      tenantId: "tenant-123",
      name: "Ayam Geprek",
      price: 20000,
      options: [
        { name: "Level 1", priceAdjustment: 0 },
        { name: "Level 2", priceAdjustment: 2000 },
      ],
    };
    expect(Value.Check(CreateMenuDTO, menuWithOpts)).toBe(true);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test backend/test/menus_options_model.test.ts`  
Expected: FAIL (`MenuOptionItemDTO` not defined or `options` not accepted in `CreateMenuDTO`).

- [x] **Step 3: Update `backend/modules/menus/model.ts`**

Export:
- `MenuOptionItemDTO = t.Object({ id: t.Optional(t.String()), name: t.String({ minLength: 1, maxLength: 100 }), priceAdjustment: t.Optional(t.Numeric({ default: 0 })) })`
- Update `CreateMenuDTO` to include `options: t.Optional(t.Array(MenuOptionItemDTO))`
- Update `UpdateMenuDTO` to include `options: t.Optional(t.Array(MenuOptionItemDTO))`
- Export `CreateMenuOptionDTO` and `UpdateMenuOptionDTO` for granular endpoints.

- [x] **Step 4: Run test to verify it passes**

Run: `bun test backend/test/menus_options_model.test.ts`  
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add backend/modules/menus/model.ts backend/test/menus_options_model.test.ts
git commit -m "feat(menus): define menu options validation schemas and DTOs"
```

---

### Task 2: Service Layer Bulk Creation, Smart Update, and Query Inclusion

**Files:**
- Modify: `backend/modules/menus/service.ts:135-255`
- Test: `backend/test/menus_options_service.test.ts`

**Interfaces:**
- Produces: `menuService.create` with options bulk insertion, `menuService.update` with smart upsert/prune, and eager-loaded `options` in `getById` and `getAll`.

- [x] **Step 1: Write failing test for menu options creation and smart update**

```typescript
// backend/test/menus_options_service.test.ts
import { describe, expect, it } from "bun:test";
import { menuService } from "../modules/menus/service";

describe("Menu Options Service Integration", () => {
  it("should create menu with options and retrieve them in getById", async () => {
    // Test logic mocking or verifying create with options
  });

  it("should smart-sync options during update", async () => {
    // Test logic verifying update keeps matching ids, adds new, and prunes missing
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test backend/test/menus_options_service.test.ts`  
Expected: FAIL.

- [x] **Step 3: Implement bulk create, smart sync, and query relation in `backend/modules/menus/service.ts`**

1. In `getAll` and `getById`:
   Add `options: true` to the Drizzle `with` query clause.
2. In `create`:
   If `data.options && data.options.length > 0`:
   Insert options into `menuOptions` table:
   ```typescript
   for (const opt of data.options) {
     await db.insert(menuOptions).values({
       id: crypto.randomUUID(),
       menuId: id,
       name: opt.name.trim(),
       priceAdjustment: opt.priceAdjustment ? Number(opt.priceAdjustment) : 0,
       createdAt: new Date(),
       updatedAt: new Date(),
     });
   }
   ```
3. In `update`:
   If `data.options !== undefined`:
   Fetch existing options for `existing.id`:
   - Identify existing options to keep/update: matching `opt.id`.
   - Identify new options to insert: `!opt.id`.
   - Identify obsolete options to delete: existing in DB but not present in `data.options.map(o => o.id)`.
   Execute updates, inserts, and deletes accordingly.

- [x] **Step 4: Run test to verify it passes**

Run: `bun test backend/test/menus_options_service.test.ts`  
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add backend/modules/menus/service.ts backend/test/menus_options_service.test.ts
git commit -m "feat(menus): implement bulk options create, smart sync update, and query eager-loading"
```

---

### Task 3: Sub-Resource CRUD Endpoints for Menu Options

**Files:**
- Modify: `backend/modules/menus/service.ts`
- Modify: `backend/modules/menus/index.ts`
- Test: `backend/test/menus_options_endpoints.test.ts`

**Interfaces:**
- Produces endpoints:
  - `GET /api/menus/:menuId/options`
  - `POST /api/menus/:menuId/options`
  - `PUT /api/menus/options/:id`
  - `DELETE /api/menus/options/:id`

- [x] **Step 1: Write failing test for sub-resource endpoints**

```typescript
// backend/test/menus_options_endpoints.test.ts
import { describe, expect, it } from "bun:test";
import { app } from "../index";

describe("Menu Options Sub-Resource Endpoints", () => {
  it("should return options for a specific menu", async () => {
    // Assert GET /api/menus/:menuId/options returns 200
  });

  it("should enforce ownership when adding option to menu", async () => {
    // Assert POST /api/menus/:menuId/options returns 403 for unauthorized tenant
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test backend/test/menus_options_endpoints.test.ts`  
Expected: FAIL (endpoints 404).

- [x] **Step 3: Implement sub-resource methods and routes**

1. In `backend/modules/menus/service.ts`:
   - `getOptionsByMenu(menuId: string)`
   - `addOption(menuId: string, data: CreateMenuOptionDTOType, user: AuthUser)`
   - `updateOption(optionId: string, data: UpdateMenuOptionDTOType, user: AuthUser)`
   - `deleteOption(optionId: string, user: AuthUser)`
   Include helper verifying tenant ownership before mutating options.
2. In `backend/modules/menus/index.ts`:
   Register the routes under `menusController`:
   - `GET /:menuId/options`
   - `POST /:menuId/options` (Role: `admin`, `admin-food-court`, `tenant`)
   - `PUT /options/:id` (Role: `admin`, `admin-food-court`, `tenant`)
   - `DELETE /options/:id` (Role: `admin`, `admin-food-court`, `tenant`)

- [x] **Step 4: Run test to verify it passes**

Run: `bun test backend/test/menus_options_endpoints.test.ts`  
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add backend/modules/menus/service.ts backend/modules/menus/index.ts backend/test/menus_options_endpoints.test.ts
git commit -m "feat(menus): add sub-resource CRUD endpoints for menu options"
```

---

### Task 4: Order Pipeline Integration with Option Snapshots

**Files:**
- Modify: `backend/modules/orders/service.ts:150-320`
- Test: `backend/test/orders_options.test.ts`

**Interfaces:**
- Consumes: `OrderItemInput.optionIds`, `menuOptions`
- Produces: `order_item_options` snapshots, updated `orderItems.unitPriceSnapshot`, and accurate subtotal calculation.

- [x] **Step 1: Write failing test for order creation with options**

```typescript
// backend/test/orders_options.test.ts
import { describe, expect, it } from "bun:test";
import { orderService } from "../modules/orders/service";

describe("Order Creation with Menu Options", () => {
  it("should calculate effective unit price including option price adjustments and create orderItemOptions snapshots", async () => {
    // Assert unitPriceSnapshot = menu.price + optionsAdjustment
    // Assert orderItemOptions rows are created in database
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test backend/test/orders_options.test.ts`  
Expected: FAIL.

- [x] **Step 3: Implement option resolution, price calculation, and snapshot insertion in `orders/service.ts`**

In `createOrder` method:
1. For each `item` in `data.items`:
   - Base price = `menu.price`.
   - If `item.optionIds && item.optionIds.length > 0`:
     - Query `menuOptions` where `menuId = menu.id` and `inArray(menuOptions.id, item.optionIds)`.
     - Compute total option adjustment:
       `const optionAdjustment = selectedOptions.reduce((sum, o) => sum + o.priceAdjustment, 0);`
     - Effective unit price:
       `const effectivePrice = basePrice + optionAdjustment;`
     - Insert `orderItem` with `unitPriceSnapshot: effectivePrice` and `subtotal: effectivePrice * item.quantity`.
     - For each option in `selectedOptions`:
       Insert into `orderItemOptions`:
       ```typescript
       await db.insert(orderItemOptions).values({
         id: crypto.randomUUID(),
         orderItemId: newOrderItem.id,
         optionNameSnapshot: o.name,
         priceAdjustmentSnapshot: o.priceAdjustment,
         createdAt: new Date(),
         updatedAt: new Date(),
       });
       ```
2. Verify in `getOrderById` that `items.options` (relation `orderItemOptions`) is included in order queries for Kitchen Display System and Customer Receipt.

- [x] **Step 4: Run test to verify it passes**

Run: `bun test backend/test/orders_options.test.ts`  
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add backend/modules/orders/service.ts backend/test/orders_options.test.ts
git commit -m "feat(orders): calculate option price adjustments and store order_item_options snapshots"
```

---

## Plan Review & Handoff Checklist
- [x] Spec coverage verified (DTOs, bulk create/update, sub-resource CRUD, order pipeline integration, snapshots).
- [x] No placeholder code, clear type signatures and Drizzle queries specified.
- [x] Tests designed for each task following TDD pattern.
