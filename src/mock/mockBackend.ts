import type { Soldier, ProductCatalog, Seller, PaymentMethod, User, Promotion, AuthUser } from '../types/schema.ts';

export interface CreateOrderPayload {
  order_id: string;
  soldier_id: string;
  items: Array<{
    product_id: string;
    barcode: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_breakdown: {
    credit_amount: number;
    cash_amount: number;
    promptpay_amount: number;
  };
  staff_user_id: string;
  shift_id: string;
}

export class MockPXBackend {
  private users: User[] = [
    {
      user_id: 'USR-01',
      username: 'admin',
      pin_hash: '1234',
      full_name: 'ผู้ดูแลระบบส่วนกลาง (HQ Admin)',
      role: 'ADMIN',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      is_active: true
    },
    {
      user_id: 'USR-02',
      username: 'seller_s01',
      pin_hash: '1234',
      full_name: 'จ.ส.อ. สมชาย บุญมี (ร้านสวัสดิการ S01)',
      role: 'SELLER',
      seller_id: 'S01',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      is_active: true
    },
    {
      user_id: 'USR-03',
      username: 'seller_s02',
      pin_hash: '1234',
      full_name: 'จ.อ. ประสิทธิ์ มีสุข (ครัวจ่าเอก S02)',
      role: 'SELLER',
      seller_id: 'S02',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      is_active: true
    }
  ];

  private products: ProductCatalog[] = [
    {
      barcode: '8850001',
      product_name: 'น้ำดื่มสิงห์ 600ml',
      unit_name: 'ขวด',
      selling_price: 10.00,
      category: 'เครื่องดื่ม',
      conversion_factor: 1,
      is_active: true
    },
    {
      barcode: '8850002',
      product_name: 'โออิชิ ชาเขียว รสต้นตำรับ 350ml',
      unit_name: 'ขวด',
      selling_price: 20.00,
      category: 'เครื่องดื่ม',
      conversion_factor: 1,
      is_active: true
    },
    {
      barcode: '8850003',
      product_name: 'ผัดกะเพราหมูกรอบไข่ดาว (จ่าเอก)',
      unit_name: 'จาน',
      selling_price: 50.00,
      category: 'อาหารตามสั่ง',
      conversion_factor: 1,
      is_active: true
    }
  ];

  private soldiers: (Soldier & { remaining_credit: number; cash_balance: number; credit_balance: number; soldier_id: string })[] = [
    {
      soldier_id: 'SOL-001',
      px_code: 'BC-SOL-001',
      national_id: '1234567890123',
      full_name: 'พลฯ สมชาย สมหวัง',
      unit: 'ร้อย 1',
      credit_limit: 3000.00,
      deductions: 0,
      credit_allowance_balance: 3000.00,
      credit_balance: 0.00,
      remaining_credit: 3000.00,
      cash_wallet_balance: 0.00,
      cash_balance: 0.00,
      status: 'ACTIVE',
      photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    },
    {
      soldier_id: 'SOL-002',
      px_code: 'BC-SOL-002',
      national_id: '1234567890124',
      full_name: 'พลฯ สมนึก นึกดี',
      unit: 'ร้อย 2',
      credit_limit: 3000.00,
      deductions: 0,
      credit_allowance_balance: 2850.00,
      credit_balance: 150.00,
      remaining_credit: 2850.00,
      cash_wallet_balance: 50.00,
      cash_balance: 50.00,
      status: 'ACTIVE',
      photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    }
  ];

  private sellers: Seller[] = [
    {
      seller_id: 'S01',
      seller_name: 'ร้านค้าสวัสดิการ กองบิน 21',
      contact_info: '081-111-2222',
      default_fee_pct: 0,
      is_active: true
    },
    {
      seller_id: 'S02',
      seller_name: 'ครัวจ่าเอก ตามสั่ง',
      contact_info: '089-999-8888',
      default_fee_pct: 0.10,
      is_active: true
    }
  ];

  private orders: any[] = [];
  private topups: any[] = [];
  private promotions: Promotion[] = [];

  // ------------------------------------
  // User Management Methods
  // ------------------------------------
  async getUsers(): Promise<User[]> {
    return [...this.users];
  }

