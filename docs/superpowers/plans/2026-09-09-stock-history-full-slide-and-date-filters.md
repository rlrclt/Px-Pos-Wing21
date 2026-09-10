# Fullscreen Slide-Up Product Stock History & Global Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a modern fullscreen slide-up Stock History Drawer for individual products with custom date filters (วันนี้, สัปดาห์นี้, เดือนนี้, กำหนดเอง), Multi-UOM pack breakdowns, and upgrade the Global Stock In History modal with matching date ranges and drill-down capabilities.

**Architecture:** 
1. **Slide-Up Fullscreen Overlay (`ProductStockHistoryModal.tsx`):** Powered by Framer Motion (`y: '100%'` to `y: 0`), rendering a full-viewport responsive drawer with sticky header, quick action buttons, product Bento header, date range selector, KPI summary widgets, and detailed transaction ledger.
2. **Global Stock History Modal (`StockInHistoryModal.tsx`):** Enriched with time presets (`today`, `this_week`, `this_month`, `all`, `custom`), seller filtering, search, and drill-down to product history.
3. **Backend & API Layer (`Code.js`, `api.ts`, `schema.ts`):** Support `this_week` / `last_7_days` in `handleGetStockInLogs` and client query parameters.

**Tech Stack:** React, Tailwind CSS, Framer Motion, Lucide Icons, TypeScript, Google Apps Script.

---

### Task 1: Schema & Backend Date Range Enhancements

**Files:**
- Modify: `src/types/schema.ts`
- Modify: `backend/gas/Code.js:940-1010`
- Modify: `src/core/api.ts:489-511`

**Interfaces:**
- Consumes: `StockInLogFilters`
- Produces: `StockInLogFilters.date_preset` with `'today' | 'this_week' | 'this_month' | 'all' | 'custom'`

- [ ] **Step 1: Update `StockInLogFilters` in `src/types/schema.ts`**
Add `'this_week'` to `date_preset` options.

```typescript
export interface StockInLogFilters {
  barcode?: string;
  seller_id?: string;
  date_preset?: 'today' | 'this_week' | 'this_month' | 'all' | 'custom';
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
}
```

- [ ] **Step 2: Update `handleGetStockInLogs` in `backend/gas/Code.js`**
Add support for `datePreset === 'this_week'` (past 7 days or current week starting Monday).

```javascript
    } else if (datePreset === 'this_week') {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startStr = Utilities.formatDate(sevenDaysAgo, 'Asia/Bangkok', 'yyyy-MM-dd');
      filterStartDate = new Date(startStr + 'T00:00:00+07:00');
      filterEndDate = new Date();
    }
```

- [ ] **Step 3: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: 0 errors.

---

### Task 2: Redesign `ProductStockHistoryModal.tsx` as Fullscreen Slide-Up Drawer

**Files:**
- Modify: `src/features/inventory/components/ProductStockHistoryModal.tsx`

**Interfaces:**
- Consumes: `ProductStockHistoryModalProps` (`product`, `isOpen`, `onClose`, `liveSellers`, `liveUOMs`, `onOpenStockIn`)
- Produces: Fullscreen slide-up interactive modal with Bento header, date range buttons, custom date picker, KPI cards, and log table.

- [ ] **Step 1: Implement Fullscreen Slide-Up Framer Motion Container**
Use `AnimatePresence` and `motion.div` with:
- Fullscreen bounds: `fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-md`
- Drawer card: `w-full h-full sm:h-[95vh] sm:mt-auto sm:rounded-t-3xl bg-white dark:bg-[#0b0f19] flex flex-col overflow-hidden shadow-2xl`
- Slide animation: `initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }}`

- [ ] **Step 2: Add Date Range Selector & Preset Bar**
Add interactive preset pills:
- 📅 **วันนี้ (Today)**
- 📅 **7 วันล่าสุด (This Week)**
- 📅 **เดือนนี้ (This Month)**
- 📅 **ทั้งหมด (All Time)**
- ⚙️ **กำหนดเอง (Custom Range)**: Renders `From: [date input]` and `To: [date input]` with "ค้นหา" button.

