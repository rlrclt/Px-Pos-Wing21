# PX ทหารใหม่ (Wing 21) - Database Schema & Core Architecture Implementation Plan (v3.1 Catalog-Split Edition)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ออกแบบและสร้างโครงสร้างฐานข้อมูล (Database Schema) บน Google Sheets และโมเดลตรรกะฝั่ง TypeScript/Frontend สำหรับระบบ PX หน่วยฝึกทหารใหม่ กองบิน 21 แบบแยก `Product_Catalog` และ `Inventory_Stocks` เพื่อความเร็วสูงสุดและปิดช่องโหว่ความลับทางการเงินของจ่า

**Key Architecture Upgrades (v3.1):**
1. **Catalog & Inventory Decoupling:** แยก `Product_Catalog` (หน้าร้านโหลด 0.1s ซ่อนต้นทุน) ออกจาก `Inventory_Stocks` (คลังสต็อกและบัญชีกำไรจ่า) เชื่อมโยงด้วย `barcode` Ref
2. **Historical Cost Snapshot:** ตาราง `Order_Items_*` บันทึก `cost_price_at_sale` เพื่อล็อคต้นทุนกำไรของจ่า ณ วินาทีที่ขายจริง
3. **Two-Wallet Architecture:** แยกกระเป๋า `credit_allowance_balance` (สวัสดิการหักเงินเดือน) กับ `cash_wallet_balance` (เงินสดเติม) ป้องกันสูตรหักเงินเดือนเพี้ยน
4. **Multi-UOM Engine:** รองรับ `parent_barcode` และ `conversion_factor` สำหรับตัดสต็อกสินค้าแพ็ค/ลัง เชื่อมโยงสต็อกขวดเดี่ยวอัตโนมัติ
5. **Payroll Settlement Table:** ตาราง `Payroll_Settlement_*` พร้อมเลขบัตร ปชช. 13 หลัก (`national_id`) ส่งฝ่ายการเงินกองบินตัดเงินเดือนสุทธิได้ทันที

**Spec Reference:** `ออกแบบระบบและโฟลว์ PX ทหารใหม่.pdf` & `px_database_schema.html`

## Global Constraints
- โครงสร้างคอลัมน์และ Header ต้องตรงตาม Master Schema ใน `px_database_schema.html` ห้ามสลับลำดับ
- ทุก Table ที่เป็นส่วนเฉพาะผลัด ต้องขึ้นต้นด้วยชื่อตารางตามด้วย `_YYYY_B` เช่น `Soldiers_2569_1`, `Credit_Logs_2569_1`, `Shifts_2569_1`, `Payroll_2569_1`
- การคำนวณเงินและปัดเศษใน Party Split Bill: เศษสตางค์ที่เหลือจากการหารต้องปัดเข้า Host (ผู้ซื้อหลัก) เสมอ
- การบันทึกบิลต้องใช้ Transaction Lock ผ่าน `LockService.getScriptLock()` รอคิวสูงสุด 10 วินาที

---

### Task 1: TypeScript Data Models & Multi-Wallet Business Logic

**Files:**
- Create: `src/types/schema.ts`
- Test: `tests/types/schema.test.ts`

**Interfaces:**
- Produces: `Soldier`, `ProductCatalog`, `InventoryStock`, `StockInLog`, `Seller`, `Promotion`, `Order`, `OrderSplit`, `OrderItem`, `BatchConfig`, `CreditLog`, `Shift`, `PayrollSettlement`, `VoidLog`

- [ ] **Step 1: Write the failing test for schema validation, Two-Wallet deduction, and Payroll settlement**

```typescript
import { describe, it, expect } from 'vitest';
import { 
  isValidSoldierStatus, 
  calculatePayrollNetPayout,
  calculateStockDeduction
} from '../../src/types/schema';

describe('Schema Types & Financial Logic', () => {
  it('should calculate Payroll Net Payout correctly without affecting cash topups', () => {
    const net = calculatePayrollNetPayout({
      salaryBase: 10000,
      creditAllowanceLimit: 2000,
      creditAllowanceRemaining: 820,
      mandatoryDeductions: 300
    });
    expect(net.creditAllowanceUsed).toBe(1180);
    expect(net.netPayout).toBe(8520);
  });

  it('should calculate Multi-UOM stock deduction correctly', () => {
    const deductedQty = calculateStockDeduction(2, 12);
    expect(deductedQty).toBe(24);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/types/schema.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation in `src/types/schema.ts`**

```typescript
export type SoldierStatus = 'ACTIVE' | 'SUSPENDED' | 'DISCHARGED';
export type PaymentMethod = 'CREDIT' | 'CASH' | 'TRANSFER';
export type PromoType = 'BOGO' | 'DISCOUNT_PCT' | 'CLEARANCE' | 'NONE';
export type SplitType = 'EQUAL' | 'FIXED' | 'PERCENT';
export type OrderStatus = 'COMPLETED' | 'VOIDED';
export type ShiftStatus = 'OPEN' | 'CLOSED';
export type CreditTxnType = 'TOPUP' | 'DEDUCT' | 'REFUND';

export interface Soldier {
  px_code: string;
  national_id: string;
  full_name: string;
  unit: string;
  credit_limit: number;
  deductions: number;
  credit_allowance_balance: number;
  cash_wallet_balance: number;
  status: SoldierStatus;
}

export interface ProductCatalog {
  barcode: string;
  product_name: string;
  image_url?: string;
  unit_name: string;
  selling_price: number;
  category: string;
  plu_code?: string;
  parent_barcode?: string;
  conversion_factor: number;
  is_service: boolean;
  is_active: boolean;
}

export interface InventoryStock {
  barcode: string;
  stock_qty: number;
  cost_price: number;
  seller_id: string;
  consignment_fee_pct: number;
  low_stock_threshold: number;
  last_restocked_at?: string;
}

export interface OrderItem {
  item_id: string;
  order_id: string;
  barcode: string;
  actual_qty: number;
  charged_qty: number;
  cost_price_at_sale: number;
  unit_price: number;
  discount_amount: number;
  subtotal: number;
  seller_id: string;
}

export interface PayrollSettlement {
  settlement_id: string;
  px_code: string;
  national_id: string;
  salary_base: number;
  total_credit_used: number;
  mandatory_deductions: number;
  net_salary_payout: number;
  status: 'PENDING' | 'EXPORTED' | 'CLEARED';
  cleared_at?: string;
}

export function isValidSoldierStatus(status: string): status is SoldierStatus {
  return ['ACTIVE', 'SUSPENDED', 'DISCHARGED'].includes(status);
}

export function calculatePayrollNetPayout(params: {
  salaryBase: number;
  creditAllowanceLimit: number;
  creditAllowanceRemaining: number;
  mandatoryDeductions: number;
}) {
  const creditAllowanceUsed = Math.max(0, params.creditAllowanceLimit - params.creditAllowanceRemaining);
  const netPayout = params.salaryBase - creditAllowanceUsed - params.mandatoryDeductions;
  return {
    creditAllowanceUsed,
    netPayout
  };
}

export function calculateStockDeduction(quantitySold: number, conversionFactor: number = 1): number {
  return quantitySold * conversionFactor;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/types/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/types/schema.ts tests/types/schema.test.ts
git commit -m "feat(schema): add Product_Catalog & Inventory_Stocks separation in TypeScript models"
```
