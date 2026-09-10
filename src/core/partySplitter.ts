import type { OrderSplit, PaymentMethod } from '../types/schema.ts';

export interface EqualSplitRequest {
  orderId: string;
  totalAmount: number;
  hostCode: string;
  participantCodes: string[];
  paymentMethod: PaymentMethod;
}

export interface CustomAllocation {
  participantCode: string;
  amount: number;
  paymentMethod: PaymentMethod;
}

export interface CustomSplitRequest {
  orderId: string;
  totalAmount: number;
  hostCode: string;
  customAllocations: CustomAllocation[];
}

/**
 * Splits bill equally among participants, allocating any satang rounding remainder to the Host.
 */
export function splitBillEqually(req: EqualSplitRequest): { splits: OrderSplit[]; remainder: number } {
  const count = req.participantCodes.length;
  if (count === 0) {
    throw new Error('Participant list cannot be empty');
  }

  // Base amount rounded down to 2 decimal places (in cents/satangs)
  const totalCents = Math.round(req.totalAmount * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - (baseCents * count);

  const splits: OrderSplit[] = req.participantCodes.map((code, index) => {
    const isHost = code === req.hostCode;
    // Remainder added to host
    const assignedCents = baseCents + (isHost ? remainderCents : 0);
    const amountAssigned = Number((assignedCents / 100).toFixed(2));

    return {
      split_id: `SPLIT-${req.orderId}-${index + 1}`,
      order_id: req.orderId,
      participant_code: code,
      split_type: 'EQUAL',
      amount_assigned: amountAssigned,
      payment_method: req.paymentMethod,
      is_paid: false
    };
  });

  return {
    splits,
    remainder: Number((remainderCents / 100).toFixed(2))
  };
}

/**
 * Validates if the sum of all splits strictly equals the order total.
 */
export function validatePartySplit(splits: OrderSplit[], expectedTotal: number): boolean {
  const sum = splits.reduce((acc, s) => acc + Math.round(s.amount_assigned * 100), 0);
  const expected = Math.round(expectedTotal * 100);
  return sum === expected;
}

/**
 * Custom split allocation with exact validation.
 */
export function allocateCustomSplit(req: CustomSplitRequest): {
  splits: OrderSplit[];
  isValid: boolean;
  difference: number;
} {
  const splits: OrderSplit[] = req.customAllocations.map((alloc, idx) => ({
    split_id: `SPLIT-${req.orderId}-${idx + 1}`,
    order_id: req.orderId,
    participant_code: alloc.participantCode,
    split_type: 'FIXED',
    amount_assigned: Number(alloc.amount.toFixed(2)),
    payment_method: alloc.paymentMethod,
    is_paid: false
  }));

  const sumCents = splits.reduce((acc, s) => acc + Math.round(s.amount_assigned * 100), 0);
  const expectedCents = Math.round(req.totalAmount * 100);
  const diffCents = sumCents - expectedCents;

  return {
    splits,
    isValid: diffCents === 0,
    difference: Number((diffCents / 100).toFixed(2))
  };
}
