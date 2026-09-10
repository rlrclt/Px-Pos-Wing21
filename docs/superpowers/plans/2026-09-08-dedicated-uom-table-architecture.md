# Dedicated Product UOM Table Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement enterprise-grade Multi-Unit Pack & UOM architecture by adding a dedicated `Product_UOM_Conversions` master table in Google Sheets & GAS backend, allowing each product to have multiple barcodes (Single, Pack, Carton) that dynamically link to the base inventory stock for POS checkout and batch restock.

**Architecture:** Master spreadsheet provisions `Product_UOM_Conversions` table storing `[conversion_id, barcode, base_barcode, unit_name, conversion_factor, selling_price, is_active, created_at]`. The GAS backend and Frontend POS/Inventory engines resolve any scanned barcode against both `Product_Catalog` and `Product_UOM_Conversions`, automatically calculating multiplier factors and deducting base stock from `Inventory_Stocks`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Google Apps Script (V8 Engine), Google Sheets Hub-and-Spoke.

**Spec:** Option 2 Multi-UOM Dedicated Table Specification

## Global Constraints
- Strictly follow User Rule: NEVER run `npm run build` or `npm test`. Exclusively use `npx tsc --noEmit` for validation.
- Communication style: `/caveman` (Thai language, concise, technically exact, zero fluff).
- 100% Zero Regression across POS, Kiosk, Seller, Admin, Google Drive, and Live Sync.

---

### Task 1: Schema & Type Definitions

**Files:**
- Modify: `src/types/schema.ts`

**Interfaces:**
- Produces: `ProductUOMConversion` interface and updates to `ProductCatalog`

- [ ] **Step 1: Add `ProductUOMConversion` interface to `src/types/schema.ts`**

```typescript
export interface ProductUOMConversion {
  conversion_id: string;      // PK: e.g. UOM-8850123006
  barcode: string;            // Unique Barcode on Pack/Carton (e.g. 8850123006)
  base_barcode: string;       // FK Ref: Barcode of single base item in Inventory_Stocks
  unit_name: string;          // e.g. "แพ็ค 6", "ลัง 24"
  conversion_factor: number;  // Multiplier (e.g. 6, 24)
  selling_price: number;      // Retail selling price for this pack unit (e.g. 55.00)
  is_active: boolean;         // Active status
  created_at?: string;        // Timestamp
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: Exit code 0

---

### Task 2: Backend GAS Table Provisioning & Handlers

**Files:**
- Modify: `backend/gas/Code.js`

**Interfaces:**
- Produces:
  * `getOrCreateProductUOMSheet()`
  * `handleGetProductUOMs()`
  * `handleSaveProductUOM(payload)`
  * `handleDeleteProductUOM(payload)`
  * Updates `handleCreateOrder` and `handleBatchImportProducts` to resolve base barcode from `Product_UOM_Conversions`

- [ ] **Step 1: Implement `getOrCreateProductUOMSheet()` and UOM handlers in `backend/gas/Code.js`**
- [ ] **Step 2: Add routing cases in `doGet` and `doPost`**
- [ ] **Step 3: Update `handleBatchImportProducts` and `handleCreateOrder` to lookup UOM conversion factor and base barcode**

---

### Task 3: API Client Methods

**Files:**
- Modify: `src/core/api.ts`

**Interfaces:**
- Consumes: `ProductUOMConversion` from `src/types/schema.ts`
- Produces: `api.getProductUOMs()`, `api.saveProductUOM()`, `api.deleteProductUOM()`

- [ ] **Step 1: Add `getProductUOMs()`, `saveProductUOM()`, and `deleteProductUOM()` in `PXApiClient`**
- [ ] **Step 2: Update `validateProductRows` to cross-validate UOM barcodes**
- [ ] **Step 3: Verify TypeScript compilation with `npx tsc --noEmit`**

---

### Task 4: Multi-UOM Management in Product Form & Catalog UI

**Files:**
- Modify: `src/features/products/components/ProductFormModal.tsx`
- Modify: `src/features/admin/components/ProductsTab.tsx`
- Modify: `src/features/pos/PosView.tsx`

**Interfaces:**
- Consumes: `api.getProductUOMs()` and `ProductUOMConversion`
- Produces: Visual Sub-UOM manager allowing adding multiple barcodes (Pack of 6, Box of 12, Carton of 24) under 1 Base Product

- [ ] **Step 1: Add Multi-UOM nested list/manager in `ProductFormModal.tsx`**
- [ ] **Step 2: Add UOM badges and conversion popover in `ProductsTab.tsx`**
- [ ] **Step 3: Ensure POS scanner resolves both single and pack barcodes seamlessly in `PosView.tsx`**
- [ ] **Step 4: Verify with `npx tsc --noEmit`**

---

### Task 5: End-to-End Verification & Handoff Update

**Files:**
- Modify: `HANDOFF.md`

- [ ] **Step 1: Run `npx tsc --noEmit` to verify type safety**
- [ ] **Step 2: Update `HANDOFF.md` with new schema and UOM table structure**
