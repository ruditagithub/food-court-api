# Multi-Role Dashboard Statistical Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengimplementasikan endpoint analitik backend dan antarmuka visual 4-layer dashboard statistik tingkat eksekutif untuk 3 role pengguna utama: Super Admin (`admin`), Admin Food Court (`admin-food-court`), dan Tenant (`tenant`).

**Architecture:** Menggunakan dedicated backend SQL aggregations pada database MySQL via Drizzle ORM di modul backend masing-masing untuk kalkulasi instan dan efisien, kemudian menyajikannya ke frontend `DashboardPage.tsx` menggunakan Recharts dan komponen modular per-role.

**Tech Stack:** ElysiaJS, TypeScript, Bun, Drizzle ORM, MySQL, React, TailwindCSS, Lucide Icons, Recharts.

## Global Constraints
- Seluruh endpoint analitik backend wajib menerapkan role guard ketat: `admin` untuk super admin stats, `admin-food-court` untuk branch stats, `tenant` untuk stall stats.
- Seluruh query wajib terisolasi: tenant hanya melihat stannya sendiri (`tenants.ownerId = user.id`), admin food court hanya melihat cabangnya sendiri (`foodCourts.managerId = user.id`).
- Komponen frontend wajib mendukung empty state dan loading shimmer skeleton agar tidak crash jika data kosong.
- Gunakan format mata uang `formatRupiah()` dan styling modern konsisten dengan UI Amici Food Court.

---

### Task 1: Backend Super Admin Stats (`GET /api/super-admin/dashboard-stats`)

**Files:**
- Create: `backend/modules/food-courts/stats.service.ts`
- Modify: `backend/modules/food-courts/wallet.controller.ts`
- Test: `backend/test/super_admin_stats.test.ts`

**Interfaces:**
- Produces: `GET /api/super-admin/dashboard-stats?range=today|7d|30d|year&foodCourtId=all|<id>`
- Output Type: `{ summary: { totalGmv, gmvGrowthPercentage, platformFeeEarned, totalCompletedOrders, pendingWithdrawalAmount, pendingWithdrawalCount }, branchLeaderboard: Array<{ foodCourtId, name, totalGmv, totalOrders, platformFeeContributed, aov }>, operational: { channelDistribution, kitchenSla, paymentComposition }, trends: Array<{ date, gmv, platformFee, orderCount }> }`

- [ ] **Step 1: Write the failing integration test**
Create `backend/test/super_admin_stats.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { app } from "../index";
import { generateAuthToken } from "./test_helpers";

describe("GET /api/super-admin/dashboard-stats", () => {
  it("should return 401 when token is missing", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/super-admin/dashboard-stats")
    );
    expect(res.status).toBe(401);
  });

  it("should return 403 when called by non-admin (e.g. tenant)", async () => {
    const tenantToken = await generateAuthToken("tenant");
    const res = await app.handle(
      new Request("http://localhost/api/super-admin/dashboard-stats", {
        headers: { token: tenantToken },
      })
    );
    expect(res.status).toBe(403);
  });

  it("should return 200 with structured analytics data for super admin", async () => {
    const adminToken = await generateAuthToken("admin");
    const res = await app.handle(
      new Request("http://localhost/api/super-admin/dashboard-stats?range=30d", {
        headers: { token: adminToken },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.summary).toBeDefined();
    expect(typeof json.data.summary.totalGmv).toBe("number");
    expect(Array.isArray(json.data.branchLeaderboard)).toBe(true);
    expect(json.data.operational).toBeDefined();
    expect(json.data.operational.channelDistribution).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `bun test backend/test/super_admin_stats.test.ts`
Expected: FAIL with 404 (endpoint not defined)

- [ ] **Step 3: Implement SuperAdminStatsService and mount controller**
In `backend/modules/food-courts/stats.service.ts`:
Implement `getSuperAdminDashboardStats(user, range, foodCourtId)`. Aggregate orders for GMV, platform fee (1%), branch leaderboard via `group by orders.sessionId -> foodCourts.id`, channel distribution (kiosk vs table QR vs cashier), and kitchen SLA.
In `backend/modules/food-courts/wallet.controller.ts`:
Mount `.get("/dashboard-stats", async ({ user, query }) => { requireRoles(user, ["admin"]); return { data: await statsService.getSuperAdminDashboardStats(user, query.range, query.foodCourtId) }; })`.

- [ ] **Step 4: Run test to verify it passes**
Run: `bun test backend/test/super_admin_stats.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**
```bash
git add backend/modules/food-courts/stats.service.ts backend/modules/food-courts/wallet.controller.ts backend/test/super_admin_stats.test.ts
git commit -m "feat(api): implement GET /api/super-admin/dashboard-stats endpoint"
```

