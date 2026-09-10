# Task 3 Report — StockInHistoryModal.tsx

**Status:** ✅ DONE  
**Date:** 2026-09-08T23:30:00+07:00

---

## Files Created

| File | Lines |
|------|-------|
| `src/features/inventory/components/StockInHistoryModal.tsx` | ~370 |

---

## Implementation Summary

### Component: `StockInHistoryModal`

A full-page admin modal rendered at `z-50` with dark/light theme support via `useTheme()` and toast error notifications via `useToast()`.

**Props:**
- `isOpen / onClose` — standard modal gate
- `liveSellers: Seller[]` — populates the seller dropdown filter
- `liveProducts: ProductCatalog[]` — used to resolve product clickthrough
- `onOpenProductHistory?: (product) => void` — optional drill-down callback

**State:**
- `logs`, `summary`, `isLoading` — API response data
- `datePreset` (`'today' | 'this_month' | 'all' | 'custom'`) — defaults to `'today'`
- `dateFrom`, `dateTo` — custom date range inputs
- `filterSellerId` — seller dropdown selection
- `searchQuery` — client-side search input

**Data Fetching:**
- `fetchLogs()` builds `StockInLogFilters` and calls `api.getStockInLogs(filters)`
- Primary `useEffect([isOpen, datePreset, filterSellerId])` — auto-fetches on modal open and any filter change
- Secondary `useEffect([dateFrom, dateTo])` — fires only when `datePreset === 'custom' && dateFrom && dateTo`
- Errors are surfaced via `showToast({ type: 'error', ... })`

**Guard:** `if (!isOpen) return null;` placed after all hooks, before render.

**Client-side search** filters `logs` on `product_name`, `barcode`, `invoice_ref`, `received_by`.

**UI Sections:**
1. **Header** — icon, title (📜 ประวัติการรับเข้าสต็อก), subtitle, refresh + close buttons
2. **Filter Panel** — 4 date-preset chips + custom date inputs (shown conditionally) + seller `<select>` + search `<input>`
3. **KPI Cards** (3-col grid):
   - 📦 ยอดรับเข้าสุทธิ — `summary.total_quantity`
   - 💰 มูลค่ารับเข้ารวม — `฿ summary.total_cost_amount` (th-TH locale, 2 decimals)
   - 🧾 จำนวนรอบรับเข้า — `summary.total_logs`
4. **Table (desktop, sm:block)** — 7 columns: วันที่-เวลา | สินค้า (thumbnail+name+barcode+category) | จำนวน | ราคาทุน/หน่วย | มูลค่ารวม | ผู้ฝากขาย | ผู้รับ/เลขบิล
5. **Mobile Cards (sm:hidden)** — thumbnail + name + barcode + date chip + quantity/cost/seller badges + received_by/invoice footer
6. **Loading State** — spinner + 4 pulse skeleton rows
7. **Empty State** — 📭 ไม่พบประวัติการรับเข้าในช่วงเวลาที่เลือก
8. **Footer bar** — result count with optional filter indicator

**Theming:** All class switching done via `isLight ? '...' : '...'` ternaries, consistent with `StockInModal.tsx` and `ProductsTab.tsx` patterns. No inline style objects except the `onError` handler hiding broken images (unavoidable DOM API).

---

## `npx tsc --noEmit` Result

```
(no output)
Exit code: 0
```

✅ Zero TypeScript errors.

---

## Concerns

None. All required types existed in `schema.ts`, the API method was confirmed in `api.ts`, and both pattern references were studied before implementation.
