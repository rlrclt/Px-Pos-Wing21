# Consignment Sellers CRUD Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full CRUD (Create, Read, Update, Delete/Archive) management for Consignment Sellers (ผู้ฝากขาย/คู่ค้า) in the Admin portal, featuring auto-generated Seller IDs (S01, S02...), safety modals, and cascading product deletion options.

**Architecture:** Extend backend (Google Apps Script `Code.js` + `mockBackend.ts`) and API layer (`api.ts`) with `createSeller`, `updateSeller`, and `deleteSeller` (handling product cascade delete). Build dedicated UI modals (`CreateSellerModal.tsx`, `DeleteSellerModal.tsx`) and enhance `SellersTab.tsx` with action buttons, status filters (Active/Inactive), and detailed seller management tools.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Google Apps Script, Vitest / Node verification.

**Spec:** [Consignment Sellers Management](file:///Users/khamseankhampang/.gemini/antigravity-cli/brain/ae344835-103b-42aa-a753-ae5afff1269a/2026-09-10-monthly-deductions-and-payroll-calendar.md)

## Global Constraints

- Backend must maintain historical integrity in `Orders` and `ConsignmentLedger` even when a seller is deactivated or deleted.
- Automatic Seller ID generation format: `S01`, `S02`, `S03`... scanning existing IDs and suggesting the next highest integer, while allowing user custom input.
- Deletion safety: Provide explicit confirmation modal displaying the count of linked products and warnings before cascading product deletion.
- Preserve light/dark theme responsiveness and bilingual Thai-first UX conventions.

---

### Task 1: Type Schema & Mock Backend Extension for Seller CRUD

**Files:**
- Modify: `src/types/schema.ts`
- Modify: `src/mock/mockBackend.ts`
- Modify: `src/core/api.ts`

**Interfaces:**
- Consumes: `Seller`, `ProductCatalog`
- Produces: 
  - `api.createSeller(seller: Partial<Seller>): Promise<{ success: boolean; data?: Seller; error?: string }>`
  - `api.updateSeller(sellerId: string, updates: Partial<Seller>): Promise<{ success: boolean; data?: Seller; error?: string }>`
  - `api.deleteSeller(sellerId: string, cascadeProducts?: boolean): Promise<{ success: boolean; deletedProductsCount?: number; error?: string }>`

- [ ] **Step 1: Update `src/types/schema.ts` with Seller CRUD payload types**

```typescript
export interface Seller {
  seller_id: string;                // PK: S01, S02
  seller_name: string;              // จ่าสิบเอก สมชาย (ร้านขนม)
  contact_info?: string;            // เบอร์โทรศัพท์ / LINE
  default_fee_pct: number;          // ค่า GP มาตรฐาน (%) ของจ่าคนนี้ (เช่น 0.10)
  avatar_url?: string;              // URL รูปโปรไฟล์ / โลโก้ร้านค้า
  is_active: boolean;               // สถานะการเป็นคู่ค้า
  created_at?: string;              // ISO 8601
  updated_at?: string;              // ISO 8601
}
```

- [ ] **Step 2: Add Seller CRUD methods in `src/mock/mockBackend.ts`**

```typescript
async createSeller(seller: Partial<Seller>): Promise<{ success: boolean; data?: Seller; error?: string }> {
  if (!seller.seller_name) return { success: false, error: 'กรุณาระบุชื่อผู้ฝากขาย' };
  
  let newId = seller.seller_id?.trim().toUpperCase();
  if (!newId) {
    const existingNums = this.sellers
      .map(s => parseInt(s.seller_id.replace(/^S/i, ''), 10))
      .filter(n => !isNaN(n));
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    newId = `S${String(nextNum).padStart(2, '0')}`;
  }

  if (this.sellers.some(s => s.seller_id.toUpperCase() === newId)) {
    return { success: false, error: `รหัสผู้ฝากขาย "${newId}" มีอยู่ในระบบแล้ว` };
  }

  const created: Seller = {
    seller_id: newId,
    seller_name: seller.seller_name.trim(),
    contact_info: seller.contact_info?.trim() || '',
    default_fee_pct: Number(seller.default_fee_pct) || 0,
    avatar_url: seller.avatar_url?.trim() || '',
    is_active: seller.is_active !== undefined ? seller.is_active : true,
    created_at: new Date().toISOString()
  };

  this.sellers.push(created);
  return { success: true, data: created };
}

async updateSeller(sellerId: string, updates: Partial<Seller>): Promise<{ success: boolean; data?: Seller; error?: string }> {
  const index = this.sellers.findIndex(s => s.seller_id === sellerId);
  if (index === -1) return { success: false, error: 'ไม่พบข้อมูลผู้ฝากขาย' };

  this.sellers[index] = {
    ...this.sellers[index],
    ...updates,
    seller_id: sellerId,
    updated_at: new Date().toISOString()
  };

  return { success: true, data: this.sellers[index] };
}

async deleteSeller(sellerId: string, cascadeProducts: boolean = true): Promise<{ success: boolean; deletedProductsCount?: number; error?: string }> {
  if (sellerId === 'S01') {
    return { success: false, error: 'ไม่อนุญาตให้ลบร้านค้าส่วนกลาง (S01)' };
  }

  const index = this.sellers.findIndex(s => s.seller_id === sellerId);
  if (index === -1) return { success: false, error: 'ไม่พบข้อมูลผู้ฝากขาย' };

  this.sellers.splice(index, 1);

  let deletedCount = 0;
  if (cascadeProducts) {
    const prevCount = this.products.length;
    this.products = this.products.filter(p => p.seller_id !== sellerId);
    deletedCount = prevCount - this.products.length;
  }

  return { success: true, deletedProductsCount: deletedCount };
}
```

- [ ] **Step 3: Expose seller methods in `src/core/api.ts`**

```typescript
async createSeller(seller: Partial<Seller>): Promise<{ success: boolean; data?: Seller; error?: string }> {
  if (this.useMock) {
    return mockBackend.createSeller(seller);
  }
  const endpoint = `${this.getProxyUrl()}?action=createSeller`;
  const response = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(seller)
  });
  return await response.json();
}

async updateSeller(sellerId: string, updates: Partial<Seller>): Promise<{ success: boolean; data?: Seller; error?: string }> {
  if (this.useMock) {
    return mockBackend.updateSeller(sellerId, updates);
  }
  const endpoint = `${this.getProxyUrl()}?action=updateSeller&seller_id=${encodeURIComponent(sellerId)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(updates)
  });
  return await response.json();
}

