import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitBillEqually, validatePartySplit, allocateCustomSplit } from '../../src/core/partySplitter.ts';

describe('Party Split Bill Engine', () => {
  it('should split 100 baht among 3 participants with satang remainder given to host', () => {
    const result = splitBillEqually({
      orderId: 'ORD-001',
      totalAmount: 100.00,
      hostCode: 'W21-001',
      participantCodes: ['W21-001', 'W21-002', 'W21-003'],
      paymentMethod: 'CREDIT'
    });

    assert.equal(result.splits.length, 3);
    
    // Host gets 33.34
    const hostSplit = result.splits.find(s => s.participant_code === 'W21-001');
    assert.equal(hostSplit?.amount_assigned, 33.34);

    // Other two get 33.33 each
    const otherSplits = result.splits.filter(s => s.participant_code !== 'W21-001');
    assert.equal(otherSplits[0].amount_assigned, 33.33);
    assert.equal(otherSplits[1].amount_assigned, 33.33);

    // Total must match exactly 100.00
    const sum = result.splits.reduce((acc, s) => acc + s.amount_assigned, 0);
    assert.equal(Number(sum.toFixed(2)), 100.00);
  });

  it('should split 70 baht evenly among 2 participants without remainder', () => {
    const result = splitBillEqually({
      orderId: 'ORD-002',
      totalAmount: 70.00,
      hostCode: 'W21-001',
      participantCodes: ['W21-001', 'W21-002'],
      paymentMethod: 'CREDIT'
    });

    assert.equal(result.splits[0].amount_assigned, 35.00);
    assert.equal(result.splits[1].amount_assigned, 35.00);
  });

  it('should validate party split total matches order total exactly', () => {
    const splits = [
      { split_id: 'S1', order_id: 'O1', participant_code: 'W1', split_type: 'EQUAL' as const, amount_assigned: 33.34, payment_method: 'CREDIT' as const, is_paid: true },
      { split_id: 'S2', order_id: 'O1', participant_code: 'W2', split_type: 'EQUAL' as const, amount_assigned: 33.33, payment_method: 'CREDIT' as const, is_paid: true },
      { split_id: 'S3', order_id: 'O1', participant_code: 'W3', split_type: 'EQUAL' as const, amount_assigned: 33.33, payment_method: 'CREDIT' as const, is_paid: true }
    ];
    assert.equal(validatePartySplit(splits, 100.00), true);
    assert.equal(validatePartySplit(splits, 99.00), false);
  });

  it('should handle custom fixed amounts and check balance', () => {
    const result = allocateCustomSplit({
      orderId: 'ORD-003',
      totalAmount: 150.00,
      hostCode: 'W21-001',
      customAllocations: [
        { participantCode: 'W21-001', amount: 50.00, paymentMethod: 'CREDIT' },
        { participantCode: 'W21-002', amount: 100.00, paymentMethod: 'CASH' }
      ]
    });

    assert.equal(result.isValid, true);
    assert.equal(result.splits.length, 2);
  });
});
