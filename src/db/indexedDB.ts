import Dexie, { type Table } from 'dexie';
import type { ProductCatalog, Soldier, Order, OrderItem, OrderSplit } from '../types/schema.ts';

export interface LocalOfflineOrder {
  order_id: string;
  order: Order;
  items: OrderItem[];
  splits: OrderSplit[];
  created_at: string;
  retry_count: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  error_message?: string;
}

export class PXDatabase extends Dexie {
  catalog!: Table<ProductCatalog, string>;
  soldiers!: Table<Soldier, string>;
  syncQueue!: Table<LocalOfflineOrder, string>;

  constructor() {
    super('PX_Wing21_LocalDB');
    this.version(1).stores({
      catalog: 'barcode, product_name, category, parent_barcode, is_active',
      soldiers: 'px_code, national_id, full_name, unit, status',
      syncQueue: 'order_id, created_at, status, retry_count'
    });
  }
}

export const db = new PXDatabase();

// Helper Functions
export async function cacheCatalogLocally(items: ProductCatalog[]): Promise<void> {
  await db.catalog.clear();
  await db.catalog.bulkPut(items);
}

export async function searchLocalCatalog(query: string): Promise<ProductCatalog[]> {
  if (!query.trim()) {
    return await db.catalog.where('is_active').equals(1 as any).toArray();
  }
  const q = query.toLowerCase();
  return await db.catalog
    .filter(item => 
      Boolean(item.is_active) && 
      (item.barcode.toLowerCase().includes(q) || item.product_name.toLowerCase().includes(q))
    )
    .toArray();
}

export async function enqueueOfflineOrder(
  order: Order,
  items: OrderItem[],
  splits: OrderSplit[] = []
): Promise<void> {
  const existing = await db.syncQueue.get(order.order_id);
  if (existing) return;

  await db.syncQueue.put({
    order_id: order.order_id,
    order,
    items,
    splits,
    created_at: new Date().toISOString(),
    retry_count: 0,
    status: 'PENDING'
  });
}

export async function getPendingOfflineOrders(): Promise<LocalOfflineOrder[]> {
  return await db.syncQueue.where('status').equals('PENDING').toArray();
}

export async function removeSyncedOrder(orderId: string): Promise<void> {
  await db.syncQueue.delete(orderId);
}
