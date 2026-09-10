# 🧠 PX หน่วยฝึกทหารใหม่ พัน.อย.บน.21 — Ultra-Deep Master Knowledge Base & Context Cache

> **เอกสารส่งต่อบริบทความจำแคชและองค์ความรู้ระดับสถาปัตยกรรมเชิงลึก (High-Resolution System Memory Cache)**
> เอกสารนี้บันทึกข้อมูลทุกมิติของโปรเจกต์: Business Rules, Database Schema, Data Flow, State Management, API Endpoints, UI/UX Guidelines, และประวัติการพัฒนาย้อนหลัง เพื่อให้ AI ทุกตัวสามารถทำงานต่อได้ทันที 100% โดยไม่ต้องอ่านค้นหาโค้ดใหม่ตั้งแต่ต้น
> **Session ID:** `ae344835-103b-42aa-a753-ae5afff1269a` | **Timestamp:** 2026-09-10 (Verified Active)

---

## 🧭 1. ข้อมูลพื้นฐาน & กฎเหล็กของโปรเจกต์ (Core Identity & Constraints)

### 📌 Business Domain
- **ระบบ:** ร้านค้าสวัสดิการ PX หน่วยฝึกทหารใหม่ กองพันอากาศโยธิน กองบิน 21 (พัน.อย.บน.21) อุบลราชธานี
- **ผู้ใช้งาน:** 
  1. **พลทหารใหม่:** ผู้ซื้อสินค้า โดยซื้อด้วย **เงินสดในกระเป๋า (Cash Wallet)** หรือ **วงเงินสวัสดิการตัดยอดเงินเดือน (Welfare/Credit Allowance)**
  2. **แคชเชียร์/จ่าเวร:** พนักงานหน้าร้าน POS ยิงบาร์โค้ด, สแกนหน้า/บาร์โค้ดทหาร, ตัดยอดเงิน 2 กระเป๋า, รับสินค้าเข้าสต็อก
  3. **ผู้ฝากขาย (Consignment Sellers):** จ่าหรือร้านค้าย่อยนำสินค้ามาฝากขาย คิดค่าส่วนแบ่ง GP และรับรายงานยอดขายแยกรายร้าน
  4. **ผู้บังคับบัญชา / Admin การเงิน:** ดูภาพรวม KPI, กำหนดปฏิทินเงินเดือน, จัดการหักค่าใช้จ่ายประจำเดือน, ตัดยอดส่งฝ่ายการเงิน

### ⚡ กฎเหล็กด้านการพัฒนา (Strict Development Rules)
1. **คำสั่งตรวจสอบโค้ด (Mandatory Verification):**
   - ❌ **ห้ามรัน** `npm run build` หรือ `npm test` เด็ดขาด (สภาพแวดล้อม Mac Sandbox จะเกิดข้อผิดพลาดจาก package bundling)
   - ✅ **ให้รันเฉพาะคำสั่ง:**
     ```bash
     npx tsc --noEmit && node -c backend/gas/Code.js
     ```
   - ต้องได้ผลลัพธ์ **Exit Code 0 (0 errors)** ทุกครั้งก่อนส่งมอบงาน
2. **สไตล์การสื่อสาร (Communication Style):**
   - ใช้ **Caveman Full Thai Style** เสมอ (ตอบภาษาไทย สั้น กระชับ ตรงประเด็น เนื้อหาทางเทคนิคแม่นยำ 100% ไม่เกริ่นเวิ่นเว้อ)
   - แปะ Clickable Link ให้กับไฟล์ที่แก้ไขเสมอ เช่น `[SellersTab.tsx](file:///...)`
3. **ความปลอดภัยของฐานข้อมูล (Database Safety):**
   - ห้ามลบร้านค้าส่วนกลางรหัส **`S01`** หรือลบสินค้าที่มีสต็อกคงเหลือ > 0 (ใช้ Soft Delete: `is_active: false` แทน)
   - รูปภาพทั้งหมดบน Google Drive ต้องตั้งชื่อตามรูปแบบ:
     - สินค้า: `PROD_{barcode}_{timestamp}.ext`
     - พลทหาร: `SOLDIER_{soldier_id}_{timestamp}.ext`
     - ผู้ฝากขาย: `SELLER_{seller_id}_{timestamp}.ext`

