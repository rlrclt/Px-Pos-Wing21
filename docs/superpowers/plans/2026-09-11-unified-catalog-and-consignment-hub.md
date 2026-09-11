# แผนการพัฒนา: รวมหน้าแคตตาล็อกสินค้าและผู้ฝากขายเป็นหน้าเดียว (Unified Catalog & Consignment Hub)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างหน้าคอมโพเนนต์ใหม่ `CatalogHubTab.tsx` ที่รวมทุกฟังก์ชันและฟีเจอร์ของ `ProductsTab.tsx` (จัดการสินค้า, Multi-UOM, สต็อก, นำเข้า/ส่งออก) และ `SellersTab.tsx` (จัดการผู้ฝากขาย, ค่าธรรมเนียม GP, เจาะลึกสต็อกรายร้าน) เข้าด้วยกันอย่างสมบูรณ์แบบ โดย**ห้ามลบหรือแก้ไขไฟล์เดิม `ProductsTab.tsx` และ `SellersTab.tsx`**

**Architecture:** สร้างคอมโพเนนต์ Hub ระดับ Enterprise ที่มี Sub-views 3 มุมมอง (1. แคตตาล็อกสินค้าทั้งหมดพร้อมตัวกรองร้านค้า, 2. บอร์ดผู้ฝากขายและการเจาะลึกสต็อกรายร้านค้า, 3. สรุปวิเคราะห์มูลค่าและส่วนแบ่ง GP) พร้อมแถบการทำงานแบบรวมศูนย์ (Unified Action Toolbar) ที่เข้าถึง Modal ทั้งหมดได้ทันที

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide React Icons, Zustand

**Spec / Requirements Reference:**
- ไฟล์เดิม (อ่านเพื่อเทียบเคียงเท่านั้น ห้ามแก้ไข): `src/features/admin/components/ProductsTab.tsx` และ `src/features/admin/components/SellersTab.tsx`
- ไฟล์สร้างใหม่: `src/features/admin/components/CatalogHubTab.tsx`

---

## Global Constraints
- ❌ **ห้ามลบหรือแก้ไขไฟล์ `src/features/admin/components/ProductsTab.tsx` และ `src/features/admin/components/SellersTab.tsx`**
- ❌ **ห้ามรัน `npm run build` หรือ `npm test`**
- ✅ **คำสั่งตรวจสอบความถูกต้อง:** `npx tsc --noEmit && node -c backend/gas/Code.js` (ต้องผ่าน 0 errors 100%)
- 🛡️ **Master Seller S01:** ต้องคงกฎป้องกันการลบร้านค้าหลัก S01 เสมอ
- 🎨 **Theme & Styling:** รองรับทั้ง Enterprise Light และ Tactical Dark ผ่าน `useTheme()`

---

## File Structure Map
- **สร้างใหม่:** `src/features/admin/components/CatalogHubTab.tsx`
  - มี Sub-views ให้ผู้ใช้สลับได้ตามความถนัด:
    1. `products` - มุมมองสินค้าทั้งหมด (All Products Catalog): รวมระบบค้นหา, ตัวกรองหมวดหมู่, ตัวกรองสถานะสต็อก, ตัวกรองร้านค้าผู้ฝากขาย, แสดง Multi-UOM Pack/Carton, ปุ่ม Action (เพิ่มสินค้า, รับเข้า, นำเข้า Excel, Template, ประวัติรับเข้า)
    2. `sellers` - มุมมองผู้ฝากขาย (Consignment Sellers Board): การ์ดร้านค้า Bento Grid, สถิติจำนวนชิ้น/มูลค่าทุน/มูลค่าขาย, ปุ่มสร้าง/แก้ไข/ลบผู้ฝากขาย, การกดคลิกเจาะลึก (Drill-down) สู่คลังสินค้าเฉพาะร้านค้านั้น
    3. `analytics` - มุมมองวิเคราะห์สต็อกและ GP (Combined Analytics): กราฟสรุปสัดส่วนมูลค่าสต็อกตามหมวดหมู่ และสัดส่วนสินค้า/สต็อกแยกตามผู้ฝากขาย

---

## Tasks Decomposition

### Task 1: กำหนด Props Interface และ State Architecture สำหรับ `CatalogHubTab.tsx`
**Files:**
- Create: `src/features/admin/components/CatalogHubTab.tsx`

