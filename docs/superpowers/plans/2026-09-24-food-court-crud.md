# Food Court CRUD & Admin Food Court Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan role `admin-food-court`, relasi kepemilikan `manager_id` pada tabel `food_courts`, dan modul REST API CRUD `/api/food-courts` yang terproteksi sesuai matriks RBAC.

**Architecture:** Modul baru `src/modules/food-courts/` (mengikuti pola Elysia Controller-Service-Model), relasi foreign key `food_courts.manager_id -> users.id`, proteksi endpoint via `authPlugin` + `requireRole`, dan integrasi dokumentasi Swagger OpenAPI.

**Tech Stack:** Bun, ElysiaJS, TypeBox, Drizzle ORM, MySQL.

## Global Constraints
- Seluruh harga/biaya menggunakan bilangan bulat `int` Rupiah (jika ada).
- Endpoint `/api/food-courts` terproteksi: tidak ada akses public/customer, endpoint `/my` ditiadakan.
- `GET /api/food-courts` untuk `admin-food-court` otomatis hanya mengembalikan data food court miliknya, sedangkan untuk `admin` mengembalikan seluruh food court.
- `GET /api/food-courts/:id` dan `DELETE /api/food-courts/:id` khusus role `admin`.

---

### Task 1: Update Database Schema & Relations

**Files:**
- Modify: `src/db/schema.ts`
- Test: `test/schema_integrity.test.ts`

**Interfaces:**
- Produces: `users.role` enum dengan `admin-food-court`, `foodCourts.managerId` FK `users.id`, relasi `foodCourtsRelations.manager` dan `usersRelations.managedFoodCourts`.

- [ ] **Step 1: Update test/schema_integrity.test.ts to assert managerId on foodCourts and role on users**

```typescript
// Di test/schema_integrity.test.ts tambahkan pengecekan kolom managerId di foodCourts
import { expect, test } from "bun:test";
import { foodCourts, users } from "../src/db/schema";

test("foodCourts should have managerId column", () => {
  expect(foodCourts.managerId).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/schema_integrity.test.ts`
Expected: FAIL (`managerId is not defined`)

- [ ] **Step 3: Update src/db/schema.ts**

Di tabel `users`:
```typescript
  role: mysqlEnum("role", ["admin", "admin-food-court", "tenant", "customer"])
    .notNull()
    .default("customer"),
```
Di relasi `usersRelations`:
```typescript
export const usersRelations = relations(users, ({ many }) => ({
  tenants: many(tenants),
  sessionParticipants: many(sessionParticipants),
  managedFoodCourts: many(foodCourts),
}));
```

Di tabel `foodCourts`:
```typescript
export const foodCourts = mysqlTable("food_courts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  managerId: varchar("manager_id", { length: 36 }).references(() => users.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 150 }).notNull(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  address: text("address"),
  phone: varchar("phone", { length: 30 }),
  logo: varchar("logo", { length: 255 }),
  status: mysqlEnum("status", ["ACTIVE", "INACTIVE"])
    .notNull()
    .default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
```
Di relasi `foodCourtsRelations`:
```typescript
export const foodCourtsRelations = relations(foodCourts, ({ one, many }) => ({
  manager: one(users, {
    fields: [foodCourts.managerId],
    references: [users.id],
  }),
  tables: many(tables),
  kiosks: many(kiosks),
  tenants: many(tenants),
  diningSessions: many(diningSessions),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/schema_integrity.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts test/schema_integrity.test.ts
git commit -m "feat(schema): add managerId to food_courts and admin-food-court role to users"
```

---

### Task 2: Update Auth Model & Service for `admin-food-court` Role

**Files:**
- Modify: `src/modules/auth/model.ts`
- Modify: `test/auth.test.ts`

**Interfaces:**
- Produces: `RegisterDTO` menerima `admin-food-court` sebagai role yang valid.

- [ ] **Step 1: Write test for registering admin-food-court in test/auth.test.ts**

```typescript
it("should register a new user with admin-food-court role", async () => {
  const res = await app.handle(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Manager Plaza",
        email: `manager_${Date.now()}@foodcourt.com`,
        password: "password123",
        role: "admin-food-court",
      }),
    }),
  );

  expect(res.status).toBe(201);
  const json = await res.json();
  expect(json.data.role).toBe("admin-food-court");
});
```

- [ ] **Step 2: Update src/modules/auth/model.ts**

