# Multi-Tenant Customer Table Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun antarmuka dan bisnis proses pemesanan meja multi-tenant berbasis QR (`/s/:qrToken`) yang efisien, di mana pengunjung dapat menjelajahi direktori stan food court, masuk ke katalog menu stan, memilih makanan dengan jumlah & catatan khusus, berpindah ke stan lain untuk menambah hidangan ke dalam keranjang belanja global terpadu, dan melakukan satu kali checkout & pelacakan status pesanan live.

**Architecture:** Menerapkan arsitektur *Hybrid Hub-and-Spoke* di frontend React/TypeScript. Halaman meja (`CustomerMenuPage`) memuat info meja dan daftar stan publik (`/api/food-court/:id/tenant/public`). Pengguna dapat beralih antara tampilan Direktori Stan (*Tenant Directory Grid*), Menu Khusus Stan (*Tenant Storefront View*), dan Tab Eksplor Menu Global. Keranjang belanja universal tersimpan di `localStorage` (`cart_${qrToken}`) dengan item teragregasi lintas stan. Saat checkout (`CheckoutPage`), pesanan dikelompokkan per stan dan dikirimkan ke `POST /api/orders`, di mana backend secara otomatis mengaitkan sesi meja (`diningSessions`), memecah menjadi `tenantOrders` & `kitchenQueues`, serta memproses pembayaran QRIS Midtrans Snap dan live order buzzer tracking (`OrderTrackingPage`).

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide Icons (via `components/ui/Icons.tsx`), ElysiaJS (Backend), Drizzle ORM, MySQL, Midtrans Snap.

## Global Constraints
- Gunakan komponen UI yang telah tersedia di `frontend/src/components/ui/` (`Card`, `Button`, `Badge`, `Input`, `Icons`).
- Keranjang belanja disimpan di `localStorage` per token QR meja (`cart_${qrToken}`) agar tidak tertukar jika pengunjung membuka link meja lain.
- Format mata uang selalu menggunakan fungsi pembantu `formatRupiah` dari `frontend/src/lib/utils.ts`.
- Desain mobile-first responsif dengan estetika bersih, kontras tinggi, dan modern (gaya Neobrutalism/Clean Modern hitam-putih-aksen sesuai standar proyek).
- Semua tautan navigasi dan kode harus type-safe tanpa error linting TypeScript.

---

### Task 1: Komponen Kartu Direktori Stan (`TenantDirectoryCard.tsx`)

**Files:**
- Create: `frontend/src/components/customer/TenantDirectoryCard.tsx`
- Test: Verifikasi komponen di browser atau render test.

**Interfaces:**
- Consumes: Info tenant dari `/api/food-court/:id/tenant/public` (`id`, `name`, `stallNumber`, `description`, `isOpen`, `logoUrl`, `coverUrl`, `rating`, `category`).
- Produces: Komponen `TenantDirectoryCard` dengan prop `tenant: any` dan callback `onSelectTenant: (tenant: any) => void`.

- [ ] **Step 1: Buat komponen `TenantDirectoryCard.tsx`**

