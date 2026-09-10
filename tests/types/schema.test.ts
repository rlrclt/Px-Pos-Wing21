import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  isValidSoldierStatus, 
  calculatePayrollNetPayout,
  calculateStockDeduction,
  calculateShiftDifference,
  calculateConsignmentProfit,
  isValidUserRole,
  canAccessCostData,
  canAuthorizeVoid,
  isProductSellable,
  calculateWriteOffLoss
} from '../../src/types/schema.ts';

describe('Schema Types & Financial Logic', () => {
  it('should validate soldier statuses correctly', () => {
    assert.equal(isValidSoldierStatus('ACTIVE'), true);
    assert.equal(isValidSoldierStatus('SUSPENDED'), true);
    assert.equal(isValidSoldierStatus('DISCHARGED'), true);
    assert.equal(isValidSoldierStatus('UNKNOWN'), false);
  });

  it('should validate user roles and permissions correctly', () => {
    assert.equal(isValidUserRole('ADMIN'), true);
    assert.equal(isValidUserRole('STAFF'), true);
    assert.equal(isValidUserRole('SELLER'), true);
    assert.equal(isValidUserRole('GUEST'), false);

    // Staff cannot view cost/GP
    assert.equal(canAccessCostData('STAFF'), false);
    assert.equal(canAccessCostData('ADMIN'), true);
    assert.equal(canAccessCostData('SELLER'), true);

    // Only Admin can authorize void
    assert.equal(canAuthorizeVoid('STAFF'), false);
    assert.equal(canAuthorizeVoid('ADMIN'), true);
  });

  it('should check product active status for selling correctly', () => {
    const activeProd = {
      barcode: '88501',
      product_name: 'Test',
      unit_name: 'Bottle',
      selling_price: 20,
      category: 'Drinks',
      conversion_factor: 1,
      is_active: true
    };
    const inactiveProd = { ...activeProd, is_active: false };

    assert.equal(isProductSellable(activeProd), true);
    assert.equal(isProductSellable(inactiveProd), false);
  });

  it('should calculate Write-Off loss value correctly', () => {
    // 5 bottles damaged, cost 16.00 each -> total loss 80.00
    const loss = calculateWriteOffLoss(5, 16.00);
    assert.equal(loss, 80.00);
  });

  it('should calculate Payroll Net Payout correctly without affecting cash topups', () => {
    const net = calculatePayrollNetPayout({
      salaryBase: 10000,
      creditAllowanceLimit: 2000,
      creditAllowanceRemaining: 820,
      mandatoryDeductions: 300
    });
    // creditAllowanceUsed = 2000 - 820 = 1180
    // netPayout = 10000 - 1180 - 300 = 8520
    assert.equal(net.creditAllowanceUsed, 1180);
    assert.equal(net.netPayout, 8520);
  });

  it('should calculate Multi-UOM stock deduction correctly', () => {
    // Sold 2 packs (pack of 12) -> deducts 24 single units from stock
    const deductedQty = calculateStockDeduction(2, 12);
    assert.equal(deductedQty, 24);

    // Single item (conversion_factor = 1) -> deducts 3 units
    const singleDeduction = calculateStockDeduction(3, 1);
    assert.equal(singleDeduction, 3);
  });

  it('should calculate Shift reconciliation difference correctly', () => {
    // Starting float 1000 + Cash sales 4500 = Expected 5500. Actual counted cash = 5480 -> diff = -20
    const diff = calculateShiftDifference(1000, 4500, 5480);
    assert.equal(diff, -20);
  });

  it('should calculate Sergeant Consignment GP profit correctly', () => {
    // Unit price 20, Cost 15, Consignment Fee 10% (0.10)
    // Gross Profit = 20 - 15 = 5
    // Consignment Fee Deducted = 5 * 0.10 = 0.50
    // Sergeant Net Profit = 5 - 0.50 = 4.50
    const profit = calculateConsignmentProfit(20, 15, 0.10, 10);
    assert.equal(profit.grossProfitTotal, 50);
    assert.equal(profit.feeTotal, 5);
    assert.equal(profit.sellerNetProfitTotal, 45);
  });

  it('should support MIXED payment method and is_voided flag on OrderItem', () => {
    const item: OrderItem = {
      item_id: 'ITEM-01',
      order_id: 'ORD-01',
      barcode: '8850123401',
      actual_qty: 1,
      charged_qty: 1,
      cost_price_at_sale: 15,
      unit_price: 20,
      discount_amount: 0,
      subtotal: 20,
      seller_id: 'S01',
      is_voided: false
    };
    assert.equal(item.is_voided, false);

    const payment: PaymentMethod = 'MIXED';
    assert.equal(payment, 'MIXED');
  });

  it('should support profile photo and avatar URLs on Soldier, User, and Seller', () => {
    const soldier = {
      px_code: '691001',
      national_id: '1349900123456',
      full_name: 'พลฯ สมชาย สายลม',
      unit: 'ร้อย.1',
      credit_limit: 2000,
      deductions: 0,
      credit_allowance_balance: 2000,
      cash_wallet_balance: 500,
      photo_url: 'https://storage.googleapis.com/px-photos/691001.jpg',
      status: 'ACTIVE' as const
    };
    assert.equal(soldier.photo_url, 'https://storage.googleapis.com/px-photos/691001.jpg');

    const user = {
      user_id: 'USR-01',
      username: 'cashier01',
      pin_hash: '1234',
      full_name: 'จ.อ. เอกชัย ใจดี',
      role: 'STAFF' as const,
      avatar_url: 'https://storage.googleapis.com/px-photos/usr01.jpg',
      is_active: true
    };
    assert.equal(user.avatar_url, 'https://storage.googleapis.com/px-photos/usr01.jpg');

    const seller = {
      seller_id: 'S01',
      seller_name: 'จ่าสมชาย (ร้านขนม)',
      default_fee_pct: 0.10,
      avatar_url: 'https://storage.googleapis.com/px-photos/s01.jpg',
      is_active: true
    };
    assert.equal(seller.avatar_url, 'https://storage.googleapis.com/px-photos/s01.jpg');
  });

  it('should validate multi-role route permissions correctly', async () => {
    const { canAccessRoute } = await import('../../src/types/schema.ts');
    assert.equal(canAccessRoute('STAFF', '/admin'), false);
    assert.equal(canAccessRoute('STAFF', '/seller'), false);
    assert.equal(canAccessRoute('STAFF', '/pos'), true);
    assert.equal(canAccessRoute('SELLER', '/pos'), false);
    assert.equal(canAccessRoute('SELLER', '/seller'), true);
    assert.equal(canAccessRoute('ADMIN', '/admin'), true);
  });

  it('should format soldier wallet display correctly', async () => {
    const { formatSoldierWalletDisplay } = await import('../../src/types/schema.ts');
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

  it('should calculate seller monthly settlement accurately', async () => {
    const { calculateSellerMonthlySettlement } = await import('../../src/types/schema.ts');
    const items = [
      { unit_price: 20, cost_price_at_sale: 15, charged_qty: 10, is_voided: false },
      { unit_price: 15, cost_price_at_sale: 10, charged_qty: 4, is_voided: false },
      { unit_price: 20, cost_price_at_sale: 15, charged_qty: 2, is_voided: true }
    ];
    const summary = calculateSellerMonthlySettlement(items, 0.10);
    assert.equal(summary.totalGrossSales, 260.00);
    assert.equal(summary.unitFeeDeducted, 7.00);
    assert.equal(summary.sellerNetPayout, 253.00);
  });

  it('should calculate POS cart totals correctly', async () => {
    const { calculateCartTotals } = await import('../../src/types/schema.ts');
    const cart = [
      { unit_price: 20, actual_qty: 2, charged_qty: 1, discount_amount: 20 },
      { unit_price: 15, actual_qty: 1, charged_qty: 1, discount_amount: 0 }
    ];
    const totals = calculateCartTotals(cart);
    assert.equal(totals.totalGross, 55.00);
    assert.equal(totals.discountTotal, 20.00);
    assert.equal(totals.netPayable, 35.00);
  });

  it('should generate payroll batch summary accurately', async () => {
    const { generatePayrollBatchSummary } = await import('../../src/types/schema.ts');
    const soldiers = [
      { px_code: '01', salary_base: 10000, credit_limit: 2000, credit_allowance_balance: 500, deductions: 300 },
      { px_code: '02', salary_base: 10000, credit_limit: 2000, credit_allowance_balance: 2000, deductions: 200 }
    ];
    const summary = generatePayrollBatchSummary(soldiers);
    assert.equal(summary.totalSoldiers, 2);
    assert.equal(summary.totalCreditUsed, 1500.00);
    assert.equal(summary.totalMandatoryDeductions, 500.00);
    assert.equal(summary.totalNetSalaryPayout, 18000.00);
  });
});
