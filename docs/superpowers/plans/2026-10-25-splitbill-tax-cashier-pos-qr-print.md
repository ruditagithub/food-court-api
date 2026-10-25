# Split Bill Tax/Service Breakdown, Backend Settlement Accuracy, Cashier QR Scanner, and Cashier Thermal Receipt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure Split Bill groups compute and display PPN (PB1 10%) and Service (3%) breakdowns, fix backend `paymentGroups.amountDue` to include tax & service upon split creation, add a camera-based QR scanner modal in the Cashier POS dashboard, and format a clean thermal receipt for cashier printing.

**Architecture:**
- **Split Bill Calculations (Frontend & Backend):** In `backend/modules/orders/service.ts`, calculate `groupServiceFee = Math.round(groupSubtotal * 0.03)`, `groupTaxAmount = Math.round(groupSubtotal * 0.10)`, and store `amountDue = groupSubtotal + groupServiceFee + groupTaxAmount` in `paymentGroups`. In `PaymentModal.tsx` and `OrderTrackingPage.tsx`, render itemized financial summaries (Subtotal, PB1 10%, Layanan 3%, Total Akhir) for every participant in both the allocation editor and the payer cards.
- **Midtrans Snap Breakdown:** In `backend/modules/payments/service.ts`, append service fee and PB1 tax line items into Midtrans Snap `item_details` so the gross amount matches the line items sum.
- **Cashier QR Scanner Modal:** Install and integrate `html5-qrcode` into a dedicated `CashierQRScannerModal.tsx` with live camera video feed, targeting frame, camera device switcher, and automatic decoding of JSON / `CSH-` payloads that triggers immediate bill lookup and calculator selection.
- **Cashier Thermal Receipt Print Styling:** In `CashierDashboardPage.tsx`, add high-priority `@media print` rules targeting `#cashier-printable-receipt` (width 480px, background white, `print-color-adjust: exact`, neutralizing parent modal overflows/backdrops) and display the full payment metadata (Cashier Name, Cash Received, Cash Change, Itemized breakdown, Tax, Service).

**Tech Stack:**
- Frontend: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, `html5-qrcode`, Vite
- Backend: ElysiaJS, Drizzle ORM, MySQL, Bun Test

## Global Constraints
- Do not alter or break existing multi-tenant food court data flow.
- All backend integration tests (`bun test test/customer_table_flow.test.ts test/tables_qr.test.ts`) must pass.
- Frontend production build (`bun run build`) must compile cleanly with 0 TypeScript/linter errors.

---

### Task 1: Backend Fix for Split Bill `amountDue` (Include Tax & Service)

**Files:**
- Modify: `backend/modules/orders/service.ts:1230-1310`
- Modify: `backend/modules/payments/service.ts:220-255`
- Test: `backend/test/customer_table_flow.test.ts:570-650`

**Interfaces:**
- `configureSplitBill(orderId, data)`: For each group, compute:
  `groupServiceFee = Math.round(groupSubtotal * 0.03)`
  `groupTaxAmount = Math.round(groupSubtotal * 0.10)`
  `groupTotalDue = groupSubtotal + groupServiceFee + groupTaxAmount`
  Store `groupTotalDue` into `paymentGroups.amountDue`.
- `createSnapPayment`: Include tax and service fee line items in `item_details` when `gross_amount` includes fees.

- [ ] **Step 1: Write the failing backend test asserting `amountDue` includes PB1 and Service Fee**

In `backend/test/customer_table_flow.test.ts` (inside Test 12):
```ts
// Rawon (45k) + Es Teh (5k) = Subtotal 50k
// Service (3%) = 1,500; PB1 (10%) = 5,000; Total = 56,500
// Putra: 1x Rawon (45k) = Subtotal 45k
// Service (3%) = 1,350; PB1 (10%) = 4,500; Total = 50,850
expect(nandaGroup.subtotal).toBe(50000);
expect(nandaGroup.serviceFee).toBe(1500);
expect(nandaGroup.taxAmount).toBe(5000);
expect(nandaGroup.amountDue).toBe(56500);

expect(putraGroup.subtotal).toBe(45000);
expect(putraGroup.serviceFee).toBe(1350);
expect(putraGroup.taxAmount).toBe(4500);
expect(putraGroup.amountDue).toBe(50850);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && bun test test/customer_table_flow.test.ts`
Expected: FAIL (received subtotal without tax/service in `amountDue`).

