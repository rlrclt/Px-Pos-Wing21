import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Package } from 'lucide-react';
import type { Seller, ProductCatalog } from '../../../types/schema.ts';
import { useTheme } from '../../../hooks/useTheme.ts';

interface DeleteSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (sellerId: string, cascadeProducts: boolean) => Promise<boolean>;
  seller: Seller | null;
  linkedProducts: ProductCatalog[];
}

export const DeleteSellerModal: React.FC<DeleteSellerModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  seller,
  linkedProducts
}) => {
  const { isLight } = useTheme();
  const [cascadeProducts, setCascadeProducts] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !seller) return null;

  const totalStock = linkedProducts.reduce((sum, p) => sum + (p.stock_qty || 0), 0);

  const handleDelete = async () => {
    setIsDeleting(true);
    const ok = await onConfirmDelete(seller.seller_id, cascadeProducts);
    setIsDeleting(false);
    if (ok) onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-md rounded-3xl shadow-2xl border p-6 space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#111726] border-[#22304d] text-white'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto ring-8 ring-rose-500/10">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-base font-black text-rose-500">ยืนยันการลบผู้ฝากขาย</h3>
            <p className="text-xs text-slate-400">
              คุณกำลังจะลบ <strong>{seller.seller_name} ({seller.seller_id})</strong>
            </p>
          </div>

          {/* Linked Products Warning Box */}
          {linkedProducts.length > 0 && (
            <div className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
              isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
            }`}>
              <div className="font-bold flex items-center gap-1.5 text-rose-500">
                <Package className="w-4 h-4" />
                <span>ตรวจพบสินค้าที่ผูกอยู่ {linkedProducts.length} รายการ (สต็อกรวม {totalStock} ชิ้น)</span>
              </div>
              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cascadeProducts}
                  onChange={(e) => setCascadeProducts(e.target.checked)}
                  className="rounded text-rose-600 mt-0.5"
                />
                <span className="text-[11px] leading-tight">
                  <strong>ลบสินค้าทั้งหมดของผู้ฝากขายคนนี้ไปด้วย (Cascade Delete)</strong>
                  <br />
                  <span className="text-slate-400 text-[10px]">
                    หากไม่เลือก สินค้าจะกลายเป็น &quot;สินค้าส่วนกลาง&quot; (ไม่ระบุผู้ฝากขาย)
                  </span>
                </span>
              </label>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'กำลังลบ...' : 'ยืนยันลบข้อมูล'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