---

## 🏗️ 2. สถาปัตยกรรมระบบ & Tech Stack (Architecture & Tech Stack)

### Frontend Layer:
- **Framework:** React 19 + TypeScript + Vite 8
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss";` พร้อม `@custom-variant dark (&:where(.dark, .dark *));`)
- **Animation & Transitions:** Framer Motion 13 (`AnimatePresence`, `motion.div`, `motion.aside`)
- **Client Offline Storage:** Dexie.js (IndexedDB) แคชแคตตาล็อกสินค้า 9 ฟิลด์สำหรับหน้าร้าน POS ทำงาน Offline ได้
- **Global Theme Provider:** Singleton `ThemeContext.tsx` ครอบที่ `main.tsx` เพื่อสลับ Dark/Light mode ได้ทั่วทั้งแอปแบบ Real-time โดยไม่สูญเสีย State

### Backend & Cloud Layer:
- **Serverless API:** Google Apps Script (GAS) Web App (`backend/gas/Code.js`) ทำงานผ่าน HTTP `doPost` / `doGet` รองรับ Action Routing
- **Cloud Database:** Google Sheets (แยกตาราง Master และ Batch Spreadsheets)
- **Cloud Storage:** Google Drive API จัดเก็บไฟล์รูปภาพ และคืน Public Web Link อัตโนมัติ
- **Local Fallback / Offline Mocking:** `src/core/api.ts` ผสานกับ `src/mock/mockBackend.ts` จำลองฐานข้อมูลครบทุกตาราง

---

## 🗄️ 3. โครงสร้างฐานข้อมูล Google Sheets ครบ 100% (Complete Database Schema)

### A. Master Spreadsheet (ฐานข้อมูลกลางของกองบิน)
1. **`Product_Catalog`** (แคตตาล็อกสินค้าหน้าร้าน Ultra-Slim 9 ฟิลด์ โหลด 0.05 วินาที):
   - `barcode` (Col 1, PK): บาร์โค้ดสินค้า หรือรหัส PLU
   - `product_name` (Col 2): ชื่อสินค้า
   - `image_url` (Col 3): URL รูปปกสินค้า
   - `unit_name` (Col 4): หน่วยนับ เช่น ชิ้น, ขวด, ซอง
   - `selling_price` (Col 5): ราคาขายปลีกหน้าร้าน (บาท)
   - `category` (Col 6): เครื่องดื่ม / ขนม / ของใช้ / บริการ
   - `parent_barcode` (Col 7): รหัสบาร์โค้ดชิ้นเดี่ยว (ถ้ามี)
   - `conversion_factor` (Col 8): อัตราแตกหน่วย (Default: 1)
   - `is_active` (Col 9): สถานะเปิดขาย (`TRUE` / `FALSE`)
2. **`Product_UOM_Conversions`** (ตารางหน่วยนับเสริม แพ็ค/ลัง):
   - `conversion_id` (PK), `barcode` (บาร์โค้ดแพ็ค), `base_barcode` (บาร์โค้ดชิ้นหลัก), `unit_name` (แพ็ค 6/ลัง 24), `conversion_factor` (จำนวนเท่า), `selling_price` (ราคาขายแพ็ค), `is_active`
3. **`Inventory_Stocks`** (คลังสินค้าและบัญชีต้นทุนหลังร้าน):
   - `barcode` (Col 1, PK), `stock_qty` (Col 2), `cost_price` (Col 3), `seller_id` (Col 4), `low_stock_threshold` (Col 5)
4. **`Stock_In_Logs`** (ประวัติการนำเข้าสต็อก):
   - `log_id` (PK), `barcode`, `quantity_added`, `cost_price_unit`, `total_cost`, `seller_id`, `received_by`, `received_at`, `invoice_ref`
5. **`Consignment_Sellers`** (คู่ค้าและผู้ฝากขาย):
   - `seller_id` (Col 1, PK: S01, S02), `seller_name` (Col 2), `contact_info` (Col 3), `default_fee_pct` (Col 4), `avatar_url` (Col 5), `is_active` (Col 6)
