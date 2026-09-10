# 🪖 PX ทหารใหม่ กองบิน 21 — Handoff Document

> **เอกสารส่งต่องานสำหรับ Agent ถัดไป:** สรุปบริบท, สถาปัตยกรรม, ความคืบหน้า และขั้นตอนต่อไปของระบบ POS สวัสดิการและบัญชีตัดยอดเงินเดือนพลทหาร กองบิน 21 (อัปเดตล่าสุด: 2026-09-09)

---

## 🧭 Agent Session & Context Reference
- **Active Workspace:** `/Users/khamseankhampang/Desktop/yoru work`
- **Agent Session ID:** `ae344835-103b-42aa-a753-ae5afff1269a`
- **Conversation Transcript:** [View Conversation Transcript](conversation://ae344835-103b-42aa-a753-ae5afff1269a)
- **App Data Directory:** `/Users/khamseankhampang/.gemini/antigravity-cli`
- **Transcript Logs:**
  - Compact: `/Users/khamseankhampang/.gemini/antigravity-cli/brain/ae344835-103b-42aa-a753-ae5afff1269a/.system_generated/logs/transcript.jsonl`
  - Full: `/Users/khamseankhampang/.gemini/antigravity-cli/brain/ae344835-103b-42aa-a753-ae5afff1269a/.system_generated/logs/transcript_full.jsonl`

---

## 🎯 1. Goal (เป้าหมายของระบบ)
สร้างและปรับปรุงระบบ **Local-First POS & Welfare Accounting Web App / PWA** สำหรับร้านสวัสดิการทหารใหม่ (กองบิน 21 อุบลราชธานี) โดยเชื่อมต่อกับ **Google Sheets** และ **Google Apps Script (GAS)** เป็นฐานข้อมูลหลัก พร้อมดีไซน์ระดับ Modern Retail POS Design Tokens, Responsive สมบูรณ์แบบทั้งบนมือถือและจอ POS ใหญ่, ระบบสลับธีมมืด/สว่างแบบ Real-time, และ Framer Motion Transitions

---

## 📊 2. System Architecture & Tech Stack

### Tech Stack:
- **Framework:** React 19 + TypeScript + Vite 8
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss";` + `@custom-variant dark (&:where(.dark, .dark *));`)
- **Animation & Motion:** Framer Motion 13 (`AnimatePresence`, `motion.div`, `motion.aside`)
- **Icons:** Lucide React
- **State & Theme:** Zustand Store + Singleton `ThemeContext` (Provider at `main.tsx`)
- **Database Backend:** Google Apps Script Web App Proxy (`/api/gas`) + Master/Batch Google Sheets

---

## 🚀 3. Current Progress (สิ่งที่ทำเสร็จล่าสุด)

### 1. Redesign Admin Panel (`/admin`) ตามแบบ Modern Retail POS:
- **UI Primitives Extraction (`src/features/admin/components/ui/`)**:
  - `AdminStatCard.tsx`: การ์ดแสดงผลสรุป KPI พร้อม Trend Badge และ Accent Colors
  - `AdminFilterPills.tsx`: แถบปุ่มกรองหมวดหมู่สินค้า/ข้อมูลแบบแนวนอน Scrollable
  - `AdminActionCard.tsx`: การ์ดคำสั่งด่วนพร้อมไอคอนและ Hover Micro-interactions
  - `AdminSectionHeader.tsx`: หัวข้อมาตรฐานพร้อม Icon Badge และ Action Buttons
- **Layout & Components**:
  - `AdminHeader.tsx`: ออกแบบใหม่พร้อม Staff Profile, Online/Offline Indicator, Search Bar, Theme Toggle
  - `AdminSidebar.tsx`: ปรับเป็น Straight Panel เต็มความสูงหน้าจอ (ขอบตรงตามโจทย์ ไม่มีขอบมนลอย) พร้อม Cloud Database Status Footer
  - `DashboardTab.tsx`: แผงควบคุม HQ Dashboard รวม Quick Actions, KPI Overview, Batch Switcher, และ Master/Batch Sheet Links
  - `ProductsTab.tsx`: ตารางแคตตาล็อกสินค้าพร้อม Stock Status Badges และตัวกรอง Pill
  - `WelfareTab.tsx`: การ์ดสถิติวงเงินและตารางทะเบียนพลทหารคำนวณยอดตัดเงินเดือนสุทธิ
  - `FoldersTab.tsx`, `BatchesTab.tsx`, `SellersTab.tsx`: ปรับปรุงหน้าตารางและการ์ดให้เข้าชุดกัน

### 4. Consignment Sellers Drill-down & Modern Bento Grid (`SellersTab.tsx`):
- ปรับโครงสร้างหน้ารายชื่อผู้ฝากขายเป็น Bento Grid 3 ชั้น สัดส่วนสวยงาม (Profile, รหัส, เบอร์โทร, SKU, สต็อกรวม, มูลค่าสินค้า)
- ปรับปรุงหน้า Drill-down ตรวจนับสต็อกตาม `docs/product_inventory_full_version.tsx`: Header Banner, 4 Summary KPI Widgets, Search/Filter Toolbar, 3 View Modes (Table, Tiles, Analytics) ด้วย Tailwind CSS v4 + Framer Motion

### 5. Multi-Unit Pack Conversions (UOM) & Safety-First Product Deletion:
- **Multi-UOM Display:** แสดง Badge หน่วยนับเสริม (Pack / Carton) ที่ผูกอยู่ใต้สินค้าหลักใน `ProductsTab.tsx` และ `SellersTab.tsx` พร้อมแสดง Tooltip บาร์โค้ดและอัตราคูณ
- **Safety-First Deletion Architecture (`ProductDeleteModal.tsx`):**
  - **Active Stock Lock:** ล็อกการลบถาวรหากมีสต็อกคงคลัง > 0 เพื่อป้องกันบัญชีคลาดเคลื่อน
  - **Soft-Delete vs Hard-Delete:** รองรับการระงับการขาย (`is_active: false`) ซ่อนจากหน้าร้านแต่คงประวัติ 100% และลบถาวรสำหรับสินค้าสต็อก 0
  - **Cascade Cleanup:** ลบหน่วยนับลูกใน `Product_UOM_Conversions` อัตโนมัติเมื่อลบสินค้าหลัก
  - **Type-to-Confirm:** บังคับพิมพ์บาร์โค้ดหรือชื่อสินค้าเพื่อยืนยันก่อนกดยืนยันลบถาวร
  - **Backend & API:** เพิ่ม `api.deleteProduct` และ `api.toggleProductActive` ทั้งใน `src/core/api.ts` และ `backend/gas/Code.js`

---

## 🔒 4. Constraints & Rules to Remember
1. **ห้ามรัน `npm run build` หรือ `npm test` เด็ดขาด** (ให้ใช้ `npx tsc --noEmit` สำหรับตรวจสอบ Type Safety เท่านั้น)
2. **การสื่อสาร:** ใช้ Caveman style (ภาษาไทย สั้น กระชับ ตรงประเด็น)
3. **Database Schema:** ปฏิบัติตาม Master Spreadsheet (`Product_Catalog`, `Product_UOM_Conversions`, `Inventory_Stocks`, `Stock_In_Logs`, `Sellers`) เสมอ


### 4. Framer Motion Integration:
- นำ `motion.aside` และ `motion.div` มาใช้กับ Mobile Drawer Slide-in
- ใส่ `AnimatePresence mode="wait"` ให้การสลับแท็บในหน้า Admin มี Animation Fade & Slide นุ่มนวล

---

## 🛠️ 4. What Worked (สิ่งที่เวิร์กและควรยึดเป็นแนวทาง)
1. **Singleton ThemeContext:** การรวม State โหมดมืด/สว่างไว้ที่ React Context ระดับ Root ช่วยตัดปัญหาเรื่องการ toggle แล้วบาง Component ไม่ยอมเปลี่ยนสี
2. **Tailwind v4 `@custom-variant dark`:** แก้ปัญหาคลาส `dark:` ไม่ติดเมื่อใช้การใส่ `.dark` บน `<html>`
3. **Modular Admin Components:** การแยก Primitives (`AdminStatCard`, `AdminFilterPills`, `AdminActionCard`, `AdminSectionHeader`) ช่วยให้หน้า Tab ต่างๆ สะอาด และปรับปรุงดีไซน์ได้ง่าย

---

## ⚠️ 5. What Didn't Work (สิ่งที่เคยติดปัญหาและไม่ควรทำซ้ำ)
1. **Isolated `useState` ใน `useTheme` hook:** การประกาศ `useState` ใน custom hook โดยไม่มี Context จะทำให้แต่ละ Component ได้ state คนละตัว ไม่ซิงค์กัน
2. **Hardcode `background-color` ใน CSS base layer:** การระบุสีมืดตายตัวใน `body` ของ `index.css` ทำให้ Light mode แสดงผลเพี้ยน

---

## 📋 6. Next Steps (ขั้นตอนถัดไปสำหรับ Agent คนต่อไป)
1. **POS View Redesign (`/pos`)**:
   - ปรับปรุงหน้าการขายหน้าร้าน `PosView.tsx` ให้ใช้ Design Tokens เดียวกับ `modern_retail_pos.tsx`
2. **User & Auth Management (`/users`)**:
   - ตรวจสอบและปรับปรุงหน้าจัดการสิทธิ์ผู้ใช้งานให้รองรับ Dark/Light Theme ครบถ้วน
3. **End-to-End Testing**:
   - ทดสอบ Flow การยิงบาร์โค้ดขายสินค้า, ตัดยอดเงินสวัสดิการ, และการซิงค์ข้อมูล Google Sheet ผลัดจริง
