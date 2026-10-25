# Cart Item Removal, Split Bill Direct Form & Locking, and Receipt Print Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide menu cart item reduction/deletion when browsing, display Split Bill allocation directly without mode switcher tabs, lock split bill modifications once any payment has been made, and fix blank digital receipt printing.

**Architecture:**
- **Cart Management:** Add `onDecrease` and `onRemoveFromCart` in `CustomerMenuPage.tsx`, interactive stepper `[-] [qty] [+]` (with trash icon when qty=1) on `MenuItemCard.tsx`, and a "Hapus dari Keranjang" button in `ItemDetailModal.tsx`.
- **Split Bill UX:** In `PaymentModal.tsx`, when `openInSplitAllocation` is true, eliminate the "Langsung Bayar" / "Split Bill" switcher tabs and immediately render the "Atur Pembagian Menu & Pembayar" allocation editor form.
- **Split Lock Enforcement:** In `backend/modules/orders/service.ts`, reject `configureSplitBill` with HTTP 400 if `paymentStatus === 'PARTIALLY_PAID'` or any payment group has `status === 'PAID'` or `amountPaid > 0`. In `OrderTrackingPage.tsx`, hide the "Atur Ulang Pembagian Menu" button and display a locked notice once payments begin.
- **Receipt Printing:** In `ReceiptModal.tsx`, assign a distinct `#printable-receipt` container and add an `@media print` stylesheet isolating the receipt, hiding overlays/buttons, removing fixed modal clipping, and displaying the actual itemized tax (PB1 10%) and service charge (3%).

**Tech Stack:**
- Frontend: React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite
- Backend: ElysiaJS, Drizzle ORM, MySQL, Bun Test

## Global Constraints
- Preserve existing styling conventions: minimalist black/white aesthetic, rounded borders, clean typography.
- Do not remove or alter existing backend business logic or break existing automated tests (`bun test test/customer_table_flow.test.ts`).
- All changes must pass `bun run build` in `frontend` with zero TypeScript errors.

---

### Task 1: Cart Item Reduction & Deletion on Menu Selection

**Files:**
- Modify: `frontend/src/components/customer/MenuItemCard.tsx`
- Modify: `frontend/src/components/customer/ItemDetailModal.tsx`
- Modify: `frontend/src/pages/customer/CustomerMenuPage.tsx`

**Interfaces:**
- `MenuItemCardProps`: Add `onDecrease?: (item: Menu) => void`
- `ItemDetailModalProps`: Add `onRemoveFromCart?: (menuId: string) => void`
- `CustomerMenuPage`: Add `handleDecreaseCart(item: Menu)` and `handleRemoveFromCart(menuId: string)`

- [ ] **Step 1: Update `MenuItemCard.tsx` to support decrement/delete controls**

In `frontend/src/components/customer/MenuItemCard.tsx`:
Add `onDecrease?: (item: Menu) => void` to `MenuItemCardProps`.
When `inCartQuantity > 0`, replace the single "Tambah Lagi" button with an interactive quantity control:
```tsx
{inCartQuantity > 0 ? (
  <div
    className="flex items-center gap-1.5 bg-[#f5f5f5] p-1 rounded-[14px] border border-[#e5e5e5]"
    onClick={(e) => e.stopPropagation()}
  >
    <button
      type="button"
      onClick={() => onDecrease && onDecrease(item)}
      className="w-7 h-7 rounded-[10px] bg-white hover:bg-[#e5e5e5] text-[#0a0a0a] flex items-center justify-center font-bold text-xs shadow-xs transition-colors cursor-pointer"
      aria-label="Kurangi porsi"
    >
      {inCartQuantity === 1 ? (
        <Icons.Trash className="w-3.5 h-3.5 text-red-600" />
      ) : (
        <span>-</span>
      )}
    </button>
    <span className="font-mono text-xs font-bold w-5 text-center text-[#0a0a0a]">
      {inCartQuantity}
    </span>
    <button
      type="button"
      onClick={() => {
        if (!isAvailable) return
        if (onQuickAdd) onQuickAdd(item)
        else onSelect(item)
      }}
      disabled={!isAvailable}
      className="w-7 h-7 rounded-[10px] bg-[#0a0a0a] hover:bg-[#262626] text-white flex items-center justify-center font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40"
      aria-label="Tambah porsi"
    >
      +
    </button>
  </div>
) : (
  <Button
    type="button"
    variant={isAvailable ? 'primary' : 'secondary'}
    size="sm"
    disabled={!isAvailable}
    onClick={(e) => {
      e.stopPropagation()
      if (!isAvailable) return
      if (onQuickAdd) onQuickAdd(item)
      else onSelect(item)
    }}
    className="h-8 px-3 text-xs"
  >
    {!isStallOpen
      ? 'Tutup'
      : outOfStock
        ? 'Habis'
        : 'Tambah'}
  </Button>
)}
```

