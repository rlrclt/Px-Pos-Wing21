# Knowledge Transfer: DEEP RESEARCH ➡️ SANDBOX CODER

**ถึงห้อง 2 (SANDBOX CODER):**
นี่คือสรุปข้อมูลโครงสร้างและบริบททั้งหมดของโปรเจกต์ "ระบบ POS และบัญชีสวัสดิการ กองบิน 21" ที่คุณต้องใช้ในการเขียนโค้ดฟีเจอร์ถัดไป (เช่น Stock Write-Off หรือ Offline Sync)

---

## 1. Tech Stack & Rules ⚠️
- **Frontend:** React 19, TypeScript, Tailwind CSS, Vite
- **Backend:** Google Apps Script (V8) + Google Sheets เป็น Database
- **Rule of Death:** ❌ **ห้ามรัน `npm run build` หรือ `npm test` เด็ดขาด** ❌
- **Verification:** ใช้เฉพาะ `npx tsc --noEmit` เพื่อเช็ค Type เท่านั้น
- **Coding Style:** Clean Enterprise Modular (`src/features/...`) ห้ามเขียนรวมใน `App.tsx`

---

## 2. Database Schema (Google Sheets)
ฐานข้อมูลหลัก (Hub) อยู่ที่ Master Sheet (ID: `1FcMRDGqRBjUaCm4yTvuE8l6ehLm879Zbwtur5ad9OU4`)
*   `Product_Catalog`: ข้อมูลสินค้าหลัก `[barcode, product_name, image_url, ...]`
*   `Product_UOM_Conversions`: ระบบแพ็คเกจ `[conversion_id, barcode, base_barcode, unit_name, conversion_factor, selling_price]`
*   `Inventory_Stocks`: สต็อกกลาง `[barcode, stock_qty, cost_price, seller_id, low_stock_threshold]`
*   `Stock_In_Logs`: ประวัติรับเข้า `[log_id, barcode, quantity_added, cost_price_unit, total_cost, seller_id, received_by, received_at, invoice_ref]`
*   **NEXT STEP:** ถ้าคุณทำฟีเจอร์ "ตัดจำหน่าย" จะต้องใช้ชีต `Stock_Write_Off_Logs`

---

## 3. Data Flow & Integration Patterns
1. **Frontend Proxy:** ยิง API ผ่าน `api.ts` `this.getProxyUrl()` (`/api/gas`) เพื่อแก้ปัญหา CORS
2. **Backend Routing:** ที่ไฟล์ `backend/gas/Code.js` ใช้โครงสร้าง:
   - `doGet(e)`: ใช้ `switch(e.parameter.action)`
   - `doPost(e)`: ใช้ `switch(payload.action)`
3. **Product Resolution:** สินค้าทุกชิ้นที่สแกนด้วยบาร์โค้ด จะต้องวิ่งไปหา `base_barcode` ผ่านตาราง UOM เสมอ เพื่อให้การตัด/เพิ่มสต็อกไปรวมที่สินค้าแม่ (Base Item)

---

## 4. สิ่งที่ทำเสร็จแล้ว (ห้ามทำซ้ำ/ไปพังของเดิม)
- ระบบนำเข้าสินค้า / แก้ไขราคาทุน (หน้า Admin > ProductsTab)
- หน้าต่างรับของเข้าคลัง (Stock-In) มีระบบบวกสต็อก Atomic และสร้าง Invoice_ref อัตโนมัติ
- หน้าต่างตรวจสอบประวัติ (Audit Trail) แยกตามสินค้า และหน้าต่างรวมทั้งระบบ (Filter ได้)
- ระบบสร้างผลัดทหาร (Batch Sharding) ที่จะ Clone Spreadsheet ใหม่เข้า Google Drive อัตโนมัติ

---
**จบการถ่ายทอดข้อมูล — DEEP RESEARCH (Room 1)**