6. **`App_Users`** (ผู้ใช้งานระบบและกำหนดสิทธิ์):
   - `user_id` (PK), `username`, `pin_hash`, `full_name`, `role` (`ADMIN`/`STAFF`/`SELLER`), `seller_id`, `avatar_url`, `is_active`
7. **`Batches_Index`** (สารบัญผลัดทหาร):
   - `batch_id` (PK เช่น `2569_1`), `batch_name`, `spreadsheet_id`, `is_active_batch`, `created_at`
8. **`Drive_Folders`** (โฟลเดอร์ Google Drive สำหรับบันทึกรูป):
   - `folder_id` (PK), `folder_name`, `folder_url`, `is_default`, `created_at`

### B. Batch Spreadsheet (ฐานข้อมูลประจำผลัด เช่น `2569_1`)
1. **`Soldiers`** (ทะเบียนทหารกองประจำการ):
   - `soldier_id` / `px_code` (PK), `national_id` (13 หลัก), `full_name`, `unit`, `credit_limit` (วงเงิน), `deductions` (ยอดหักประจำเดือน), `credit_allowance_balance` (ยอดคงเหลือกระเป๋าสวัสดิการ), `cash_wallet_balance` (ยอดเงินสดเติมล่วงหน้า), `photo_url`, `status` (`ACTIVE`/`SUSPENDED`/`DISCHARGED`)
2. **`Orders` & `Order_Items`** (ประวัติบิลขายและการตัด 2 กระเป๋า)
3. **`Credit_Logs`** (Statement การเงินของทหาร: เติมเงิน, รูดซื้อ, คืนเงิน, ตัดหักประจำเดือน)
4. **`Monthly_Deductions`** (รายการหักค่าใช้จ่ายประจำเดือน เช่น ค่าซักรีด, ค่าเครื่องแบบ, ค่าตัดผม)
5. **`Payroll_Calendar`** (ปฏิทินรอบเงินเดือนเข้า และวันตัดรอบหักสวัสดิการ)

---

## 📂 4. แผนผังโฟลเดอร์และการแบ่งหน้าที่ (Detailed File Directory Map)

```text
/
├── backend/
│   └── gas/
│       ├── Code.js               # จุดศูนย์รวม Backend API ทั้งหมด (doPost routing, Sheet handlers, Drive Uploads)
│       └── appsscript.json       # GAS Manifest & OAuth Scopes
├── src/
│   ├── core/
│   │   └── api.ts                # Frontend API Client: รวมฟังก์ชันเรียก GAS พร้อม Offline Mock fallback
│   ├── mock/
│   │   └── mockBackend.ts        # Mock Database จำลอง Google Sheets แบบ In-Memory และ LocalStorage
│   ├── types/
│   │   └── schema.ts             # TypeScript Type Definitions & Database Interfaces ทั้งระบบ
│   ├── db/
│   │   └── indexedDB.ts          # Dexie.js Client สำหรับแคชข้อมูลแคตตาล็อกหน้าร้าน POS
│   ├── context/
│   │   └── ThemeContext.tsx      # Context จัดการ Dark/Light Theme แบบ Global Singleton
│   ├── features/
│   │   ├── admin/
│   │   │   ├── AdminView.tsx     # Shell หน้าหลัก Admin ควบคุม Tab Routing และ Data Reloading
│   │   │   └── components/
│   │   │       ├── DashboardTab.tsx           # Dashboard สรุปภาพรวมและ KPI การเงิน
│   │   │       ├── ProductsTab.tsx            # ตารางแคตตาล็อกสินค้า และ Multi-UOM Badges
│   │   │       ├── SellersTab.tsx             # หน้าร้านค้าผู้ฝากขาย Bento Grid & หน้ารายละเอียดตรวจนับ (Drill-down)
│   │   │       ├── WelfareTab.tsx             # ทะเบียนพลทหาร & จัดการสิทธิ 2 กระเป๋า
│   │   │       ├── BatchesTab.tsx             # จัดการผลัดทหารและสลับผลัดที่ใช้งาน
│   │   │       ├── FoldersTab.tsx             # จัดการโฟลเดอร์ Google Drive
│   │   │       ├── MonthlyDeductionsTab.tsx   # หักค่าใช้จ่ายประจำเดือน (เต็มจอ + บันทึกผลสำเร็จ)
│   │   │       ├── PayrollCalendarTab.tsx     # ปฏิทินวันเงินเดือนเข้า & วันตัดยอด
│   │   │       ├── CreateSellerModal.tsx      # Modal เพิ่ม/แก้ไขร้านค้าผู้ฝากขาย + อัปโหลดรูป Drive
│   │   │       ├── DeleteSellerModal.tsx      # Modal ลบผู้ฝากขายพร้อมระบบ Safety ตรวจสอบสต็อก
│   │   │       └── ui/                        # Admin UI Primitives (AdminStatCard, AdminFilterPills, etc.)
│   │   ├── pos/
│   │   │   └── PosView.tsx       # หน้าร้าน POS: ยิงบาร์โค้ด, ตะกร้า, ตัด 2 กระเป๋า, Guardrail ล็อกผลัด
│   │   ├── inventory/
│   │   │   └── components/       # Stock In Modal, Product Stock History Modal, Stock In History Modal
│   │   ├── products/
│   │   │   └── components/       # ProductFormModal, ProductDeleteModal, ProductImportModal
│   │   └── users/
│   │       └── components/       # UserCard, UserModal
│   ├── App.tsx                   # Top-level Routing, Authentication Session, และ Batch Selector Guard
│   ├── main.tsx                  # Root Entry Point ผูกกับ ThemeProvider
│   └── index.css                 # Tailwind CSS v4 Main Configuration
```