```tsx
// frontend/src/components/customer/TenantDirectoryCard.tsx
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icons } from '../ui/Icons'

interface TenantDirectoryCardProps {
  tenant: {
    id: string
    name: string
    stallNumber: string
    description?: string | null
    isOpen?: boolean
    logoUrl?: string | null
    coverUrl?: string | null
    category?: string | null
    menuCount?: number
  }
  onSelectTenant: (tenant: any) => void
}

export function TenantDirectoryCard({
  tenant,
  onSelectTenant,
}: TenantDirectoryCardProps) {
  const isOpen = tenant.isOpen !== false

  return (
    <Card
      surface="paper"
      className="overflow-hidden p-0 transition-all duration-200 hover:shadow-md cursor-pointer border border-[#e5e5e5] group"
      onClick={() => onSelectTenant(tenant)}
    >
      {/* Banner / Cover */}
      <div className="relative h-28 sm:h-32 w-full bg-[#f0f0f0] overflow-hidden">
        {tenant.coverUrl ? (
          <img
            src={tenant.coverUrl}
            alt={tenant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] to-[#262626] text-white">
            <Icons.Store className="w-10 h-10 opacity-30" />
          </div>
        )}

        {/* Stall Number Badge */}
        <div className="absolute top-2.5 left-2.5">
          <Badge variant="solid" className="bg-[#0a0a0a] text-white font-mono text-[11px] shadow-sm">
            Kios {tenant.stallNumber}
          </Badge>
        </div>

        {/* Status Badge */}
        <div className="absolute top-2.5 right-2.5">
          <Badge
            variant={isOpen ? 'solid' : 'soft'}
            className={
              isOpen
                ? 'bg-[#16a34a] text-white text-[11px] font-semibold shadow-sm'
                : 'bg-[#737373] text-white text-[11px]'
            }
          >
            {isOpen ? 'BUKA' : 'TUTUP'}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 sm:p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-[#0a0a0a] truncate group-hover:text-[#2563eb] transition-colors">
              {tenant.name}
            </h3>
            <p className="text-xs text-[#737373] line-clamp-1 mt-0.5">
              {tenant.description || 'Penyedia aneka sajian lezat food court.'}
            </p>
          </div>
        </div>

        {/* Footer meta & CTA */}
        <div className="pt-2 border-t border-[#f0f0f0] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[#737373]">
            <Icons.Clock className="w-3.5 h-3.5 text-[#a3a3a3]" />
            <span className="text-[11px]">Saji ~10-15 mnt</span>
          </div>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 text-xs px-2.5 font-bold gap-1 group-hover:bg-[#0a0a0a] group-hover:text-white transition-all"
            onClick={(e) => {
              e.stopPropagation()
              onSelectTenant(tenant)
            }}
          >
            <span>Pilih Stan</span>
            <Icons.ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Jalankan typecheck frontend untuk memastikan tidak ada lint error**

Run: `bun run build` di folder `frontend`
Expected: Compile sukses tanpa error type.

---

### Task 2: Komponen Tampilan Menu Stan (`TenantStorefrontView.tsx`)

**Files:**
- Create: `frontend/src/components/customer/TenantStorefrontView.tsx`
- Test: Verifikasi interaksi pemilihan menu dan tombol kembali ke daftar stan.

**Interfaces:**
- Consumes: 
  - `tenant: any`
  - `menus: (Menu & { tenantName: string; stallNumber: string })[]`
  - `onBack: () => void`
  - `onSelectMenu: (menu: any) => void`
  - `onQuickAdd: (menu: any) => void`
- Produces: Antarmuka katalog stan mandiri dengan kategorisasi menu dan navigasi kembali.

- [ ] **Step 1: Buat `TenantStorefrontView.tsx`**

```tsx
// frontend/src/components/customer/TenantStorefrontView.tsx
import { useState, useMemo } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Input } from '../ui/Input'
import { Icons } from '../ui/Icons'
import { MenuItemCard } from './MenuItemCard'
import type { Menu } from '../../types'

interface TenantStorefrontViewProps {
  tenant: {
    id: string
    name: string
    stallNumber: string
    description?: string | null
    coverUrl?: string | null
    isOpen?: boolean
  }
  menus: (Menu & { tenantName: string; stallNumber: string })[]
  categories?: { id: string; name: string }[]
  onBack: () => void
  onSelectMenu: (item: any) => void
  onQuickAdd: (item: any) => void
}

