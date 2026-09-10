import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockPXBackend } from '../../src/mock/mockBackend.ts';

describe('MockPXBackend API Engine', () => {
  let backend: MockPXBackend;

  beforeEach(() => {
    backend = new MockPXBackend();
  });

  test('should return initial product catalog and soldier profiles', async () => {
    const products = await backend.getProducts();
    const soldiers = await backend.getSoldiers();

    assert.ok(products.length > 0);
    assert.ok(soldiers.length > 0);
    assert.equal(soldiers[0].soldier_id, 'SOL-001');
  });

  test('should look up soldier by barcode', async () => {
    const soldier = await backend.getSoldierByBarcode('BC-SOL-001');
    assert.ok(soldier);
    assert.equal(soldier?.full_name, 'พลฯ สมชาย สมหวัง');
    assert.equal(soldier?.credit_limit, 3000);
  });

  test('should process checkout order with credit balance deduction', async () => {
    const orderPayload = {
      order_id: 'ORD-TEST-001',
      soldier_id: 'SOL-001',
      items: [
        { product_id: 'PRD-001', barcode: '8850001', quantity: 2, unit_price: 15.00, subtotal: 30.00 }
      ],
      total_amount: 30.00,
      payment_method: 'CREDIT' as const,
      payment_breakdown: {
        credit_amount: 30.00,
        cash_amount: 0,
        promptpay_amount: 0
      },
      staff_user_id: 'USR-CASHIER-01',
      shift_id: 'SHF-001'
    };

    const result = await backend.createOrder(orderPayload);
    assert.equal(result.success, true);
    assert.equal(result.order_id, 'ORD-TEST-001');

    // Verify wallet updated
    const soldier = await backend.getSoldierByBarcode('BC-SOL-001');
    assert.equal(soldier?.credit_balance, 30.00); // 30 spent
    assert.equal(soldier?.remaining_credit, 2970.00); // 3000 - 30
  });

  test('should reject order if soldier credit limit exceeded', async () => {
    const orderPayload = {
      order_id: 'ORD-OVERLIMIT',
      soldier_id: 'SOL-001',
      items: [
        { product_id: 'PRD-001', barcode: '8850001', quantity: 1, unit_price: 4000.00, subtotal: 4000.00 }
      ],
      total_amount: 4000.00,
      payment_method: 'CREDIT' as const,
      payment_breakdown: {
        credit_amount: 4000.00,
        cash_amount: 0,
        promptpay_amount: 0
      },
      staff_user_id: 'USR-CASHIER-01',
      shift_id: 'SHF-001'
    };

    const result = await backend.createOrder(orderPayload);
    assert.equal(result.success, false);
    assert.match(result.error || '', /วงเงินคงเหลือไม่เพียงพอ/);
  });

  test('should top up soldier cash wallet', async () => {
    const topupResult = await backend.topupSoldierWallet('SOL-001', 500, 'CASH', 'USR-CASHIER-01');
    assert.equal(topupResult.success, true);
    assert.equal(topupResult.new_cash_balance, 500);

    const soldier = await backend.getSoldierByBarcode('BC-SOL-001');
    assert.equal(soldier?.cash_balance, 500);
  });

  test('should sync offline batch transactions cleanly', async () => {
    const batchOrders = [
      {
        order_id: 'ORD-OFFLINE-01',
        soldier_id: 'SOL-002',
        items: [{ product_id: 'PRD-001', barcode: '8850001', quantity: 1, unit_price: 15, subtotal: 15 }],
        total_amount: 15,
        payment_method: 'CASH' as const,
        payment_breakdown: { credit_amount: 0, cash_amount: 15, promptpay_amount: 0 },
        staff_user_id: 'USR-CASHIER-01',
        shift_id: 'SHF-001'
      }
    ];

    const syncResult = await backend.syncBatchOrders(batchOrders);
    assert.equal(syncResult.success, true);
    assert.equal(syncResult.synced_count, 1);
  });
});