---

## ⚡ 5. บันทึกความจำแคชของฟีเจอร์สำคัญ (Feature Memory Cache)

### 🏪 1. ระบบผู้ฝากขาย (Consignment Sellers CRUD & Drive Avatar System)
- **การสร้าง/แก้ไข (`CreateSellerModal.tsx`):**
  - สร้างรหัสอัตโนมัติ `S01`, `S02`, `S03`...
  - รองรับการอัปโหลดรูปตรงเข้า Google Drive ผ่าน API `uploadSellerAvatar` บันทึกเป็น `SELLER_{seller_id}_{timestamp}.ext` และแชร์ Public View อัตโนมัติ
  - ตัดส่วนภาพสำเร็จรูปออกตามคำสั่งผู้ใช้ (ใช้เฉพาะรูปอัปโหลด Drive และ URL ตรง)
- **การลบแบบปลอดภัย (`DeleteSellerModal.tsx`):**
  - ตรวจสอบจำนวน SKU และสต็อกคงเหลือของร้านนั้นก่อนลบ
  - ล็อกห้ามลบร้านค้าส่วนกลาง `S01`
  - มีตัวเลือกว่าจะลบเฉพาะร้าน หรือลบสินค้าทั้งหมดของร้านนั้นแบบ Cascade
- **การจัดวางปุ่ม Action ในหน้าร้านค้า (`SellersTab.tsx`):**
  - **หน้ารายการรวม:** การ์ด Bento สะอาด 100% ลบปุ่มแก้ไข/ลบออก เหลือเฉพาะป้ายสถานะ `ACTIVE/INACTIVE`, สถิติสต็อก, มูลค่ารวม, ปุ่ม `ประวัติ`, และปุ่ม `ตรวจนับ ->`
  - **หน้ารายละเอียดตรวจนับ (Drill-down):** ปุ่ม **`[✏️ แก้ไขข้อมูล]`** และ **`[🗑️ ลบผู้ฝากขาย]`** วางเด่นชัดบน Header Bar ด้านบน ป้องกันการเผลอกดผิดพลาด
