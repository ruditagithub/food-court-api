# Implementation Plan: Self-Service Kiosk & Takeaway Ordering System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a multi-device **Self-Service Kiosk & Takeaway Ordering System** per food court. Food court managers can register and operate multiple Kiosk terminals (`/kiosk/:deviceCode`), enabling customers to place takeaway orders via a fullscreen touchscreen interface or by scanning the standby QR code with their mobile phones. The system supports live dynamic Midtrans QRIS payments and Cashier payment slips, and tags orders as `[TAKEAWAY]` with standard `ORD-XXXX` numbers for kitchen call-out.

**Architecture:**
- **Backend Kiosks Module (`backend/modules/kiosks/`):** CRUD endpoints for Kiosks, unique `deviceCode` validation, public resolution endpoint `GET /api/kiosks/resolve/:deviceCode` with eager-loaded menus.
- **Frontend Kiosk Terminal (`frontend/src/pages/kiosk/`):** Fullscreen touchscreen UI with screensaver/attract screen, standby takeaway QR code for mobile orders, touch-friendly menu browsing, dynamic Midtrans QRIS payment with live polling, Cashier slip generator (`CSH-TK-XXXX`), success modal with giant `ORD-XXXX` number, and 60s inactivity auto-reset timer.
- **Admin Food Court Kiosk Portal (`frontend/src/pages/admin/AdminKiosksPage.tsx`):** Manage Kiosks per food court, toggle status, launch kiosk terminal, and generate print-ready takeaway standee cards (`KioskQRPrintModal.tsx`).
- **Kitchen & Cashier Integration:** Tag orders as `[TAKEAWAY]` in KDS kitchen queues and Cashier POS.

**Tech Stack:** Bun, ElysiaJS, Drizzle ORM, MySQL, React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite.

---

### Task 1: Backend Kiosks Module & Integration Tests
**Files:**
- Create: `backend/modules/kiosks/model.ts`
- Create: `backend/modules/kiosks/service.ts`
- Create: `backend/modules/kiosks/index.ts`
- Modify: `backend/index.ts`
- Create: `backend/test/kiosks.test.ts`

- [x] **Step 1: Write integration tests in `backend/test/kiosks.test.ts`**
  - Test public resolution `GET /api/kiosks/resolve/:deviceCode` returning kiosk details and food court menus.
  - Test unique `deviceCode` collision rejection.
  - Test admin authorization (admin can only manage kiosks in their food court).
  - Test kiosk active/inactive status toggle.
- [x] **Step 2: Implement DTOs in `backend/modules/kiosks/model.ts`**
  - `CreateKioskDTO`, `UpdateKioskDTO`, `KioskQueryDTO`.
- [x] **Step 3: Implement service in `backend/modules/kiosks/service.ts`**
  - `resolveKioskByDeviceCode`, `createKiosk`, `getKiosks`, `updateKiosk`, `deleteKiosk`.
- [x] **Step 4: Implement routes in `backend/modules/kiosks/index.ts` and mount in `backend/index.ts`**
- [x] **Step 5: Run tests (`cd backend && bun test test/kiosks.test.ts`) and verify all pass**

---

### Task 2: Frontend Types & Navigation Wiring
**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/InternalSidebar.tsx`
- Modify: `frontend/src/components/layout/SuperAdminRailAside.tsx`

- [x] **Step 1: Add `Kiosk` interface to `frontend/src/types/index.ts`**
- [x] **Step 2: Add routes in `frontend/src/App.tsx`**
  - `/kiosk/:deviceCode` -> `KioskTerminalPage` (public fullscreen).
  - `/app/admin/kiosks` -> `AdminKiosksPage` (protected).
- [x] **Step 3: Add navigation link in `InternalSidebar.tsx` and `SuperAdminRailAside.tsx`**

---

### Task 3: Admin Food Court Kiosk Management Page
**Files:**
- Create: `frontend/src/pages/admin/AdminKiosksPage.tsx`
- Create: `frontend/src/components/admin/KioskQRPrintModal.tsx`

- [x] **Step 1: Implement `AdminKiosksPage.tsx`**
  - Stat cards (Total Kiosk, Kiosk Aktif).
  - Table of registered kiosks with status toggle and action buttons ("Buka Kiosk", "Cetak QR Standee", "Edit", "Hapus").
  - Form dialog for adding/editing a Kiosk (Nama Kiosk, Device Code, Lokasi).
- [x] **Step 2: Implement `KioskQRPrintModal.tsx`**
  - Print-ready card layout with QR Code encoding `/kiosk/:deviceCode` and food court branding.

---

### Task 4: Fullscreen Touchscreen Kiosk Terminal Page
**Files:**
- Create: `frontend/src/pages/kiosk/KioskTerminalPage.tsx`
- Create: `frontend/src/components/kiosk/KioskPaymentModal.tsx`
- Create: `frontend/src/components/kiosk/KioskOrderSuccessModal.tsx`

- [x] **Step 1: Build Attract Screensaver & Standby QR Display**
  - Fullscreen banner with touch-to-order prompt.
  - Standby QR Code card for customer mobile ordering.
- [x] **Step 2: Build Touchscreen Menu Catalog & Takeaway Cart**
  - Big category tiles, food cards with photo & options badge.
  - Customer name input and bottom floating takeaway cart bar.
  - Inactivity guard timer (60s idle -> 15s prompt -> auto reset).
- [x] **Step 3: Implement `KioskPaymentModal.tsx`**
  - Tab 1: Midtrans dynamic QRIS with live countdown and status polling.
  - Tab 2: Cashier payment slip (`CSH-TK-XXXX`) with barcode.
- [x] **Step 4: Implement `KioskOrderSuccessModal.tsx`**
  - Huge `ORD-XXXX` order number, customer name, and 30s auto-reset countdown.

---

### Task 5: Automated Testing & Build Verification
- [x] **Step 1: Run full backend test suite (`cd backend && bun test`)**
- [x] **Step 2: Run full frontend test suite (`cd frontend && bun test`)**
- [x] **Step 3: Run production build (`cd frontend && bun run build`)**
