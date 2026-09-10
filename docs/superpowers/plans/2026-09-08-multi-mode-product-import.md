# Multi-Mode Smart Product Import Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-mode bulk product import hub (Template Download, Multi-format Parsing, Real-time Pre-validation, and Dual-table Google Sheets Synchronization) supporting New Products + Opening Stock, Catalog & Price Updates, and Batch Stock-In.

**Architecture:** 
- **Backend (Google Apps Script):** Atomic transactional multi-table handler (`handleBatchImportProducts`) writing to `Product_Catalog`, `Inventory_Stocks`, and `Stock_In_Logs` in Master Spreadsheet.
- **Core Engine (TypeScript):** Dynamic template generator (CSV UTF-8 BOM + Excel XML), parser with Thai/English header aliasing, and mode-aware pre-validation engine checking format, missing fields, and duplicates.
- **Frontend (React 19 / Tailwind):** Products & Inventory tab in `/admin`, Template Download Modal, and an interactive Multi-Mode Smart Import Modal with live status metrics, per-row checkboxes, and toast feedback.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Google Apps Script, Google Sheets API.

**Spec / Reference:**
- Master Spreadsheet ID: `1FcMRDGqRBjUaCm4yTvuE8l6ehLm879Zbwtur5ad9OU4`
- Tables: `Product_Catalog`, `Inventory_Stocks`, `Stock_In_Logs`, `Sellers`
- Reference Schema: `src/types/schema.ts` (`ProductCatalog`, `InventoryStock`, `StockInLog`, `Seller`)

## Global Constraints
- **Strict Rule:** DO NOT run `npm run build` or `npm test`. Use `npx tsc --noEmit` exclusively for type verification.
- Preserve UTF-8 BOM (`\uFEFF`) in CSV files for Thai character encoding compatibility in Microsoft Excel.
- Excel XML format must adhere to SpreadsheetML 2003 schema with styled headers (`#1E293B`, bold white text).
- Communication style: `/caveman` (Thai language, concise, technically exact, zero fluff).

---

### Task 1: Backend Multi-Mode Product Import Handler in Google Apps Script

**Files:**
- Modify: `backend/gas/Code.js:140-160` (Add route in `doPost` / `doGet`)
- Modify: `backend/gas/Code.js:330-360` (Add `handleBatchImportProducts` function)

**Interfaces:**
- Consumes: `payload: { mode: 'NEW_PRODUCTS' | 'UPDATE_CATALOG' | 'RESTOCK', products: any[], conflictMode: 'SKIP_DUPLICATES' | 'UPSERT' }`
- Produces: `{ status: 'SUCCESS' | 'ERROR', count_imported?: number, count_updated?: number, count_skipped?: number, count_logged?: number, message: string }`

- [ ] **Step 1: Wire routes in `doGet` and `doPost` in `backend/gas/Code.js`**
Add cases for `batchImportProducts`:
```javascript
case 'batchImportProducts':
case 'importProducts':
  response = handleBatchImportProducts(payload);
  break;
```

- [ ] **Step 2: Implement `handleBatchImportProducts(payload)` in `backend/gas/Code.js`**
Write atomic handler that supports:
1. `mode === 'NEW_PRODUCTS'`:
   - Opens Master Sheet, checks `Product_Catalog`, `Inventory_Stocks`, `Stock_In_Logs`.
   - Maps existing barcodes in Catalog and Inventory.
   - For each item:
     - If exists and `conflictMode === 'SKIP_DUPLICATES'`: skip.
     - If exists and `conflictMode === 'UPSERT'`: update row in `Product_Catalog` and row in `Inventory_Stocks`.
     - If new: append row to `Product_Catalog`, append row to `Inventory_Stocks`, and if `stock_qty > 0` append record to `Stock_In_Logs`.
2. `mode === 'UPDATE_CATALOG'`:
   - Updates `product_name`, `selling_price`, `unit_name`, `category`, `is_active` in `Product_Catalog`.
3. `mode === 'RESTOCK'`:
   - Finds row in `Inventory_Stocks` by barcode.
   - Increments `stock_qty += quantity_added`, updates `cost_price = cost_price_unit`.
   - Appends transaction log to `Stock_In_Logs` with unique `log_id` (`IN-YYYYMMDD-XXXX`).