export function TenantStorefrontView({
  tenant,
  menus,
  onBack,
  onSelectMenu,
  onQuickAdd,
}: TenantStorefrontViewProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Extract unique categories from menus
  const categoryList = useMemo(() => {
    const set = new Set<string>()
    menus.forEach((m: any) => {
      if (m.categoryName) set.add(m.categoryName)
      else if (m.category?.name) set.add(m.category.name)
    })
    return Array.from(set)
  }, [menus])

  // Filter menus
  const filteredMenus = useMemo(() => {
    return menus.filter((m: any) => {
      const cat = m.categoryName || m.category?.name || ''
      const matchesCategory =
        selectedCategory === 'all' || cat === selectedCategory
      const matchesSearch = search.trim()
        ? m.name.toLowerCase().includes(search.toLowerCase()) ||
          (m.description && m.description.toLowerCase().includes(search.toLowerCase()))
        : true
      return matchesCategory && matchesSearch
    })
  }, [menus, selectedCategory, search])

  return (
    <div className="space-y-4">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#737373] hover:text-[#0a0a0a] transition-colors py-1 px-2 rounded-lg hover:bg-white cursor-pointer"
        >
          <Icons.ArrowLeft className="w-4 h-4" />
          <span>Ganti / Pilih Stan Lain</span>
        </button>

        <Badge variant="solid" className="font-mono text-xs">
          Kios {tenant.stallNumber}
        </Badge>
      </div>

      {/* Tenant Banner Profile */}
      <Card surface="paper" className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-[#0a0a0a] tracking-tight">
                {tenant.name}
              </h2>
              <Badge
                variant="solid"
                className={
                  tenant.isOpen !== false
                    ? 'bg-[#16a34a] text-white text-[10px]'
                    : 'bg-[#737373] text-white text-[10px]'
                }
              >
                {tenant.isOpen !== false ? 'BUKA' : 'TUTUP'}
              </Badge>
            </div>
            <p className="text-xs text-[#737373] mt-1 leading-relaxed">
              {tenant.description || 'Penyedia aneka sajian lezat food court.'}
            </p>
          </div>
        </div>

        {/* Local Search in this Stall */}
        <div className="relative pt-1">
          <Input
            placeholder={`Cari menu di ${tenant.name}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
          <Icons.Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-4 pointer-events-none" />
        </div>

        {/* Category Pills if more than 1 category */}
        {categoryList.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-[14px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#0a0a0a] text-white'
                  : 'bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a]'
              }`}
            >
              Semua ({menus.length})
            </button>
            {categoryList.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-[14px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#0a0a0a] text-white'
                    : 'bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Menu List */}
      <div className="space-y-3">
        {filteredMenus.length === 0 ? (
          <Card surface="paper" className="p-8 text-center text-sm text-[#737373]">
            Tidak ada sajian menu yang ditemukan di stan ini.
          </Card>
        ) : (
          filteredMenus.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              tenantName={tenant.name}
              stallNumber={tenant.stallNumber}
              onSelect={onSelectMenu}
              onQuickAdd={onQuickAdd}
            />
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Jalankan typecheck build**

Run: `bun run build` di folder `frontend`
Expected: Compile sukses tanpa error.

---

### Task 3: Refactor `CustomerMenuPage.tsx` dengan Arsitektur Hybrid Hub-and-Spoke & Multi-Tenant Floating Cart

**Files:**
- Modify: `frontend/src/pages/customer/CustomerMenuPage.tsx`
- Test: Buka link `http://localhost:5173/s/QR-T-01-e1f93841`, uji navigasi Stan -> Masuk ke Stan -> Tambah Item -> Ganti Stan -> Tambah Item -> Lihat Keranjang.

**Interfaces:**
- Menangani state `activeTab`: `'stalls'` (Direktori Stan) | `'explore'` (Eksplor Semua Menu).
- Menangani state `selectedTenant`: null atau tenant yang sedang dibuka katalognya.
- Menyediakan indikator multi-tenant di floating cart: *"3 menu dari 2 stan (Stan A, Stan B)"*.

- [ ] **Step 1: Modifikasi `CustomerMenuPage.tsx`**

Integrasikan `TenantDirectoryCard` dan `TenantStorefrontView`.
Perbarui keranjang mengambang di bawah agar mengagregasi nama stan unik yang ada di keranjang.
Sertakan tombol cepat *"Pilih Stan Lain"* di dalam storefront view.

- [ ] **Step 2: Uji coba manual alur di browser**

Buka `http://localhost:5173/s/QR-T-01-e1f93841`:
1. Halaman utama menampilkan kartu-kartu Stan (cth: Kios A-01, Kios A-02).
2. Klik Stan A -> Masuk ke menu Stan A.
3. Klik Tambah item 1 dengan catatan "jangan pedas" -> masuk ke keranjang.
4. Klik tombol "Ganti / Pilih Stan Lain" -> kembali ke direktori stan.
5. Klik Stan B -> Tambah item 2.
6. Floating cart bar di bawah otomatis mengupdate: "2 menu dari 2 stan" beserta total rupiah.

---

### Task 4: Sempurnakan Halaman Konfirmasi Pesanan Terpadu (`CheckoutPage.tsx`)

**Files:**
- Modify: `frontend/src/pages/customer/CheckoutPage.tsx`
- Test: Masuk ke `/checkout?qrToken=...`, verifikasi item terkelompok rapi per stan, ubah kuantitas, hapus item, dan kirim pesanan.

**Interfaces:**
- Membaca keranjang dari `cart_${qrToken}`.
- Mengelompokkan item per `tenantName` dan `stallNumber`.
- Menampilkan subtotal per-stan.
- Form Nama Pemesan & Catatan.
- Memanggil `POST /api/orders` dan membuka modal pembayaran QRIS Midtrans Snap.

- [ ] **Step 1: Perbarui grouping dan stepper kuantitas di `CheckoutPage.tsx`**

Pastikan tiap kartu stan memiliki:
- Header stan: Nama Stan + Badge Nomor Kios.
- Daftar item dari stan tersebut dengan rincian: nama makanan, catatan, harga satuan, tombol minus / plus kuantitas, dan tombol hapus item.
- Subtotal khusus untuk stan tersebut.
- Ringkasan total tagihan seluruh stan di food court.

- [ ] **Step 2: Hubungkan sukses order ke pelacakan status pesanan live**

Setelah Midtrans ditutup atau pembayaran terkonfirmasi, arahkan pelanggan ke `/track/:orderNumber` agar pelanggan langsung melihat live progress masak dari masing-masing stan yang dipesan.

---

### Task 5: Sempurnakan Halaman Pelacakan Pesanan & Buzzer Mandiri (`OrderTrackingPage.tsx`)

**Files:**
- Modify: `frontend/src/pages/customer/OrderTrackingPage.tsx`
- Test: Verifikasi tracking endpoint `/api/orders/track/:orderNumber` menampilkan status per stan, dan banner notifikasi "Siap Diambil di Gerai" muncul saat stan menandai pesanan selesai dimasak.

**Interfaces:**
- Menerima `orderNumber` dari URL param.
- Polling status dapur berkala via `GET /api/orders/track/:orderNumber`.
- Menampilkan kartu untuk masing-masing stan:
  - Stan Name & Stall Number.
  - Status stan: `QUEUED` (Antrean Dapur) | `PREPARING` (Sedang Dimasak) | `READY` (Siap Diambil di Gerai) | `COMPLETED` (Selesai/Diantar ke Meja).
  - Daftar menu yang dipesan di stan tersebut.
- Banner Buzzer Interaktif:
  - Animasi visual jelas jika salah satu stan berstatus `READY`.
  - Teks: *"Pesanan Anda di [Nama Stan] sudah siap! Silakan ambil di gerai atau staf kami akan mengantarkan ke Meja [X]."*

---

## Verification Plan

### Automated Build Verification
```bash
# Build frontend
cd frontend
bun run build

# Run backend test suite
cd ../backend
bun test test/tenant_activation.test.ts
```

### Manual Verification
1. **Pindai QR Meja**:
   - Buka browser ke URL `http://localhost:5173/s/QR-T-01-e1f93841` (atau QR token yang valid di database).
   - Pastikan header memunculkan nama Food Court dan `Meja [X]`.
2. **Jelajah Stan (Gerai)**:
   - Verifikasi kartu-kartu stan tampil rapi dengan foto, nomor kios, status buka, dan tombol pilih stan.
3. **Pesan Multi-Stan**:
   - Masuk ke Stan 1 -> pilih 1 makanan + catatan "pedas sedang" -> tambah ke keranjang.
   - Klik "Pilih Stan Lain" -> masuk ke Stan 2 -> pilih 1 minuman -> tambah ke keranjang.
   - Amati floating cart bar di bawah: Menampilkan "2 menu dari 2 stan" dan total rupiah yang akurat.
4. **Checkout**:
   - Klik "Lihat Pesanan" -> menuju `/checkout`.
   - Periksa apakah menu terkelompok rapi per stan (Stan 1 dan Stan 2 terpisah).
   - Masukkan nama pemesan "Budi".
   - Klik "Bayar Sekarang" -> Muncul modal Snap QRIS Midtrans.
5. **Live Tracking**:
   - Arahkan ke `/track/FC-XXXX-XXX` -> verifikasi status per stan tampil dengan jelas.