---

### Task 2: Backend Admin Food Court Stats (`GET /api/admin/food-court/dashboard-stats`)

**Files:**
- Modify: `backend/modules/food-courts/stats.service.ts`
- Modify: `backend/modules/food-courts/wallet.controller.ts`
- Test: `backend/test/food_court_manager_stats.test.ts`

**Interfaces:**
- Produces: `GET /api/admin/food-court/dashboard-stats?range=today|7d|30d`
- Output Type: `{ foodCourtInfo: { id, name }, financialSummary: { totalBranchRevenue, revenueGrowthPercentage, branchWalletBalance, pendingTenantWithdrawals, completedOrdersCount }, floorAndTables: { totalTables, occupiedTables, availableTables, occupancyRatePercentage, averageDiningDurationMinutes }, tenantAndKitchen: { totalTenants, activeTenantsCount, topTenants, kitchenQueueOverview }, channelBreakdown: { tableQr, kiosk, cashierPos }, trends }`

- [ ] **Step 1: Write failing integration test**
Create `backend/test/food_court_manager_stats.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { app } from "../index";
import { generateAuthToken } from "./test_helpers";

describe("GET /api/admin/food-court/dashboard-stats", () => {
  it("should return 401 when unauthenticated", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/admin/food-court/dashboard-stats")
    );
    expect(res.status).toBe(401);
  });

  it("should return 200 with branch scoped data for admin-food-court", async () => {
    const managerToken = await generateAuthToken("admin-food-court");
    const res = await app.handle(
      new Request("http://localhost/api/admin/food-court/dashboard-stats?range=today", {
        headers: { token: managerToken },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.foodCourtInfo).toBeDefined();
    expect(json.data.floorAndTables).toBeDefined();
    expect(typeof json.data.floorAndTables.occupancyRatePercentage).toBe("number");
    expect(json.data.tenantAndKitchen).toBeDefined();
    expect(Array.isArray(json.data.tenantAndKitchen.topTenants)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `bun test backend/test/food_court_manager_stats.test.ts`
Expected: FAIL with 404

- [ ] **Step 3: Implement getFoodCourtManagerStats method and mount endpoint**
Implement `getFoodCourtManagerStats(user, range)` in `backend/modules/food-courts/stats.service.ts`:
- Resolve food court where `managerId = user.id`.
- Count tables where `foodCourtId = fc.id` with `status = 'occupied'` vs `'available'`.
- Calculate occupancy percentage and average dining session duration.
- Fetch active kitchen queues and top selling tenants in this branch.
- Return structured analytics payload.

- [ ] **Step 4: Run test to verify it passes**
Run: `bun test backend/test/food_court_manager_stats.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**
```bash
git add backend/modules/food-courts/stats.service.ts backend/modules/food-courts/wallet.controller.ts backend/test/food_court_manager_stats.test.ts
git commit -m "feat(api): implement GET /api/admin/food-court/dashboard-stats endpoint"
```

---

### Task 3: Backend Tenant Stats (`GET /api/tenants/dashboard-stats`)

**Files:**
- Create: `backend/modules/tenants/stats.service.ts`
- Modify: `backend/modules/tenants/index.ts`
- Test: `backend/test/tenant_stats.test.ts`

**Interfaces:**
- Produces: `GET /api/tenants/dashboard-stats?range=today|7d|30d|year`
- Output Type: `{ tenantInfo: { id, name, stallNumber }, summary: { totalRevenue, walletBalance, pendingWithdrawal, totalPortionsSold, averageOrderValue, totalCompletedOrders }, menuIntelligence: { topSellingMenus, categoryDistribution, stockAlerts }, peakHoursAndTrends: { peakHour, hourlyBreakdown, dailyTrends }, recentWithdrawals }`