- [ ] **Step 3: Verification**
Verify syntax in `backend/gas/Code.js` and ensure all table columns match Master Sheet schema.

---

### Task 2: Core Template Generator, Parser & Pre-Validation Engine

**Files:**
- Modify: `src/core/api.ts` (Add template download, parser, and pre-validator functions)

**Interfaces:**
- Produces:
  - `export type ProductImportMode = 'NEW_PRODUCTS' | 'UPDATE_CATALOG' | 'RESTOCK';`
  - `export interface ParsedProductRow { rowIndex: number; barcode: string; product_name: string; category: string; unit_name: string; selling_price: number; cost_price: number; stock_qty: number; seller_id: string; low_stock_threshold: number; is_active: boolean; validationStatus: 'VALID' | 'DUPLICATE' | 'ERROR'; errors: string[]; warnings: string[]; isSelected: boolean; }`
  - `export interface ProductValidationSummary { total: number; validCount: number; duplicateCount: number; errorCount: number; rows: ParsedProductRow[]; }`
  - `export function downloadProductTemplate(mode: ProductImportMode, format: 'csv' | 'excel_xml'): void`
  - `export async function parseProductFile(file: File): Promise<any[]>`
  - `export function validateProductRows(mode: ProductImportMode, rawRows: any[], existingProducts: ProductCatalog[], existingStocks: any[], existingSellers: Seller[]): ProductValidationSummary`
  - `api.batchImportProducts(mode: ProductImportMode, products: any[], conflictMode: 'SKIP_DUPLICATES' | 'UPSERT')`

- [ ] **Step 1: Define types & interfaces in `src/core/api.ts`**
Add `ProductImportMode`, `ParsedProductRow`, and `ProductValidationSummary`.

- [ ] **Step 2: Implement `downloadProductTemplate(mode, format)` in `src/core/api.ts`**
Generate sample datasets for each mode:
- Mode `NEW_PRODUCTS`: Barcode, Product Name, Category, Unit, Selling Price, Cost Price, Opening Stock, Seller ID, Low Stock Alert.
- Mode `UPDATE_CATALOG`: Barcode, Product Name, Category, Unit, Selling Price, Active Status.
- Mode `RESTOCK`: Barcode, Product Name, Quantity Added, Cost Price Unit, Seller ID, Invoice Ref, Received By.
Generate both CSV (with `\uFEFF` UTF-8 BOM) and SpreadsheetML 2003 XML with `#1E293B` styled header row.

- [ ] **Step 3: Implement `parseProductFile(file)` and Header Normalizer**
Support aliases for barcode (`รหัสสินค้า`, `บาร์โค้ด`, `barcode`), product name (`ชื่อสินค้า`, `รายการ`), price (`ราคาขาย`, `ราคา`), cost (`ราคาทุน`, `ทุน`), stock (`จำนวน`, `สต็อก`, `จำนวนรับเข้า`), seller (`ผู้ฝากขาย`, `รหัสผู้ขาย`, `seller_id`), unit (`หน่วย`, `หน่วยนับ`).

- [ ] **Step 4: Implement `validateProductRows(mode, rawRows, existingProducts, existingStocks, existingSellers)`**
- Check required barcode and product name.
- For `NEW_PRODUCTS`: Duplicate check against existing catalog barcodes.
- For `UPDATE_CATALOG`: Warning if barcode does not exist in catalog.
- For `RESTOCK`: Error if barcode not found in catalog/inventory, quantity must be > 0.
- Check if `seller_id` exists in `existingSellers` (warning/error if invalid).

- [ ] **Step 5: Add `api.batchImportProducts(mode, products, conflictMode)`**
POST to GAS with `action: 'batchImportProducts'` and return parsed response.

- [ ] **Step 6: Verify Type Safety**
Run `npx tsc --noEmit` and ensure code compiles with zero errors.

---

### Task 3: Products & Inventory Management Tab in `/admin`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `api.getProducts()`, `api.getSellers()`
- Produces: UI tab `'products'` in `adminTab: 'welfare' | 'batches' | 'folders' | 'products'`

