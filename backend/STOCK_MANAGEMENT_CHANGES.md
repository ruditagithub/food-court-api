# Stock Management Implementation

## Ringkasan Perubahan
Menambahkan sistem manajemen stok produk makanan/minuman dengan validasi otomatis, pengurangan stok saat pembayaran berhasil, dan pengembalian stok saat order dibatalkan.

---

## Masalah Sebelumnya
- Field `stock` ada di database tapi tidak digunakan
- Tidak ada validasi jumlah order vs ketersediaan stok
- Stok tidak berkurang otomatis saat customer bayar
- Stok tidak kembali saat order dibatalkan
- Tenant harus manual ubah status `OUT_OF_STOCK`

---

## Solusi yang Diimplementasi

### 1. Tambah Field Stock di Menu API

**File: `src/modules/menus/model.ts`**

Tambah field `stock` (opsional) di DTO:
```typescript
CreateMenuDTO: {
  stock: t.Optional(t.Integer({ minimum: 0 }))
}

UpdateMenuDTO: {
  stock: t.Optional(t.Integer({ minimum: 0 }))
}
```

**Cara pakai:**
```json
POST /api/menus
{
  "tenantId": "xxx",
  "name": "Nasi Goreng Spesial",
  "price": 25000,
  "stock": 50          // Opsional, default 100
}
```

---

### 2. Auto Status Berdasarkan Stock

**File: `src/modules/menus/service.ts`**

**Logika:**
- Saat `create menu` tanpa field stock → default `stock = 100`
- Saat `create menu` dengan `stock = 0` → otomatis `status = OUT_OF_STOCK`
- Saat `update menu` dengan `stock = 0` → otomatis `status = OUT_OF_STOCK`
- Saat stok kembali > 0 → otomatis `status = AVAILABLE`

**Contoh:**
```javascript
// Create menu tanpa stock
{ name: "Rawon", price: 35000 }
// Result: stock = 100, status = AVAILABLE

// Create menu dengan stock 0
{ name: "Rawon", price: 35000, stock: 0 }
// Result: stock = 0, status = OUT_OF_STOCK

// Update stock jadi 0
PUT /api/menus/:id { stock: 0 }
// Result: status otomatis jadi OUT_OF_STOCK
```

---

### 3. Validasi Stock Saat Order

**File: `src/modules/orders/service.ts` (line ~187)**

**Logika:**
Sebelum buat order, cek setiap menu:
```javascript
if (menuItem.stock < item.quantity) {
  throw new BadRequestError(
    `Insufficient stock for '${menuItem.name}'. 
     Available: ${menuItem.stock}, 
     Requested: ${item.quantity}`
  );
}
```

**Contoh:**
```json
// Stock Nasi Goreng = 5
POST /api/orders
{
  "items": [
    { "menuId": "xxx", "quantity": 10 }  // ❌ DITOLAK
  ]
}
// Error: Insufficient stock for 'Nasi Goreng'. Available: 5, Requested: 10

// Stock Nasi Goreng = 5
POST /api/orders
{
  "items": [
    { "menuId": "xxx", "quantity": 3 }   // ✅ BERHASIL
  ]
}
```

---

### 4. Pengurangan Stock Otomatis Saat Bayar

**File: `src/modules/orders/service.ts`**

**Method baru: `reserveStock(orderId)`**

Dipanggil otomatis saat payment SUCCESS. Logika:
1. Ambil semua item dalam order
2. Group berdasarkan menuId
3. Kurangi stock setiap menu sesuai total quantity
4. Jika stock jadi 0 → auto-set status OUT_OF_STOCK

**Contoh flow:**
```
1. Order dibuat:
   - 2x Nasi Goreng (stock: 10)
   - 1x Es Teh (stock: 20)
   
2. Payment SUCCESS → reserveStock() dipanggil

3. Database update:
   - Nasi Goreng: stock 10 → 8
   - Es Teh: stock 20 → 19
   
4. Jika Nasi Goreng stock jadi 0:
   - status otomatis jadi OUT_OF_STOCK
```

**Integrasi dengan Payment:**

**File: `src/modules/payments/service.ts`**

Setelah payment SUCCESS dan order status jadi CONFIRMED:
```javascript
// Reserve stock after successful payment
await orderService.completePayment(orderId);
```

---

### 5. Pengembalian Stock Saat Order Dibatalkan

**File: `src/modules/orders/service.ts`**

**Method baru: `releaseStock(orderId)`**

Dipanggil saat order status diubah ke CANCELLED. Logika:
1. Cek apakah order sudah PAID (stock sudah dikurangi)
2. Jika belum PAID → skip (stock belum dikurangi)
3. Jika sudah PAID → kembalikan stock
4. Jika status OUT_OF_STOCK → auto-restore ke AVAILABLE

**Contoh flow:**
```
1. Order sudah dibayar:
   - Stock Nasi Goreng: 8
   - Status: AVAILABLE

2. Order dibatalkan (PATCH /api/orders/:id/status)
   { "status": "CANCELLED" }
   
3. releaseStock() dipanggil

4. Database update:
   - Nasi Goreng: stock 8 → 10 (dikembalikan)
   - Status tetap AVAILABLE
   
5. Contoh khusus:
   - Stock sebelumnya: 0, status: OUT_OF_STOCK
   - Setelah dikembalikan: stock 2, status: AVAILABLE
```

