# Stock-In History & Product Audit Trail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive Stock-In History & Product Restock Audit Trail module for Admin to inspect restock logs by Today, This Month, Custom Date Range, or drilled down per specific product.

**Architecture:** 
- Backend Google Apps Script (`backend/gas/Code.js`) exposes `handleGetStockInLogs` to read `Stock_In_Logs` from the Master Spreadsheet, joined with `Product_Catalog` and `Sellers` metadata, returning sorted log entries and calculated aggregate KPIs (total units received, total procurement cost, total batch count).
- Frontend API client (`src/core/api.ts`) and schema types (`src/types/schema.ts`) provide type-safe queries with filtering options.
- Admin UI introduces a Dedicated **Stock-In History Modal / Tab** (`StockInHistoryModal.tsx`) with fast period chips (Today, This Month, All Time, Custom), Seller filter, search query, and summary KPI cards, alongside a **Per-Product History Modal** (`ProductStockHistoryModal.tsx`) triggered directly from any product row in `ProductsTab.tsx`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Google Apps Script (V8 engine), Google Sheets Master Database.

**Spec:** User request for Restock History analytics and drill-down audit trail by period (Day / Month) and by specific product.

## Global Constraints
- **STRICT RULE:** NEVER run `npm run build` or `npm test`. Exclusively run `npx tsc --noEmit` for type checking.
- **NO MOCK DATA:** All stock logs and products must be fetched live from Google Sheets via Google Apps Script.
- **COMMUNICATION STYLE:** `/caveman` (Thai language, concise, technically exact, zero fluff).

---

### File Structure Map
- **Backend:**
  - Modify: `backend/gas/Code.js` (implement `handleGetStockInLogs`, register `getStockInLogs` in `doGet`/`doPost`)
- **Core Types & API:**
  - Modify: `src/types/schema.ts` (export `StockInLogEntry`, `StockInLogsSummary`, `StockInLogsResponse`, `StockInLogFilters`)
  - Modify: `src/core/api.ts` (implement `api.getStockInLogs`)
