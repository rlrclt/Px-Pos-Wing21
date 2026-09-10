import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, Trash2, X, Archive, Boxes, Package, 
  CheckCircle2, RefreshCw, Lock
} from 'lucide-react';
import type { ProductCatalog, ProductUOMConversion } from '../../../types/schema.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { api } from '../../../core/api.ts';

interface ProductDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductCatalog | null;
  liveUOMs?: ProductUOMConversion[];
  onSuccess?: () => void;
}

export const ProductDeleteModal: React.FC<ProductDeleteModalProps> = ({
  isOpen,
  onClose,
  product,
  liveUOMs = [],
  onSuccess
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();

  const [deleteMode, setDeleteMode] = useState<'SOFT' | 'HARD'>('SOFT');
  const [confirmInput, setConfirmInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !product) return null;

  const currentStock = Number(product.stock_qty) || 0;
  const hasStock = currentStock > 0;
  const totalStockValue = currentStock * (Number(product.cost_price) || Number(product.selling_price) || 0);
  
  // Find linked pack conversions
  const linkedUoms = liveUOMs.filter(u => u.base_barcode === product.barcode && u.is_active !== false);

  const isConfirmed = 
    deleteMode === 'SOFT' || 
    confirmInput.trim().toUpperCase() === product.barcode.trim().toUpperCase() ||
    confirmInput.trim() === product.product_name.trim();

  const handleAction = async () => {
    if (!isConfirmed) return;
    setIsProcessing(true);

    try {
      if (deleteMode === 'SOFT') {
        // Toggle is_active = false
        const res = await api.toggleProductActive({ barcode: product.barcode, is_active: false });
        if (res.success) {
          showToast({
            type: 'success',
            title: 'ระงับการขายสำเร็จ',
            message: `สินค้า "${product.product_name}" ถูกซ่อนจากหน้าร้านเรียบร้อย`
          });
          onSuccess?.();
          onClose();
        } else {
          showToast({
            type: 'error',
            title: 'เกิดข้อผิดพลาด',
            message: res.error || 'ไม่สามารถระงับการขายได้'
          });
        }
      } else {
        // Hard delete
        if (hasStock) {
          showToast({
            type: 'warning',
            title: 'ไม่สามารถลบสินค้าได้',
            message: `ยังมีสต็อกคงคลัง ${currentStock} ชิ้น กรุณาตัดจำหน่าย (Write-Off) ก่อน`
          });
          setIsProcessing(false);
          return;
        }

        const res = await api.deleteProduct({ barcode: product.barcode, force: false });
        if (res.success) {
          // If product had a Google Drive image, trash it to avoid junk files
          if (product.image_url && (product.image_url.includes('googleusercontent.com') || product.image_url.includes('drive.google.com'))) {
            api.deleteDriveFile({ file_url: product.image_url }).catch(e => {
              console.warn('Could not trash drive image on product delete:', e);
            });
          }

          showToast({
            type: 'success',
            title: 'ลบสินค้าถาวรสำเร็จ',
            message: `ลบสินค้า "${product.product_name}" และหน่วยเสริมออกจากระบบเรียบร้อย`
          });
          onSuccess?.();
          onClose();
        } else {
          showToast({
            type: 'error',
            title: 'เกิดข้อผิดพลาดในการลบ',
            message: res.error || 'ไม่สามารถลบสินค้าได้'
          });
        }
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: err.message || err.toString()
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`max-w-lg w-full rounded-3xl p-5 sm:p-6 shadow-2xl border overflow-hidden ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#141824] border-[#252C3D]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#252C3D]">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                deleteMode === 'SOFT' 
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
              }`}>
                {deleteMode === 'SOFT' ? <Archive className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
              </div>
              <div>
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {deleteMode === 'SOFT' ? 'ระงับการขายสินค้า (Deactivate)' : 'ลบสินค้าออกจากระบบถาวร (Hard Delete)'}
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  รหัสสินค้า: <span className="font-mono font-bold text-blue-500">{product.barcode}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className={`p-1.5 rounded-full transition cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Product Summary Card */}
          <div className={`my-4 p-3 rounded-2xl border flex items-center gap-3 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181D2C] border-[#252B3B]'
          }`}>
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#111622] border border-slate-200 dark:border-[#252B3B] flex items-center justify-center shrink-0">
              {product.image_url ? (
                <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <Package className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className={`text-sm font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {product.product_name}
              </h4>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                <span className="font-mono">หมวดหมู่: {product.category || 'ทั่วไป'}</span>
                <span>•</span>
                <span className="font-mono">ราคาขาย: ฿{(Number(product.selling_price) || 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block">คงเหลือ</span>
              <span className={`text-xs font-mono font-bold ${
                hasStock ? 'text-emerald-500' : 'text-slate-400'
              }`}>
                {currentStock} {product.unit_name || 'ชิ้น'}
              </span>
            </div>
          </div>

          {/* Active Stock Warning Banner */}
          {hasStock && (
            <div className={`p-3.5 rounded-2xl border mb-4 flex items-start gap-2.5 ${
              isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-800/40 text-amber-300'
            }`}>
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <strong className="block font-bold">⚠️ มีสต็อกคงเหลือในคลัง {currentStock.toLocaleString()} {product.unit_name || 'ชิ้น'} (มูลค่า ฿{totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</strong>
                <p className="opacity-90 leading-relaxed">
                  ระบบ <strong>ล็อกการลบถาวร</strong> เพื่อป้องกันบัญชีคลาดเคลื่อนและรักษาภาระหนี้กับผู้ฝากขาย แนะนำให้เลือก <strong>&quot;ระงับการขาย&quot;</strong> เพื่อซ่อนจากหน้าร้าน หรือทำการตัดจำหน่าย (Write-Off) ก่อน
                </p>
              </div>
            </div>
          )}

          {/* Linked UOM Conversions Notice */}
          {linkedUoms.length > 0 && (
            <div className={`p-3 rounded-2xl border mb-4 text-xs ${
              isLight ? 'bg-blue-50/70 border-blue-200 text-blue-900' : 'bg-blue-950/30 border-blue-800/40 text-blue-300'
            }`}>
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <Boxes className="w-4 h-4 text-blue-500" />
                <span>หน่วยนับเสริมที่ผูกอยู่ ({linkedUoms.length} รายการ):</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {linkedUoms.map(uom => (
                  <span 
                    key={uom.barcode}
                    className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[11px] font-mono font-semibold"
                  >
                    📦 {uom.unit_name} (1={uom.conversion_factor}) บาร์โค้ด: {uom.barcode}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Choice Mode Selector */}
          <div className="space-y-2 mb-4">
            <label className={`text-xs font-bold block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              เลือกวิธีการจัดการ:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteMode('SOFT')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  deleteMode === 'SOFT'
                    ? isLight ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20' : 'bg-blue-950/40 border-blue-500 text-white ring-2 ring-blue-500/20'
                    : isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-[#181D2C] border-[#252B3B] text-slate-400 hover:bg-[#202738]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1">
                    <Archive className="w-3.5 h-3.5 text-blue-500" />
                    ระงับการขาย (แนะนำ)
                  </span>
                  {deleteMode === 'SOFT' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                </div>
                <p className="text-[10px] opacity-80 leading-snug">
                  ซ่อนสินค้าจาก POS/Kiosk คงประวัติบิลและบัญชี 100%
                </p>
              </button>

              <button
                type="button"
                disabled={hasStock}
                onClick={() => setDeleteMode('HARD')}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  hasStock
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-[#181D2C] border-slate-200 dark:border-[#252B3B] text-slate-400'
                    : deleteMode === 'HARD'
                    ? isLight ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20' : 'bg-rose-950/40 border-rose-500 text-white ring-2 ring-rose-500/20'
                    : isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer' : 'bg-[#181D2C] border-[#252B3B] text-slate-400 hover:bg-[#202738] cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1 text-rose-500">
                    {hasStock ? <Lock className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                    ลบถาวร (Hard Delete)
                  </span>
                  {deleteMode === 'HARD' && <CheckCircle2 className="w-4 h-4 text-rose-500" />}
                </div>
                <p className="text-[10px] opacity-80 leading-snug">
                  {hasStock ? 'ล็อก: สต็อกต้องเป็น 0' : 'ลบรายการออกจากฐานข้อมูลทั้งหมด'}
                </p>
              </button>
            </div>
          </div>

          {/* Type-to-Confirm for Hard Delete */}
          {deleteMode === 'HARD' && (
            <div className="mb-4 space-y-1.5 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-rose-500 block">
                พิมพ์บาร์โค้ด <span className="font-mono underline">{product.barcode}</span> เพื่อยืนยันการลบถาวร:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={product.barcode}
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  isLight ? 'bg-rose-50/50 border-rose-300 text-slate-900' : 'bg-[#181D2C] border-rose-500/40 text-white'
                }`}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#252C3D]">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-[#181D2C] border-[#252B3B] text-slate-300 hover:bg-[#202738]'
              }`}
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={handleAction}
              disabled={!isConfirmed || isProcessing || (deleteMode === 'HARD' && hasStock)}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                deleteMode === 'SOFT'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังดำเนินการ...</span>
                </>
              ) : deleteMode === 'SOFT' ? (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>ยืนยันระงับการขาย</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ยืนยันลบถาวร</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