- [ ] **Step 3: Update `backend/modules/orders/service.ts` to calculate and store full `amountDue`**

In `backend/modules/orders/service.ts`:
```ts
      let groupSubtotal = 0;
      const groupAllocations: Array<{ orderItemId: string; allocatedAmount: number }> = [];

      for (const [orderItemId, qty] of mergedQtyByItem.entries()) {
        const oi = itemMap.get(orderItemId)!;
        const unitEffectivePrice = Math.round(oi.subtotal / oi.quantity);
        const allocatedAmount = unitEffectivePrice * qty;

        groupSubtotal += allocatedAmount;
        groupAllocations.push({ orderItemId, allocatedAmount });

        allocatedQtyByItemId.set(
          orderItemId,
          (allocatedQtyByItemId.get(orderItemId) ?? 0) + qty,
        );
      }

      const groupServiceFee = Math.round(groupSubtotal * 0.03);
      const groupTaxAmount = Math.round(groupSubtotal * 0.10);
      const groupAmountDue = groupSubtotal + groupServiceFee + groupTaxAmount;

      preparedGroups.push({
        participantName: cleanName,
        subtotal: groupSubtotal,
        serviceFee: groupServiceFee,
        taxAmount: groupTaxAmount,
        amountDue: groupAmountDue,
        allocations: groupAllocations,
      });
```
When inserting `paymentGroups`:
```ts
      await db.insert(paymentGroups).values({
        id: newGroupId,
        orderId,
        participantId: participant.id,
        amountDue: pg.amountDue,
        amountPaid: 0,
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
```

- [ ] **Step 4: Update `backend/modules/payments/service.ts` Midtrans Snap item details**

In `backend/modules/payments/service.ts`:
Include service fee and tax lines in `item_details`:
```ts
    const subtotal = groupItems.reduce((acc, gi) => acc + (gi.allocatedAmount || 0), 0);
    const serviceFee = Math.round(subtotal * 0.03);
    const taxAmount = Math.round(subtotal * 0.10);

    const fullItemDetails = [
      ...(itemDetails || []),
      ...(serviceFee > 0 ? [{ id: "FEE-SERVICE", price: serviceFee, quantity: 1, name: "Biaya Layanan (3%)" }] : []),
      ...(taxAmount > 0 ? [{ id: "TAX-PB1", price: taxAmount, quantity: 1, name: "Pajak Restoran PB1 (10%)" }] : []),
    ];

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: paymentReference,
        gross_amount: pGroup.amountDue,
      },
      item_details: fullItemDetails,
      customer_details: participant ? { first_name: participant.name } : undefined,
      expiry: { unit: "minutes", duration: SNAP_EXPIRY_MINUTES },
    });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && bun test test/customer_table_flow.test.ts`
Expected: PASS.

---

### Task 2: Frontend PPN & Service Fee Breakdown in Split Bill

**Files:**
- Modify: `frontend/src/components/customer/PaymentModal.tsx`
- Modify: `frontend/src/pages/customer/OrderTrackingPage.tsx`

**Interfaces:**
- `splitCalculations`: Add `serviceFee`, `taxAmount`, and `totalDue` per participant.
- `VIEW A: SPLIT BILL ALLOCATION EDITOR`: Display live breakdown card (Subtotal, PB1 10%, Layanan 3%, Total Akhir) for every participant.
- `VIEW B: SPLIT BILL PAYER CARDS`: Under each payer's items list, render subtotal, service fee, tax, and final amount due.
- `OrderTrackingPage.tsx`: Under each participant's allocated item list, render subtotal, service fee, and tax breakdown.

- [ ] **Step 1: Update `splitCalculations` in `PaymentModal.tsx`**