- [ ] **Step 1: Write failing integration test**
Create `backend/test/tenant_stats.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { app } from "../index";
import { generateAuthToken } from "./test_helpers";

describe("GET /api/tenants/dashboard-stats", () => {
  it("should return 401 when token missing", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/tenants/dashboard-stats")
    );
    expect(res.status).toBe(401);
  });

  it("should return 200 with stall scoped data for tenant role", async () => {
    const tenantToken = await generateAuthToken("tenant");
    const res = await app.handle(
      new Request("http://localhost/api/tenants/dashboard-stats?range=7d", {
        headers: { token: tenantToken },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.tenantInfo).toBeDefined();
    expect(json.data.summary).toBeDefined();
    expect(typeof json.data.summary.totalRevenue).toBe("number");
    expect(json.data.menuIntelligence).toBeDefined();
    expect(Array.isArray(json.data.menuIntelligence.topSellingMenus)).toBe(true);
    expect(json.data.peakHoursAndTrends).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `bun test backend/test/tenant_stats.test.ts`
Expected: FAIL with 404

- [ ] **Step 3: Implement TenantStatsService and mount endpoint**
Create `backend/modules/tenants/stats.service.ts`:
- Resolve tenant where `ownerId = user.id`.
- Query `tenantOrders` and `orderItems` for portions sold and top selling menus.
- Group by hour to produce peak hour breakdown.
- Query `menus` where `tenantId = tenant.id` and `(isAvailable = false OR status = 'OUT_OF_STOCK')` for stock alerts.
- Query `tenantBalanceLogs` and `withdrawalRequests` for wallet metrics.
Mount `.get("/dashboard-stats", ...)` in `backend/modules/tenants/index.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run: `bun test backend/test/tenant_stats.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**
```bash
git add backend/modules/tenants/stats.service.ts backend/modules/tenants/index.ts backend/test/tenant_stats.test.ts
git commit -m "feat(api): implement GET /api/tenants/dashboard-stats endpoint"
```

---

### Task 4: Frontend Super Admin 4-Layer Dashboard UI

**Files:**
- Create: `frontend/src/components/admin/SuperAdminAnalyticsWidgets.tsx`
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`

**Features:**
- Header time range pill selector (`Hari Ini`, `7 Hari`, `30 Hari`, `1 Tahun`) + filter cabang dropdown.
- Layer 1: 4 Top KPI Cards (GMV, Fee Platform 1%, Completed Orders, Pending Withdrawals).
- Layer 2: Recharts Area Chart (Tren GMV & Fee) + Leaderboard Antar-Cabang (Omzet, Order, AOV, Fee).
- Layer 3: Rasio Kanal Pesan (QR Meja vs Kiosk vs Kasir), SLA Dapur (rata-rata menit), dan Komposisi Bayar (QRIS vs Tunai).
- Layer 4: Quick Action Approval Card + Live Order Activity Feed.

- [ ] **Step 1: Create SuperAdminAnalyticsWidgets component**
Implement modular widgets for Layer 2 & Layer 3 with responsive Recharts (`ResponsiveContainer`, `AreaChart`, `BarChart`, `PieChart`).
- [ ] **Step 2: Connect DashboardPage.tsx to GET /api/super-admin/dashboard-stats**
Add state for `statsRange`, trigger fetch on range/branch change, and render widgets when `user?.role === 'admin'`.
- [ ] **Step 3: Verify TypeScript build**
Run: `cd frontend && bun run build`
Expected: Build succeeds with 0 errors.
- [ ] **Step 4: Commit changes**
```bash
git add frontend/src/components/admin/SuperAdminAnalyticsWidgets.tsx frontend/src/pages/dashboard/DashboardPage.tsx
git commit -m "feat(ui): implement super admin 4-layer dashboard analytics view"
```

---

### Task 5: Frontend Admin Food Court 4-Layer Dashboard UI

