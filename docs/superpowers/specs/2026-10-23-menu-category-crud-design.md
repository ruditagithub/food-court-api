# Design Spec: Menu Category Full CRUD & Unified Category Management Page

## 1. Executive Summary
Sistem kuliner multi-tenant Amici Food Court saat ini baru mendukung pembuatan (`POST /api/menus/categories`) dan pembacaan (`GET /api/menus/categories/:tenantId`) kategori sajian. Dokumen spesifikasi ini merancang penambahan fitur CRUD kategori yang lengkap pada backend (Update `PUT` & Delete `DELETE`) beserta penyediaan halaman terpadu di frontend pada rute `/app/categories` yang secara cerdas beradaptasi berdasarkan peran pengguna (`admin`, `admin-food-court`, dan `tenant`).

---

## 2. Analisis Kebutuhan & Arsitektur

### A. Role-Based Access Control (RBAC)
| Role | Hak Akses Kategori | Ruang Lingkup (Scope) |
| :--- | :--- | :--- |
| **Super Admin (`admin`)** | Full CRUD | Global lintas seluruh cabang food court dan seluruh stan tenant |
| **Admin Food Court (`admin-food-court`)** | Full CRUD | Khusus untuk stan tenant yang berada di food court kelolaannya |
| **Tenant (`tenant`)** | Full CRUD | Khusus untuk stan kios kuliner miliknya sendiri |
| **Customer (`customer`)** | Read-Only | Hanya melihat kategori menu via endpoint katalog pemesanan |

### B. Perilaku Penghapusan Kategori (Cascade Policy)
- Skema database tabel `menus` mendefinisikan relasi `categoryId` dengan `onDelete: "set null"`.
- Saat sebuah kategori dihapus:
  1. Seluruh menu yang sebelumnya terhubung dengan kategori tersebut tidak akan dihapus, melainkan nilai `categoryId`-nya otomatis menjadi `null` (*"Tanpa Kategori"* / sajian umum).
  2. Dialog konfirmasi di frontend akan memberikan alert informatif bahwa menu di dalam kategori akan beralih status menjadi "Tanpa Kategori" dan tidak akan hilang dari database.

---

## 3. Backend Implementation Spec

### A. DTO Schemas ([`backend/modules/menus/model.ts`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/backend/modules/menus/model.ts))
```ts
// Create:
export const CreateCategoryDTO = t.Object({
  tenantId: t.String(),
  name: t.String({ minLength: 2, maxLength: 80 }),
});

// Update:
export const UpdateCategoryDTO = t.Object({
  name: t.String({ minLength: 2, maxLength: 80 }),
});

export type UpdateCategoryDTOType = typeof UpdateCategoryDTO.static;
```

### B. Endpoints ([`backend/modules/menus/index.ts`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/backend/modules/menus/index.ts))
1. **`GET /api/menus/categories/:tenantId`** *(Existing)*:
   - Mengambil daftar kategori beserta daftar menu di dalamnya untuk tenant tertentu.
2. **`GET /api/menus/categories`** *(New)*:
   - Mengambil seluruh kategori sesuai scope user yang login:
     - `admin`: seluruh kategori semua tenant.
     - `admin-food-court`: seluruh kategori tenant dalam food court kelolaannya.
     - `tenant`: seluruh kategori stan miliknya.
     - Menerima query opsional `tenantId` untuk penyaringan spesifik.
3. **`POST /api/menus/categories`** *(Existing)*:
   - Membuat kategori baru, memvalidasi kepemilikan stan tenant via `checkTenantOwnership`.
4. **`PUT /api/menus/categories/:id`** *(New)*:
   - Parameter URL: `id` (UUID kategori).
   - Body: `{ name: string }`.
   - Autentikasi: `requireRoles(user, ["admin", "admin-food-court", "tenant"])`.
   - Validasi kepemilikan tenant dari kategori tersebut sebelum update.
   - Return `{ message: "Category updated successfully", data: updatedCategory }`.