**Interfaces:**
- Consumes:
  - `ProductCatalog`, `Seller`, `ProductUOMConversion`, `DriveFolder` from `src/types/schema.ts`
  - `useTheme` from `src/hooks/useTheme.ts`
  - `useToast` from `src/hooks/useToast.ts`
  - `CreateSellerModal`, `DeleteSellerModal`, `AdminSectionHeader`, `AdminStatCard`
- Produces:
  - `CatalogHubTabProps`
  - `CatalogHubTab: React.FC<CatalogHubTabProps>`

- [ ] **Step 1: กำหนด Interface ครบทุก Props ของทั้ง 2 หน้า**
```typescript
export interface CatalogHubTabProps {
  products: ProductCatalog[];
  sellers: Seller[];
  isLoading?: boolean;
  productSearch?: string;
  onSearchChange?: (search: string) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (cat: string) => void;
  onOpenAddProduct: () => void;
  onOpenEditProduct: (product: ProductCatalog) => void;
  onOpenDeleteProduct?: (product: ProductCatalog) => void;
  onOpenStockIn: (barcode?: string) => void;
  onOpenImportHub: () => void;
  onOpenDownloadTemplate: () => void;
  onOpenStockInHistory?: () => void;
  onOpenProductHistory?: (product: ProductCatalog) => void;
  onOpenSellerHistory?: (sellerId: string) => void;
  onCreateSeller?: (seller: Partial<Seller>) => Promise<boolean>;
  onUpdateSeller?: (sellerId: string, updates: Partial<Seller>) => Promise<boolean>;
  onDeleteSeller?: (sellerId: string, cascadeProducts: boolean) => Promise<boolean>;
  driveFolders?: DriveFolder[];
  liveUOMs?: ProductUOMConversion[];
}
```

- [ ] **Step 2: รันคำสั่งตรวจสอบความถูกต้อง**
```bash
npx tsc --noEmit && node -c backend/gas/Code.js
```

---

### Task 2: รวมระบบสถิติ KPI รวมและตัวกรองอัจฉริยะ (Combined Stats & Smart Filtering)
**Files:**
- Modify: `src/features/admin/components/CatalogHubTab.tsx`

**Details:**
- รวมการคำนวณ:
  - `overallStats`: สินค้าทั้งหมด, ยอดสต็อกรวม, มูลค่าขายรวม, มูลค่าทุนรวม, สินค้าใกล้หมด (Low Stock), สินค้าหมด (Out of Stock), จำนวนผู้ฝากขาย
  - `sellerStatsMap`: คำนวณสต็อกและมูลค่าของแต่ละร้านค้าแบบ Real-time
  - `uomMap`: เชื่อมโยง Multi-UOM Conversions กับ Base Barcode เพื่อแสดงหน่วยแพ็ค/ลัง
- รวมตัวกรอง:
  - ค้นหาด้วย บาร์โค้ด / ชื่อสินค้า / หมวดหมู่ / ชื่อร้านค้า
  - ตัวกรองสถานะสต็อก (`all`, `in-stock`, `low-stock`, `out-of-stock`)
  - ตัวกรองหมวดหมู่สินค้า
  - ตัวกรองร้านค้าผู้ฝากขาย (Seller Filter Dropdown / Pills)

- [ ] **Step 1: เขียน Logic Memoized Stats & Filtered Data**
- [ ] **Step 2: รันคำสั่งตรวจสอบความถูกต้อง**
```bash
npx tsc --noEmit && node -c backend/gas/Code.js
```

---

### Task 3: สร้างมุมมอง "แคตตาล็อกสินค้าทั้งหมด (All Products Catalog)" พร้อมฟังก์ชัน Multi-UOM
**Files:**
- Modify: `src/features/admin/components/CatalogHubTab.tsx`

**Details:**
- รองรับการสลับมุมมอง Table View (ตารางความละเอียดสูง) และ Grid/Tiles View (การ์ดพร้อมรูปภาพ)
- แสดง Thumbnail รูปสินค้า, ป้ายชื่อร้านค้าผู้ฝากขาย (คลิกเพื่อกรองร้านค้านั้นได้ทันที), ป้าย Multi-UOM (แพ็ค/ลัง), ราคาขาย, ราคาทุน, GP %, จำนวนสต็อกคงเหลือพร้อมแถบสีเตือน
- ปุ่ม Action ครบถ้วนบนแต่ละแถว/การ์ด:
  - 📥 รับเข้าสต็อกสินค้านี้ (`onOpenStockIn(barcode)`)
  - ✏️ แก้ไขข้อมูลสินค้า (`onOpenEditProduct(product)`)
  - 📜 ประวัติสินค้า (`onOpenProductHistory(product)`)
  - 🗑️ ลบสินค้า (`onOpenDeleteProduct(product)`)

