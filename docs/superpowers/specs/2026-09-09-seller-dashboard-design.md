# Design Spec: Seller Inventory Dashboard (ผู้ฝากขาย)

**Date:** 2026-09-09
**Status:** Approved for Implementation
**Author:** DEEP RESEARCH (ai-research)

## 1. Overview & Goals
สร้างเมนูแท็บใหม่ในหน้า Admin เพื่อให้ผู้ดูแลระบบสามารถดูภาพรวมของผู้ฝากขาย (Sellers) ทั้งหมด พร้อมสถิติสินค้าคงคลัง (จำนวนรายการ, จำนวนชิ้น, มูลค่าทุน) และสามารถคลิกเจาะลึก (Drill-down) เพื่อดูและจัดการรายการสินค้าเฉพาะของ Seller รายนั้นๆ ได้โดยตรง 

ระบบนี้ใช้แนวทาง **Local In-Memory Calculation** เพื่อให้เปลี่ยนหน้าได้รวดเร็ว โดยดึงข้อมูลจาก `liveSellers` และ `liveProducts` ที่โหลดมาเตรียมไว้แล้ว ไม่ต้องยิง API ใหม่

---

## 2. Architecture & File Changes

### 2.1 `src/types/ui.ts`
- อัปเดต `AdminTab` ให้รองรับแท็บใหม่
```typescript
export type AdminTab = 'welfare' | 'batches' | 'folders' | 'products' | 'import' | 'sellers';
```

### 2.2 `src/features/admin/AdminView.tsx`
- **Navigation:** เพิ่มปุ่ม "🏪 ผู้ฝากขาย" ลงใน Navigation menu bar ของหน้า Admin (ถัดจาก 'สินค้า')
- **Routing/Rendering:** เมื่อ `activeTab === 'sellers'` ให้ render คอมโพเนนต์ `<SellersTab />`
- **Props to Pass:** ส่ง `liveSellers`, `liveProducts`, `onOpenEditProduct`, `onOpenProductHistory` และ `onOpenStockIn`

### 2.3 `src/features/admin/components/SellersTab.tsx` (สร้างไฟล์ใหม่)
นี่คือ Component หลักที่ดูแล State การแสดงผล 2 โหมด
```typescript
interface SellersTabProps {
  sellers: Seller[];
  products: ProductCatalog[];
  onOpenEditProduct: (product: ProductCatalog) => void;
  onOpenProductHistory?: (product: ProductCatalog) => void;
  onOpenStockIn: (barcode?: string) => void;
}
```

---

## 3. Data Processing & Logic

ภายใน `<SellersTab />` จะต้องคำนวณข้อมูลแบบ On-the-fly:
1. **Fallback (กองกลาง):** สินค้าที่ `seller_id` เป็นค่าว่าง หรือหาไม่เจอใน `sellers` ให้กรุ๊ปเป็น "🏢 สินค้าส่วนกลาง (ไม่มีผู้ฝากขาย)" เพื่อไม่ให้ข้อมูลตกหล่น
2. **Aggregation:**
   วนลูปสร้าง `sellerStats` Array ที่มีโครงสร้างดังนี้:
   ```typescript
   {
     sellerInfo: Seller | null; // null หมายถึง กองกลาง
     totalUniqueProducts: number;
     totalStockQty: number;
     totalCostValue: number; // sum(cost_price * stock_qty)
     products: ProductCatalog[];
   }
   ```

---

## 4. UI / UX Design

### โหมด A: Seller List Grid (เมื่อ `selectedSeller === null`)
- **Header:** ชื่อแท็บ "สรุปข้อมูลผู้ฝากขาย (Consignment Dashboard)"
- **Grid Layout:** ใช้ CSS Grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- **Card Design:**
  - รูป Avatar หรืออักษรย่อชื่อ
  - ชื่อผู้ฝากขาย + เบอร์ติดต่อ
  - ตัวเลข KPI: 
    - 📦 `X` รายการสินค้า
    - 📊 สต็อกรวม `Y` ชิ้น
    - 💰 มูลค่าทุนรวม `Z` บาท
  - ปุ่ม "ดูรายการสินค้า ➔"

### โหมด B: Drill-down Product List (เมื่อ `selectedSeller !== null`)
- **Header:** 
  - ปุ่มกดย้อนกลับ "← กลับไปหน้ารวม"
  - ป้ายแสดงชื่อผู้ฝากขาย
- **Table / List:**
  - นำโครงสร้างตารางคล้ายๆ `ProductsTab` มาใช้ แต่ไม่ต้องมีตัวกรอง Category
  - ช่องค้นหา (Search Box) สำหรับกรองชื่อสินค้า/บาร์โค้ด
  - ตารางแสดงคอลัมน์: รหัส/ชื่อสินค้า, หมวดหมู่, ราคาทุน, ราคาขาย, สต็อกคงเหลือ
  - **Action Buttons:** ดึงฟังก์ชัน `Edit` (แก้ไขสินค้า), `History` (ประวัติรับเข้า), และ `Stock In` (รับเข้าเพิ่ม) มาแสดงที่ท้ายแถวแต่ละบรรทัด เพื่อให้ทำงานจบในหน้าเดียว

---

## 5. Global Constraints & Review
- ไม่มี Mock Data เด็ดขาด ข้อมูลต้องคำนวณจาก Props เท่านั้น
- เขียน Component ให้อยู่ในโครงสร้าง Tailwind CSS ตาม Theme (Dark/Light) ปัจจุบัน
- **Validation:** ตรวจสอบความถูกต้องด้วย `npx tsc --noEmit` ต้องไม่มี Type error