- **Inventory Components:**
  - Create: `src/features/inventory/components/StockInHistoryModal.tsx` (Global Stock-In History with KPI summary, period filters, seller filters, and log table)
  - Create: `src/features/inventory/components/ProductStockHistoryModal.tsx` (Drill-down modal for viewing single product's restock timeline)
- **Admin Views Integration:**
  - Modify: `src/features/admin/components/ProductsTab.tsx` (add header button "ประวัติการรับเข้าสต็อก" + row action icon "ดูประวัติสินค้า")
  - Modify: `src/features/admin/AdminView.tsx` (wire state and modals for `StockInHistoryModal` and `ProductStockHistoryModal`)

---

### Task 1: Backend GAS `handleGetStockInLogs`

**Files:**
- Modify: `backend/gas/Code.js`

**Interfaces:**
- Produces:
  * `handleGetStockInLogs(params)`: Returns `{ status: 'SUCCESS', success: true, data: StockInLogEntry[], summary: StockInLogsSummary }`
  * Action route `'getStockInLogs'` in `doGet` and `doPost`.

- [ ] **Step 1: Implement `handleGetStockInLogs` in `backend/gas/Code.js`**

Implement `handleGetStockInLogs(params)` with the following specifications:
1. Fetch `Stock_In_Logs`, `Product_Catalog`, and `Sellers` from Master Spreadsheet.
2. If `Stock_In_Logs` does not exist, initialize it via `getOrCreateStockInLogsSheet()`.
3. Map catalog entries by `barcode` to attach `product_name`, `category`, `unit_name`, `image_url`.
4. Map sellers by `seller_id` to attach `seller_name`.
5. Support filtering:
   - `barcode`: Exact match on `barcode`.
   - `seller_id`: Exact match on `seller_id`.
   - `date_from` (ISO string or YYYY-MM-DD): Filter logs `received_at >= date_from`.
   - `date_to` (ISO string or YYYY-MM-DD): Filter logs `received_at <= date_to + 23:59:59`.
   - `date_preset`: `'today'` (Bangkok timezone today 00:00:00 to 23:59:59), `'this_month'` (Bangkok timezone 1st of current month to now), or `'all'`.
6. Compute summary aggregates:
   - `total_logs`: Count of matching records.
   - `total_quantity`: Sum of `quantity_added`.
   - `total_cost_amount`: Sum of `total_cost`.
7. Sort logs in reverse chronological order (newest `received_at` first).
8. Return JSON:
```javascript
{
  status: 'SUCCESS',
  success: true,
  data: logs,
  summary: {
    total_logs: logs.length,
    total_quantity: totalQty,
    total_cost_amount: totalCost
  }
}
```

- [ ] **Step 2: Wire routes in `doGet` and `doPost` in `backend/gas/Code.js`**

In `doGet`:
```javascript
case 'getStockInLogs':
  data = handleGetStockInLogs(e.parameter);
  break;
```

In `doPost`:
```javascript
case 'getStockInLogs':
  response = handleGetStockInLogs(payload);
  break;
```

---

### Task 2: TypeScript Schema & Frontend API Client

**Files:**
- Modify: `src/types/schema.ts`
- Modify: `src/core/api.ts`

**Interfaces:**
- Consumes: `handleGetStockInLogs` from GAS
- Produces:
  * `StockInLogEntry`, `StockInLogsSummary`, `StockInLogsResponse`, `StockInLogFilters`
  * `api.getStockInLogs(filters)`

- [ ] **Step 1: Add types in `src/types/schema.ts`**

Export the following interfaces in `src/types/schema.ts`:
```typescript
export interface StockInLogEntry {
  log_id: string;
  barcode: string;
  product_name: string;
  unit_name: string;
  category: string;
  image_url?: string;
  quantity_added: number;
  cost_price_unit: number;
  total_cost: number;
  seller_id: string;
  seller_name?: string;
  received_by: string;
  received_at: string;
  invoice_ref?: string;
}

export interface StockInLogsSummary {
  total_logs: number;
  total_quantity: number;
  total_cost_amount: number;
}

export interface StockInLogsResponse {
  status: string;
  success: boolean;
  data: StockInLogEntry[];
  summary: StockInLogsSummary;
  error?: string;
}

export interface StockInLogFilters {
  barcode?: string;
  seller_id?: string;
  date_preset?: 'today' | 'this_month' | 'custom' | 'all';
  date_from?: string;
  date_to?: string;
}
```

- [ ] **Step 2: Add `getStockInLogs` to `src/core/api.ts`**

In `src/core/api.ts`:
```typescript
async getStockInLogs(filters?: StockInLogFilters): Promise<StockInLogsResponse> {
  const params = new URLSearchParams({ action: 'getStockInLogs' });
  if (filters?.barcode) params.set('barcode', filters.barcode);
  if (filters?.seller_id) params.set('seller_id', filters.seller_id);
  if (filters?.date_preset) params.set('date_preset', filters.date_preset);
  if (filters?.date_from) params.set('date_from', filters.date_from);
  if (filters?.date_to) params.set('date_to', filters.date_to);

  try {
    const res = await fetch(`${this.getProxyUrl()}?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    return await res.json();
  } catch (err: any) {
    console.error('Failed to fetch stock in logs:', err);
    return {
      status: 'ERROR',
      success: false,
      data: [],
      summary: { total_logs: 0, total_quantity: 0, total_cost_amount: 0 },
      error: err.message || 'ไม่สามารถดึงประวัติการรับเข้าสต็อกได้'
    };
  }
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: Exit code 0.

---

### Task 3: Create `StockInHistoryModal.tsx` (Global History & KPI Analytics)

**Files:**
- Create: `src/features/inventory/components/StockInHistoryModal.tsx`

**Interfaces:**
- Consumes: `api.getStockInLogs`, `useTheme`, `useToast`, `Seller`, `ProductCatalog`
- Produces: `StockInHistoryModal` component

- [ ] **Step 1: Implement `StockInHistoryModal.tsx`**

