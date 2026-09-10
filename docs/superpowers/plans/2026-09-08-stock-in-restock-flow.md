# Stock-In / Restock System with Multi-Unit Pack Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a robust, scanner-friendly "Stock-In / Restock (รับของเข้าสต็อก)" system that accepts either Base Product Barcodes or Multi-Unit Pack Barcodes (`Product_UOM_Conversions`), displays rich product preview with photo and current stock, calculates total base units dynamically (`Quantity × Conversion Factor`), updates `Inventory_Stocks`, and writes audit records to `Stock_In_Logs`.

**Architecture:** 
- **Frontend (`StockInModal.tsx`):** Hardware barcode scanner & input field auto-resolves scanned barcodes against `ProductCatalog` and `Product_UOM_Conversions`. Displays immediate product card (photo, name, current stock, seller, unit badges), real-time math calculation (`packs × factor = base units`, `current stock + received = new stock`), cost price, invoice reference, and continuous scanning mode.
- **Client API (`src/core/api.ts`):** `stockInProduct()` sends typed payload to Google Apps Script.
- **Backend (`backend/gas/Code.js`):** `handleStockInProduct()` atomically retrieves `Product_Catalog`, `Product_UOM_Conversions`, and `Inventory_Stocks`, computes base quantities, updates stock level & cost price, and appends structured audit trail to `Stock_In_Logs`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Google Apps Script (Master Spreadsheet).

**Spec:** User request for Stock-In feature with barcode scanner, Base/Pack UOM auto-detection, product preview with image & current stock, quantity multiplier, and inventory logging.

## Global Constraints
- **STRICT RULE:** NEVER run `npm run build` or `npm test`. Exclusively run `npx tsc --noEmit` for validation.
- **Communication Style:** `/caveman` (Thai language, concise, technically exact, zero fluff).
- **Zero Mock Data:** Live data only from Google Sheets / GAS API.
- **Barcode Support:** Must seamlessly resolve both standard single product barcodes and multi-unit pack barcodes.

---

### Task 1: Backend GAS `handleStockInProduct`

**Files:**
- Modify: `backend/gas/Code.js` (and `doGet` / `doPost` routing)

**Interfaces:**
- Consumes: `{ action: 'stockInProduct', payload: { barcode, quantity, cost_price_unit?, seller_id?, invoice_ref?, received_by?, notes? } }`
- Produces: `{ status: 'SUCCESS', success: true, base_barcode, quantity_added, previous_stock, new_stock, log_id, message }`

- [ ] **Step 1: Implement `handleStockInProduct(payload)` in `backend/gas/Code.js`**
- [ ] **Step 2: Wire `stockInProduct` in `doGet` and `doPost` in `backend/gas/Code.js`**

---

### Task 2: Core API & Type Definitions

**Files:**
- Modify: `src/types/schema.ts`
- Modify: `src/core/api.ts`

**Interfaces:**
- Consumes: `StockInPayload`
- Produces: `api.stockInProduct(payload)`

- [ ] **Step 1: Export `StockInPayload` and `StockInResponse` in `src/types/schema.ts`**
- [ ] **Step 2: Add `stockInProduct` method in `PXApiClient` in `src/core/api.ts`**

---

### Task 3: Build `StockInModal.tsx` Component

**Files:**
- Create: `src/features/inventory/components/StockInModal.tsx`

**Features:**
- Auto-Focus Barcode Input with Hardware Scanner support.
- Dual Barcode Resolver (Base Barcode vs Multi-Unit Pack Barcode).
- Live Preview Card: Product image, name, category, current stock badge, seller badge, unit badge.
- Dynamic Multiplier calculation: `จำนวนรับเข้า (แพ็ค/ลัง) × อัตราคูณ = จำนวนหน่วยย่อย`, `สต็อกเดิม + รับเข้า = สต็อกใหม่`.
- Cost price per unit, Seller selector, Invoice ref, Received by fields.
- Continuous Scan Mode toggle (สแกนรับเข้าต่อเนื่อง).

- [ ] **Step 1: Create `src/features/inventory/components/StockInModal.tsx`**

---

### Task 4: Connect to `ProductsTab.tsx`, `AdminView.tsx`, and `App.tsx`

**Files:**
- Modify: `src/features/admin/components/ProductsTab.tsx`
- Modify: `src/features/admin/AdminView.tsx`
- Modify: `src/App.tsx`

**Deliverables:**
- Add `📥 รับของเข้าสต็อก (Restock)` button in the header of `ProductsTab.tsx`.
- Add Quick Restock button on each product row in the table.
- Pass `liveProducts`, `liveUOMs`, `liveSellers`, and refresh handler to `StockInModal`.

---

### Task 5: Verification & Type Safety

- [ ] **Step 1: Typecheck with TypeScript compiler**
Run: `npx tsc --noEmit`
Expected: Exit code 0 (zero errors).

- [ ] **Step 2: Test Single Product Barcode and Multi-Unit Pack Barcode Scenarios**