- [ ] **Step 2: Update `ItemDetailModal.tsx` to support removing from cart**

In `frontend/src/components/customer/ItemDetailModal.tsx`:
Add `onRemoveFromCart?: (menuId: string) => void` to `ItemDetailModalProps`.
If `inCartQuantity > 0`, render a "Hapus dari Keranjang" button in the footer or right below the notes input:
```tsx
{inCartQuantity > 0 && onRemoveFromCart && (
  <button
    type="button"
    onClick={() => {
      onRemoveFromCart(item.id)
      onOpenChange(false)
    }}
    className="w-full py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-[14px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
  >
    <Icons.Trash className="w-3.5 h-3.5" />
    <span>Hapus {inCartQuantity} dari Keranjang</span>
  </button>
)}
```

- [ ] **Step 3: Implement cart deletion handlers in `CustomerMenuPage.tsx`**

In `frontend/src/pages/customer/CustomerMenuPage.tsx`:
Implement `handleDecreaseCart` and `handleRemoveFromCart`:
```tsx
const handleDecreaseCart = (item: Menu) => {
  setCart((prev) => {
    const existingIndex = prev.findIndex((ci) => ci.menuId === item.id)
    if (existingIndex === -1) return prev
    const currentItem = prev[existingIndex]
    if (currentItem.quantity <= 1) {
      return prev.filter((_, idx) => idx !== existingIndex)
    }
    const updated = [...prev]
    updated[existingIndex] = {
      ...currentItem,
      quantity: currentItem.quantity - 1,
    }
    return updated
  })
}

const handleRemoveFromCart = (menuId: string) => {
  setCart((prev) => prev.filter((ci) => ci.menuId !== menuId))
}
```
Pass `onDecrease={handleDecreaseCart}` to all `MenuItemCard` occurrences (in both the Explore tab and Stall Detail tab).
Pass `onRemoveFromCart={handleRemoveFromCart}` to `ItemDetailModal`.

- [ ] **Step 4: Verify frontend build**

Run: `cd frontend && bun run build`
Expected: Build succeeds with 0 errors.

---

### Task 2: Simplify Split Bill Button to Direct Allocation Form

**Files:**
- Modify: `frontend/src/components/customer/PaymentModal.tsx`
- Modify: `frontend/src/pages/customer/OrderTrackingPage.tsx`

**Interfaces:**
- `PaymentModalProps`: `openInSplitAllocation?: boolean`
- When `openInSplitAllocation === true`, hide `activeMode` tabs, hide "Langsung Bayar (1 Tagihan)", and show "Atur Pembagian Menu & Pembayar" editor directly.

- [ ] **Step 1: Update `PaymentModal.tsx` to hide mode tabs and directly render split allocation**

In `frontend/src/components/customer/PaymentModal.tsx`:
1. In the header:
```tsx
<DialogTitle>
  {openInSplitAllocation || activeMode === 'SPLIT'
    ? `Atur Pembagian Tagihan (Split Bill)`
    : `Pembayaran Terpadu Meja`}
</DialogTitle>
```
2. When `openInSplitAllocation` is true, **hide** the mode switcher tabs:
```tsx
{/* Mode Switcher Tabs (Direct vs Split Bill) */}
{!hasAnyPaid && !openInSplitAllocation && (
  <div className="grid grid-cols-2 gap-2 p-1 bg-[#f5f5f5] rounded-[18px] border border-[#e5e5e5]">
    ...
  </div>
)}
```
3. When `openInSplitAllocation` is true, ensure `activeMode` is initialized to `'SPLIT'` and `isEditingSplit` is set to `true` (unless already partially paid):
```tsx
useEffect(() => {
  if (isOpen) {
    fetchOrderDetails()
    if (openInSplitAllocation) {
      setActiveMode('SPLIT')
      setIsEditingSplit(true)
    } else {
      setIsEditingSplit(false)
    }
  }
}, [isOpen, openInSplitAllocation, fetchOrderDetails])
```
4. In the Split Editor footer, if opened from `openInSplitAllocation`, clicking "Batal" should call `onClose()`.

