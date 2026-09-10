# PX ทหารใหม่ (Wing 21) - Multi-Role Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างระบบหน้าบ้าน (Frontend PWA) ครบทั้ง 4 บทบาท (Soldiers, Sellers, Staff, Admin) เชื่อมโยงกับ Google Sheets Master DB 15 ตารางและ IndexedDB ออฟไลน์

**Architecture:** สถาปัตยกรรม Single PWA Codebase (React 19 + TypeScript + Vite + TailwindCSS + Zustand + Dexie.js) รองรับ Responsive ทุกอุปกรณ์ (PC แคชเชียร์, แท็บเล็ต, มือถือทหาร/จ่า) ทำงานแบบ Local-First Offline Resilience

**Tech Stack:** React 19, TypeScript 5, Vite, Tailwind CSS 3.4, Lucide Icons, Dexie.js (IndexedDB), Zustand, Node 24 Native Test Runner

**Spec Reference:** [px_tech_stack_architecture.html](file:///Users/khamseankhampang/Desktop/yoru%20work/px_tech_stack_architecture.html) & [px_database_schema.html](file:///Users/khamseankhampang/Desktop/yoru%20work/px_database_schema.html)

## Global Constraints
- ห้ามดึงข้อมูลราคาทุนและ GP ลงหน้าจอ Staff/Soldiers (รักษาความลับทางการค้าของจ่า)
- การคำนวณเงินทั้งหมดต้องแม่นยำระดับเศษสตางค์ (2 ทศนิยม)
- ต้องรองรับการทำงานออฟไลน์ 100% ผ่าน IndexedDB และซิงค์อัตโนมัติเมื่อเน็ตต่อติด
- รองรับการสแกนบาร์โค้ดผ่าน Keyboard Wedge (< 50ms) และกล้องเว็บแคม/มือถือ

---

### Task 1: Core Routing, Layout Shell & RBAC Auth Guard

**Files:**
- Create: `src/context/AuthContext.tsx`
- Create: `src/components/layout/AppLayout.tsx`
- Create: `src/components/layout/Navbar.tsx`
- Create: `src/routes/AppRoutes.tsx`
- Modify: `src/App.tsx`
- Test: `tests/core/auth.test.ts`

**Interfaces:**
- Consumes: `User`, `UserRole` from `src/types/schema.ts`
- Produces: `useAuth()`, `<ProtectedRoute allowedRoles={[...]} />`, `<AppLayout />`

- [ ] **Step 1: Write failing test for Auth & Role-based Guard**

```typescript
// tests/core/auth.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canAccessRoute } from '../../src/types/schema.ts';

describe('RBAC Route Guard', () => {
  it('should restrict Staff from accessing Admin and Seller routes', () => {
    assert.equal(canAccessRoute('STAFF', '/admin'), false);
    assert.equal(canAccessRoute('STAFF', '/seller'), false);
    assert.equal(canAccessRoute('STAFF', '/pos'), true);
  });

  it('should restrict Seller from accessing POS Cashier and Admin', () => {
    assert.equal(canAccessRoute('SELLER', '/pos'), false);
    assert.equal(canAccessRoute('SELLER', '/admin'), false);
    assert.equal(canAccessRoute('SELLER', '/seller'), true);
  });

  it('should allow Admin access to all backoffice modules', () => {
    assert.equal(canAccessRoute('ADMIN', '/admin'), true);
    assert.equal(canAccessRoute('ADMIN', '/pos'), true);
    assert.equal(canAccessRoute('ADMIN', '/seller'), true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/core/auth.test.ts`
Expected: FAIL with `canAccessRoute is not a function`

- [ ] **Step 3: Implement `canAccessRoute` in `src/types/schema.ts`**

```typescript
export function canAccessRoute(role: UserRole, path: string): boolean {
  if (role === 'ADMIN') return true;
  if (role === 'STAFF') return path.startsWith('/pos') || path.startsWith('/kiosk');
  if (role === 'SELLER') return path.startsWith('/seller');
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/core/auth.test.ts`
Expected: PASS (1 suite, 3 tests pass)

---

### Task 2: 💂‍♂️ ฝั่งทหารใหม่ (Soldiers Kiosk & Mobile Wallet)

**Screens & Components:**
1. **Screen 1.1: Soldier Wallet Kiosk (`/kiosk`)** - สแกนบัตรทหาร ตรวจสอบยอดเงิน 2 กระเป๋า (`credit_allowance_balance` & `cash_wallet_balance`), รูปถ่ายหน้าตรง, รายการหักประจำเดือน
2. **Screen 1.2: Soldier Digital Slips (`/kiosk/history`)** - ประวัติบิลที่ซื้อหรือร่วมหาร (Party Split) พร้อมใบเสร็จดิจิทัล

**Files:**
- Create: `src/views/soldier/SoldierKioskView.tsx`
- Create: `src/views/soldier/SoldierHistoryView.tsx`
- Create: `src/components/soldier/WalletCard.tsx`
- Create: `src/components/soldier/ReceiptModal.tsx`
- Test: `tests/views/soldierWallet.test.ts`

- [ ] **Step 1: Write failing test for Soldier Wallet presentation helper**

```typescript
// tests/views/soldierWallet.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatSoldierWalletDisplay } from '../../src/types/schema.ts';

describe('Soldier Wallet Presentation', () => {
  it('should calculate total available spending power accurately', () => {
    const soldier = {
      px_code: '691042',
      national_id: '1349900123456',
      full_name: 'พลฯ สมชาย สายลม',
      unit: 'ร้อย.1',
      credit_limit: 2000,
      deductions: 300,
      credit_allowance_balance: 820.00,
      cash_wallet_balance: 200.00,
      status: 'ACTIVE' as const
    };
    const display = formatSoldierWalletDisplay(soldier);
    assert.equal(display.totalAvailable, 1020.00);
    assert.equal(display.isUsable, true);
  });

  it('should lock wallet when soldier status is SUSPENDED', () => {
    const soldier = {
      px_code: '691042',
      national_id: '1349900123456',
      full_name: 'พลฯ สมชาย สายลม',
      unit: 'ร้อย.1',
      credit_limit: 2000,
      deductions: 300,
      credit_allowance_balance: 820.00,
      cash_wallet_balance: 200.00,
      status: 'SUSPENDED' as const
    };
    const display = formatSoldierWalletDisplay(soldier);
    assert.equal(display.isUsable, false);
    assert.equal(display.statusMessage, 'ระงับการใช้จ่าย (ป่วย/กักบริเวณ)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/views/soldierWallet.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `formatSoldierWalletDisplay` in `src/types/schema.ts`**

```typescript
export function formatSoldierWalletDisplay(soldier: Soldier) {
  const totalAvailable = Number((soldier.credit_allowance_balance + soldier.cash_wallet_balance).toFixed(2));
  const isUsable = soldier.status === 'ACTIVE';
  return {
    totalAvailable,
    isUsable,
    statusMessage: isUsable ? 'พร้อมใช้งาน' : 'ระงับการใช้จ่าย (ป่วย/กักบริเวณ)'
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/views/soldierWallet.test.ts`
Expected: PASS

---

### Task 3: 🏪 ฝั่งจ่าฝากขาย (Sellers Portal)

**Screens & Components:**
1. **Screen 2.1: Seller Dashboard (`/seller`)** - สรุปยอดขายรวม, หักค่า GP กองร้อย, กำไรสุทธิที่รอโอนคืนสิ้นเดือน
2. **Screen 2.2: Seller Inventory (`/seller/stocks`)** - เช็คสต็อกคงเหลือเฉพาะสินค้าของตัวเอง, แจ้งเตือนของใกล้หมด
3. **Screen 2.3: Seller Write-Off & Stock-In (`/seller/logs`)** - ประวัติรับของเข้า และรายการสินค้าชำรุด/หมดอายุ

**Files:**
- Create: `src/views/seller/SellerDashboardView.tsx`
- Create: `src/views/seller/SellerStocksView.tsx`
- Create: `src/views/seller/SellerLogsView.tsx`
- Create: `src/components/seller/GPSummaryCard.tsx`
- Test: `tests/views/sellerPortal.test.ts`

- [ ] **Step 1: Write failing test for Seller Dashboard analytics calculation**

```typescript
// tests/views/sellerPortal.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSellerMonthlySettlement } from '../../src/types/schema.ts';

describe('Seller Portal Analytics', () => {
  it('should aggregate total sales, unit GP fee, and net payout for sergeant', () => {
    const items = [
      { unit_price: 20, cost_price_at_sale: 15, charged_qty: 10, is_voided: false },
      { unit_price: 15, cost_price_at_sale: 10, charged_qty: 4, is_voided: false },
      { unit_price: 20, cost_price_at_sale: 15, charged_qty: 2, is_voided: true } // should ignore voided
    ];
    const feePct = 0.10; // 10% GP
    const summary = calculateSellerMonthlySettlement(items, feePct);

    // Sales = 20*10 + 15*4 = 260
    // Total Cost = 15*10 + 10*4 = 190
    // Gross Profit = 260 - 190 = 70
    // Fee = 70 * 0.10 = 7.00
    // Seller Net Payout = Total Cost + (Gross Profit - Fee) = 190 + 63 = 253.00
    assert.equal(summary.totalGrossSales, 260.00);
    assert.equal(summary.unitFeeDeducted, 7.00);
    assert.equal(summary.sellerNetPayout, 253.00);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/views/sellerPortal.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `calculateSellerMonthlySettlement` in `src/types/schema.ts`**

```typescript
export function calculateSellerMonthlySettlement(
  items: Array<{ unit_price: number; cost_price_at_sale: number; charged_qty: number; is_voided?: boolean }>,
  feePct: number
) {
  let totalGrossSales = 0;
  let totalCost = 0;

  items.forEach(item => {
    if (item.is_voided) return;
    totalGrossSales += item.unit_price * item.charged_qty;
    totalCost += item.cost_price_at_sale * item.charged_qty;
  });

  const grossProfit = totalGrossSales - totalCost;
  const unitFeeDeducted = Number((grossProfit * feePct).toFixed(2));
  const sellerNetProfit = grossProfit - unitFeeDeducted;
  const sellerNetPayout = Number((totalCost + sellerNetProfit).toFixed(2));

  return {
    totalGrossSales,
    totalCost,
    grossProfit,
    unitFeeDeducted,
    sellerNetPayout
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/views/sellerPortal.test.ts`
Expected: PASS

---

### Task 4: 💳 ฝั่งแคชเชียร์หน้าร้าน (Staff / Cashier POS)

**Screens & Components:**
1. **Screen 3.1: Fast POS Terminal (`/pos`)** - ยิงบาร์โค้ด < 10ms, ตะกร้าสินค้า, Multi-UOM แพ็ค/ขวด, ตัด 2 กระเป๋า
2. **Screen 3.2: Party Mode Split Modal** - กระจายบิลหารหลายคน พร้อมเศษสตางค์เข้า Host
3. **Screen 3.3: Shift Management Modal (`/pos/shift`)** - เปิด-ปิดกะ, บันทึกเงินทอน, นับเงินสดจริง, สรุปยอดขาด/เกิน
4. **Screen 3.4: Quick Cash Topup Modal (`/pos/topup`)** - เติมเงินสดเข้ากระเป๋าทหารหน้าร้าน

**Files:**
- Create: `src/views/pos/PosTerminalView.tsx`
- Create: `src/components/pos/ProductGrid.tsx`
- Create: `src/components/pos/CartSidebar.tsx`
- Create: `src/components/pos/PartySplitModal.tsx`
- Create: `src/components/pos/ShiftReconciliationModal.tsx`
- Create: `src/components/pos/CashTopupModal.tsx`
- Test: `tests/views/posTerminal.test.ts`

- [ ] **Step 1: Write failing test for POS Cart & Multi-UOM deduction check**

```typescript
// tests/views/posTerminal.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCartTotals } from '../../src/types/schema.ts';

describe('POS Cart Calculations', () => {
  it('should calculate cart total with BOGO discount and UOM factor properly', () => {
    const cart = [
      { barcode: '88501', unit_price: 20, actual_qty: 2, charged_qty: 1, discount_amount: 20 }, // BOGO
      { barcode: '88502', unit_price: 15, actual_qty: 1, charged_qty: 1, discount_amount: 0 }
    ];
    const totals = calculateCartTotals(cart);
    assert.equal(totals.totalGross, 55.00); // (20*2) + 15
    assert.equal(totals.discountTotal, 20.00);
    assert.equal(totals.netPayable, 35.00);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/views/posTerminal.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `calculateCartTotals` in `src/types/schema.ts`**

```typescript
export function calculateCartTotals(items: Array<{ unit_price: number; actual_qty: number; charged_qty: number; discount_amount: number }>) {
  let totalGross = 0;
  let discountTotal = 0;

  items.forEach(item => {
    totalGross += item.unit_price * item.actual_qty;
    discountTotal += item.discount_amount;
  });

  const netPayable = Number((totalGross - discountTotal).toFixed(2));
  return { totalGross, discountTotal, netPayable };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/views/posTerminal.test.ts`
Expected: PASS

---

### Task 5: 🛡️ ฝั่งผู้ดูแลระบบ (Admin Backoffice)

**Screens & Components:**
1. **Screen 4.1: Catalog & Inventory Backoffice (`/admin/products`)** - จัดการสินค้า, เปิด/ปิดขาย, ผูก Multi-UOM, ตัดจ่ายชำรุด
2. **Screen 4.2: Soldier & Batch Management (`/admin/soldiers`)** - นำเข้าทะเบียนทหารใหม่, ตั้งค่าวงเงินผลัด, เปลี่ยนสถานะ
3. **Screen 4.3: Payroll Export Engine (`/admin/payroll`)** - สรุปยอดตัดเงินเดือนส่งฝ่ายการเงินกองบิน 21 (Excel/PDF)
4. **Screen 4.4: Void & Refund Security Desk (`/admin/voids`)** - ตรวจสอบและอนุมัติยกเลิกบิล พร้อม Audit Log

**Files:**
- Create: `src/views/admin/ProductManagementView.tsx`
- Create: `src/views/admin/SoldierBatchView.tsx`
- Create: `src/views/admin/PayrollExportView.tsx`
- Create: `src/views/admin/VoidApprovalView.tsx`
- Create: `src/components/admin/AdminHeader.tsx`
- Test: `tests/views/adminBackoffice.test.ts`

- [ ] **Step 1: Write failing test for Payroll Export batch aggregator**

```typescript
// tests/views/adminBackoffice.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generatePayrollBatchSummary } from '../../src/types/schema.ts';

describe('Admin Payroll Export Engine', () => {
  it('should calculate grand total deductions and salary payouts for entire wing battalion', () => {
    const soldiers = [
      { px_code: '01', salary_base: 10000, credit_limit: 2000, credit_allowance_balance: 500, deductions: 300 }, // used 1500 + 300 = 1800 -> payout 8200
      { px_code: '02', salary_base: 10000, credit_limit: 2000, credit_allowance_balance: 2000, deductions: 200 } // used 0 + 200 = 200 -> payout 9800
    ];
    const summary = generatePayrollBatchSummary(soldiers);
    assert.equal(summary.totalSoldiers, 2);
    assert.equal(summary.totalCreditUsed, 1500.00);
    assert.equal(summary.totalMandatoryDeductions, 500.00);
    assert.equal(summary.totalNetSalaryPayout, 18000.00);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/views/adminBackoffice.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `generatePayrollBatchSummary` in `src/types/schema.ts`**

```typescript
export function generatePayrollBatchSummary(
  soldiers: Array<{ px_code: string; salary_base: number; credit_limit: number; credit_allowance_balance: number; deductions: number }>
) {
  let totalCreditUsed = 0;
  let totalMandatoryDeductions = 0;
  let totalNetSalaryPayout = 0;

  soldiers.forEach(s => {
    const creditUsed = s.credit_limit - s.credit_allowance_balance;
    const netPayout = s.salary_base - creditUsed - s.deductions;
    totalCreditUsed += creditUsed;
    totalMandatoryDeductions += s.deductions;
    totalNetSalaryPayout += netPayout;
  });

  return {
    totalSoldiers: soldiers.length,
    totalCreditUsed: Number(totalCreditUsed.toFixed(2)),
    totalMandatoryDeductions: Number(totalMandatoryDeductions.toFixed(2)),
    totalNetSalaryPayout: Number(totalNetSalaryPayout.toFixed(2))
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/views/adminBackoffice.test.ts`
Expected: PASS

---

### Task 6: Full System Verification & Regression Suite

**Files:**
- Test: `tests/**/*.test.ts`

- [ ] **Step 1: Execute all unit tests across all 4 user roles**

Run: `node --experimental-strip-types --test tests/**/*.test.ts`
Expected: 100% PASS with 0 failures

- [ ] **Step 2: Commit complete implementation plan**

```bash
git add docs/superpowers/plans/2026-09-08-px-multi-role-frontend.md src/types/schema.ts tests/
git commit -m "docs: create multi-role frontend implementation plan and helper functions"
```
