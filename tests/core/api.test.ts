import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PXApiClient } from '../../src/core/api.ts';

describe('PXApiClient Service Gateway', () => {
  test('should default to local mock mode and fetch products & soldiers', async () => {
    const client = new PXApiClient({ mode: 'mock' });
    const products = await client.getProducts();
    const soldiers = await client.getSoldiers();

    assert.ok(products.length >= 3);
    assert.ok(soldiers.length >= 2);
  });

  test('should execute createOrder and update local wallet in mock mode', async () => {
    const client = new PXApiClient({ mode: 'mock' });
    const res = await client.createOrder({
      order_id: 'ORD-CLIENT-001',
      soldier_id: 'SOL-001',
      items: [{ product_id: 'PRD-001', barcode: '8850001', quantity: 1, unit_price: 10, subtotal: 10 }],
      total_amount: 10,
      payment_method: 'CREDIT',
      payment_breakdown: { credit_amount: 10, cash_amount: 0, promptpay_amount: 0 },
      staff_user_id: 'USR-01',
      shift_id: 'SHF-01'
    });

    assert.equal(res.success, true);
    assert.equal(res.order_id, 'ORD-CLIENT-001');

    const soldier = await client.getSoldierByBarcode('BC-SOL-001');
    assert.equal(soldier?.credit_balance, 10);
  });
});