- [ ] **Step 2: Update `OrderTrackingPage.tsx` split button click handler**

Verify `handleOpenSplitEditor` in `frontend/src/pages/customer/OrderTrackingPage.tsx`:
```tsx
const handleOpenSplitEditor = () => {
  if (hasAnyGroupPaid) return
  setSelectedPaymentGroupId(null)
  setOpenSplitAllocation(true)
  setIsPaymentModalOpen(true)
}
```

- [ ] **Step 3: Verify frontend build**

Run: `cd frontend && bun run build`
Expected: Build succeeds with 0 errors.

---

### Task 3: Backend & Frontend Lock on Split Reconfiguration Once Paid

**Files:**
- Modify: `backend/modules/orders/service.ts`
- Test: `backend/test/customer_table_flow.test.ts`
- Modify: `frontend/src/pages/customer/OrderTrackingPage.tsx`
- Modify: `frontend/src/components/customer/PaymentModal.tsx`

**Interfaces:**
- `configureSplitBill(orderId: string, data: SplitBillDTOType)`: Throws 400 `BadRequestError` if `order.paymentStatus === "PAID"`, `order.paymentStatus === "PARTIALLY_PAID"`, or `order.paymentGroups.some(pg => pg.status === "PAID" || Number(pg.amountPaid) > 0)`.
- `OrderTrackingPage.tsx`: `hasAnyGroupPaid` computation; conditionally hides/locks the split edit trigger.

- [ ] **Step 1: Write the failing backend test in `customer_table_flow.test.ts`**

In `backend/test/customer_table_flow.test.ts`, inside test step 12 (after paying Nanda's bill when order is `PARTIALLY_PAID`):
```ts
// 4b. Verify that reconfiguring split bill after partial payment is rejected with 400
const reconfigRes = await app.handle(
  new Request(`http://localhost/api/orders/${splitOrderId}/split-bill`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      groups: [
        {
          participantName: "Nanda & Putra",
          items: [{ orderItemId: rawonItemId, quantity: 2 }],
        },
      ],
    }),
  }),
);
expect(reconfigRes.status).toBe(400);
const reconfigBody = await reconfigRes.json();
expect(reconfigBody.message).toContain("already been paid");
```

- [ ] **Step 2: Update `backend/modules/orders/service.ts` to strictly enforce split bill locking**

In `backend/modules/orders/service.ts`:
Inside `configureSplitBill(orderId: string, data: SplitBillDTOType)`:
```ts
if (order.paymentStatus === "PAID" || order.paymentStatus === "PARTIALLY_PAID") {
  throw new BadRequestError(
    "Cannot reconfigure split bill because payment has already started or been completed",
  );
}

const hasPaidGroup = order.paymentGroups.some(
  (pg) => pg.status === "PAID" || (pg.amountPaid && Number(pg.amountPaid) > 0),
);
if (hasPaidGroup) {
  throw new BadRequestError(
    "Cannot reconfigure split bill because one or more payment groups have already been paid",
  );
}
```

- [ ] **Step 3: Run backend test to verify it passes**

Run: `cd backend && bun test test/customer_table_flow.test.ts`
Expected: 16 passing tests (or 17), 0 failures.

- [ ] **Step 4: Update `OrderTrackingPage.tsx` to lock and hide split editor when paid**

In `frontend/src/pages/customer/OrderTrackingPage.tsx`:
Compute:
```tsx
const hasAnyGroupPaid =
  isOrderFullyPaid ||
  isPartiallyPaid ||
  (order.paymentGroups || []).some(
    (pg: any) => pg.status === 'PAID' || Number(pg.amountPaid || 0) > 0
  )
