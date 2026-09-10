export interface QueuedItem<T = any> {
  orderId: string;
  payload: T;
  retryCount: number;
  enqueuedAt: string;
}

export type SyncSender<T = any> = (item: QueuedItem<T>) => Promise<{ success: boolean; data?: any }>;

export class SyncQueueManager<T = any> {
  private queue: QueuedItem<T>[] = [];
  private orderIdSet: Set<string> = new Set();

  /**
   * Enqueues an item for background sync. Returns false if orderId already exists in queue.
   */
  public enqueue(item: { orderId: string; payload: T }): boolean {
    if (this.orderIdSet.has(item.orderId)) {
      return false;
    }

    const queuedItem: QueuedItem<T> = {
      orderId: item.orderId,
      payload: item.payload,
      retryCount: 0,
      enqueuedAt: new Date().toISOString()
    };

    this.queue.push(queuedItem);
    this.orderIdSet.add(item.orderId);
    return true;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public peek(): QueuedItem<T> | undefined {
    return this.queue[0];
  }

  /**
   * Sequentially flushes all queued items using the provided sender function.
   */
  public async flush(sender: SyncSender<T>): Promise<{ syncedCount: number; failedCount: number }> {
    let syncedCount = 0;
    let failedCount = 0;
    const remainingQueue: QueuedItem<T>[] = [];

    for (const item of this.queue) {
      try {
        const res = await sender(item);
        if (res.success) {
          syncedCount++;
          this.orderIdSet.delete(item.orderId);
        } else {
          item.retryCount++;
          failedCount++;
          remainingQueue.push(item);
        }
      } catch (err) {
        item.retryCount++;
        failedCount++;
        remainingQueue.push(item);
      }
    }

    this.queue = remainingQueue;
    return { syncedCount, failedCount };
  }

  public clear(): void {
    this.queue = [];
    this.orderIdSet.clear();
  }
}
