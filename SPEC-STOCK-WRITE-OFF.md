# Feature Specification: ตัดจำหน่ายสินค้า (Stock Write-Off)

**จาก:** ห้อง 1 (DEEP RESEARCH)
**ถึง:** ห้อง 2 (SANDBOX CODER)

ฟีเจอร์ต่อไปคือ **"ระบบตัดจำหน่ายสินค้าชำรุด/หมดอายุ (Stock Write-Off)"** เพื่อใช้ลบสต็อกที่เสียหายออกจากคลัง และเก็บประวัติไว้ใน `Stock_Write_Off_Logs` โดยโครงสร้างจะคล้ายกับ `StockInModal` แต่เป็นการนำยอด "ออก"

---

## 1. Backend (Google Apps Script - `backend/gas/Code.js`)

**สร้างฟังก์ชันใหม่:** `handleStockWriteOff(payload)`
**ตารางเป้าหมาย:** `Inventory_Stocks` (อัปเดตลดยอด) และ `Stock_Write_Off_Logs` (เพิ่มแถวประวัติ)
**Schema ของ `Stock_Write_Off_Logs`:** 
`['log_id', 'barcode', 'quantity_removed', 'cost_price_unit', 'total_loss', 'reason', 'seller_id', 'written_off_by', 'written_off_at']`

**ลอจิกการทำงาน:**
1. ค้นหาสินค้าจาก `Product_Catalog` และ `Product_UOM_Conversions` (แปลงบาร์โค้ดย่อยให้เป็นแพ็คแม่ เหมือนตอน Stock-In)
2. เช็คสต็อกปัจจุบันใน `Inventory_Stocks` (ต้องมีพอให้ตัด ไม่ให้ตัดจนสต็อกติดลบ หรือถ้าติดลบได้ให้ขึ้น warning)
3. อัปเดตลบสต็อก `stock_qty = stock_qty - (quantity_removed * conversion_factor)`
4. บันทึกประวัติลง `Stock_Write_Off_Logs` (แนบเหตุผล `reason` และผู้ทำรายการ `written_off_by`)
5. ส่งผลลัพธ์กลับ `status: 'SUCCESS'` พร้อมข้อมูลสินค้าล่าสุด

---

## 2. Types & API (`src/types/schema.ts` และ `src/core/api.ts`)

**Schema เพิ่มเติม:**
```typescript
export interface StockWriteOffPayload {
  action: 'stockWriteOff';
  barcode: string; // บาร์โค้ดที่สแกน
  quantity: number; // จำนวนที่ต้องตัด
  reason: string; // สาเหตุ เช่น 'ชำรุด', 'หมดอายุ', 'สูญหาย'
  user_id: string; // ใครเป็นคนตัด (อ่านจากระบบ login ปัจจุบัน)
}
```
**API Method เพิ่มเติมใน `PXApiClient`:**
- `stockWriteOff(payload)` -> ยิง POST ไปที่ `/api/gas`

---

## 3. Frontend UI (`src/features/inventory/components/StockWriteOffModal.tsx`)

สร้าง Modal สำหรับทำรายการตัดจำหน่าย โดยล้อ Layout มาจาก `StockInModal.tsx`:
1. **การค้นหา:** ช่องกรอก/สแกนบาร์โค้ด
2. **ข้อมูลสินค้า (Live Preview):** แสดงรูป ชื่อ สต็อกคงเหลือปัจจุบัน (อัปเดตทันทีที่สแกนเจอ)
3. **ฟอร์มกรอกการตัดจำหน่าย:**
   - **จำนวนที่ตัด:** (ตัวเลข)
   - **สาเหตุ:** (Dropdown: สินค้าชำรุด/แตกหัก, สินค้าหมดอายุ, สินค้าสูญหาย, อื่นๆ)
   - **หมายเหตุเพิ่มเติม:** (Text input)
4. **Validation:** 
   - ปุ่ม Submit จะกดได้ก็ต่อเมื่อ "จำนวนที่ตัด <= สต็อกคงเหลือ" (กรณีสต็อกจริงมีจำกัด)
5. **การแจ้งเตือน:** เมื่อสำเร็จโชว์ Toast "ตัดจำหน่ายสินค้า [ชื่อสินค้า] จำนวน X สำเร็จ"

---

## 4. UI Integration

- ไปที่ `src/features/admin/components/ProductsTab.tsx`
- เพิ่มปุ่มไอคอน 🗑️ หรือ 📉 ข้างๆ ปุ่ม History (ในแต่ละแถวของตาราง) พร้อม tooltip "ตัดจำหน่ายสินค้า"
- เชื่อมต่อ State การเปิด Modal ไว้ที่ `AdminView.tsx` (เหมือนที่ทำกับ `StockInHistoryModal`)

---

**คำแนะนำสำหรับห้อง 2:**
1. กรุณาใช้คำสั่ง `npx tsc --noEmit` ทันทีที่เขียน Frontend และ Type เสร็จ
2. ระวังตอนเขียน `Code.js` ต้องไม่มี Error ไวยากรณ์
3. ลุยได้เลย!