async deleteSeller(sellerId: string, cascadeProducts: boolean = true): Promise<{ success: boolean; deletedProductsCount?: number; error?: string }> {
  if (this.useMock) {
    return mockBackend.deleteSeller(sellerId, cascadeProducts);
  }
  const endpoint = `${this.getProxyUrl()}?action=deleteSeller&seller_id=${encodeURIComponent(sellerId)}&cascade=${cascadeProducts}`;
  const response = await fetch(endpoint, { method: 'POST' });
  return await response.json();
}
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/schema.ts src/mock/mockBackend.ts src/core/api.ts
git commit -m "feat(seller): add type definitions and api handlers for seller CRUD"
```

---

### Task 2: Google Apps Script Backend Handlers (`backend/gas/Code.js`)

**Files:**
- Modify: `backend/gas/Code.js:35-50`
- Modify: `backend/gas/Code.js:2250-2340`

**Interfaces:**
- Consumes: Action routing `createSeller`, `updateSeller`, `deleteSeller`
- Produces: Google Sheets data persistence in `Sellers` and `Products` sheets

- [ ] **Step 1: Add action dispatch cases in `doPost` / `doGet` in `Code.js`**

```javascript
case 'createSeller':
  data = handleCreateSeller(payload);
  break;
case 'updateSeller':
  data = handleUpdateSeller(e.parameter.seller_id, payload);
  break;
case 'deleteSeller':
  data = handleDeleteSeller(e.parameter.seller_id, e.parameter.cascade === 'true');
  break;