- **ระบบ Auto-Sync สถานะเปิด/ปิดร้านค้ากับสินค้า (Seller Active Cascade Sync):**
  - เมื่อปิดใช้งานร้านค้า (`is_active: false`): ระบบจะปรับสินค้าทั้งหมดของร้านนั้นเป็น `is_active: false` อัตโนมัติทั้งใน Google Sheets (`Product_Catalog`) และ Mock DB
  - POS จะซ่อนสินค้าของร้านนั้น และหากยิงบาร์โค้ดจะขึ้นแจ้งเตือนว่า *"ร้านค้าผู้ฝากขายถูกปิดใช้งานอยู่"*
  - เมื่อเปิดใช้งานร้านค้ากลับมา (`is_active: true`): ระบบจะเปิดแสดงและเปิดขายสินค้าทั้งหมดของร้านนั้นคืนให้อัตโนมัติ

### 📅 2. ระบบหักค่าใช้จ่ายประจำเดือน & ปฏิทินวันตัดรอบ (Monthly Deductions & Payroll Calendar)
- **Monthly Deductions (`MonthlyDeductionsTab.tsx`):**
  - ปรับขนาดหน้าจอให้แสดงผลแบบ **Full Width เต็มจอ**
  - เพิ่มส่วนแสดง **รายการหักประจำเดือนที่ดำเนินการสำเร็จแล้ว** เพื่อให้ตรวจสอบย้อนหลังได้
- **Batch Guardrails (ระบบบล็อกเมื่อไม่เชื่อมต่อผลัด):**
  - หากยังไม่ได้เลือกผลัด หรือผลัดไม่ได้เปิดใช้งาน (`is_active_batch === false`):
    - **`WelfareTab.tsx`**: แสดง Modal แจ้งเตือนชัดเจน ไม่ให้แสดงผลผิดพลาดเป็น `(ผลัด 2569_1)`
    - **`PayrollCalendarTab.tsx`**: ล็อกการทำงาน
    - **`MonthlyDeductionsTab.tsx`**: ล็อกการทำงาน
    - **`PosView.tsx`**: บล็อกทุก Action การขาย / การยิงบาร์โค้ด / การชำระเงิน จนกว่าจะเลือกผลัดที่เปิดใช้งาน

### 📦 3. ระบบ Multi-UOM Pack/Carton Barcodes & Product Safety Deletion
- แสดงผลหน่วยนับย่อย/ลังใต้สินค้าหลักทั้งใน `ProductsTab.tsx`, `SellersTab.tsx`, และ `PosView.tsx`
- ระบบลบสินค้าปลอดภัย (`ProductDeleteModal.tsx`): ล็อกไม่ให้ลบสินค้าที่ยังมีสต็อก > 0 พร้อมตัวเลือกระงับการขาย (`is_active: false`)

### 🎁 4. ระบบจัดการโปรโมชั่นสินค้า (Promotions Management & Real-time POS Engine)
- **ประเภทโปรโมชั่นที่รองรับ:**
  - **`BOGO` (ซื้อ 1 แถม 1 / X แถม Y):** ตัดสต็อกจริงตามจำนวนชิ้นจริง (`actual_qty`) และคิดเงินเฉพาะชิ้นที่ซื้อ (`charged_qty`) ไม่ให้สต็อกขาดหรือเงินแหว่ง
  - **`DISCOUNT_PCT` (ลดเป็น %):** คำนวณส่วนลดตามเปอร์เซ็นต์ที่กำหนด
  - **`CLEARANCE` (ลดราคาพิเศษ / ล้างสต็อก):** ลดราคาคงเหลือเป็นราคาพิเศษสำหรับระบายสินค้าใกล้หมดอายุ
- **การจัดสรรต้นทุนส่วนลด (`absorbed_by`):**
  - `SELLER` (จ่า/ร้านค้ารับภาระ) | `UNIT` (กองร้อยชดเชยให้) | `SHARED` (คนละครึ่ง)
- **Admin Management (`PromotionsTab.tsx` & `CreatePromotionModal.tsx`):**
  - หน้าจัดการโปรโมชั่นแยกแท็บเฉพาะใน Admin Panel พร้อม KPI Overview และสลับโหมด Bento Cards / Table
  - Modal สร้าง/แก้ไขโปรโมชั่น ค้นหาสินค้าเป้าหมาย ปรับประเภทโปรแบบไดนามิก และกำหนด Preset วันที่
  - สวิตช์เปิด/ปิดโปรโมชั่นแบบ Real-time (`is_active`)