- [ ] **Step 1: พัฒนา Table View & Grid View สำหรับแคตตาล็อกสินค้า**
- [ ] **Step 2: พัฒนาระบบ Pagination (แบ่งหน้าแสดงผล)**
- [ ] **Step 3: รันคำสั่งตรวจสอบความถูกต้อง**
```bash
npx tsc --noEmit && node -c backend/gas/Code.js
```

---

### Task 4: สร้างมุมมอง "ผู้ฝากขายและการเจาะลึกสต็อก (Consignment Sellers & Drill-Down)"
**Files:**
- Modify: `src/features/admin/components/CatalogHubTab.tsx`

**Details:**
- การ์ดผู้ฝากขาย (Seller Bento Cards):
  - Avatar / รูปโปรไฟล์ร้านค้า
  - ข้อมูลติดต่อ & รหัสร้านค้า (S01, S02, ...) พร้อม Badge ป้องกันร้าน Master S01
  - ค่าธรรมเนียมสวัสดิการ (Default Fee / GP %)
  - สรุป: จำนวนรายการสินค้า, จำนวนชิ้นในสต็อก, มูลค่าทุนรวม, มูลค่าขายรวม
  - ปุ่มแก้ไขผู้ฝากขาย, ปุ่มลบผู้ฝากขาย (เปิด DeleteSellerModal), ปุ่มดูประวัติยอดขาย
  - ปุ่ม "📦 ดูคลังสินค้าของร้านนี้" สำหรับ Drill-down
- หน้าจอ Drill-Down เมื่อเลือกดูเฉพาะร้านค้า:
  - แถบ Breadcrumb: `ย้อนกลับหน้าร้านค้าทั้งหมด` / `[ชื่อร้านค้า]`
  - Banner สรุปยอดของร้านค้าที่เลือก
  - ตารางสินค้าเฉพาะของร้านค้านั้น พร้อมปุ่ม Action ครบถ้วน

- [ ] **Step 1: พัฒนาการ์ดร้านค้า Bento Grid และปุ่มจัดการ Seller CRUD**
- [ ] **Step 2: พัฒนาระบบ Drill-Down ดูเฉพาะสินค้าของร้านค้านั้น**
- [ ] **Step 3: รันคำสั่งตรวจสอบความถูกต้อง**
```bash
npx tsc --noEmit && node -c backend/gas/Code.js
```

---

### Task 5: สร้างมุมมอง "วิเคราะห์สต็อกและสัดส่วน GP (Consignment & Inventory Analytics)"
**Files:**
- Modify: `src/features/admin/components/CatalogHubTab.tsx`

**Details:**
- แสดงกราฟและสัดส่วนมูลค่าสต็อกตามหมวดหมู่ (Category Distribution)
- แสดงสัดส่วนมูลค่าสต็อกและสินค้าตามผู้ฝากขาย (Seller Valuation Breakdown)
- แสดงตารางสรุป Margin & Profit Potential (กำไรส่วนต่างที่คาดการณ์ได้)

- [ ] **Step 1: พัฒนามุมมอง Analytics พร้อม Visual Bar & Breakdown Tables**
- [ ] **Step 2: รันคำสั่งตรวจสอบความถูกต้อง**
```bash
npx tsc --noEmit && node -c backend/gas/Code.js
```

---

### Task 6: รวบรวมและตรวจสอบความถูกต้องสมบูรณ์ (Final Assembly & Verification)
**Files:**
- Verify: `src/features/admin/components/CatalogHubTab.tsx`
- Ensure untouched: `src/features/admin/components/ProductsTab.tsx`, `src/features/admin/components/SellersTab.tsx`

- [ ] **Step 1: ตรวจสอบความครบถ้วนของทุกฟีเจอร์และ Modal Integration**
- [ ] **Step 2: รันคำสั่งตรวจสอบ Type & Syntax**
```bash
npx tsc --noEmit && node -c backend/gas/Code.js
```
- [ ] **Step 3: ตรวจสอบ Git Status เพื่อยืนยันว่า `ProductsTab.tsx` และ `SellersTab.tsx` ไม่มีการเปลี่ยนแปลงหรือถูกลบ**
```bash
git status -s
```