5. **`DELETE /api/menus/categories/:id`** *(New)*:
   - Parameter URL: `id` (UUID kategori).
   - Autentikasi: `requireRoles(user, ["admin", "admin-food-court", "tenant"])`.
   - Menyetel `menus.categoryId = null` untuk semua menu yang terhubung.
   - Menghapus record dari tabel `categories`.
   - Return `{ success: true, message: "Category '...' deleted successfully" }`.

### C. Service Implementation ([`backend/modules/menus/service.ts`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/backend/modules/menus/service.ts))
- Method `updateCategory(id: string, data: UpdateCategoryDTOType, user: AuthUser)`
- Method `deleteCategory(id: string, user: AuthUser)`
- Method `getAllCategories(tenantId?: string, user: AuthUser)`

---

## 4. Frontend Implementation Spec

### A. Rute Baru di [`frontend/src/App.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/App.tsx)
- Menambahkan rute `/app/categories` dengan proteksi peran:
  ```tsx
  <Route
    path="/app/categories"
    element={
      <ProtectedRoute allowedRoles={['admin', 'admin-food-court', 'tenant']}>
        <CategoriesPage />
      </ProtectedRoute>
    }
  />
  ```

### B. Navigasi Terpadu ([`InternalSidebar.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/components/layout/InternalSidebar.tsx) & [`SuperAdminRailAside.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/components/layout/SuperAdminRailAside.tsx))
- Menambahkan item menu "Kategori Menu" (`/app/categories`) dengan ikon `Layers` pada sidebar Super Admin, Admin Food Court, dan Tenant.

### C. Halaman Terpadu: [`CategoriesPage.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/pages/categories/CategoriesPage.tsx)
1. **Header App Bar & Context**:
   - Judul dinamis:
     - Super Admin: *"Manajemen Kategori Menu Global"*
     - Admin Food Court: *"Kategori Menu Cabang"*
     - Tenant: *"Kategori Menu Gerai"*
   - Tombol Aksi: `+ Tambah Kategori` & `Muat Ulang`.
2. **4 Bento Metric Cards**:
   - Total Kategori
   - Kategori Terisi Menu
   - Kategori Kosong (Tanpa Menu)
   - Stan Tenant Terdaftar
3. **Filter Toolbar**:
   - Pencarian nama kategori.
   - Filter Cabang Food Court (Hanya tampil bagi Super Admin).
   - Filter Stan Tenant (Tampil bagi Super Admin dan Admin Food Court).
4. **Data Grid & Bento Cards View**:
   - Tabel responsif menampilkan:
     - Nama Kategori.
     - Stan Pemilik & Cabang.
     - Jumlah Menu Terhubung (`cat.menus.length`).
     - Tanggal Pembuatan.
     - Aksi: Edit Kategori (`Pencil`), Kelola Menu Terhubung (`UtensilsCrossed`), Hapus Kategori (`Trash2`).
5. **Create & Edit Dialog**:
   - Dropdown Cabang & Stan (Otomatis terkunci untuk role Tenant).
   - Input Nama Kategori (2 - 80 karakter).
   - Validasi error inline dan toast notifikasi.
6. **Delete Confirmation Dialog**:
   - Dialog konfirmasi aman dengan peringatan bahwa menu di dalam kategori akan dialihkan ke "Tanpa Kategori".

---

## 5. Dokumentasi API ([`backend/README.md`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/backend/README.md))
- Memperbarui tabel routing backend:
  - Menambahkan endpoint nomor 22A (`PUT /api/menus/categories/{id}`) dan 22B (`DELETE /api/menus/categories/{id}`).
  - Menambahkan detail endpoint `GET /api/menus/categories` dan format payload request/response JSON.

---

## 6. Verification Plan

### A. Backend Verification
- Kompilasi TypeScript backend: `bun test` atau verifikasi tipe dengan `bun --check`.
- Eksekusi cURL/Fetch test untuk create, list, update, dan delete kategori.

### B. Frontend Verification
- `bun run build` di folder `frontend` sukses 0 error TypeScript.
- Verifikasi halaman `/app/categories` di browser:
  - Login sebagai Super Admin: melihat kategori seluruh cabang dan dapat CRUD.
  - Login sebagai Admin Food Court: melihat kategori cabang sendiri dan dapat CRUD.
  - Login sebagai Tenant: melihat kategori gerainya dan dapat CRUD.