---

## Alur Lengkap (Flow Diagram)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE MENU                                               │
│    POST /api/menus { name: "Rawon", price: 35000 }          │
│    → Default stock: 100                                      │
│    → Status: AVAILABLE                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CUSTOMER ORDER                                            │
│    POST /api/orders { items: [{ menuId, quantity: 3 }] }    │
│    → ✅ Validasi: 3 <= 100 (stock)                          │
│    → Order status: PENDING_PAYMENT                           │
│    → Stock BELUM berubah                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. PAYMENT                                                   │
│    POST /api/payments { orderId, method: "QRIS" }            │
│    → Payment SUCCESS                                         │
│    → Order status: CONFIRMED                                 │
│    → 🔥 reserveStock() dipanggil                            │
│    → Stock: 100 → 97                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4a. ORDER SELESAI (happy path)                               │
│     PATCH /api/orders/:id/status { status: "COMPLETED" }     │
│     → Stock tetap 97                                         │
│     → Meja dibebaskan                                        │
└─────────────────────────────────────────────────────────────┘

                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4b. ORDER DIBATALKAN (cancel path)                           │
│     PATCH /api/orders/:id/status { status: "CANCELLED" }     │
│     → 🔥 releaseStock() dipanggil                           │
│     → Stock: 97 → 100 (dikembalikan)                         │
│     → Meja dibebaskan                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing

**Test Coverage:**
- ✅ Create menu tanpa stock → default 100
- ✅ Create menu dengan stock 0 → status OUT_OF_STOCK
- ✅ Order dengan quantity > stock → ditolak
- ✅ Payment success → stock berkurang
- ✅ Cancel order → stock dikembalikan
- ✅ Stock jadi 0 → auto OUT_OF_STOCK
- ✅ Stock restored > 0 → auto AVAILABLE

**Run test:**
```bash
bun test
# Result: 46 pass, 0 fail
```

---

## Files Changed

```
src/modules/menus/
  ├── model.ts           ← Tambah field stock di DTO
  └── service.ts         ← Default stock 100, auto-status logic

src/modules/orders/
  └── service.ts         ← Validasi, reserveStock, releaseStock

src/modules/payments/
  └── service.ts         ← Call reserveStock after payment
```

---

## API Examples

### 1. Create Menu dengan Stock
```bash
POST /api/menus
{
  "tenantId": "uuid-tenant",
  "name": "Nasi Goreng Spesial",
  "price": 25000,
  "stock": 50,
  "isAvailable": true
}

Response:
{
  "message": "Menu item created successfully",
  "data": {
    "id": "uuid-menu",
    "stock": 50,
    "status": "AVAILABLE"
  }
}
```

### 2. Update Stock Menu
```bash
PUT /api/menus/:id
{
  "stock": 0
}

Response:
{
  "data": {
    "stock": 0,
    "status": "OUT_OF_STOCK"  // Otomatis
  }
}
```

### 3. Order Ditolak (Stock Habis)
```bash
POST /api/orders
{
  "tableId": "uuid-table",
  "items": [
    { "menuId": "uuid-menu", "quantity": 100 }
  ]
}

Response: 400 Bad Request
{
  "error": "BadRequestError",
  "message": "Insufficient stock for 'Nasi Goreng'. Available: 50, Requested: 100"
}
```

### 4. Check Stock After Payment
```bash
# Before payment
GET /api/menus/:id
{ "stock": 50 }

# Place order (quantity: 5)
POST /api/orders + POST /api/payments

# After payment
GET /api/menus/:id
{ "stock": 45 }  // Berkurang otomatis
```

---

## Backward Compatibility

**Existing code tetap jalan:**
- Menu lama tanpa stock → otomatis dapat default 100
- Order lama tetap bisa diproses
- Semua 46 test existing tetap pass

**Breaking changes:** TIDAK ADA

---

## Troubleshooting

### Problem: Order ditolak padahal menu available
**Kemungkinan:** Stock = 0
**Solusi:**
```bash
PUT /api/menus/:id
{ "stock": 100 }
```

### Problem: Stock tidak berkurang setelah payment
**Check:**
1. Payment status SUCCESS? 
2. Order status CONFIRMED?
3. Cek log: `reserveStock()` dipanggil?

### Problem: Stock tidak kembali saat cancel
**Check:**
1. Order sudah dibayar (PAID)?
2. Kalau belum PAID, stock memang tidak dikurangi jadi tidak perlu dikembalikan

---

## Future Improvements (Opsional)

1. **Stock reservation saat order created** (bukan saat payment)
   - Pro: Guarantee stock tidak overselling
   - Con: Stock terkunci untuk unpaid orders

2. **Stock history/audit log**
   - Track siapa yang ubah stock dan kapan

3. **Low stock alert**
   - Notif tenant kalau stock < 10

4. **Batch stock update**
   - Update stock banyak menu sekaligus

5. **Stock expiry**
   - Unpaid order > 30 menit → release stock

---

## Kontak
Jika ada pertanyaan, hubungi team atau buka issue di repository.
