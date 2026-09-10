# Promotions Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Promotions Management System (Admin CRUD, Google Sheets Sync, and Real-time POS Promotion Calculation Engine for BOGO 1-แถม-1, Percentage Discounts, and Clearance) according to `ออกแบบระบบและโฟลว์ PX ทหารใหม่.pdf`.

**Architecture:** Add `Promotions` sheet schema in Master Spreadsheet with GAS RPC endpoints. Build an Admin Promotions Management Tab (`PromotionsTab.tsx`) with modern Bento/table views and a comprehensive `CreatePromotionModal.tsx`. Connect a pure TypeScript promotion engine (`promotionEngine.ts`) to POS cart calculations, ensuring accurate physical stock deduction (e.g. 1 แถม 1 deducts 2 in inventory, charges 1) and proper seller GP profit splits.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide React, Google Apps Script (GAS).

**Spec:** `ออกแบบระบบและโฟลว์ PX ทหารใหม่.pdf` and `PROJECT_KNOWLEDGE_CONTEXT.md`

## Global Constraints
- Verification command: `npx tsc --noEmit && node -c backend/gas/Code.js` (Never run `npm run build` or `npm test`).
- Always view lines before modifying with `replace_file_content`.
- Communication style: Caveman Full Thai mode.
- Inventory safety: Free promotional items (BOGO) must deduct physical stock (`actual_qty`), but discount the monetary value (`discount_amount`) so neither stock nor money leaks.
- Seller GP protection: Respect `absorbed_by` (`SELLER` vs `UNIT` vs `SHARED`) when computing net payout.

---

### Task 1: Data Model, TypeScript Schema, and Mock Backend Extension

**Files:**
- Modify: `src/types/schema.ts`
- Modify: `src/mock/mockBackend.ts`

**Interfaces:**
- Consumes: Existing `ProductCatalog`, `Seller`
- Produces: `Promotion` interface, `PromotionType` enum, mock CRUD methods (`getPromotions`, `createPromotion`, `updatePromotion`, `deletePromotion`, `togglePromotionActive`)

- [ ] **Step 1: Inspect `src/types/schema.ts`**
View existing `Promotion` interface lines in `src/types/schema.ts` around lines 180-200.

- [ ] **Step 2: Update `Promotion` interface in `src/types/schema.ts`**
Ensure `Promotion` has:
```typescript
export type PromoType = 'BOGO' | 'DISCOUNT_PCT' | 'CLEARANCE' | 'FIXED_PRICE';
export type PromoAbsorbedBy = 'UNIT' | 'SELLER' | 'SHARED';

export interface Promotion {
  promo_id: string;                 // PK: e.g. PROMO-001, P-BOGO-COKE
  promo_name: string;               // e.g. ซื้อ 1 แถม 1 นมถั่วเหลือง UHT
  promo_type: PromoType;            // BOGO | DISCOUNT_PCT | CLEARANCE | FIXED_PRICE
  target_barcode: string;           // FK Ref: Product_Catalog.barcode
  buy_qty: number;                  // e.g. 1
  free_qty: number;                 // e.g. 1 (for BOGO)
  discount_pct?: number;            // e.g. 20 (for DISCOUNT_PCT)
  special_price?: number;           // e.g. 10.00 (for CLEARANCE / FIXED_PRICE)
  absorbed_by: PromoAbsorbedBy;     // UNIT (กองร้อยออก) | SELLER (จ่าออก) | SHARED
  start_date: string;               // YYYY-MM-DD
  end_date: string;                 // YYYY-MM-DD
  is_active: boolean;               // boolean
  created_at?: string;
  updated_at?: string;
}
```

- [ ] **Step 3: Add Mock Promotions data & methods in `src/mock/mockBackend.ts`**
Add initial sample promotions (e.g. BOGO for soy milk, 20% discount on coffee) and mock methods:
`getPromotions()`, `createPromotion(promo)`, `updatePromotion(promoId, updates)`, `deletePromotion(promoId)`, `togglePromotionActive(promoId)`.