In `frontend/src/components/customer/PaymentModal.tsx`:
```tsx
  const splitCalculations = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number
        subtotal: number
        serviceFee: number
        taxAmount: number
        totalDue: number
        items: PortionAllocation[]
      }
    >()
    participantNames.forEach((name) => {
      map.set(name, { count: 0, subtotal: 0, serviceFee: 0, taxAmount: 0, totalDue: 0, items: [] })
    })

    allocations.forEach((portion) => {
      const entry = map.get(portion.assignedParticipant)
      if (entry) {
        entry.count += 1
        entry.subtotal += portion.unitPrice
        entry.items.push(portion)
      }
    })

    // Compute service fee (3%) and tax (10% PB1)
    map.forEach((val) => {
      val.serviceFee = Math.round(val.subtotal * 0.03)
      val.taxAmount = Math.round(val.subtotal * 0.10)
      val.totalDue = val.subtotal + val.serviceFee + val.taxAmount
    })

    return map
  }, [participantNames, allocations])
```

- [ ] **Step 2: Add live financial breakdown summary table in `VIEW A` of `PaymentModal.tsx`**

In `frontend/src/components/customer/PaymentModal.tsx`, below the participant selection pills and above the action buttons:
```tsx
{/* Live Financial Breakdown Summary */}
<div className="p-3.5 rounded-[18px] bg-[#f5f5f5] border border-[#e5e5e5] space-y-2 text-xs">
  <span className="font-bold text-[#0a0a0a] text-xs block">
    Ringkasan Tagihan per Orang (Termasuk Pajak & Layanan):
  </span>
  <div className="space-y-1.5">
    {participantNames.map((name) => {
      const stats = splitCalculations.get(name)
      if (!stats) return null
      return (
        <div key={name} className="p-2 rounded-[12px] bg-white border border-[#e5e5e5] flex items-center justify-between">
          <div>
            <span className="font-bold text-[#0a0a0a]">{name}</span>
            <div className="text-[10px] text-[#737373] space-x-1">
              <span>Subtotal: {formatRupiah(stats.subtotal)}</span>
              <span>•</span>
              <span>Layanan (3%): {formatRupiah(stats.serviceFee)}</span>
              <span>•</span>
              <span>PB1 (10%): {formatRupiah(stats.taxAmount)}</span>
            </div>
          </div>
          <span className="font-mono font-bold text-sm text-[#0a0a0a]">
            {formatRupiah(stats.totalDue)}
          </span>
        </div>
      )
    })}
  </div>
</div>
```

- [ ] **Step 3: Update `VIEW B` payer cards in `PaymentModal.tsx` to display subtotal, PB1, service, and total**

In `frontend/src/components/customer/PaymentModal.tsx`:
Under the items list of each payer card:
```tsx
<div className="pt-2 border-t border-[#f0f0f0] space-y-1 text-xs">
  <div className="flex justify-between text-[#737373]">
    <span>Subtotal Menu:</span>
    <span className="font-mono text-[#0a0a0a]">{formatRupiah(group.subtotal || 0)}</span>
  </div>
  <div className="flex justify-between text-[#737373]">
    <span>Biaya Layanan (3%):</span>
    <span className="font-mono text-[#0a0a0a]">{formatRupiah(group.serviceFee || Math.round((group.subtotal || 0) * 0.03))}</span>
  </div>
  <div className="flex justify-between text-[#737373]">
    <span>Pajak Restoran PB1 (10%):</span>
    <span className="font-mono text-[#0a0a0a]">{formatRupiah(group.taxAmount || Math.round((group.subtotal || 0) * 0.10))}</span>
  </div>
  <div className="flex justify-between font-bold text-[#0a0a0a] pt-1 border-t border-[#e5e5e5]">
    <span>Total Tagihan:</span>
    <span className="font-mono">{formatRupiah(group.amountDue)}</span>
  </div>
</div>
```

- [ ] **Step 4: Update `OrderTrackingPage.tsx` participant cards to show the fee breakdown**

In `frontend/src/pages/customer/OrderTrackingPage.tsx`:
Add the subtotal, service fee, and tax breakdown below each participant's allocated items list.

- [ ] **Step 5: Verify frontend build**

Run: `cd frontend && bun run build`
Expected: Build succeeds with 0 errors.

---

### Task 3: Cashier QR Scanner Feature

**Files:**
- Create: `frontend/src/components/cashier/CashierQRScannerModal.tsx`
- Modify: `frontend/src/pages/cashier/CashierDashboardPage.tsx`
- Modify: `frontend/package.json`