  async createUser(user: User): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!user.username || !user.pin_hash || !user.full_name) {
      return { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน (Username, PIN, ชื่อ-สกุล)' };
    }
    const existing = this.users.find(u => u.username === user.username);
    if (existing) {
      return { success: false, error: `Username '${user.username}' มีอยู่ในระบบแล้ว` };
    }
    const newUser: User = {
      ...user,
      user_id: user.user_id || `USR-${String(this.users.length + 1).padStart(2, '0')}`,
      is_active: user.is_active !== undefined ? user.is_active : true
    };
    this.users.push(newUser);
    return { success: true, user: newUser };
  }

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    const idx = this.users.findIndex(u => u.user_id === userId);
    if (idx === -1) {
      return { success: false, error: 'ไม่พบผู้ใช้ที่ต้องการลบ' };
    }
    this.users.splice(idx, 1);
    return { success: true };
  }

  async toggleUserActive(userId: string): Promise<{ success: boolean; is_active?: boolean; error?: string }> {
    const user = this.users.find(u => u.user_id === userId);
    if (!user) {
      return { success: false, error: 'ไม่พบผู้ใช้' };
    }
    user.is_active = !user.is_active;
    return { success: true, is_active: user.is_active };
  }

  async login(username: string, pin: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    const normalizedUsername = (username || '').trim().toLowerCase();
    const user = this.users.find(u => u.username.toLowerCase() === normalizedUsername && u.pin_hash === pin);

    if (!user) {
      return { success: false, error: 'ชื่อผู้ใช้งานหรือรหัส PIN ไม่ถูกต้อง' };
    }

    if (user.is_active === false) {
      return { success: false, error: 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน' };
    }

    const authUser: AuthUser = {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      seller_id: user.seller_id,
      avatar_url: user.avatar_url,
      is_active: user.is_active
    };

    return { success: true, user: authUser };
  }

  // ------------------------------------
  // Catalog & Soldier Methods
  // ------------------------------------
  async getProducts(): Promise<ProductCatalog[]> {
    return [...this.products];
  }

  async getSoldiers(): Promise<(Soldier & { remaining_credit: number; cash_balance: number; credit_balance: number; soldier_id: string })[]> {
    return [...this.soldiers];
  }

  async getSellers(): Promise<Seller[]> {
    return [...this.sellers];
  }

  async createSeller(seller: Partial<Seller>): Promise<{ success: boolean; data?: Seller; error?: string }> {
    if (!seller.seller_name) return { success: false, error: 'กรุณาระบุชื่อผู้ฝากขาย' };
    
    let newId = seller.seller_id?.trim().toUpperCase();
    if (!newId) {
      const existingNums = this.sellers
        .map(s => parseInt(s.seller_id.replace(/^S/i, ''), 10))
        .filter(n => !isNaN(n));
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      newId = `S${String(nextNum).padStart(2, '0')}`;
    }

    if (this.sellers.some(s => s.seller_id.toUpperCase() === newId)) {
      return { success: false, error: `รหัสผู้ฝากขาย "${newId}" มีอยู่ในระบบแล้ว` };
    }

    const created: Seller = {
      seller_id: newId,
      seller_name: seller.seller_name.trim(),
      contact_info: seller.contact_info?.trim() || '',
      default_fee_pct: Number(seller.default_fee_pct) || 0,
      avatar_url: seller.avatar_url?.trim() || '',
      is_active: seller.is_active !== undefined ? seller.is_active : true,
      created_at: new Date().toISOString()
    };

    this.sellers.push(created);
    return { success: true, data: created };
  }

  async updateSeller(sellerId: string, updates: Partial<Seller>): Promise<{ success: boolean; data?: Seller; error?: string }> {
    const index = this.sellers.findIndex(s => s.seller_id === sellerId);
    if (index === -1) return { success: false, error: 'ไม่พบข้อมูลผู้ฝากขาย' };

    this.sellers[index] = {
      ...this.sellers[index],
      ...updates,
      seller_id: sellerId,
      updated_at: new Date().toISOString()
    };

    if (updates.is_active !== undefined) {
      const isActive = updates.is_active !== false;
      this.products = this.products.map(p => {
        if (p.seller_id === sellerId) {
          return { ...p, is_active: isActive };
        }
        return p;
      });
    }

    return { success: true, data: this.sellers[index] };
  }

  async deleteSeller(sellerId: string, cascadeProducts: boolean = true): Promise<{ success: boolean; deletedProductsCount?: number; error?: string }> {
    if (sellerId === 'S01') {
      return { success: false, error: 'ไม่อนุญาตให้ลบร้านค้าส่วนกลาง (S01)' };
    }

    const index = this.sellers.findIndex(s => s.seller_id === sellerId);
    if (index === -1) return { success: false, error: 'ไม่พบข้อมูลผู้ฝากขาย' };

    this.sellers.splice(index, 1);

    let deletedCount = 0;
    if (cascadeProducts) {
      const prevCount = this.products.length;
      this.products = this.products.filter(p => p.seller_id !== sellerId);
      deletedCount = prevCount - this.products.length;
    }

    return { success: true, deletedProductsCount: deletedCount };
  }

  async getSoldierByBarcode(barcode: string): Promise<(Soldier & { remaining_credit: number; cash_balance: number; credit_balance: number; soldier_id: string }) | null> {
    const soldier = this.soldiers.find(s => s.px_code === barcode || s.soldier_id === barcode);
    return soldier ? { ...soldier } : null;
  }

  async saveSoldier(soldier: Partial<Soldier & { soldier_id?: string }>): Promise<{ success: boolean; data?: Soldier; error?: string; message?: string }> {
    const pxCode = (soldier.px_code || soldier.soldier_id || '').trim();
    if (!pxCode || !soldier.full_name) {
      return { success: false, error: 'กรุณาระบุรหัส PX และชื่อ-นามสกุล' };
    }

    const idx = this.soldiers.findIndex(s => s.px_code === pxCode || s.soldier_id === pxCode);
    const creditLimit = Number(soldier.credit_limit) >= 0 ? Number(soldier.credit_limit) : 2000;
    const deductions = Number(soldier.deductions) >= 0 ? Number(soldier.deductions) : 0;

    if (idx !== -1) {
      const existing = this.soldiers[idx];
      const updated: any = {
        ...existing,
        ...soldier,
        px_code: pxCode,
        credit_limit: creditLimit,
        deductions: deductions,
        remaining_credit: soldier.credit_allowance_balance !== undefined ? Number(soldier.credit_allowance_balance) : existing.remaining_credit,
        credit_allowance_balance: soldier.credit_allowance_balance !== undefined ? Number(soldier.credit_allowance_balance) : existing.credit_allowance_balance,
        cash_wallet_balance: soldier.cash_wallet_balance !== undefined ? Number(soldier.cash_wallet_balance) : existing.cash_wallet_balance,
        cash_balance: soldier.cash_wallet_balance !== undefined ? Number(soldier.cash_wallet_balance) : existing.cash_balance
      };
      this.soldiers[idx] = updated;
      return { success: true, data: updated, message: `อัปเดตข้อมูล ${soldier.full_name} เรียบร้อย` };
    } else {
      const newSoldier: any = {
        soldier_id: pxCode,
        px_code: pxCode,
        national_id: soldier.national_id || '',
        full_name: soldier.full_name,
        unit: soldier.unit || 'ร้อย 1',
        credit_limit: creditLimit,
        deductions: deductions,
        credit_allowance_balance: creditLimit,
        credit_balance: 0,
        remaining_credit: creditLimit,
        cash_wallet_balance: 0,
        cash_balance: 0,
        photo_url: soldier.photo_url || '',
        status: soldier.status || 'ACTIVE'
      };
      this.soldiers.push(newSoldier);
      return { success: true, data: newSoldier, message: `เพิ่มพลทหาร ${soldier.full_name} เรียบร้อย` };
    }
  }

  async deleteSoldier(pxCode: string): Promise<{ success: boolean; error?: string; message?: string }> {
    const idx = this.soldiers.findIndex(s => s.px_code === pxCode || s.soldier_id === pxCode);
    if (idx === -1) {
      return { success: false, error: 'ไม่พบข้อมูลทหารที่ต้องการลบ' };
    }
    this.soldiers.splice(idx, 1);
    return { success: true, message: `ลบข้อมูลพลทหาร ${pxCode} เรียบร้อย` };
  }

  async toggleSoldierStatus(pxCode: string, status: any): Promise<{ success: boolean; error?: string; message?: string }> {
    const soldier = this.soldiers.find(s => s.px_code === pxCode || s.soldier_id === pxCode);
    if (!soldier) {
      return { success: false, error: 'ไม่พบข้อมูลทหาร' };
    }
    soldier.status = status;
    return { success: true, message: `ปรับสถานะเป็น ${status} เรียบร้อย` };
  }

  async batchUpdateSoldierPhotos(updates: Array<{ px_code: string; photo_url: string }>): Promise<{ success: boolean; updated_count: number; message?: string }> {
    let count = 0;
    updates.forEach(u => {
      const s = this.soldiers.find(soldier => soldier.px_code === u.px_code || soldier.soldier_id === u.px_code);
      if (s) {
        s.photo_url = u.photo_url;
        count++;
      }
    });
    return { success: true, updated_count: count, message: `อัปเดตรูปถ่ายพลทหาร ${count} นายสำเร็จ` };
  }

  async scanDriveFolderForSoldierPhotos(_folderId: string): Promise<{ success: boolean; matched_count: number; message?: string }> {
    return { success: true, matched_count: 0, message: 'สแกนโฟลเดอร์ในโหมดจำลอง (Mock) สำเร็จ' };
  }

  async createOrder(payload: CreateOrderPayload): Promise<{ success: boolean; order_id?: string; error?: string }> {
    const soldier = this.soldiers.find(s => s.soldier_id === payload.soldier_id || s.px_code === payload.soldier_id);
    if (!soldier) {
      return { success: false, error: 'ไม่พบข้อมูลทหาร' };
    }

    if (soldier.status !== 'ACTIVE') {
      return { success: false, error: `ทหารสถานะ ${soldier.status} ไม่สามารถทำรายการได้` };
    }

    const creditRequired = payload.payment_breakdown.credit_amount;
    if (creditRequired > 0) {
      if (soldier.remaining_credit < creditRequired) {
        return { 
          success: false, 
          error: `วงเงินคงเหลือไม่เพียงพอ (ต้องการ ฿${creditRequired.toFixed(2)}, เหลือ ฿${soldier.remaining_credit.toFixed(2)})` 
        };
      }
      soldier.credit_balance += creditRequired;
      soldier.credit_allowance_balance -= creditRequired;
      soldier.remaining_credit = soldier.credit_limit - soldier.credit_balance;
    }

    const cashRequired = payload.payment_breakdown.cash_amount;
    if (cashRequired > 0) {
      if (soldier.cash_balance >= cashRequired) {
        soldier.cash_balance -= cashRequired;
        soldier.cash_wallet_balance -= cashRequired;
      }
    }

    this.orders.push({
      ...payload,
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      order_id: payload.order_id
    };
  }

  async getOrders(filters?: any): Promise<{
    status: string;
    success: boolean;
    data: any[];
    summary: {
      total_sales: number;
      total_orders: number;
      party_splits: number;
      credit_sales: number;
      cash_sales: number;
    };
  }> {
    const mockList = [
      {
        order_id: 'ORD-2569-1-0003',
        order_datetime: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        cashier_id: 'USR-02',
        shift_id: 'SHIFT-01',
        primary_buyer_code: 'BC-SOL-001',
        buyer_name: 'พลฯ สมชาย สมหวัง',
        buyer_unit: 'ร้อย 1',
        total_amount: 150.00,
        discount_total: 0,
        net_amount: 150.00,
        payment_method: 'CREDIT',
        is_party_split: true,
        split_count: 3,
        status: 'COMPLETED'
      },
      {
        order_id: 'ORD-2569-1-0002',
        order_datetime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        cashier_id: 'USR-02',
        shift_id: 'SHIFT-01',
        primary_buyer_code: 'BC-SOL-002',
        buyer_name: 'พลฯ สมนึก นึกดี',
        buyer_unit: 'ร้อย 2',
        total_amount: 65.00,
        discount_total: 0,
        net_amount: 65.00,
        payment_method: 'CASH',
        is_party_split: false,
        split_count: 0,
        status: 'COMPLETED'
      },
      {
        order_id: 'ORD-2569-1-0001',
        order_datetime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        cashier_id: 'USR-03',
        shift_id: 'SHIFT-00',
        primary_buyer_code: 'BC-SOL-001',
        buyer_name: 'พลฯ สมชาย สมหวัง',
        buyer_unit: 'ร้อย 1',
        total_amount: 20.00,
        discount_total: 0,
        net_amount: 20.00,
        payment_method: 'CREDIT',
        is_party_split: false,
        split_count: 0,
        status: 'COMPLETED'
      }
    ];

    let filtered = [...mockList];
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(o => 
        o.order_id.toLowerCase().includes(q) ||
        o.buyer_name.toLowerCase().includes(q) ||
        o.primary_buyer_code.toLowerCase().includes(q)
      );
    }
    if (filters?.payment_method && filters.payment_method !== 'ALL') {
      filtered = filtered.filter(o => o.payment_method === filters.payment_method);
    }
    if (filters?.is_party_split !== undefined && filters.is_party_split !== 'ALL') {
      const isParty = filters.is_party_split === true || filters.is_party_split === 'true';
      filtered = filtered.filter(o => o.is_party_split === isParty);
    }

    const totalSales = filtered.reduce((acc, o) => o.status !== 'VOIDED' ? acc + o.net_amount : acc, 0);
    const partySplits = filtered.filter(o => o.is_party_split && o.status !== 'VOIDED').length;
    const creditSales = filtered.reduce((acc, o) => o.status !== 'VOIDED' && o.payment_method === 'CREDIT' ? acc + o.net_amount : acc, 0);
    const cashSales = filtered.reduce((acc, o) => o.status !== 'VOIDED' && o.payment_method === 'CASH' ? acc + o.net_amount : acc, 0);

    return {
      status: 'SUCCESS',
      success: true,
      data: filtered,
      summary: {
        total_sales: totalSales,
        total_orders: filtered.length,
        party_splits: partySplits,
        credit_sales: creditSales,
        cash_sales: cashSales
      }
    };
  }

  async getOrderDetails(orderId: string): Promise<{
    status: string;
    success: boolean;
    data?: any;
    error?: string;
  }> {
    const isParty = orderId.includes('0003');
    return {
      status: 'SUCCESS',
      success: true,
      data: {
        order: {
          order_id: orderId,
          order_datetime: new Date().toISOString(),
          cashier_id: 'USR-02 (จ่าอานนท์)',
          shift_id: 'SHIFT-01',
          primary_buyer_code: 'BC-SOL-001',
          total_amount: isParty ? 150.00 : 65.00,
          discount_total: 0,
          net_amount: isParty ? 150.00 : 65.00,
          payment_method: isParty ? 'CREDIT' : 'CASH',
          is_party_split: isParty,
          status: 'COMPLETED'
        },
        items: [
          {
            item_id: 'ITEM-01',
            order_id: orderId,
            barcode: '8850003',
            product_name: 'ผัดกะเพราหมูกรอบไข่ดาว (จ่าเอก)',
            unit_name: 'จาน',
            actual_qty: isParty ? 3 : 1,
            charged_qty: isParty ? 3 : 1,
            cost_price_at_sale: 35.00,
            unit_price: 50.00,
            discount_amount: 0,
            subtotal: isParty ? 150.00 : 50.00,
            seller_id: 'S02',
            is_voided: false
          },
          ...(isParty ? [] : [
            {
              item_id: 'ITEM-02',
              order_id: orderId,
              barcode: '8850002',
              product_name: 'โค้ก ออริจินัล 325ml',
              unit_name: 'กระป๋อง',
              actual_qty: 1,
              charged_qty: 1,
              cost_price_at_sale: 10.00,
              unit_price: 15.00,
              discount_amount: 0,
              subtotal: 15.00,
              seller_id: 'S01',
              is_voided: false
            }
          ])
        ],
        splits: isParty ? [
          {
            split_id: 'SPLIT-01',
            order_id: orderId,
            participant_code: 'BC-SOL-001',
            soldier_name: 'สมชาย สมหวัง',
            rank: 'พลฯ',
            unit: 'ร้อย 1',
            split_type: 'EQUAL',
            amount_assigned: 50.00,
            payment_method: 'CREDIT',
            is_paid: true,
            paid_at: new Date().toISOString()
          },
          {
            split_id: 'SPLIT-02',
            order_id: orderId,
            participant_code: 'BC-SOL-002',
            soldier_name: 'สมนึก นึกดี',
            rank: 'พลฯ',
            unit: 'ร้อย 2',
            split_type: 'EQUAL',
            amount_assigned: 50.00,
            payment_method: 'CREDIT',
            is_paid: true,
            paid_at: new Date().toISOString()
          },
          {
            split_id: 'SPLIT-03',
            order_id: orderId,
            participant_code: 'BC-SOL-003',
            soldier_name: 'คมกริช เกิดผล',
            rank: 'พลฯ',
            unit: 'ร้อย 3',
            split_type: 'EQUAL',
            amount_assigned: 50.00,
            payment_method: 'CASH',
            is_paid: true,
            paid_at: new Date().toISOString()
          }
        ] : [],
        primary_buyer: {
          soldier_id: 'SOL-001',
          px_code: 'BC-SOL-001',
          national_id: '1234567890123',
          full_name: 'พลฯ สมชาย สมหวัง',
          unit: 'ร้อย 1',
          credit_limit: 3000.00,
          deductions: 0,
          credit_allowance_balance: 2950.00,
          credit_balance: 50.00,
          remaining_credit: 2950.00,
          cash_wallet_balance: 0.00,
          cash_balance: 0.00,
          status: 'ACTIVE'
        }
      }
    };
  }

  async topupSoldierWallet(
    soldier_id: string,
    amount: number,
    method: 'CASH' | 'TRANSFER',
    staff_user_id: string
  ): Promise<{ success: boolean; new_cash_balance: number; error?: string }> {
    const soldier = this.soldiers.find(s => s.soldier_id === soldier_id || s.px_code === soldier_id);
    if (!soldier) {
      return { success: false, new_cash_balance: 0, error: 'ไม่พบข้อมูลทหาร' };
    }

    soldier.cash_balance += amount;
    soldier.cash_wallet_balance += amount;
    this.topups.push({
      topup_id: `TOP-${Date.now()}`,
      soldier_id,
      amount,
      payment_method: method,
      created_by: staff_user_id,
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      new_cash_balance: soldier.cash_balance
    };
  }

  async syncBatchOrders(batchOrders: CreateOrderPayload[]): Promise<{ success: boolean; synced_count: number }> {
    let synced = 0;
    for (const order of batchOrders) {
      const res = await this.createOrder(order);
      if (res.success) {
        synced++;
      }
    }
    return { success: true, synced_count: synced };
  }

  async updateBatchConfig(_payload: {
    batch_id: string;
    batch_name?: string;
    start_date?: string;
    end_date?: string;
    default_credit_limit?: number;
  }) {
    return { success: true, message: 'Mock update batch config success' };
  }

  async executeBatchDeductions(_batchId: string, payload: any) {
    const totalPerPerson = (payload.deduction_items || []).reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
    this.soldiers.forEach(s => {
      s.deductions = (s.deductions || 0) + totalPerPerson;
      if (payload.target_wallet === 'ALLOWANCE') {
        s.credit_allowance_balance = Math.max(0, (s.credit_allowance_balance || 0) - totalPerPerson);
      } else if (payload.target_wallet === 'CASH') {
        s.cash_wallet_balance = Math.max(0, (s.cash_wallet_balance || 0) - totalPerPerson);
      }
    });
    return {
      success: true,
      affected_count: this.soldiers.length,
      total_deducted: this.soldiers.length * totalPerPerson,
      message: 'Mock deduction executed'
    };
  }

  async batchSalaryTopup(_batchId: string, payload: any) {
    const amount = Number(payload.amount) || 0;
    const targets = payload.soldier_px_codes || [];
    this.soldiers.forEach(s => {
      if (payload.topup_type === 'BATCH_ALL' || targets.includes(s.px_code)) {
        if (payload.wallet_target === 'CREDIT_LIMIT') {
          s.credit_limit = (s.credit_limit || 0) + amount;
          s.credit_allowance_balance = (s.credit_allowance_balance || 0) + amount;
        } else if (payload.wallet_target === 'CREDIT_BALANCE') {
          s.credit_allowance_balance = (s.credit_allowance_balance || 0) + amount;
        } else {
          s.cash_wallet_balance = (s.cash_wallet_balance || 0) + amount;
        }
      }
    });
    return {
      success: true,
      updated_count: targets.length || this.soldiers.length,
      total_amount: (targets.length || this.soldiers.length) * amount,
      message: 'Mock topup executed'
    };
  }

  // ------------------------------------
  // Payroll Calendar / Deduction Configs / History (mock)
  // ------------------------------------
  private payrollSchedules: Record<string, any[]> = {};
  private deductionConfigs: Record<string, any[]> = {};
  private deductionHistory: Record<string, any[]> = {};

  async getPayrollSchedules(batchId: string) {
    return { success: true, data: this.payrollSchedules[batchId] || [] };
  }

  async savePayrollSchedules(batchId: string, payload: { schedules: any[] }) {
    const schedules = payload.schedules || [];
    this.payrollSchedules[batchId] = schedules;
    return { success: true, saved_count: schedules.length };
  }

  async getDeductionConfigs(batchId: string) {
    return { success: true, data: this.deductionConfigs[batchId] || [] };
  }

  async saveDeductionConfigs(batchId: string, payload: { items: any[] }) {
    const items = payload.items || [];
    this.deductionConfigs[batchId] = items;
    return { success: true, saved_count: items.length };
  }

  async getDeductionHistory(batchId: string) {
    return { success: true, data: this.deductionHistory[batchId] || [] };
  }

  async saveDeductionHistory(batchId: string, payload: { record: any }) {
    const record = payload.record;
    if (!record) return { success: false, error: 'record is required' };
    if (!this.deductionHistory[batchId]) this.deductionHistory[batchId] = [];
    this.deductionHistory[batchId].unshift(record);
    return { success: true };
  }

  // ------------------------------------
  // Promotion Management Methods
  // ------------------------------------
  async getPromotions(): Promise<{ success: boolean; data: Promotion[] }> {
    return {
      success: true,
      data: [...this.promotions]
    };
  }

  async createPromotion(promo: Omit<Promotion, 'promo_id'> & { promo_id?: string }): Promise<{ success: boolean; data?: Promotion; error?: string }> {
    if (!promo.promo_name || !promo.target_barcode || !promo.promo_type) {
      return { success: false, error: 'กรุณากรอกข้อมูลโปรโมชั่นให้ครบถ้วน (ชื่อโปรโมชั่น, บาร์โค้ดสินค้า, ประเภทโปรโมชั่น)' };
    }

    let newId = promo.promo_id?.trim().toUpperCase();
    if (!newId) {
      const existingNums = this.promotions
        .map(p => parseInt(p.promo_id.replace(/^PROMO-/i, ''), 10))
        .filter(n => !isNaN(n));
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      newId = `PROMO-${String(nextNum).padStart(3, '0')}`;
    }

    if (this.promotions.some(p => p.promo_id.toUpperCase() === newId)) {
      return { success: false, error: `รหัสโปรโมชั่น "${newId}" มีอยู่ในระบบแล้ว` };
    }

    const created: Promotion = {
      ...promo,
      promo_id: newId,
      promo_name: promo.promo_name.trim(),
      target_barcode: promo.target_barcode.trim(),
      promo_type: promo.promo_type,
      buy_qty: Number(promo.buy_qty) || 1,
      free_qty: Number(promo.free_qty) || 0,
      discount_pct: promo.discount_pct !== undefined ? Number(promo.discount_pct) : undefined,
      special_price: promo.special_price !== undefined ? Number(promo.special_price) : undefined,
      absorbed_by: promo.absorbed_by || 'UNIT',
      start_date: promo.start_date || new Date().toISOString().split('T')[0],
      end_date: promo.end_date || new Date().toISOString().split('T')[0],
      is_active: promo.is_active !== undefined ? promo.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.promotions.push(created);
    return { success: true, data: created };
  }

  async updatePromotion(promoId: string, updates: Partial<Promotion>): Promise<{ success: boolean; data?: Promotion; error?: string }> {
    const index = this.promotions.findIndex(p => p.promo_id === promoId);
    if (index === -1) {
      return { success: false, error: 'ไม่พบข้อมูลโปรโมชั่น' };
    }

    this.promotions[index] = {
      ...this.promotions[index],
      ...updates,
      promo_id: promoId,
      updated_at: new Date().toISOString()
    };

    return { success: true, data: this.promotions[index] };
  }

  async deletePromotion(promoId: string): Promise<{ success: boolean; error?: string }> {
    const index = this.promotions.findIndex(p => p.promo_id === promoId);
    if (index === -1) {
      return { success: false, error: 'ไม่พบข้อมูลโปรโมชั่น' };
    }
    this.promotions.splice(index, 1);
    return { success: true };
  }

  async togglePromotionActive(promoId: string): Promise<{ success: boolean; is_active?: boolean; error?: string }> {
    const promo = this.promotions.find(p => p.promo_id === promoId);
    if (!promo) {
      return { success: false, error: 'ไม่พบข้อมูลโปรโมชั่น' };
    }
    promo.is_active = !promo.is_active;
    promo.updated_at = new Date().toISOString();
    return { success: true, is_active: promo.is_active };
  }
}

export const mockBackend = new MockPXBackend();