- **POS Engine Integration (`promotionEngine.ts` & `PosView.tsx`):**
  - ตรวจจับโปรโมชั่นอัตโนมัติเมื่อยิงบาร์โค้ดสินค้าเข้าตะกร้า
  - แสดง Promo Badge บนสินค้าในตะกร้า หน้าร้าน และบนใบเสร็จ E-Slip
  - คำนวณส่วนลดสุทธิลงในบิล และส่งต่อยอดสุทธิไปยังโหมด Party Split Mode ครบถ้วน 100%

### 🔐 5. ระบบยืนยันตัวตน Admin & Seller (Authentication & Role Scoping System)
- **ขอบเขตสิทธิ์ (Role Scoping):**
  - **`ADMIN`:** สิทธิ์สูงสุด เข้าถึงได้ทุกแท็บ (Dashboard, Orders, Welfare, Batches, Folders, Products, Sellers, Promotions, Users)
  - **`SELLER`:** เข้าถึงเฉพาะส่วนงานที่เกี่ยวข้องกับร้านค้าของตนเอง (Products, Sellers Drill-down, Promotions, Orders) และซ่อนระบบคอนฟิกของ Admin
  - **พลทหาร:** ยังไม่ต้อง Login (ใช้รหัสบาร์โค้ด / สแกนหน้าหน้าร้าน POS ตามเดิม)
- **Login Portal (`LoginView.tsx`):**
  - รวมฟอร์มเข้าสู่ระบบเป็น **หน้าจอเดียว (Unified Login)** ไม่ต้องเลือกแท็บ Admin/Seller
  - ระบบตรวจสอบสิทธิ์จาก Username และ PIN แล้วจำแนกบทบาท (`role: ADMIN | SELLER`) พร้อมกำหนดสิทธิ์ให้อัตโนมัติ
  - ช่องกรอก Username และ PIN (รหัสผ่าน 4 หลัก) พร้อมปุ่มเปิด/ปิดการแสดงรหัสผ่าน
  - เข้าสู่ระบบผ่านฐานข้อมูลจริง (Google Sheets `Users` / API) พร้อมระบบตรวจสอบสถานะบัญชี (`is_active !== false`) บล็อกบัญชีที่ถูกระงับ
- **State & Session Persistence (`useAuthStore.ts`):**
  - จัดการสถานะ `currentUser` และ `isAuthenticated` ด้วย Zustand
  - บันทึกลง `localStorage` Key `'px_auth_session'` รักษา Session เมื่อรีเฟรชหน้าจอ
- **Route Guarding & Logout Modal (`App.tsx` & `LogoutConfirmModal.tsx`):**
  - ครอบ Auth Guard: หากยังไม่ล็อกอิน ระบบจะแสดง `LoginView` เสมอ
  - หากล็อกอินเป็น Seller พยายามเข้า `/users` จะถูก Redirect กลับไปยัง `/admin`
  - Modal ยืนยันการออกจากระบบ (`LogoutConfirmModal.tsx`) สวยงาม ป้องกันการกดหลุดจากระบบโดยไม่ได้ตั้งใจ

---

## 📋 6. รายการงานที่พร้อมทำต่อในอนาคต (Ready Next Steps)

1. **POS Tablet Optimization:** ทดสอบและขัดเกลาหน้าขายสัมผัสให้ตอบสนองเร็วขึ้นบนแท็บเล็ต
2. **Consignment Settlement Export:** เพิ่มระบบพิมพ์ใบสรุปยอดขายและค่าส่วนแบ่ง GP รายร้านค้าผู้ฝากขาย
3. **Batch Soldier Photo Sync:** ดึงรูปภาพพลทหารจากโฟลเดอร์ Google Drive มาแมพเข้าทะเบียนพลทหารอัตโนมัติ

---
*บันทึก Master Context Cache นี้พร้อมให้ AI ทุกตัวนำไปใช้ทำงานต่อได้ทันทีโดยสมบูรณ์*