- [ ] **Step 4: Verify type safety**
Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
Expected: PASS (0 errors)

---

### Task 2: Backend Google Apps Script (GAS) & API Client Integration

**Files:**
- Modify: `backend/gas/Code.js`
- Modify: `src/core/api.ts`

**Interfaces:**
- Consumes: Google Sheets `Promotions` sheet
- Produces: API methods `api.getPromotions()`, `api.createPromotion()`, `api.updatePromotion()`, `api.deletePromotion()`, `api.togglePromotionActive()`

- [ ] **Step 1: Add Promotions sheet helper & handlers in `backend/gas/Code.js`**
Add `getOrCreatePromotionsSheet()`, `handleGetPromotions()`, `handleCreatePromotion()`, `handleUpdatePromotion()`, `handleDeletePromotion()`, and `handleTogglePromotionActive()`.
Columns:
`['promo_id', 'promo_name', 'promo_type', 'target_barcode', 'buy_qty', 'free_qty', 'discount_pct', 'special_price', 'absorbed_by', 'start_date', 'end_date', 'is_active']`

- [ ] **Step 2: Add routing in `doPost` / `doGet` in `backend/gas/Code.js`**
Wire actions: `getPromotions`, `createPromotion`, `updatePromotion`, `deletePromotion`, `togglePromotionActive`.

- [ ] **Step 3: Update `src/core/api.ts` with Promotion endpoints**
Add `getPromotions()`, `createPromotion(payload)`, `updatePromotion(promoId, updates)`, `deletePromotion(promoId)`, and `togglePromotionActive(promoId)` with fallback to `mockBackend`.

- [ ] **Step 4: Verify syntax**
Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
Expected: PASS (0 errors)

---

### Task 3: Pure Promotion Calculation Engine (`promotionEngine.ts`)

**Files:**
- Create: `src/features/promotions/promotionEngine.ts`

**Interfaces:**
- Consumes: Cart items, Active Promotions list
- Produces: `calculateCartPromotions(cartItems, promotions, currentDate)` returning line discounts, free items breakdown, total promotional savings, and seller/unit cost allocation.

- [x] **Step 1: Write `src/features/promotions/promotionEngine.ts`**
Implement the mathematical logic:
1. **BOGO (Buy X Get Y Free):**
   - For every `buy_qty + free_qty` items, `free_qty` items have their price discounted to 0.
   - Example: Buy 1 Get 1 (buy_qty=1, free_qty=1) on item price 20฿:
     - 1 item in cart = 20฿ (0 discount)
     - 2 items in cart = 40฿ - 20฿ discount = 20฿ net (Deducts 2 physical stock)
     - 3 items in cart = 60฿ - 20฿ discount = 40฿ net
     - 4 items in cart = 80฿ - 40฿ discount = 40฿ net
2. **DISCOUNT_PCT (% Discount):**
   - Item discount = `(selling_price * discount_pct / 100) * quantity`
3. **CLEARANCE / FIXED_PRICE:**
   - Item discount = `Math.max(0, selling_price - special_price) * quantity`
4. **Active Date Check:**
   - Compares `currentDate` (YYYY-MM-DD) between `start_date` and `end_date`.

- [x] **Step 2: Verify type safety**
Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
Expected: PASS (0 errors)

---

### Task 4: Admin Promotions Management Tab & Create/Edit Modal

**Files:**
- Create: `src/features/admin/components/CreatePromotionModal.tsx`
- Create: `src/features/admin/components/PromotionsTab.tsx`

**Interfaces:**
- Consumes: `products`, `sellers`, `promotions`, CRUD callbacks from `AdminView`
- Produces: Complete Promotions Management UI

