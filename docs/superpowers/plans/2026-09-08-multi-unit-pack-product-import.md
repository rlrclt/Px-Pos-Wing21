# Multi-Unit Pack & Carton Product Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable seamless handling of Single Items vs. Pack/Carton variants with automatic unit conversion routing in both Catalog registration and Inventory Restock operations.

**Architecture:** 
- **Data Model:** Base Unit item stores true physical stock in `Inventory_Stocks`. Pack/Carton item is registered in `Product_Catalog` with `parent_barcode` referencing the Base Item's barcode and `conversion_factor` (e.g. 6 or 24).
- **Backend (GAS):** When restocking or receiving a pack barcode, resolve its `parent_barcode` and `conversion_factor`, converting incoming quantity (`qty * conversion_factor`) and updating the Base Unit in `Inventory_Stocks` and `Stock_In_Logs`.
- **Frontend:** Update the Manual Product Modal with an intuitive unit type selector (🔘 ชิ้นเดี่ยว / 🔘 แพ็ค-ลัง-กล่อง) and parent product picker. Update the RESTOCK Import mode to display conversion previews (e.g. "10 ลัง = 240 ชิ้น").

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Google Apps Script, Google Sheets API.

**Spec Reference:**
- `src/types/schema.ts` (`ProductCatalog`, `InventoryStock`, `StockInLog`)
- Master Spreadsheet ID: `1FcMRDGqRBjUaCm4yTvuE8l6ehLm879Zbwtur5ad9OU4`

## Global Constraints
- **Strict Rule:** DO NOT run `npm run build` or `npm test`. Use `npx tsc --noEmit` exclusively for type verification.
- Always preserve atomic consistency between `Product_Catalog` and `Inventory_Stocks`.
- Communication style: `/caveman` (terse, dense, technically exact, zero fluff).

---

### Task 1: Backend GAS Pack-to-Base Unit Conversion in RESTOCK Mode

**Files:**
- Modify: `backend/gas/Code.js:500-550`

**Interfaces:**
- Consumes: `mode === 'RESTOCK'`, `items: any[]`
- Produces: Atomic write converting pack barcode to parent barcode with `qtyAdded = packQty * conversionFactor` in `Inventory_Stocks` and `Stock_In_Logs`.

- [x] **Step 1: Implement Parent Barcode & Conversion Factor Resolution in `backend/gas/Code.js`**
- [x] **Step 2: Update `Stock_In_Logs` Description with Pack Conversion Context**
- [x] **Step 3: Verification**

---

### Task 2: Core Validation & Conversion Pre-Calculation in `src/core/api.ts`

**Files:**
- Modify: `src/core/api.ts:1140-1280`

**Interfaces:**
- Consumes: `validateProductRows(mode, rawRows, existingProducts, existingSellers)`
- Produces: `ParsedProductRow` enriched with `parent_barcode`, `conversion_factor`, `converted_qty`, and unit relationship warning/info badges.

- [x] **Step 1: Enrich `ParsedProductRow` with conversion fields**
- [x] **Step 2: Enhance `validateProductRows` for RESTOCK Mode**
- [x] **Step 3: Type Safety Check (`npx tsc --noEmit`)**

---

### Task 3: Manual Product Form UI Upgrade (Single vs. Pack Mode)

**Files:**
- Modify: `src/App.tsx` (State, Handlers & Modal UI)

**Interfaces:**
- Produces:
  - Unit Mode Switcher in Manual Product Modal:
    - 🔘 ชิ้นเดี่ยว (Single Base Item)
    - 🔘 แพ็ค / ลัง / กล่อง (Multi-Unit Pack)
  - Parent Product Dropdown selector when Pack Mode is selected.
  - Conversion Factor input (`1 แพ็ค/ลัง บรรจุ ? ชิ้น`).
  - Auto-hide of Opening Stock inputs in Pack Mode (since stock is managed at the Base Item level).

- [x] **Step 1: Add Unit Mode State & Reset in `productForm`**
- [x] **Step 2: Build Unit Type Toggle & Parent Product Selector in UI**
- [x] **Step 3: Update `handleSaveManualProduct`**
- [x] **Step 4: Type Safety Check (`npx tsc --noEmit`)**

---

### Task 4: Product Catalog Table Enhancement (Pack Badge & Parent Link)

**Files:**
- Modify: `src/App.tsx` (Products Table)

- [x] **Step 1: Add Pack Indicator Badge in Products Table**
- [x] **Step 2: Type Safety Check (`npx tsc --noEmit`)**

---

### Task 5: Documentation & Handoff Update

**Files:**
- Modify: `HANDOFF.md`

- [x] **Step 1: Update `HANDOFF.md` with Multi-Unit Architecture and Conversion Flow**
- [x] **Step 2: Final Verification with `npx tsc --noEmit`**