**Files:**
- Create: `frontend/src/components/admin/FoodCourtManagerAnalyticsWidgets.tsx`
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`

**Features:**
- Header: Nama Cabang Terkunci + Time Selector (`Hari Ini`, `7 Hari`, `30 Hari`).
- Layer 1: 4 KPI Finansial Cabang (Omzet Cabang, Saldo Siap Tarik, Pending Penarikan Tenant, Total Pesanan Cabang).
- Layer 2: Compact Floor Occupancy Gauge (% terisi, meja kosong vs terisi, avg dining duration) + Adopsi Kanal Cabang.
- Layer 3: Leaderboard Stan Terlaris Cabang + Beban Antrean Dapur Stan (Busiest Kitchen).
- Layer 4: Feed Aktivitas Pesanan Cabang Terkini.

- [ ] **Step 1: Create FoodCourtManagerAnalyticsWidgets component**
Implement radial/progress occupancy meter, channel bar chart, and tenant leaderboard table with kitchen queue indicator.
- [ ] **Step 2: Integrate in DashboardPage.tsx for admin-food-court**
Fetch `GET /api/admin/food-court/dashboard-stats` and render `FoodCourtManagerAnalyticsWidgets` when `user?.role === 'admin-food-court'`.
- [ ] **Step 3: Verify TypeScript build**
Run: `cd frontend && bun run build`
Expected: Build succeeds with 0 errors.
- [ ] **Step 4: Commit changes**
```bash
git add frontend/src/components/admin/FoodCourtManagerAnalyticsWidgets.tsx frontend/src/pages/dashboard/DashboardPage.tsx
git commit -m "feat(ui): implement admin food court manager 4-layer dashboard analytics view"
```

---

### Task 6: Frontend Tenant 4-Layer Dashboard UI

**Files:**
- Create: `frontend/src/components/tenant/TenantAnalyticsWidgets.tsx`
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`

**Features:**
- Header: Identitas Stan (`STAN-A01`) + Time Selector (`Hari Ini`, `7 Hari`, `30 Hari`, `1 Tahun`) + Tombol Tarik Saldo.
- Layer 1: 4 Merchant KPI Cards (Omzet Stan, Saldo Bersih Siap Tarik, Porsi Terjual, AOV).
- Layer 2: Tren Penjualan Harian (Area Chart) + Jam Sibuk Pesanan (Peak Hours Bar Chart).
- Layer 3: Top 5 Menu Terlaris & Varian Favorit + Sebaran Kategori & Peringatan Stok Habis (*Stock Alert*).
- Layer 4: Transparansi Dompet & Riwayat Penarikan Dana.

- [ ] **Step 1: Create TenantAnalyticsWidgets component**
Implement peak hours Recharts bar chart, top 5 menu table with popular options, category distribution donut, and stock alert cards.
- [ ] **Step 2: Integrate in DashboardPage.tsx for tenant role**
Fetch `GET /api/tenants/dashboard-stats` and render `TenantAnalyticsWidgets` when `user?.role === 'tenant'`.
- [ ] **Step 3: Verify TypeScript build**
Run: `cd frontend && bun run build`
Expected: Build succeeds with 0 errors.
- [ ] **Step 4: Commit changes**
```bash
git add frontend/src/components/tenant/TenantAnalyticsWidgets.tsx frontend/src/pages/dashboard/DashboardPage.tsx
git commit -m "feat(ui): implement tenant merchant 4-layer dashboard analytics view"
```

---

### Task 7: End-to-End Verification & API Documentation Sync

**Files:**
- Modify: `backend/README.md`
- Test: All backend tests & frontend production build

- [ ] **Step 1: Run all unit and integration tests**
Run: `cd backend && bun test`
Expected: All tests pass.
- [ ] **Step 2: Run frontend build check**
Run: `cd frontend && bun run build`
Expected: Successful build.
- [ ] **Step 3: Update backend/README.md**
Document the 3 new endpoints:
- `GET /api/super-admin/dashboard-stats`
- `GET /api/admin/food-court/dashboard-stats`
- `GET /api/tenants/dashboard-stats`
Update RBAC matrix and detail sections.
- [ ] **Step 4: Commit documentation and plan completion**
```bash
git add backend/README.md
git commit -m "docs: document new multi-role dashboard stats endpoints in README"
```