- [ ] **Step 1: Add State Variables in `src/App.tsx`**
```typescript
const [adminTab, setAdminTab] = useState<'welfare' | 'batches' | 'folders' | 'products'>('welfare');
const [liveProducts, setLiveProducts] = useState<ProductCatalog[]>([]);
const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
const [productSearch, setProductSearch] = useState<string>('');
const [productCategoryFilter, setProductCategoryFilter] = useState<string>('ALL');
```

- [ ] **Step 2: Add Navigation Tab Button in Admin Navbar**
Add button: `📦 แคตตาล็อก & คลังสินค้า (Products & Inventory)` with count badge.

- [ ] **Step 3: Build Products & Inventory Table View**
- KPI Summary Cards: Total SKUs, Active Products, Total Categories.
- Search bar + Category filter dropdown.
- Header Action Buttons:
  - `📥 โหลดเทมเพลตสินค้า` (Opens `isDownloadProductTemplateOpen`)
  - `📤 นำเข้าสินค้า (Import Hub)` (Opens `isUploadProductOpen`)
  - `🔄 รีเฟรชสินค้า` (Calls `loadProducts()`)
- Table displaying: Barcode, Image/Icon, Product Name, Category, Unit, Selling Price, Status (Active/Disabled).

- [ ] **Step 4: Verify Type Safety**
Run `npx tsc --noEmit`.

---

### Task 4: Template Download & Multi-Mode Smart Import Modals

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Produces:
  - `isDownloadProductTemplateOpen` Modal
  - `isUploadProductOpen` Modal

- [ ] **Step 1: Implement Download Product Template Modal**
- Mode selection cards (Mode A: New Products, Mode B: Catalog Update, Mode C: Restock).
- Format selection (CSV UTF-8 BOM vs. Excel XML).
- Download button triggering `downloadProductTemplate(mode, format)`.

- [ ] **Step 2: Implement Multi-Mode Smart Import Hub Modal**
- **Mode Switcher Tabs:**
  - 🟢 โหมด A: นำเข้าสินค้าใหม่ + สต็อกเปิดร้าน (`NEW_PRODUCTS`)
  - 🔵 โหมด B: ปรับปรุงราคา / แคตตาล็อก (`UPDATE_CATALOG`)
  - 🟠 โหมด C: รับสต็อกล็อตใหม่เข้าคลัง (`RESTOCK`)
- **Dropzone File Picker:**
  - Accepts `.csv`, `.xlsx`, `.xls`, `.xml`, `.txt`.
  - Parses file and validates based on selected mode.
- **Validation KPI Cards:**
  - 📊 ทั้งหมด
  - 🟢 ถูกต้อง พร้อมนำเข้า
  - 🟡 ซ้ำ / พบในระบบ
  - 🔴 ข้อผิดพลาด (Error)
- **Interactive Preview Table:**
  - Per-row checkbox (auto-disabled on Error rows).
  - Row number, Barcode, Product Name, Category, Price / Qty, Validation Status Badge with detailed error/warning tooltips.
- **Action Buttons:**
  - Mode A: `นำเข้า (ข้ามรายการซ้ำ)` & `นำเข้าทั้งหมด (อัปเดตทับ)`
  - Mode B: `อัปเดตแคตตาล็อกสินค้า`
  - Mode C: `ยืนยันรับสต็อกเข้าคลัง`
  - Wired with `showToast` and loading state.

- [ ] **Step 3: Verify Type Safety**
Run `npx tsc --noEmit`.

---

### Task 5: POS Catalog Live Synchronization

**Files:**
- Modify: `src/App.tsx` (Use `liveProducts` in POS view when available)

- [ ] **Step 1: Connect POS items catalog to `liveProducts`**
When `liveProducts.length > 0`, POS uses `liveProducts`; otherwise falls back to `MOCK_PRODUCTS`.
- [ ] **Step 2: Verify Type Safety**
Run `npx tsc --noEmit`.

---

### Task 6: Final Verification & Handoff Documentation

**Files:**
- Modify: `HANDOFF.md`

- [ ] **Step 1: Verify TypeScript Build**
Run `npx tsc --noEmit` (Must exit with code 0).
- [ ] **Step 2: Update `HANDOFF.md`**
Document the new Multi-Mode Product Import System, endpoints, and deployment procedures.