```typescript
export const RegisterDTO = t.Object({
  name: t.String({
    minLength: 2,
    maxLength: 100,
    default: "Admin Food Court",
  }),
  email: t.String({ format: "email", default: "admin@foodcourt.com" }),
  password: t.String({ minLength: 6, default: "password123" }),
  role: t.Optional(
    t.Union(
      [
        t.Literal("admin"),
        t.Literal("admin-food-court"),
        t.Literal("tenant"),
        t.Literal("customer"),
      ],
      {
        default: "admin",
      },
    ),
  ),
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `bun test test/auth.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/auth/model.ts test/auth.test.ts
git commit -m "feat(auth): support admin-food-court role in RegisterDTO"
```

---

### Task 3: Create Food Courts Model (DTOs & Validation)

**Files:**
- Create: `src/modules/food-courts/model.ts`

**Interfaces:**
- Produces: `CreateFoodCourtDTO`, `UpdateFoodCourtDTO`, `FoodCourtResponse`, `FoodCourtsQueryDTO`

- [ ] **Step 1: Create src/modules/food-courts/model.ts**

```typescript
import { t } from "elysia";

export const CreateFoodCourtDTO = t.Object({
  name: t.String({ minLength: 2, maxLength: 150, default: "Grand Food Market" }),
  slug: t.Optional(t.String({ minLength: 2, maxLength: 150 })),
  address: t.Optional(t.String({ default: "Jl. Sudirman No. 10" })),
  phone: t.Optional(t.String({ maxLength: 30, default: "08123456789" })),
  logo: t.Optional(t.String({ maxLength: 255 })),
});

export const UpdateFoodCourtDTO = t.Object({
  name: t.Optional(t.String({ minLength: 2, maxLength: 150 })),
  slug: t.Optional(t.String({ minLength: 2, maxLength: 150 })),
  address: t.Optional(t.String()),
  phone: t.Optional(t.String({ maxLength: 30 })),
  logo: t.Optional(t.String({ maxLength: 255 })),
  status: t.Optional(t.Union([t.Literal("ACTIVE"), t.Literal("INACTIVE")])),
});

export const FoodCourtsQueryDTO = t.Object({
  status: t.Optional(t.String()),
  search: t.Optional(t.String()),
});

export type CreateFoodCourtDTOType = typeof CreateFoodCourtDTO.static;
export type UpdateFoodCourtDTOType = typeof UpdateFoodCourtDTO.static;
export type FoodCourtsQueryDTOType = typeof FoodCourtsQueryDTO.static;
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/food-courts/model.ts
git commit -m "feat(food-courts): create DTOs and validation schemas"
```

---

### Task 4: Create Food Courts Service

**Files:**
- Create: `src/modules/food-courts/service.ts`

**Interfaces:**
- Produces: `foodCourtsService.create`, `foodCourtsService.getAll`, `foodCourtsService.getById`, `foodCourtsService.update`, `foodCourtsService.delete`

- [ ] **Step 1: Create src/modules/food-courts/service.ts**

```typescript
import { and, desc, eq, like } from "drizzle-orm";
import { db } from "../../config/database";
import { AppError } from "../../common/errors";
import { foodCourts, tables, tenants } from "../../db/schema";
import {
  CreateFoodCourtDTOType,
  FoodCourtsQueryDTOType,
  UpdateFoodCourtDTOType,
} from "./model";