```
At lines 584-596 (Split configuration edit button):
Replace with:
```tsx
{/* Split configuration edit button or lock notification */}
{!hasAnyGroupPaid ? (
  <div className="pt-2 border-t border-[#e5e5e5] text-center">
    <button
      type="button"
      onClick={handleOpenSplitEditor}
      className="text-xs font-bold text-[#737373] hover:text-[#0a0a0a] transition-colors underline underline-offset-4 cursor-pointer"
    >
      Atur Ulang Pembagian Menu (Edit Split Bill)
    </button>
  </div>
) : (
  <div className="pt-2 border-t border-[#e5e5e5] flex items-center justify-center gap-1.5 text-[11px] text-[#737373]">
    <Icons.Lock className="w-3.5 h-3.5 text-[#a3a3a3]" />
    <span>Pembagian menu telah dikunci karena pembayaran sudah dimulai.</span>
  </div>
)}
```

- [ ] **Step 5: Guard in `PaymentModal.tsx` against editing split when paid**

In `frontend/src/components/customer/PaymentModal.tsx`:
```tsx
const hasAnyPaid =
  orderData?.paymentStatus === 'PAID' ||
  orderData?.paymentStatus === 'PARTIALLY_PAID' ||
  paymentGroups.some((g: any) => g.status === 'PAID' || Number(g.amountPaid || 0) > 0)
```
If `hasAnyPaid && isEditingSplit`, automatically force `setIsEditingSplit(false)`.

- [ ] **Step 6: Verify frontend build**

Run: `cd frontend && bun run build`
Expected: Build succeeds with 0 errors.

---

### Task 4: Fix Blank Digital Receipt Print Output & Tax Breakdown

**Files:**
- Modify: `frontend/src/components/payment/ReceiptModal.tsx`

**Interfaces:**
- Thermal Receipt Paper Component: Add `id="printable-receipt"`.
- Add dedicated `@media print` CSS block that un-hides `#printable-receipt`, positions it at `(0,0)`, removes backdrop obscuring, and hides navigation/buttons.
- Display actual `orderData.subtotal`, `orderData.serviceFee` (3%), and `orderData.taxAmount` (10% PB1).

- [ ] **Step 1: Update `ReceiptModal.tsx` with dedicated print CSS and proper container ID**

In `frontend/src/components/payment/ReceiptModal.tsx`:
1. Add an inline `<style>` element for print styling:
```tsx
<style>{`
  @media print {
    body {
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    /* Hide everything in the body by default */
    body * {
      visibility: hidden !important;
    }
    /* Only show the receipt paper and all its children */
    #printable-receipt, #printable-receipt * {
      visibility: visible !important;
    }
    #printable-receipt {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 16px !important;
      background: #ffffff !important;
      border: none !important;
      box-shadow: none !important;
    }
    /* Hide any buttons, close icons, dialog headers/footers */
    button, [role="button"], dialog, .no-print {
      display: none !important;
    }
  }
`}</style>
```

2. Assign `id="printable-receipt"` to the thermal receipt container:
```tsx
<div
  id="printable-receipt"
  className="p-5 border border-dashed border-[#d4d4d4] rounded-[18px] bg-[#fafafa] space-y-4 font-mono text-xs"
>
```

3. Update the Totals section to show actual fee breakdown:
```tsx
{/* Totals */}
<div className="space-y-1.5 pb-2">
  <div className="flex justify-between text-[11px] text-[#737373]">
    <span>Subtotal Pesanan</span>
    <span>{formatRupiah(orderData?.subtotal || effectiveTotal)}</span>
  </div>
  {orderData?.serviceFee ? (
    <div className="flex justify-between text-[11px] text-[#737373]">
      <span>Biaya Layanan (3%)</span>
      <span>{formatRupiah(orderData.serviceFee)}</span>
    </div>
  ) : null}
  {orderData?.taxAmount ? (
    <div className="flex justify-between text-[11px] text-[#737373]">
      <span>Pajak Restoran PB1 (10%)</span>
      <span>{formatRupiah(orderData.taxAmount)}</span>
    </div>
  ) : null}
  <div className="flex justify-between text-xs font-bold text-[#0a0a0a] pt-1 border-t border-[#e5e5e5]">
    <span>TOTAL PEMBAYARAN</span>
    <span>{formatRupiah(effectiveTotal)}</span>
  </div>
</div>
```

- [ ] **Step 2: Verify frontend build**

Run: `cd frontend && bun run build`
Expected: Build succeeds with 0 errors.

---

### Task 5: Full Automated Regression Verification

**Files:**
- Test: `backend/test/customer_table_flow.test.ts`
- Test: `backend/test/tables_qr.test.ts`

- [ ] **Step 1: Run all backend tests**

Run: `cd backend && bun test test/customer_table_flow.test.ts test/tables_qr.test.ts`
Expected: All tests pass (0 failures).

- [ ] **Step 2: Run frontend build check**

Run: `cd frontend && bun run build`
Expected: Build completes in < 4s with 0 errors.
