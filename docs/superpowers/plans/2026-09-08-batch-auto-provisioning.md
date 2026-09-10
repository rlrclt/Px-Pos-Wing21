# Batch Auto-Provisioning & Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้ผู้ดูแลระบบสามารถสร้าง Google Sheet ประจำผลัดใหม่ (New Batch Sheet) พร้อม 8 ตารางฐานข้อมูลมาตรฐาน และเชื่อมต่อเข้ากับระบบอัตโนมัติ 100% ผ่านหน้าเว็บ โดยไม่ต้องเข้า Google Apps Script หรือ Google Sheet เลย

**Architecture:** 
1. **Google Apps Script Backend:** เพิ่ม Action `createBatchSheet` ใน `Code.js` ใช้ `SpreadsheetApp.create()` เพื่อสร้างชีตใหม่ใน Google Drive, สร้าง 8 แท็บฐานข้อมูลพร้อม Header, และลงทะเบียนเข้าตาราง `Batch_Config` บน Master Sheet
2. **Frontend UI:** เพิ่มหน้าจอจัดการผลัด (Batch Management View) ใน `/admin` แสดงตารางผลัดทั้งหมด พร้อม Modal สร้างผลัดใหม่แบบ 1-Click Auto Provisioning

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Google Apps Script V8 Engine

---

### Task 1: Backend GAS `Code.js` — `handleCreateBatchSheet`

**Files:**
- Modify: `backend/gas/Code.js`

**Interfaces:**
- Consumes: `payload: { batch_id: string, batch_name: string, default_credit_limit?: number, start_date?: string, end_date?: string }`
- Produces: `{ status: 'SUCCESS', success: true, batch_id, batch_name, spreadsheet_id, sheet_url }`

- [ ] **Step 1: เพิ่มฟังก์ชัน `handleCreateBatchSheet` ใน `Code.js`**
  - ตรวจสอบความถูกต้องของ `batch_id` (ห้ามว่าง ห้ามซ้ำ)
  - สร้าง Google Sheet ใหม่ด้วย `SpreadsheetApp.create('PX_Batch_' + batch_id)`
  - วนลูปสร้าง 8 ตาราง:
    - `Soldiers_<batchId>`: `['soldier_id', 'px_code', 'rfid_token', 'full_name', 'company', 'platoon', 'credit_limit', 'current_credit', 'status', 'created_at']`
    - `Orders_<batchId>`: `['order_id', 'soldier_id', 'total_amount', 'payment_method', 'status', 'created_by', 'created_at']`
    - `Order_Splits_<batchId>`: `['split_id', 'order_id', 'soldier_id', 'split_amount', 'status', 'created_at']`
    - `Order_Items_<batchId>`: `['item_id', 'order_id', 'product_id', 'product_name', 'cost_price', 'selling_price', 'quantity', 'subtotal']`
    - `Credit_Logs_<batchId>`: `['log_id', 'soldier_id', 'order_id', 'action_type', 'amount', 'balance_after', 'note', 'created_at']`
    - `Shifts_<batchId>`: `['shift_id', 'cashier_id', 'opened_at', 'closed_at', 'start_cash', 'end_cash', 'total_sales', 'status']`
    - `Payroll_Settlement_<batchId>`: `['settlement_id', 'soldier_id', 'batch_id', 'total_credit_used', 'settled_amount', 'settled_at', 'status']`
    - `Void_Logs_<batchId>`: `['void_id', 'order_id', 'voided_by', 'reason', 'voided_at']`
  - ลบ `Sheet1` เริ่มต้นออก
  - นำ `spreadsheet_id` บันทึกลงตาราง `Batch_Config` ใน Master Sheet
  - คืนค่าผลลัพธ์พร้อม Sheet URL

---

### Task 2: API Client `src/core/api.ts` — `createBatchSheet`

**Files:**
- Modify: `src/core/api.ts`

**Interfaces:**
- Consumes: `createBatchSheet(data: { batch_id: string, batch_name: string, default_credit_limit?: number, start_date?: string, end_date?: string })`
- Produces: `Promise<{ success: boolean, spreadsheet_id?: string, sheet_url?: string, error?: string }>`

- [ ] **Step 1: เพิ่มเมธอด `createBatchSheet` ใน `PXApiClient`**
  - ยิง POST request ไปที่ Apps Script proxy พร้อม payload
  - จัดการ Error Handling และแปลง Response คืนค่าให้กับหน้าเว็บ

---

### Task 3: Frontend UI `src/App.tsx` — Batch Management View & Auto Provisioning Modal

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `api.getBatches()`, `api.createBatchSheet()`
- Produces: UI แท็บสลับหน้า "บัญชีสวัสดิการผลัด" vs "จัดการผลัดทั้งหมด", Modal สำหรับกดสร้างผลัดใหม่ 1-Click

- [ ] **Step 1: เพิ่ม State สำหรับระบบจัดการผลัด**
  - `adminTab`: `'welfare' | 'batches'`
  - `isCreateBatchModalOpen`: `boolean`
  - `isCreatingBatch`: `boolean`
  - `newBatchForm`: `{ batch_id, batch_name, default_credit_limit, start_date, end_date }`
  - `createBatchSuccess`: `{ batch_id, spreadsheet_id, sheet_url } | null`

- [ ] **Step 2: สร้างส่วน UI แท็บสลับหน้า และตารางแสดงผลัดทั้งหมด (Batch Management Table)**
  - แสดงผลัดทั้งหมดที่มีใน `Batch_Config`
  - แสดงชื่อผลัด, รหัสผลัด, วงเงินเริ่มต้น, Spreadsheet ID, ปุ่มเปิดดู Google Sheet, และสถานะ Active

- [ ] **Step 3: สร้าง Modal ฟอร์มสร้างผลัดใหม่แบบ 1-Click**
  - ฟิลด์กรอกข้อมูลที่จำเป็น
  - ปุ่ม Action: "สร้างและเชื่อมต่อ Google Sheet อัตโนมัติ"
  - แสดง Loading Spinner และสถานะความคืบหน้า
  - เมื่อสร้างเสร็จ อัปเดตรายการผลัดและสลับไปยังผลัดใหม่ทันที