- [ ] **Step 3: Add Product Bento Header & Multi-UOM Stock Breakdown**
Display:
- Product avatar image + category tag + Seller badge.
- Main title + Barcode breakdown (`[ชิ้น] {product.barcode}` and `[แพ็ค...] {uom.barcode}`).
- Current stock badge with pack breakdown (`54 ชิ้น (= 9 แพ็ค)`).
- Quick Action: Button "📥 รับเข้าสต็อกเพิ่ม" (calls `onOpenStockIn`).

- [ ] **Step 4: Add KPI Metric Summary Cards**
Display 4 Bento widgets:
1. **ยอดรับเข้ารวม (Total Received Qty):** e.g., `120 ชิ้น` + `(= 20 แพ็ค)`.
2. **มูลค่าทุนรวม (Total Cost):** e.g., `฿1,440.00`.
3. **จำนวนครั้งที่รับเข้า (Total Batches):** e.g., `4 ครั้ง`.
4. **ราคาต้นทุนเฉลี่ย (Avg Cost / Unit):** e.g., `฿12.00 / ชิ้น`.

- [ ] **Step 5: Add Detailed Log Table & Search Filter**
Render responsive transaction table:
- Columns: วันที่-เวลา (Thai Date & Time), จำนวนที่รับเข้า (พร้อมแจกแจงแพ็คถ้ามี), ต้นทุนต่อหน่วย, ราคารวม, ผู้รับเข้า/ผู้บันทึก, หมายเหตุ/เลขอ้างอิง.
- Empty state with illustration if no logs found in selected range.

- [ ] **Step 6: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: 0 errors.

---

### Task 3: Upgrade `StockInHistoryModal.tsx` (Global History)

**Files:**
- Modify: `src/features/inventory/components/StockInHistoryModal.tsx`

**Interfaces:**
- Consumes: `StockInHistoryModalProps` (`isOpen`, `onClose`, `liveSellers`, `liveProducts`, `liveUOMs`, `onOpenProductHistory`)
- Produces: Enhanced global stock history modal with date range presets, custom date picker, seller filter, search, summary KPIs, and product drill-down.

- [ ] **Step 1: Add 'this_week' Date Preset & Custom Date Range Pickers**
Update state to support:
- `datePreset`: `'today' | 'this_week' | 'this_month' | 'all' | 'custom'`
- Custom date inputs with clean Thai labels ("ตั้งแต่วันที่" ถึง "ถึงวันที่").

- [ ] **Step 2: Add Global Summary KPIs Bar**
Render 4 summary widgets:
1. **จำนวนรายการรับเข้า:** `{summary.total_logs} รายการ`
2. **จำนวนชิ้นรวม:** `{summary.total_quantity} ชิ้น`
3. **มูลค่าทุนรวม:** `฿{summary.total_cost_amount}`
4. **สินค้าที่รับเข้า:** Count distinct barcodes in current list.

- [ ] **Step 3: Enrich Table with Multi-UOM Badges & Drill-Down Action**
In each row:
- Display base barcode and pack conversion badges.
- Add "ดูประวัติเฉพาะสินค้า" button (calls `onOpenProductHistory(product)`).

- [ ] **Step 4: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: 0 errors.

---

### Task 4: Connect Modals in `AdminView.tsx`, `ProductsTab.tsx`, and `SellersTab.tsx`

**Files:**
- Modify: `src/features/admin/AdminView.tsx`
- Modify: `src/features/admin/components/ProductsTab.tsx`
- Modify: `src/features/admin/components/SellersTab.tsx`

- [ ] **Step 1: Pass `liveUOMs` to `ProductStockHistoryModal` and `StockInHistoryModal` in `AdminView.tsx`**
Ensure both modals receive live UOM conversions for real-time pack math.

- [ ] **Step 2: Connect slide-up trigger from `ProductsTab` and `SellersTab`**
Ensure clicking "ดูประวัติ" (History icon) opens the fullscreen slide-up product history seamlessly.

- [ ] **Step 3: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: 0 errors.

---

## Self-Review Checklist
1. **Spec Coverage:**
   - [x] Fullscreen slide-up drawer for product-specific history
   - [x] Date filter options: วันนี้, สัปดาห์นี้, เดือนนี้, ทั้งหมด, กำหนดเอง (From - To)
   - [x] Global history modal with identical date filtering
   - [x] Multi-UOM pack equivalent breakdown across all views
2. **Placeholder scan:** No TODOs or pseudo-code.
3. **Type consistency:** Matches schema types and API contracts.
