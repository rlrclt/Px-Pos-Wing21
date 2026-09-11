# Fix Plan: แก้บั๊กวันที่/สถานะโปรโมชั่นใน PromotionsTab

**จาก:** ห้องตรวจสอบ (REVIEWER)
**ถึง:** ห้อง 2 (SANDBOX CODER)
**ความสำคัญ:** 🔴 HIGH — ตัวกรอง "กำลังจัดโปร / ยังไม่เริ่ม / หมดอายุ" และ badge นับเวลาให้ผลผิดจริง
**ขอบเขต:** แก้แค่ 2 ไฟล์ — `src/features/promotions/promotionEngine.ts` และ `src/features/admin/components/PromotionsTab.tsx`

---

## ⚠️ กฎก่อนเริ่ม (อ่านก่อนทุกครั้ง)

- ❌ **ห้ามรัน `npm run build` หรือ `npm test` เด็ดขาด**
- ✅ **Verification ใช้เฉพาะ `npx tsc --noEmit`**
- ❌ **ห้ามเปลี่ยน signature (props/parameters) ของฟังก์ชันเดิม** เพราะมี consumer หลายจุด:
  - `AdminView.tsx:350` → `isPromotionActive(p, today)`
  - `ProductGrid.tsx:102` → `isPromotionActive(p)`
  - `PosView.tsx:122` → `evaluateCartPromotions(..., getTodayDateString())`
- ⚠️ ขณะนี้ `npx tsc --noEmit` มี error เดิมอยู่แล้วที่ `src/features/users/UsersView.tsx(24,1) TS1131` — **ไม่ใช่หน้าที่เรา ห้ามแตะ** เกณฑ์ผ่าน = error เพิ่มจากเดิมเป็น **0 ตัว**

---

## 1. สาเหตุของบั๊ก (Root Cause)

### บั๊ก #1 (Critical): เปรียบเทียบวันที่คนละรูปแบบด้วย string
- `CreatePromotionModal.tsx` (บรรทัด 66-91, 241-242) บันทึกวันที่เป็น **datetime**: `"2026-09-10T14:30"` (input `type="datetime-local"`)
- แต่ `PromotionsTab.tsx` (บรรทัด 145-160) ใช้ `today = getTodayDateString()` ซึ่งเป็น **date-only**: `"2026-09-10"` แล้วเอามาเทียบ string ตรงๆ:
  ```ts
  // ผิด: "2026-09-10T14:30" >= "2026-09-10" เป็น true เสมอ (เพราะ prefix)
  if (promo.is_active !== false && promo.end_date >= today) return false; // expired filter
  if (promo.start_date <= today || ...) return false;                      // upcoming filter
  ```
- ผลลัพธ์: โปรที่เริ่ม/หมดอายุ "วันนี้" ถูกจัดหมวดผิดทั้งชุด

### บั๊ก #2 (Critical): Timezone ของ date-only string
- `new Date("2026-09-10")` ถูก parse เป็น **UTC เที่ยงคืน** = 07:00 น. เวลาไทย
- กระทบ 2 จุด:
  - `promotionEngine.ts` บรรทัด ~93-95 (`isPromotionActive` เทียบ `start_date` ตรงๆ)
  - `PromotionsTab.tsx` บรรทัด ~226-232 (`renderDateBadge` เทียบ `startMs` ตรงๆ)
- ผลลัพธ์: badge แสดง "เริ่มในอีก 7 ชม." ทั้งๆ ที่โปรเริ่มเที่ยงคืน และโปรที่หมดอายุวันที่ X ยัง active ต่อถึงเช้าวันถัดไป (~07:00)

### บั๊ก #3 (รอง): Logic ตรวจสถานะไม่สม่ำเสมอ
- Filter "active" ใช้ `isPromotionActive()` (มีเวลา end-of-day ให้ถูกต้อง) แต่ "upcoming/expired" ใช้ string compare ดิบ → โปรเดียวกันอาจหลุดจากทุกหมวด หรือซ้ำซ้อน

### บั๊ก #4 (รอง): KPI การ์ด "หมดอายุหรือปิดอยู่" เพี้ยน
- `stats` (บรรทัด 71-99) นับ `expiredOrInactiveCount` จาก `else` ของ `isPromotionActive` → โปรที่ "ยังไม่เริ่ม" ถูกนับรวมเป็น "หมดอายุ/ปิด" ด้วย


---

## 2. Plan การแก้ไข (ทำตามลำดับ)

### Step 1: เพิ่ม helpers ใน `src/features/promotions/promotionEngine.ts`

เพิ่มฟังก์ชันใหม่ 3 ตัว (วางไว้เหนือ `isPromotionActive`) — **ห้ามแตะ signature เดิม**:

```ts
/**
 * Parses promo date strings to local-time milliseconds.
 * 'YYYY-MM-DD' (date-only) → treated as LOCAL midnight (fixes UTC parsing bug).
 * 'YYYY-MM-DDTHH:mm' → parsed as-is (already local).
 * Returns null when missing/invalid.
 */
export function parsePromoDateMs(s?: string, endOfDay = false): number | null {
  if (!s) return null;
  const str = s.length === 10
    ? `${s}T${endOfDay ? '23:59:59' : '00:00:00'}`
    : s;
  const ms = new Date(str).getTime();
  return isNaN(ms) ? null : ms;
}

/** โปรเปิดใช้งานแต่ยังไม่ถึงเวลาเริ่ม */
export function isPromoUpcoming(promo: Promotion, nowMs: number = Date.now()): boolean {
  if (promo.is_active !== true) return false;
  const start = parsePromoDateMs(promo.start_date);
  return start !== null && start > nowMs;
}

/** ปิดใช้งานอยู่ หรือหมดเวลาแล้ว (end ของ date-only นับถึง 23:59:59 ของวันนั้น) */
export function isPromoExpired(promo: Promotion, nowMs: number = Date.now()): boolean {
  if (promo.is_active !== true) return true;
  const end = parsePromoDateMs(promo.end_date, true);
  return end !== null && end < nowMs;
}
```