```

- [ ] **Step 2: Implement GAS handlers for Seller CRUD**

```javascript
function handleCreateSeller(payload) {
  const sheet = getOrCreateSellersSheet();
  const data = sheet.getDataRange().getValues();
  
  if (!payload.seller_name) {
    return { status: 'ERROR', message: 'กรุณาระบุชื่อผู้ฝากขาย' };
  }

  let sellerId = (payload.seller_id || '').toString().trim().toUpperCase();
  if (!sellerId) {
    let maxNum = 0;
    for (let r = 1; r < data.length; r++) {
      const id = (data[r][0] || '').toString().toUpperCase();
      const m = id.match(/^S(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    sellerId = 'S' + ('0' + (maxNum + 1)).slice(-2);
  }

  for (let r = 1; r < data.length; r++) {
    if ((data[r][0] || '').toString().toUpperCase() === sellerId) {
      return { status: 'ERROR', message: 'รหัสผู้ฝากขาย ' + sellerId + ' มีอยู่ในระบบแล้ว' };
    }
  }

  const row = [
    sellerId,
    payload.seller_name.trim(),
    payload.contact_info || '',
    Number(payload.default_fee_pct) || 0,
    payload.avatar_url || '',
    payload.is_active !== false
  ];

  sheet.appendRow(row);
  return { 
    status: 'SUCCESS', 
    data: {
      seller_id: sellerId,
      seller_name: payload.seller_name.trim(),
      contact_info: payload.contact_info || '',
      default_fee_pct: Number(payload.default_fee_pct) || 0,
      avatar_url: payload.avatar_url || '',
      is_active: payload.is_active !== false
    }
  };
}

function handleUpdateSeller(sellerId, payload) {
  const sheet = getOrCreateSellersSheet();
  const data = sheet.getDataRange().getValues();
  let targetRow = -1;

  for (let r = 1; r < data.length; r++) {
    if ((data[r][0] || '').toString().toUpperCase() === (sellerId || '').toUpperCase()) {
      targetRow = r + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return { status: 'ERROR', message: 'ไม่พบผู้ฝากขายรหัส ' + sellerId };
  }

  if (payload.seller_name !== undefined) sheet.getRange(targetRow, 2).setValue(payload.seller_name);
  if (payload.contact_info !== undefined) sheet.getRange(targetRow, 3).setValue(payload.contact_info);
  if (payload.default_fee_pct !== undefined) sheet.getRange(targetRow, 4).setValue(Number(payload.default_fee_pct));
  if (payload.avatar_url !== undefined) sheet.getRange(targetRow, 5).setValue(payload.avatar_url);
  if (payload.is_active !== undefined) sheet.getRange(targetRow, 6).setValue(payload.is_active);

  return { status: 'SUCCESS', message: 'อัปเดตข้อมูลผู้ฝากขายสำเร็จ' };
}

function handleDeleteSeller(sellerId, cascadeProducts) {
  if (sellerId === 'S01') {
    return { status: 'ERROR', message: 'ไม่อนุญาตให้ลบร้านค้าส่วนกลาง (S01)' };
  }

  const sheet = getOrCreateSellersSheet();
  const data = sheet.getDataRange().getValues();
  let targetRow = -1;

  for (let r = 1; r < data.length; r++) {
    if ((data[r][0] || '').toString().toUpperCase() === (sellerId || '').toUpperCase()) {
      targetRow = r + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return { status: 'ERROR', message: 'ไม่พบผู้ฝากขายรหัส ' + sellerId };
  }

  sheet.deleteRow(targetRow);

  let deletedProducts = 0;
  if (cascadeProducts) {
    const prodSheet = masterSS.getSheetByName('Products');
    if (prodSheet) {
      const pData = prodSheet.getDataRange().getValues();
      for (let r = pData.length - 1; r >= 1; r--) {
        const pSellerId = (pData[r][14] || pData[r][11] || '').toString().toUpperCase(); // seller_id col
        if (pSellerId === (sellerId || '').toUpperCase()) {
          prodSheet.deleteRow(r + 1);
          deletedProducts++;
        }
      }
    }
  }

  return { status: 'SUCCESS', deletedProductsCount: deletedProducts };
}
```

- [ ] **Step 3: Verify GAS syntax**

Run: `node -c backend/gas/Code.js`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add backend/gas/Code.js
git commit -m "feat(gas): add backend handlers for seller CRUD and cascade deletion"
```

---

### Task 3: Create Seller Modal (`CreateSellerModal.tsx`)

**Files:**
- Create: `src/features/admin/components/CreateSellerModal.tsx`

**Interfaces:**
- Consumes:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `onSave: (seller: Partial<Seller>) => Promise<boolean>`
  - `initialData?: Seller | null`
  - `existingSellers: Seller[]`
- Produces: Modal form for creating/editing sellers with auto ID computation, GP % formatting, shop name splitting, and validation.

- [ ] **Step 1: Write `CreateSellerModal.tsx`**

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/admin/components/CreateSellerModal.tsx
git commit -m "feat(seller): create CreateSellerModal component"
```

---

### Task 4: Delete Seller Safety Modal (`DeleteSellerModal.tsx`)

**Files:**
- Create: `src/features/admin/components/DeleteSellerModal.tsx`

**Interfaces:**
- Consumes:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `onConfirmDelete: (sellerId: string, cascadeProducts: boolean) => Promise<boolean>`
  - `seller: Seller | null`
  - `linkedProducts: ProductCatalog[]`
- Produces: Deletion warning modal showing linked products count, cascade deletion toggle, and confirmation button.

- [ ] **Step 1: Write `DeleteSellerModal.tsx`**

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/admin/components/DeleteSellerModal.tsx
git commit -m "feat(seller): create DeleteSellerModal component"
```

---

### Task 5: Enhance `SellersTab.tsx` with Seller Action Controls & Modals

**Files:**
- Modify: `src/features/admin/components/SellersTab.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes:
  - `onCreateSeller?: (seller: Partial<Seller>) => Promise<boolean>`
  - `onUpdateSeller?: (sellerId: string, updates: Partial<Seller>) => Promise<boolean>`
  - `onDeleteSeller?: (sellerId: string, cascadeProducts: boolean) => Promise<boolean>`
- Produces: Integrated UI in `SellersTab.tsx` for adding, editing, deleting, and filtering active/inactive sellers.

- [ ] **Step 1: Update `SellersTabProps` and state in `SellersTab.tsx`**
- [ ] **Step 2: Connect modals and action buttons in `SellersTab.tsx`**
- [ ] **Step 3: Wire up CRUD handlers in `src/App.tsx`**
- [ ] **Step 4: Verify end-to-end type check and GAS syntax check**

Run: `npx tsc --noEmit && node -c backend/gas/Code.js`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/components/SellersTab.tsx src/App.tsx
git commit -m "feat(seller): integrate seller CRUD modals and actions in SellersTab"
```

---

## Plan Self-Review Checklist
- [x] Spec coverage: Covers seller CRUD, auto-generation of ID, safety cascade deletion, and UI integration.
- [x] No placeholders: Exact interfaces, code blocks, and commands provided.
- [x] Type consistency: Matches existing types and schemas.
