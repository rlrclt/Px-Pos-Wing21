# Enterprise POS System & Party Split Bill Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** พัฒนาระบบหน้าขายหน้าร้าน (POS System) ครบวงจรตามเอกสาร `ออกแบบระบบและโฟลว์ PX ทหารใหม่.pdf`:
1. **Flow การขาย:** เลือก/ค้นหาทหารผู้ซื้อหลักก่อน (ค้นหาด้วยรหัส PX, ชื่อ-สกุล หรือเลขบัตรประชาชน 13 หลัก) พร้อมแสดงรูปถ่าย, สังกัดร้อย/หมวด, วงเงินสวัสดิการ และยอดเครดิตคงเหลือ Real-time
2. **Category Horizontal Slider & Product Catalog Grid:** แถบหมวดหมู่สินค้าด้านบนสไลด์เลื่อนเลือกหมวดหมู่ได้แบบ Smooth พร้อมตารางรายการสินค้า/รูปปก/สต็อก/ราคา/หน่วยนับ และช่องยิงสแกนบาร์โค้ดสินค้า
3. **Cart & Multi-UOM Pack & Consignment Seller Display:** ตะกร้าสินค้าแสดงรายละเอียดผู้ฝากขาย, คำนวณราคา, จำนวน และตัดสต็อกสินค้าหลักอัตโนมัติ
4. **Party Split Bill (ระบบหารบิลตั้งปาร์ตี้ซื้อของ):** รองรับ 3 รูปแบบการหาร (หารเท่ากัน Equal, กำหนดจำนวนเงินเอง Custom Amount, ระบุเปอร์เซ็นต์ Percentage Split) พร้อมปัดเศษสตางค์เข้า Host + เลือกวิธีจ่ายอิสระ (หักเครดิต / เงินสด / สแกนโอน QR พร้อมปุ่มยืนยันเงินเข้า) + Validation Check รวมครบ 100%
5. **E-Slip (สลิปอิเล็กทรอนิกส์):** ออกสลิปดิจิทัลแจกแจงรายการสินค้าและแจกแจงการหารบิลรายบุคคล พร้อมปุ่มเสร็จสิ้นรับคิวถัดไป

**Architecture:**
- **State Management (`usePosStore.ts`):** ปรับปรุง Zustand POS Store ให้รองรับ Primary Buyer, Party Participants, Split Calculation, Real-time Validation, และ E-Slip generation
- **POS Screen Core (`src/features/pos/`):**
  - `PosView.tsx`: หน้าจอหลัก POS แบบ Split-View (ซ้าย: ข้อมูลผู้ซื้อ & ตารางสินค้า/หมวดหมู่สไลด์, ขวา: ตะกร้า & สรุปยอด & ปุ่มเปิด Party)
  - `components/SoldierSelectorModal.tsx`: หน้าต่างค้นหา/เลือกทหาร (ค้นหาด้วย PX Code, ชื่อ, เลขบัตร 13 หลัก)
  - `components/CategorySlider.tsx`: แถบสไลด์หมวดหมู่สินค้าแนวนอน
  - `components/ProductGrid.tsx`: ตารางการ์ดสินค้าพร้อมรูปภาพ สต็อก และปุ่มเลือกหน่วยนับ (Multi-UOM)
  - `components/PartySplitModal.tsx`: หน้าต่างจัดการหารบิลปาร์ตี้ (เพิ่มเพื่อน, เลือก 3 โหมดหาร, กำหนดวิธีจ่ายรายคน, ตรวจสอบ Validation 100%)
  - `components/ESlipModal.tsx`: หน้าต่างสลิปอิเล็กทรอนิกส์
- **Routing & Navigation:** เพิ่ม Route `/pos` ใน `RoutePath`, `App.tsx`, `Header.tsx`, และ `AdminSidebar.tsx`

**Tech Stack:** React 19, TypeScript, Zustand, Tailwind CSS, Framer Motion, Lucide React, Google Apps Script API.

---

### Task 1: Update Schema & UI Routing for POS View

