import React, { useMemo } from 'react';
import { 
  Package, Boxes, Image as ImageIcon, Plus, Store
} from 'lucide-react';
import type { ProductCatalog, ProductUOMConversion, Seller, Promotion } from '../../../types/schema.ts';
import { isPromotionActive } from '../../promotions/promotionEngine.ts';
import { useTheme } from '../../../hooks/useTheme.ts';

interface ProductGridProps {
  products: ProductCatalog[];
  liveUOMs?: ProductUOMConversion[];
  liveSellers?: Seller[];
  promotions?: Promotion[];
  onAddToCart: (product: ProductCatalog, qty?: number) => void;
  onAddUOMToCart?: (uom: ProductUOMConversion, baseProduct: ProductCatalog) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  liveUOMs = [],
  liveSellers = [],
  promotions = [],
  onAddToCart,
  onAddUOMToCart
}) => {
  const { isLight } = useTheme();

  const sellerMap = useMemo(() => {
    const map: Record<string, string> = {};
    liveSellers.forEach(s => {
      map[s.seller_id] = s.seller_name;
    });
    return map;
  }, [liveSellers]);

  const uomMapByBaseBarcode = useMemo(() => {
    const map: Record<string, ProductUOMConversion[]> = {};
    liveUOMs.forEach(u => {
      if (u.is_active !== false) {
        if (!map[u.base_barcode]) map[u.base_barcode] = [];
        map[u.base_barcode].push(u);
      }
    });
    return map;
  }, [liveUOMs]);

  if (products.length === 0) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-bold text-sm">ไม่พบสินค้าในหมวดหมู่นี้</p>
        <p className="text-xs mt-1">ลองเปลี่ยนการค้นหาหรือเลือกหมวดหมู่อื่นด้านบน</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-3.5 pb-6">
      {products.map((product) => {
        const stock = Number(product.stock_qty) || 0;
        const isOutOfStock = stock <= 0;
        const isLowStock = stock > 0 && stock <= (Number(product.low_stock_threshold) || 5);
        const linkedUoms = uomMapByBaseBarcode[product.barcode] || [];
        const sellerName = product.seller_id ? (sellerMap[product.seller_id] || product.seller_id) : 'หน่วยกลาง';

        return (
          <div
            key={product.barcode}
            className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group select-none ${
              isOutOfStock
                ? isLight ? 'bg-slate-100/80 border-slate-200 opacity-60' : 'bg-[#101522]/80 border-[#1c2438] opacity-60'
                : isLight
                  ? 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5'
                  : 'bg-[#121928] border-[#222e47] hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5'
            }`}
          >
            {/* Top: Image Thumbnail + Stock Badge */}
            <div 
              onClick={() => {
                if (!isOutOfStock) onAddToCart(product);
              }}
              className="relative aspect-4/3 overflow-hidden bg-slate-900/10 cursor-pointer"
            >
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.product_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon className="w-7 h-7 opacity-30 mb-1" />
                  <span className="text-[9px] opacity-60">{product.unit_name || 'ชิ้น'}</span>
                </div>
              )}

              {/* Promo Badge if Active */}
              {(() => {
                const activePromo = promotions.find(p => p.target_barcode === product.barcode && isPromotionActive(p));
                if (!activePromo) return null;
                const badgeText = activePromo.promo_type === 'BOGO' 
                  ? '🎁 1 แถม 1' 
                  : activePromo.promo_type === 'DISCOUNT_PCT' 
                  ? `🏷️ ลด ${activePromo.discount_pct}%` 
                  : '⚡ ลดพิเศษ';
                return (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide shadow-md bg-gradient-to-r from-amber-500 to-rose-500 text-white flex items-center gap-1 border border-white/30">
                      {badgeText}
                    </span>
                  </div>
                );
              })()}

              {/* Stock Status Badge */}
              <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono shadow-xs backdrop-blur-xs ${
                  isOutOfStock
                    ? 'bg-rose-600/90 text-white'
                    : isLowStock
                      ? 'bg-amber-500/90 text-white'
                      : 'bg-emerald-600/90 text-white'
                }`}>
                  {isOutOfStock ? 'หมด' : `${stock} ${product.unit_name || 'ชิ้น'}`}
                </span>
              </div>

              {/* Seller Tag */}
              <div className="absolute bottom-2 left-2 max-w-[80%] truncate">
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-black/60 backdrop-blur-xs text-slate-200 flex items-center gap-1">
                  <Store className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                  <span className="truncate">{sellerName}</span>
                </span>
              </div>
            </div>

            {/* Bottom: Title, Barcode, Price & Add Button */}
            <div className="p-3 flex flex-col flex-1 justify-between">
              <div 
                onClick={() => {
                  if (!isOutOfStock) onAddToCart(product);
                }}
                className="cursor-pointer"
              >
                <h4 className={`font-bold text-xs line-clamp-2 leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {product.product_name}
                </h4>
                <div className="font-mono text-[10px] text-slate-400 mt-1 truncate">
                  {product.barcode}
                </div>
              </div>

              <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-[#1d273a] flex items-center justify-between gap-1">
                <div>
                  <span className="text-[10px] text-slate-400 block -mb-0.5">ราคาขาย</span>
                  <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                    ฿{Number(product.selling_price).toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => onAddToCart(product)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                    isOutOfStock
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white'
                  }`}
                  title={isOutOfStock ? 'สินค้าหมด' : 'ใส่ตะกร้า'}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Linked Pack/Carton UOM Quick Selector */}
              {linkedUoms.length > 0 && (
                <div className="mt-2 pt-1.5 border-t border-dashed border-slate-200 dark:border-[#223048] flex flex-wrap gap-1">
                  {linkedUoms.map(uom => (
                    <button
                      key={uom.barcode}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => {
                        if (onAddUOMToCart) {
                          onAddUOMToCart(uom, product);
                        } else {
                          // Fallback
                          onAddToCart({
                            ...product,
                            barcode: uom.barcode,
                            product_name: `${product.product_name} (${uom.unit_name})`,
                            selling_price: uom.selling_price,
                            unit_name: uom.unit_name,
                            conversion_factor: uom.conversion_factor,
                            parent_barcode: product.barcode
                          });
                        }
                      }}
                      className={`text-[9px] px-2 py-0.5 rounded-lg border font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        isLight 
                          ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700' 
                          : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                      }`}
                      title={`ซื้อเป็น ${uom.unit_name} (ตัดสต็อก ${uom.conversion_factor} ชิ้น)`}
                    >
                      <Boxes className="w-2.5 h-2.5" />
                      <span>{uom.unit_name} (฿{Number(uom.selling_price).toFixed(0)})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