**Interfaces:**
- `CashierQRScannerModalProps`:
  ```ts
  interface CashierQRScannerModalProps {
    isOpen: boolean
    onClose: () => void
    onScanSuccess: (decodedText: string) => void
  }
  ```
- Install `html5-qrcode` in `frontend`.
- When QR code is scanned:
  - If decoded text is JSON (from `CashierPaymentPassModal`), parse `code` or `orderNumber` or `paymentGroupId`.
  - If text starts with `CSH-` or UUID, use directly.
  - Call `handleSearch(decodedQuery)` or select corresponding bill from `pendingBills`.

- [ ] **Step 1: Install `html5-qrcode` in frontend**

Run: `cd frontend && bun add html5-qrcode`
Expected: Installed successfully.

- [ ] **Step 2: Create `CashierQRScannerModal.tsx`**

Create `frontend/src/components/cashier/CashierQRScannerModal.tsx`:
- Render camera container `<div id="cashier-qr-reader" />`.
- Initialize `Html5QrcodeScanner` or `Html5Qrcode` on mount when open.
- Configure fps: 10, qrbox: 250x250.
- Handle scan success callback: stop camera scanner, parse payload, trigger `onScanSuccess`, close modal.
- Provide cleanup on unmount / modal close (`html5QrCode.stop()`).
- Add fallback input for manual code entry or image file scan.

- [ ] **Step 3: Integrate QR Scanner into `CashierDashboardPage.tsx`**

In `frontend/src/pages/cashier/CashierDashboardPage.tsx`:
- Add a "Scan QR Kamera" button next to the search input.
- Add `isScannerOpen` state.
- In `handleScanSuccess(decodedText: string)`:
  1. Parse JSON if applicable (`const data = JSON.parse(decodedText); query = data.paymentGroupId || data.orderNumber || data.code`).
  2. Find matching bill in `pendingBills` or call `/api/payments/cashier/lookup/:query`.
  3. If bill found: `handleSelectBill(matchedBill)`, play success chime or show `toastSuccess('Tagihan Ditemukan', ...)`.
  4. If bill not in pending, refresh bills and auto-select.

- [ ] **Step 4: Verify frontend build**

Run: `cd frontend && bun run build`
Expected: Build succeeds with 0 errors.

---

### Task 4: Fix Cashier Receipt Print View (Thermal Receipt Styling)

**Files:**
- Modify: `frontend/src/pages/cashier/CashierDashboardPage.tsx`

**Interfaces:**
- Thermal Receipt Paper Component: Add `id="cashier-printable-receipt"`.
- Dedicated `@media print` stylesheet:
  - Reset body and modal container overflows/max-heights.
  - Position `#cashier-printable-receipt` at `(0,0)`, width `100%`, max-width `480px`, white background.
  - `-webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;`
  - Hide all non-printable UI elements (`body * { visibility: hidden !important; }`, `#cashier-printable-receipt * { visibility: visible !important; }`).
  - Itemize Subtotal, Service Fee (3%), PB1 Tax (10%), Total Tagihan, Cash Received, and Cash Change.

- [ ] **Step 1: Update Cash Receipt Confirmation Modal in `CashierDashboardPage.tsx`**

In `frontend/src/pages/cashier/CashierDashboardPage.tsx`:
1. Add print style block `<style>` inside or above the modal:
```tsx
<style>{`
  @media print {
    @page {
      margin: 0;
      size: auto;
    }
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      height: auto !important;
    }
    body * {
      visibility: hidden !important;
    }
    .fixed, .relative, .overflow-y-auto, [role="dialog"] {
      position: static !important;
      overflow: visible !important;
      max-height: none !important;
      height: auto !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    #cashier-printable-receipt, #cashier-printable-receipt * {
      visibility: visible !important;
    }
    #cashier-printable-receipt {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      max-width: 480px !important;
      margin: 0 auto !important;
      padding: 24px !important;
      background: #ffffff !important;
      border: none !important;
      box-shadow: none !important;
    }
    button, [role="button"], dialog, .no-print {
      display: none !important;
    }
  }
`}</style>
```

2. Assign `id="cashier-printable-receipt"` to the thermal paper card container.
3. Include official Food Court Cashier receipt header, date, order number, table number, cashier name, customer name, items list, subtotal, service fee, PB1 tax, total tagihan, cash received, and kembalian.

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