**Files:**
- Modify: `src/types/ui.ts` (add `'/pos'` to `RoutePath` and `'pos'` to `AdminTab`)
- Modify: `src/types/schema.ts` (ensure Split Types & Order Interfaces match PDF)
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/features/admin/components/AdminSidebar.tsx`
- Modify: `src/features/users/components/UserCard.tsx`

- [ ] **Step 1: Update `src/types/ui.ts`**
Add `'/pos'` to `RoutePath` and `'pos'` to `AdminTab`.

- [ ] **Step 2: Add POS Navigation buttons to `Header.tsx`, `AdminSidebar.tsx`, and `UserCard.tsx`**

- [ ] **Step 3: Run `npx tsc --noEmit` and confirm 0 errors**

---

### Task 2: Enhance `usePosStore.ts` with Party Split Math & Validation

**Files:**
- Modify: `src/store/usePosStore.ts`

**Interfaces:**
- `PartyParticipant`: `{ soldier: Soldier; splitType: 'EQUAL' | 'FIXED' | 'PERCENT'; amountAssigned: number; percentage: number; paymentMethod: 'CREDIT' | 'CASH' | 'TRANSFER'; transferConfirmed: boolean; cashReceived?: number; cashChange?: number; isPaid: boolean; }`
- Calculation logic: Auto-allocate remainder pennies to Host (Primary Buyer) to ensure sum matches 100% of `netPayable`.

- [ ] **Step 1: Update `usePosStore.ts` types and state handlers**
Implement:
- `setPrimaryBuyer(soldier)`
- `addPartyParticipant(soldier)`
- `removePartyParticipant(px_code)`
- `updatePartySplitType(mode: 'EQUAL' | 'FIXED' | 'PERCENT')`
- `updateParticipantAmount(px_code, amount)`
- `updateParticipantPercentage(px_code, pct)`
- `updateParticipantPayment(px_code, method, transferConfirmed, cashReceived)`
- `recalculateSplits()`: Auto-balances cents to Host on Equal/Percent split.

- [ ] **Step 2: Run `npx tsc --noEmit` and confirm 0 errors**

---

### Task 3: Build Soldier Selector Modal & Quick Search

**Files:**
- Create: `src/features/pos/components/SoldierSelectorModal.tsx`

**Interfaces:**
- Consumes: `soldiers: Soldier[]`, `onSelectSoldier: (s: Soldier) => void`, `isOpen: boolean`, `onClose: () => void`
- Features: Instant search filter by:
  1. `px_code` (e.g. `691042`)
  2. `full_name` (e.g. `สมชาย สายลม`)
  3. `national_id` (13 digits e.g. `14099...`)
  4. Unit / Company badge & photo avatar display
  5. Status check: Alert if soldier is `SUSPENDED` or `DISCHARGED`

- [ ] **Step 1: Create `src/features/pos/components/SoldierSelectorModal.tsx`**
- [ ] **Step 2: Run `npx tsc --noEmit` and verify**

---

### Task 4: Build Category Horizontal Slider & Product Catalog Grid

**Files:**
- Create: `src/features/pos/components/CategorySlider.tsx`
- Create: `src/features/pos/components/ProductGrid.tsx`

**Interfaces:**
- `CategorySlider.tsx`: Drag/scrollable horizontal pill tabs for `ALL`, `เครื่องดื่ม`, `ขนม`, `ของใช้ส่วนตัว`, `อาหารแห้ง`, `SERVICE`, etc.
- `ProductGrid.tsx`: Modern Bento product cards showing cover image, selling price, remaining stock badge, seller name, and quick UOM pack dropdown button.

- [ ] **Step 1: Create `CategorySlider.tsx` with Framer Motion animated active pill**
- [ ] **Step 2: Create `ProductGrid.tsx` with search & category filtering, out-of-stock disable, and quick add-to-cart**
- [ ] **Step 3: Run `npx tsc --noEmit` and verify**

---

### Task 5: Build Party Split Bill Modal & E-Slip Dialog

**Files:**
- Create: `src/features/pos/components/PartySplitModal.tsx`
- Create: `src/features/pos/components/ESlipModal.tsx`

**Interfaces:**
- `PartySplitModal.tsx`:
  - 3 split modes: (•) หารเท่าทุกคน ( ) ระบุจำนวนเงินเอง ( ) ระบุสัดส่วน (%)
  - Search & add party members by PX Code / Name
  - Per-participant payment method:
    - `CREDIT`: Check `current_balance >= amount` Real-time
    - `CASH`: Input cash received, auto-calc change
    - `TRANSFER`: Show Bank QR Code + "ตรวจสอบยอดเข้าแล้ว" confirmation checkbox
  - Validation Bar: `ยอดบิลสุทธิ == ยอดที่จัดสรรแล้ว` (ครบถ้วน 100%) ถึงจะเปิดปุ่มบันทึก
- `ESlipModal.tsx`:
  - E-Slip layout matching page 5 & 6 in PDF with TxID, Date, Cashier, Item breakdown, Party breakdown, and Next Customer button.

- [ ] **Step 1: Create `src/features/pos/components/PartySplitModal.tsx`**
- [ ] **Step 2: Create `src/features/pos/components/ESlipModal.tsx`**
- [ ] **Step 3: Run `npx tsc --noEmit` and verify**

---

### Task 6: Assemble Complete `PosView.tsx` & App Routing Integration

**Files:**
- Create: `src/features/pos/PosView.tsx`
- Modify: `src/App.tsx` (wire `/pos` route)

**Interfaces:**
- Full screen POS terminal with barcode keyboard scanner listener (enter key trigger), active cashier status, quick buyer selector, category slider, product grid, cart sidebar, party split trigger, and order completion.

- [ ] **Step 1: Create `src/features/pos/PosView.tsx`**
- [ ] **Step 2: Update `src/App.tsx` to mount `PosView` under `/pos`**
- [ ] **Step 3: Run `npx tsc --noEmit` and confirm 0 errors**

---

### Task 7: Full System Verification & Validation

- [ ] **Step 1: Execute `npx tsc --noEmit`**
- [ ] **Step 2: Verify End-to-End POS Flow (Buyer select -> Category slider -> Product select -> Party split -> E-Slip)**
