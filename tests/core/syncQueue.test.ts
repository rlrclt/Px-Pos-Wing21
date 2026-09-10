import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SyncQueueManager } from '../../src/core/syncQueue.ts';

describe('Offline Sync Queue Manager', () => {
  it('should enqueue orders and prevent duplicates by order_id', () => {
    const queue = new SyncQueueManager();
    const item1 = { orderId: 'ORD-001', payload: { test: 1 } };
    const item2 = { orderId: 'ORD-001', payload: { test: 2 } };
    const item3 = { orderId: 'ORD-002', payload: { test: 3 } };

    assert.equal(queue.enqueue(item1), true);
    assert.equal(queue.enqueue(item2), false); // duplicate
    assert.equal(queue.enqueue(item3), true);
    assert.equal(queue.getQueueLength(), 2);
  });

  it('should process queued items sequentially and remove on success', async () => {
    const queue = new SyncQueueManager();
    queue.enqueue({ orderId: 'ORD-001', payload: { name: 'A' } });
    queue.enqueue({ orderId: 'ORD-002', payload: { name: 'B' } });

    const processed: string[] = [];
    const mockSender = async (item: { orderId: string; payload: any }) => {
      processed.push(item.orderId);
      return { success: true };
    };

    const result = await queue.flush(mockSender);
    assert.equal(result.syncedCount, 2);
    assert.equal(result.failedCount, 0);
    assert.deepEqual(processed, ['ORD-001', 'ORD-002']);
    assert.equal(queue.getQueueLength(), 0);
  });

  it('should retain failed items for retry and increment retry count', async () => {
    const queue = new SyncQueueManager();
    queue.enqueue({ orderId: 'ORD-FAIL', payload: {} });

    const mockFailingSender = async () => {
      throw new Error('Network offline');
    };

    const result = await queue.flush(mockFailingSender);
    assert.equal(result.syncedCount, 0);
    assert.equal(result.failedCount, 1);
    assert.equal(queue.getQueueLength(), 1);

    const queuedItem = queue.peek();
    assert.equal(queuedItem?.retryCount, 1);
  });
});