- [ ] **Step 1: Create `CreatePromotionModal.tsx`**
- Form Fields:
  - Promotion Name (`promo_name`)
  - Target Product Picker (Searchable dropdown with product thumbnail, barcode, and base price)
  - Promotion Type Selector Tabs: `BOGO (1 แถม 1 / X แถม Y)`, `DISCOUNT_PCT (ลด %)`, `CLEARANCE (ลดราคาพิเศษ)`
  - Dynamic fields based on type (buy_qty, free_qty, discount_pct, special_price)
  - Date Range Picker (Start Date & End Date)
  - Cost Burden Selector (`absorbed_by`: ร้านค้าผู้ฝากขาย / กองร้อย / คนละครึ่ง)
  - Active Switch (`is_active`)
- Validation: Ensures valid positive quantities, valid date range, required target product.

- [ ] **Step 2: Create `PromotionsTab.tsx`**
- Bento Cards & Table Views:
  - Top KPI Widgets: Active Promotions Count, Total Discount Given, Top Running Promo
  - Filter Pills: `ทั้งหมด`, `🟢 กำลังจัดโปร`, `⏳ ยังไม่เริ่ม`, `🔴 หมดอายุ/ปิด`
  - Action Bar: Search input, `+ สร้างโปรโมชั่นใหม่` button
  - Promotion Cards: Shows target product picture, promo badge (`1 แถม 1`, `ลด 20%`), active date range, quick toggle switch (`is_active`), Edit button, Delete button.

- [ ] **Step 3: Verify syntax**
Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
Expected: PASS (0 errors)

---

### Task 5: Wire Promotions Tab into Admin Navigation & Sidebar

**Files:**
- Modify: `src/features/admin/AdminView.tsx`
- Modify: `src/features/admin/components/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `promotions` state and API handlers
- Produces: Active 'promotions' tab in Admin Panel

- [ ] **Step 1: Update `AdminSidebar.tsx`**
Add navigation menu item:
`{ id: 'promotions', label: 'จัดการโปรโมชั่น', icon: Tag / Sparkles, badge: activePromosCount }`

- [ ] **Step 2: Update `AdminView.tsx`**
Add state `promotions: Promotion[]`, `loadPromotions()`, `handleCreatePromotion()`, `handleUpdatePromotion()`, `handleDeletePromotion()`, and render `PromotionsTab` when `activeTab === 'promotions'`.

- [ ] **Step 3: Verify syntax**
Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
Expected: PASS (0 errors)

---

### Task 6: POS Real-time Promotion Engine Integration

**Files:**
- Modify: `src/features/pos/PosView.tsx`

**Interfaces:**
- Consumes: `livePromotions`, `calculateCartPromotions`
- Produces: Real-time promo tags in POS cart, accurate discount calculation, E-Slip promo breakdown

- [x] **Step 1: Pass `promotions` into `PosView.tsx`**
Ensure `PosView` receives active promotions list.

- [x] **Step 2: Apply promotion engine to cart calculations in `PosView.tsx`**
- In cart item listing:
  - Display promo badge e.g. `[PROMO: 1 แถม 1 (แถม 1 ชิ้น)]` or `[PROMO: ลด 20% (-10.00฿)]`
  - Calculate `totalDiscount`, `netSubtotal`
- In Payment Summary & E-Slip:
  - Display `ยอดรวมสินค้าปกติ`, `ส่วนลดโปรโมชั่น (-฿XX.XX)`, `ยอดสุทธิที่ต้องชำระ`
  - In Party Split mode, distribute the discounted net subtotal accurately.

- [x] **Step 3: Stock Deduction Verification**
Ensure order processing passes physical quantity `actual_qty` and discounted quantity `charged_qty` so inventory stock decreases accurately without monetary mismatch.

- [x] **Step 4: Verify type safety**
Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
Expected: PASS (0 errors)

---

### Task 7: End-to-End Verification & Master Documentation Sync

**Files:**
- Modify: `PROJECT_KNOWLEDGE_CONTEXT.md`

- [ ] **Step 1: Run comprehensive build & syntax check**
Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
Expected: 0 errors (Exit code 0)

- [ ] **Step 2: Update `PROJECT_KNOWLEDGE_CONTEXT.md`**
Record the completed Promotions feature, schema columns, and calculation rules.

- [ ] **Step 3: Final confirmation to user**
Deliver summary of changes in Caveman Full Thai style.