export const foodCourtsService = {
  async create(data: CreateFoodCourtDTOType, managerId: string) {
    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const existing = await db
      .select()
      .from(foodCourts)
      .where(eq(foodCourts.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      throw new AppError("Food court with this slug already exists", 409, "ConflictError");
    }

    const id = crypto.randomUUID();
    await db.insert(foodCourts).values({
      id,
      managerId,
      name: data.name,
      slug,
      address: data.address || null,
      phone: data.phone || null,
      logo: data.logo || null,
      status: "ACTIVE",
    });

    return this.getById(id);
  },

  async getAll(query: FoodCourtsQueryDTOType, user: { id: string; role: string }) {
    const conditions = [];

    // Jika admin-food-court, hanya ambil food court miliknya
    if (user.role === "admin-food-court") {
      conditions.push(eq(foodCourts.managerId, user.id));
    }

    if (query.status) {
      conditions.push(eq(foodCourts.status, query.status as "ACTIVE" | "INACTIVE"));
    }

    if (query.search) {
      conditions.push(like(foodCourts.name, `%${query.search}%`));
    }

    return db
      .select()
      .from(foodCourts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(foodCourts.createdAt));
  },

  async getById(id: string) {
    const fc = await db.query.foodCourts.findFirst({
      where: eq(foodCourts.id, id),
      with: {
        manager: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        tenants: true,
        tables: true,
      },
    });

    if (!fc) {
      throw new AppError("Food court not found", 404, "NotFoundError");
    }

    return fc;
  },

  async update(id: string, data: UpdateFoodCourtDTOType, user: { id: string; role: string }) {
    const existing = await db
      .select()
      .from(foodCourts)
      .where(eq(foodCourts.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new AppError("Food court not found", 404, "NotFoundError");
    }

    // Hanya admin atau manajer pemilik yang boleh update
    if (user.role === "admin-food-court" && existing[0].managerId !== user.id) {
      throw new AppError("Forbidden to update this food court", 403, "ForbiddenError");
    }

    await db.update(foodCourts).set(data).where(eq(foodCourts.id, id));
    return this.getById(id);
  },

  async delete(id: string) {
    const existing = await db
      .select()
      .from(foodCourts)
      .where(eq(foodCourts.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new AppError("Food court not found", 404, "NotFoundError");
    }

    await db.delete(foodCourts).where(eq(foodCourts.id, id));
    return { success: true, message: "Food court deleted successfully" };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/food-courts/service.ts
git commit -m "feat(food-courts): implement service with ownership checks"
```

---

### Task 5: Create Food Courts Controller & Mount to App

**Files:**
- Create: `src/modules/food-courts/index.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `foodCourtsController` di-mount pada `/api/food-courts` dan tag Swagger `Food Courts`.

- [ ] **Step 1: Create src/modules/food-courts/index.ts**

```typescript
import { Elysia, t } from "elysia";
import { authPlugin, requireAuth, requireRole } from "../../common/middlewares/auth";
import {
  CreateFoodCourtDTO,
  FoodCourtsQueryDTO,
  UpdateFoodCourtDTO,
} from "./model";
import { foodCourtsService } from "./service";

export const foodCourtsController = new Elysia({ prefix: "/api/food-courts" })
  .use(authPlugin)
  .post(
    "/",
    async ({ body, user, set }) => {
      requireRole(user, ["admin", "admin-food-court"]);
      const created = await foodCourtsService.create(body, user.id);
      set.status = 201;
      return {
        message: "Food court registered successfully",
        data: created,
      };
    },
    {
      body: CreateFoodCourtDTO,
      detail: {
        tags: ["Food Courts"],
        summary: "Register a new food court (Admin or Admin Food Court)",
      },
    },
  )
  .get(
    "/",
    async ({ query, user }) => {
      requireRole(user, ["admin", "admin-food-court"]);
      const list = await foodCourtsService.getAll(query, user);
      return {
        data: list,
      };
    },
    {
      query: FoodCourtsQueryDTO,
      detail: {
        tags: ["Food Courts"],
        summary: "Get list of food courts (Admin sees all, Admin-food-court sees own)",
      },
    },
  )
  .get(
    "/:id",
    async ({ params: { id }, user }) => {
      requireRole(user, ["admin"]);
      const fc = await foodCourtsService.getById(id);
      return {
        data: fc,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Food Courts"],
        summary: "Get food court detail with tenants and tables (Admin only)",
      },
    },
  )
  .put(
    "/:id",
    async ({ params: { id }, body, user }) => {
      requireRole(user, ["admin", "admin-food-court"]);
      const updated = await foodCourtsService.update(id, body, user);
      return {
        message: "Food court updated successfully",
        data: updated,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: UpdateFoodCourtDTO,
      detail: {
        tags: ["Food Courts"],
        summary: "Update food court profile (Admin or owning Manager)",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params: { id }, user }) => {
      requireRole(user, ["admin"]);
      return foodCourtsService.delete(id);
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Food Courts"],
        summary: "Delete food court (Admin only)",
      },
    },
  );
```

- [ ] **Step 2: Mount controller in src/index.ts and add Swagger tag**

Di `src/index.ts`:
- Import: `import { foodCourtsController } from "./modules/food-courts";`
- Tag OpenAPI: `{ name: "Food Courts", description: "Food court location and management" }`
- Mount: `.use(foodCourtsController)`

- [ ] **Step 3: Commit**

```bash
git add src/modules/food-courts/index.ts src/index.ts
git commit -m "feat(food-courts): implement controller and mount to app"
```

---

### Task 6: Integration Tests for Food Courts CRUD

**Files:**
- Create: `test/food_courts.test.ts`

- [ ] **Step 1: Write integration tests in test/food_courts.test.ts**

Tes mencakup:
1. Registrasi user `admin-food-court` & user `customer`.
2. Login dan dapatkan token.
3. Customer mencoba `POST /api/food-courts` -> 403 Forbidden.
4. `admin-food-court` memanggil `POST /api/food-courts` -> 201 Created (`managerId = user.id`).
5. `admin-food-court` memanggil `GET /api/food-courts` -> 200 OK (hanya berisi miliknya).
6. `admin-food-court` mencoba `GET /api/food-courts/:id` -> 403 Forbidden (karena detail khusus `admin`).
7. `admin-food-court` memanggil `PUT /api/food-courts/:id` miliknya -> 200 OK.
8. `admin-food-court` mencoba `DELETE /api/food-courts/:id` -> 403 Forbidden.

- [ ] **Step 2: Run test suite**

Run: `bun test test/food_courts.test.ts`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add test/food_courts.test.ts
git commit -m "test(food-courts): add comprehensive integration test suite"
```