Features:
1. **Header & Filter Bar:**
   - Quick Filter Chips:
     * `📅 วันนี้ (Today)`
     * `🗓️ เดือนนี้ (This Month)`
     * `📦 ทั้งหมด (All Time)`
     * `🎯 กำหนดช่วงวันที่ (Custom Range)`
   - Filter by Seller dropdown
   - Search input (searches by product name, barcode, invoice_ref, received_by)
   - Refresh button with spinner
2. **KPI Summary Cards:**
   - Total Items Received: `📦 ยอดรับเข้าสุทธิ: X ชิ้น`
   - Total Procurement Cost: `💰 มูลค่ารับเข้ารวม: ฿X.XX`
   - Total Batches: `🧾 จำนวนบิล/รอบรับเข้า: X ครั้ง`
3. **Log Table & Card List:**
   - Date/Time formatted in Thai locale (`DD/MM/BBBB HH:mm น.`)
   - Product preview: Thumbnail image, Product name, Category, Barcode
   - Quantity added with unit
   - Cost price per unit & Total cost (฿)
   - Seller Badge (`🏪 ชื่อร้าน / ส่วนกลาง`)
   - Receiver & Invoice Ref (`👤 user_id` & `INV-XXXX`)
4. **Empty State & Loading Skeleton.**
5. **Quick Action:** Click any log's product to open restock modal or drill down.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: Exit code 0.

---

### Task 4: Create `ProductStockHistoryModal.tsx` (Single Product Drill-Down)

**Files:**
- Create: `src/features/inventory/components/ProductStockHistoryModal.tsx`

**Interfaces:**
- Consumes: `ProductCatalog`, `api.getStockInLogs`, `onOpenStockIn`
- Produces: `ProductStockHistoryModal` component

- [ ] **Step 1: Implement `ProductStockHistoryModal.tsx`**

Features:
1. Product Header Banner: Image, Product Name, Category, Base Barcode, Linked UOM pack info, Seller, Current Stock pill.
2. Stats Mini-Grid:
   - Total units received all-time for this product.
   - Total procurement spend all-time for this product.
   - Last restocked date and received by.
3. Restock Logs Timeline Table:
   - Date & Time
   - Quantity added
   - Unit cost & Total lot cost
   - Invoice Reference
   - Received By
4. Quick Action Button: **"📥 รับเข้าสต็อกเพิ่มทันที"** (triggers `onOpenStockIn(product.barcode)`).

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: Exit code 0.

---

### Task 5: Integrate into `ProductsTab.tsx` and `AdminView.tsx`

**Files:**
- Modify: `src/features/admin/components/ProductsTab.tsx`
- Modify: `src/features/admin/AdminView.tsx`

**Interfaces:**
- Consumes: `StockInHistoryModal`, `ProductStockHistoryModal`
- Produces: Complete Admin Stock-In History and Product Audit UX

- [ ] **Step 1: Update `ProductsTab.tsx`**

1. In header actions:
   - Add button: `📜 ประวัติการรับเข้า (Stock History)` -> calls `onOpenStockInHistory()`.
2. In each product table row:
   - Add icon action button: `📜` (title: "ดูประวัติการรับเข้าของสินค้านี้") -> calls `onOpenProductHistory(product)`.

- [ ] **Step 2: Wire modals and state in `AdminView.tsx`**

1. Add states:
   - `isStockInHistoryOpen: boolean`
   - `selectedHistoryProduct: ProductCatalog | null`
2. Connect handlers:
   - `handleOpenStockInHistory()`
   - `handleOpenProductHistory(product)`
3. Render `<StockInHistoryModal />` and `<ProductStockHistoryModal />` with proper refresh and modal linking props.

- [ ] **Step 3: Run full TypeScript verification**

Run: `npx tsc --noEmit`
Expected: Exit code 0.

---

### Task 6: End-to-End Verification

- [ ] **Step 1: Compile Check**
Run `npx tsc --noEmit` and ensure 0 errors.

- [ ] **Step 2: Flow Verification**
- Check filtering by `today`, `this_month`, `all` in GAS logic.
- Check drill-down product history timeline logic.
- Verify seamless integration with `StockInModal`.
