/**
 * LINE Messaging API & Flex Message Builder Service
 * Builds rich, responsive cards for E-Receipts, Daily Sales, and Payroll Deductions
 */

export interface FlexMessagePayload {
  type: 'flex';
  altText: string;
  contents: any;
}

export const lineBotService = {
  /**
   * Build Daily Sales Summary Flex Message
   */
  buildDailySalesFlex(params: {
    dateStr: string;
    totalSales: number;
    totalOrders: number;
    cashTotal: number;
    creditTotal: number;
    shopName?: string;
  }): any {
    const { dateStr, totalSales, totalOrders, cashTotal, creditTotal, shopName = 'PX สวัสดิการ บน.21' } = params;

    return {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0F172A',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '📊 สรุปยอดขายประจำวัน',
            weight: 'bold',
            color: '#38BDF8',
            size: 'sm'
          },
          {
            type: 'text',
            text: shopName,
            weight: 'bold',
            color: '#FFFFFF',
            size: 'xl',
            margin: 'md'
          },
          {
            type: 'text',
            text: `ประจำวันที่ ${dateStr}`,
            color: '#94A3B8',
            size: 'xs',
            margin: 'sm'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ยอดขายรวมทั้งสิ้น', size: 'sm', color: '#64748B', flex: 2 },
              { type: 'text', text: `฿${totalSales.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`, size: 'lg', weight: 'bold', color: '#059669', align: 'end', flex: 3 }
            ]
          },
          { type: 'separator', margin: 'md' },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'จำนวนคำสั่งซื้อ', size: 'xs', color: '#64748B' },
              { type: 'text', text: `${totalOrders} บิล`, size: 'xs', weight: 'bold', color: '#1E293B', align: 'end' }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '💵 ยอดเงินสด / โอน', size: 'xs', color: '#64748B' },
              { type: 'text', text: `฿${cashTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`, size: 'xs', weight: 'bold', color: '#1E293B', align: 'end' }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '💳 ยอดสวัสดิการทหาร', size: 'xs', color: '#64748B' },
              { type: 'text', text: `฿${creditTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`, size: 'xs', weight: 'bold', color: '#2563EB', align: 'end' }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '15px',
        backgroundColor: '#F8FAFC',
        contents: [
          {
            type: 'text',
            text: 'ระบบจัดการร้านค้าสวัสดิการ พัน.อย.บน.21',
            size: 'xxs',
            color: '#94A3B8',
            align: 'center'
          }
        ]
      }
    };
  },

  /**
   * Build POS E-Receipt Flex Message
   */
  buildReceiptFlex(params: {
    receiptNo: string;
    customerName: string;
    items: Array<{ name: string; qty: number; price: number; subtotal: number }>;
    totalAmount: number;
    discountAmount: number;
    netTotal: number;
    paymentMethod: string;
  }): any {
    const { receiptNo, customerName, items, totalAmount, discountAmount, netTotal, paymentMethod } = params;

    return {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1E293B',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '🧾 ใบเสร็จรับเงินอิเล็กทรอนิกส์ (E-Receipt)', weight: 'bold', color: '#38BDF8', size: 'sm' },
          { type: 'text', text: `เลขที่: ${receiptNo}`, weight: 'bold', color: '#FFFFFF', size: 'md', margin: 'sm' },
          { type: 'text', text: `ผู้ซื้อ: ${customerName}`, color: '#94A3B8', size: 'xs', margin: 'xs' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        spacing: 'sm',
        contents: [
          ...items.slice(0, 5).map(item => ({
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: `${item.name} x${item.qty}`, size: 'xs', color: '#334155', flex: 3 },
              { type: 'text', text: `฿${item.subtotal.toFixed(2)}`, size: 'xs', weight: 'bold', color: '#0F172A', align: 'end', flex: 2 }
            ]
          })),
          { type: 'separator', margin: 'md' },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ยอดรวมสินค้า', size: 'xs', color: '#64748B' },
              { type: 'text', text: `฿${totalAmount.toFixed(2)}`, size: 'xs', align: 'end', color: '#334155' }
            ]
          },
          ...(discountAmount > 0 ? [{
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ส่วนลดโปรโมชั่น', size: 'xs', color: '#EF4444' },
              { type: 'text', text: `-฿${discountAmount.toFixed(2)}`, size: 'xs', weight: 'bold', color: '#EF4444', align: 'end' }
            ]
          }] : []),
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ยอดสุทธิ', size: 'sm', weight: 'bold', color: '#0F172A' },
              { type: 'text', text: `฿${netTotal.toFixed(2)}`, size: 'md', weight: 'bold', color: '#059669', align: 'end' }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ช่องทางชำระ', size: 'xxs', color: '#94A3B8' },
              { type: 'text', text: paymentMethod, size: 'xxs', color: '#64748B', align: 'end' }
            ]
          }
        ]
      }
    };
  }
};