แล้วแก้ใน `isPromotionActive` เดิม ให้ใช้ helper (แก้ timezone ตอนเทียบ `start_date`):
```ts
if (promo.start_date) {
  const startMs = parsePromoDateMs(promo.start_date);
  if (startMs !== null && nowMs < startMs) return false;
}
```
(ส่วน `end_date` ใน `isPromotionActive` เดิมมี logic `T23:59:59` อยู่แล้วและถูกต้อง — เปลี่ยนเป็นเรียก `parsePromoDateMs(promo.end_date, true)` แทนได้เพื่อลด code ซ้ำ)

### Step 2: แก้ `filteredPromotions` ใน `src/features/admin/components/PromotionsTab.tsx` (บรรทัด ~118-160)

เปลี่ยนบล็อก Status filter เดิม (string compare) เป็น:

```ts
// Status filter
if (statusFilter === "active") {
  if (!isPromotionActive(promo, today)) return false;
} else if (statusFilter === "upcoming") {
  if (!isPromoUpcoming(promo)) return false;
} else if (statusFilter === "expired") {
  if (!isPromoExpired(promo)) return false;
}
```

อัปเดต import บรรทัด 30 เป็น:
```ts
import {
  getTodayDateString,
  isPromotionActive,
  isPromoUpcoming,
  isPromoExpired,
  parsePromoDateMs,
  formatPromoDateTime
} from "../../promotions/promotionEngine.ts";
```

### Step 3: Refactor `renderDateBadge` (บรรทัด ~210-247)

แทนที่การ parse เอง (`promo.end_date.length === 10 ? ... + 'T23:59:59'`) ด้วย helper:
```ts
const now = Date.now();
const startMs = parsePromoDateMs(promo.start_date) ?? 0;
const endMs = parsePromoDateMs(promo.end_date, true) ?? Infinity;
```
ส่วน JSX ที่เหลือคงเดิมทั้งหมด (เริ่มในอีก X ชม./วัน, หมดอายุแล้ว, เหลือ X ชม./วัน)

### Step 4: แก้ `stats` KPI (บรรทัด 71-99)

เพิ่มตัวนับ `upcomingCount` แล้วเปลี่ยนเงื่อนไข else เป็น 3 ทาง:
```ts
let activeCount = 0, upcomingCount = 0, expiredOrInactiveCount = 0;
promotions.forEach(p => {
  if (isPromotionActive(p, today)) activeCount += 1;
  else if (isPromoUpcoming(p)) upcomingCount += 1;
  else expiredOrInactiveCount += 1;
});
```
UI การ์ด KPI: ให้การ์ด "หมดอายุหรือปิดอยู่" **ไม่รวมโปรที่ยังไม่เริ่ม** (แก้ subtitle เป็น `นับเฉพาะที่หมดอายุ/ปิดแล้ว` ก็ได้) — ไม่ต้องเพิ่มการ์ดใหม่

### Step 5 (Optional): จุด `dark:` variant ที่ปนกับ `isLight`
มี `dark:` variant ปน 4 จุด (บรรทัด 663, 673, 681, 766) ขณะที่ทั้งไฟล์ใช้ pattern `isLight ? ... : ...` — ทำงานได้จริง (ThemeContext ใส่ class `dark` บน `<html>`) แต่ไม่สม่ำเสมอ → เปลี่ยนเป็น ternary `isLight` ให้เหมือนทั้งไฟล์ หรือปล่อยไว้ **ไม่ block การ merge**

---

## 3. Verification (ทำครบทุกข้อ)

1. `npx tsc --noEmit` → ต้องไม่มี error เพิ่มจากเดิม (เดิมมีแค่ `UsersView.tsx(24,1) TS1131` ซึ่งไม่ใช่งานเรา)
2. ตรวจ logic ด้วยตัวอย่างเหล่านี้ (อ่านโค้ดกลับเอง ห้ามรัน test):
   - โปร `start_date = "2026-09-10T14:30"`, ตอนนี้ 09:00 ของวันเดียวกัน → ต้องขึ้นหมวด "ยังไม่เริ่ม"
   - โปร `end_date = "2026-09-10T09:30"`, ตอนนี้ 10:00 → ต้องเข้า "หมดอายุ/ปิด"
   - โปร `end_date = "2026-09-30"` (date-only) ตอนนี้ 30 ก.ย. 23:00 → ยังต้อง "active" (end-of-day) และห้ามมี badge "เริ่มในอีก 7 ชม." จาก UTC parsing อีก
3. **ห้ามรัน `npm run dev` / build / test** — ให้ห้องเจ้าของรันเอง

## 4. ห้ามแตะ (Out of Scope)

- `src/features/users/UsersView.tsx` (มี syntax error เดิม — แจ้ง owner แยก)
- `evaluateCartPromotions` / `calculateItemPromotion` (ฝั่ง POS ใช้ engine เดียวกัน จะได้ประโยชน์จาก Step 1 อัตโนมัติ ห้ามแก้ logic คิดเงิน)
- โครงสร้าง props/UI ของ `PromotionsTab.tsx` และ `CreatePromotionModal.tsx` (ห้ามแก้ format วันที่ที่ modal บันทึก)
- ไฟล์อื่นๆ ทุกไฟล์ นอกเหนือจาก 2 ไฟล์ที่ระบุ
