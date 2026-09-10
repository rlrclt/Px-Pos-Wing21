import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Edit2, Package, Boxes, Check, RefreshCw, Trash2,
  Image as ImageIcon, Upload, Folder, Link as LinkIcon
} from 'lucide-react';
import { api, type ProductImportMode, type DriveFolder, normalizeDriveImageUrl } from '../../../core/api.ts';
import type { ProductCatalog, Seller, ProductUOMConversion } from '../../../types/schema.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { useTheme } from '../../../hooks/useTheme.ts';

export interface ProductFormData {
  barcode: string;
  product_name: string;
  category: string;
  custom_category?: string;
  image_url?: string;
  unit_name: string;
  selling_price: string;
  cost_price: string;
  stock_qty: string;
  seller_id: string;
  low_stock_threshold?: string;
  is_active: boolean;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: ProductCatalog | null;
  liveProducts?: ProductCatalog[];
  liveSellers: Seller[];
  liveUOMs?: ProductUOMConversion[];
  driveFolders?: DriveFolder[];
  onRefreshUOMs?: () => void;
  onSuccess?: () => void;
}

const DEFAULT_FORM: ProductFormData = {
  barcode: '',
  product_name: '',
  category: 'เครื่องดื่ม',
  custom_category: '',
  image_url: '',
  unit_name: 'ชิ้น',
  selling_price: '',
  cost_price: '',
  stock_qty: '0',
  seller_id: '',
  low_stock_threshold: '5',
  is_active: true
};

const DEFAULT_FOLDER_KEY = 'px_default_product_image_folder_id';

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  editingProduct,
  liveSellers,
  liveUOMs = [],
  driveFolders = [],
  onRefreshUOMs,
  onSuccess
}) => {
  const { isLight } = useTheme();
  const { showToast, dismissToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productForm, setProductForm] = useState<ProductFormData>(DEFAULT_FORM);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Image & Drive Folder State
  const [selectedFolderId, setSelectedFolderId] = useState<string>(() => {
    return localStorage.getItem(DEFAULT_FOLDER_KEY) || '';
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [imageSourceTab, setImageSourceTab] = useState<'UPLOAD' | 'URL'>('UPLOAD');
  const [customImageUrlInput, setCustomImageUrlInput] = useState<string>('');

  // Sub-UOM Management State
  const [uomConversions, setUomConversions] = useState<ProductUOMConversion[]>([]);
  const [newUomBarcode, setNewUomBarcode] = useState('');
  const [newUomName, setNewUomName] = useState('แพ็ค 6');
  const [newUomFactor, setNewUomFactor] = useState('6');
  const [newUomPrice, setNewUomPrice] = useState('');
  const [isSavingUom, setIsSavingUom] = useState(false);

  // 1. Reset/Initialize form when modal opens or editingProduct changes
  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        setProductForm({
          barcode: editingProduct.barcode,
          product_name: editingProduct.product_name,
          category: editingProduct.category || 'เครื่องดื่ม',
          custom_category: '',
          image_url: editingProduct.image_url || '',
          unit_name: editingProduct.unit_name || 'ชิ้น',
          selling_price: editingProduct.selling_price ? String(editingProduct.selling_price) : '',
          cost_price: editingProduct.cost_price !== undefined ? String(editingProduct.cost_price) : '',
          stock_qty: editingProduct.stock_qty !== undefined ? String(editingProduct.stock_qty) : '0',
          seller_id: editingProduct.seller_id || '',
          low_stock_threshold: editingProduct.low_stock_threshold !== undefined ? String(editingProduct.low_stock_threshold) : '5',
          is_active: editingProduct.is_active ?? true
        });
        setImagePreviewUrl(editingProduct.image_url || '');
        setCustomImageUrlInput(editingProduct.image_url || '');

        // Load linked UOMs for this editing product
        const linkedUoms = liveUOMs.filter(u => u.base_barcode === editingProduct.barcode);
        setUomConversions(linkedUoms);
      } else {
        setProductForm(DEFAULT_FORM);
        setImagePreviewUrl('');
        setCustomImageUrlInput('');
        setUomConversions([]);
      }
      setNewUomBarcode('');
      setNewUomName('แพ็ค 6');
      setNewUomFactor('6');
      setNewUomPrice('');
    }
  }, [editingProduct, isOpen]);

  // 2. Synchronize live UOM updates without wiping user-entered product form data
  useEffect(() => {
    const activeBarcode = editingProduct?.barcode || productForm.barcode;
    if (activeBarcode && activeBarcode.trim()) {
      const linkedUoms = liveUOMs.filter(u => u.base_barcode === activeBarcode.trim());
      if (linkedUoms.length > 0) {
        setUomConversions(linkedUoms);
      }
    }
  }, [liveUOMs]);

  if (!isOpen) return null;

  const isEditing = !!editingProduct;

  const handleGenerateBarcode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 90 + 10);
    setProductForm(prev => ({ ...prev, barcode: `PX${timestamp}${random}` }));
  };

  const handleGenerateUomBarcode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 90 + 10);
    setNewUomBarcode(`UOM${timestamp}${random}`);
  };

  const handleAddUomConversion = async () => {
    if (!productForm.barcode.trim()) {
      showToast({ type: 'warning', title: 'ไม่พบบาร์โค้ดสินค้าหลัก', message: 'กรุณากรอกบาร์โค้ดสินค้าหลักก่อนเพิ่มหน่วยเสริม' });
      return;
    }
    if (!newUomBarcode.trim()) {
      showToast({ type: 'warning', title: 'กรุณาระบุบาร์โค้ดแพ็ค/ลัง', message: 'บาร์โค้ดสำหรับหน่วยเสริมห้ามเว้นว่าง' });
      return;
    }
    if (newUomBarcode.trim() === productForm.barcode.trim()) {
      showToast({ type: 'warning', title: 'บาร์โค้ดซ้ำ', message: 'บาร์โค้ดแพ็คต้องไม่ซ้ำกับบาร์โค้ดสินค้าหลัก' });
      return;
    }
    const factor = Number(newUomFactor);
    if (isNaN(factor) || factor <= 1) {
      showToast({ type: 'warning', title: 'อัตราคูณไม่ถูกต้อง', message: 'จำนวนชิ้นต่อแพ็คต้องเป็นตัวเลขมากกว่า 1' });
      return;
    }
    const price = Number(newUomPrice);
    if (isNaN(price) || price < 0) {
      showToast({ type: 'warning', title: 'ราคาขายไม่ถูกต้อง', message: 'ราคาขายต้องเป็นตัวเลขมากกว่าหรือเท่ากับ 0' });
      return;
    }

    const uomPayload: ProductUOMConversion = {
      conversion_id: `UOM-${newUomBarcode.trim()}`,
      barcode: newUomBarcode.trim(),
      base_barcode: productForm.barcode.trim(),
      unit_name: newUomName.trim() || `แพ็ค ${factor}`,
      conversion_factor: factor,
      selling_price: price,
      is_active: true
    };

    // Optimistic UI update and clear inputs immediately
    setUomConversions(prev => [...prev.filter(u => u.barcode !== uomPayload.barcode), uomPayload]);
    setNewUomBarcode('');
    setNewUomName('แพ็ค 6');
    setNewUomFactor('6');
    setNewUomPrice('');

    setIsSavingUom(true);
    try {
      const res = await api.saveProductUOM(uomPayload);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'เพิ่มหน่วยเสริมสำเร็จ!',
          message: `เพิ่ม "${uomPayload.unit_name}" (บาร์โค้ด ${uomPayload.barcode}) ผูกสินค้าหลักเรียบร้อย`
        });
        if (onRefreshUOMs) onRefreshUOMs();
      } else {
        showToast({ type: 'error', title: 'เพิ่มหน่วยเสริมไม่สำเร็จ', message: res.error || 'ไม่สามารถบันทึกหน่วยนับเสริมได้' });
      }
    } catch (e: any) {
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: e.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
      setIsSavingUom(false);
    }
  };

  const handleDeleteUomConversion = async (uom: ProductUOMConversion) => {
    if (!window.confirm(`ยืนยันการลบหน่วยนับเสริม "${uom.unit_name}" (${uom.barcode})?`)) return;
    setUomConversions(prev => prev.filter(u => u.barcode !== uom.barcode && u.conversion_id !== uom.conversion_id));
    try {
      const res = await api.deleteProductUOM({ conversion_id: uom.conversion_id, barcode: uom.barcode });
      if (res.success) {
        showToast({ type: 'success', title: 'ลบหน่วยเสริมสำเร็จ', message: `ลบ ${uom.unit_name} เรียบร้อย` });
        if (onRefreshUOMs) onRefreshUOMs();
      } else {
        showToast({ type: 'error', title: 'ลบหน่วยเสริมไม่สำเร็จ', message: res.error || 'ไม่สามารถลบหน่วยนับได้' });
        if (onRefreshUOMs) onRefreshUOMs();
      }
    } catch (e: any) {
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: e.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
      if (onRefreshUOMs) onRefreshUOMs();
    }
  };

  const handleFolderChange = (newFolderId: string) => {
    setSelectedFolderId(newFolderId);
    localStorage.setItem(DEFAULT_FOLDER_KEY, newFolderId);
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({ type: 'warning', title: 'ไฟล์ไม่ถูกต้อง', message: 'กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WEBP, GIF)' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast({ type: 'warning', title: 'ขนาดไฟล์เกินกำหนด', message: 'ขนาดรูปภาพต้องไม่เกิน 5 MB' });
      return;
    }

    const currentBarcode = productForm.barcode.trim() || 'NEW_PROD';

    // Local Preview
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setImagePreviewUrl(base64Data);

      setIsUploadingImage(true);
      const toastId = showToast({
        type: 'loading',
        title: 'กำลังอัปโหลดรูปภาพ...',
        message: `กำลังบันทึกลง Google Drive (${selectedFolderId ? 'โฟลเดอร์ที่เลือก' : 'โฟลเดอร์หลัก'})`
      }, 0);

      try {
        const uploadRes = await api.uploadProductImage({
          barcode: currentBarcode,
          image_base64: base64Data,
          mime_type: file.type,
          folder_id: selectedFolderId || undefined
        });

        dismissToast(toastId);

        if (uploadRes.success && uploadRes.image_url) {
          const newUrl = uploadRes.image_url;
          // If there was a previous drive image and it's different from the new uploaded one, delete the old file
          if (productForm.image_url && productForm.image_url !== newUrl && productForm.image_url.includes('googleusercontent.com')) {
            api.deleteDriveFile({ file_url: productForm.image_url }).catch(e => {
              console.warn('Could not trash previous image file:', e);
            });
          }

          setProductForm(prev => ({ ...prev, image_url: newUrl }));
          setImagePreviewUrl(newUrl);

          showToast({
            type: 'success',
            title: 'อัปโหลดรูปภาพสำเร็จ!',
            message: `บันทึกรูป ${uploadRes.file_name || ''} เรียบร้อย`
          });
        } else {
          showToast({
            type: 'error',
            title: 'อัปโหลดไม่สำเร็จ',
            message: uploadRes.error || uploadRes.message || 'ไม่สามารถอัปโหลดไปยัง Google Drive ได้'
          });
        }
      } catch (err: any) {
        dismissToast(toastId);
        showToast({
          type: 'error',
          title: 'เกิดข้อผิดพลาด',
          message: err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'
        });
      } finally {
        setIsUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = async () => {
    if (!productForm.image_url) return;

    if (!window.confirm('คุณต้องการลบรูปภาพสินค้านี้ใช่หรือไม่? (ระบบจะลบไฟล์ออกจาก Google Drive จริงๆ เพื่อไม่ให้เป็นขยะ)')) {
      return;
    }

    const currentUrl = productForm.image_url;
    setProductForm(prev => ({ ...prev, image_url: '' }));
    setImagePreviewUrl('');
    setCustomImageUrlInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (currentUrl.includes('googleusercontent.com') || currentUrl.includes('drive.google.com')) {
      const toastId = showToast({
        type: 'loading',
        title: 'กำลังลบไฟล์ใน Google Drive...',
        message: 'กำลังย้ายรูปภาพลงถังขยะ'
      }, 0);

      try {
        const res = await api.deleteDriveFile({ file_url: currentUrl });
        dismissToast(toastId);
        if (res.success) {
          showToast({ type: 'success', title: 'ลบรูปภาพสำเร็จ', message: 'ลบไฟล์ออกจาก Google Drive เรียบร้อย' });
        }
      } catch (e: any) {
        dismissToast(toastId);
        console.warn('Could not trash drive image:', e);
      }
    }
  };

  const handleApplyCustomImageUrl = (inputUrl: string) => {
    const raw = inputUrl.trim();
    if (!raw) {
      setProductForm(prev => ({ ...prev, image_url: '' }));
      setImagePreviewUrl('');
      return;
    }
    // Auto-normalize if it's a Google Drive link
    const normalized = normalizeDriveImageUrl(raw);
    setProductForm(prev => ({ ...prev, image_url: normalized }));
    setImagePreviewUrl(normalized);
    setCustomImageUrlInput(normalized);
    showToast({
      type: 'success',
      title: 'ใช้ลิงก์รูปภาพเรียบร้อย',
      message: raw !== normalized ? 'แปลงลิงก์ Google Drive เป็น Direct URL อัตโนมัติแล้ว' : 'ผูก URL รูปภาพกับสินค้าแล้ว'
    });
  };

  const handleSaveManualProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.barcode.trim()) {
      showToast({ type: 'warning', title: 'กรุณาระบุบาร์โค้ด', message: 'บาร์โค้ดสินค้าห้ามเว้นว่าง' });
      return;
    }
    if (!productForm.product_name.trim()) {
      showToast({ type: 'warning', title: 'กรุณาระบุชื่อสินค้า', message: 'ชื่อสินค้าห้ามเว้นว่าง' });
      return;
    }
    const sellingPriceNum = Number(productForm.selling_price);
    if (isNaN(sellingPriceNum) || sellingPriceNum < 0) {
      showToast({ type: 'warning', title: 'ราคาขายไม่ถูกต้อง', message: 'ราคาขายต้องเป็นตัวเลขมากกว่าหรือเท่ากับ 0' });
      return;
    }

    const finalCategory = productForm.category === 'CUSTOM' ? (productForm.custom_category?.trim() || 'ทั่วไป') : productForm.category;

    setIsSavingProduct(true);
    const toastId = showToast({
      type: 'loading',
      title: isEditing ? 'กำลังอัปเดตข้อมูลสินค้า...' : 'กำลังเพิ่มสินค้าใหม่...',
      message: `กำลังบันทึก ${productForm.product_name} ลง Master Sheet`
    }, 0);

    try {
      const mode: ProductImportMode = isEditing ? 'UPDATE_CATALOG' : 'NEW_PRODUCTS';
      const payloadItem = {
        barcode: productForm.barcode.trim(),
        product_name: productForm.product_name.trim(),
        image_url: productForm.image_url?.trim() || '',
        category: finalCategory,
        unit_name: productForm.unit_name.trim() || 'ชิ้น',
        selling_price: sellingPriceNum,
        cost_price: Number(productForm.cost_price) || 0,
        stock_qty: Math.max(0, Number(productForm.stock_qty) || 0),
        seller_id: productForm.seller_id.trim(),
        low_stock_threshold: Number(productForm.low_stock_threshold) || 5,
        is_active: productForm.is_active
      };

      const res = await api.batchImportProducts(mode, [payloadItem], 'UPSERT');
      dismissToast(toastId);

      if (res.success) {
        showToast({
          type: 'success',
          title: isEditing ? 'อัปเดตสินค้าสำเร็จ!' : 'เพิ่มสินค้าใหม่สำเร็จ!',
          message: isEditing 
            ? `อัปเดต "${payloadItem.product_name}" ในแคตตาล็อกเรียบร้อย` 
            : `เพิ่ม "${payloadItem.product_name}" พร้อมสต็อก ${payloadItem.stock_qty} ${payloadItem.unit_name} เรียบร้อย`
        });
        onClose();
        if (onSuccess) onSuccess();
      } else {
        showToast({
          type: 'error',
          title: 'บันทึกไม่สำเร็จ',
          message: res.error || 'เกิดข้อผิดพลาดในการบันทึกลง Google Sheet'
        });
      }
    } catch (err: any) {
      dismissToast(toastId);
      showToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        message: err.message || 'ไม่สามารถติดต่อ Google Apps Script ได้'
      });
    } finally {
      setIsSavingProduct(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`border rounded-2xl w-full max-w-2xl max-h-[94vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0e131f] border-[#2b3a55]'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isEditing
                ? isLight ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                : isLight ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            }`}>
              {isEditing ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isEditing ? 'แก้ไขข้อมูลสินค้า (Edit Product)' : 'เพิ่มสินค้าใหม่ลงระบบ (New Product)'}
              </h3>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEditing 
                  ? 'แก้ไขรายละเอียดและราคาขายใน Product_Catalog' 
                  : 'บันทึกลง Product_Catalog, Inventory_Stocks และ Stock_In_Logs'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!isSavingProduct) onClose();
            }}
            disabled={isSavingProduct}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-600' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveManualProduct} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-5 text-xs">
            {/* Section 1: ข้อมูลแคตตาล็อก */}
            <div className={`p-4 rounded-xl border space-y-4 ${
              isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#141b2b] border-[#223048]'
            }`}>
              <div className="font-bold flex items-center gap-2 text-sm text-slate-900 dark:text-white">
                <Package className="w-4 h-4 text-emerald-500" />
                1. ข้อมูลแคตตาล็อกสินค้า (Product Details)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Barcode */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`block font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      รหัสบาร์โค้ด (Barcode) <span className="text-rose-500">*</span>
                    </label>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={handleGenerateBarcode}
                        className="text-[10px] text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                      >
                        สุ่มรหัสอัตโนมัติ
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm(prev => ({ ...prev, barcode: e.target.value }))}
                    readOnly={isEditing}
                    placeholder="เช่น 8850123401"
                    className={`w-full rounded-xl px-3 py-2 font-mono focus:outline-none transition-colors border ${
                      isEditing
                        ? isLight ? 'bg-slate-200 text-slate-500 cursor-not-allowed border-slate-300' : 'bg-[#1e2638] text-slate-400 cursor-not-allowed border-[#2d3a50]'
                        : isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600' : 'bg-[#0f1422] border-[#2b3a55] text-white focus:border-emerald-500'
                    }`}
                  />
                  <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    🔍 สแกนบาร์โค้ดจากสินค้าจริง หรือคลิก &quot;สุ่มรหัสอัตโนมัติ&quot; หากเป็นสินค้าไม่มีบาร์โค้ด
                  </p>
                </div>

                {/* Product Name */}
                <div>
                  <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    ชื่อสินค้า (Product Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={productForm.product_name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, product_name: e.target.value }))}
                    placeholder="เช่น นมถั่วเหลือง UHT 250ml"
                    className={`w-full rounded-xl px-3 py-2 focus:outline-none transition-colors border ${
                      isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600' : 'bg-[#0f1422] border-[#2b3a55] text-white focus:border-emerald-500'
                    }`}
                  />
                </div>

                {/* Category */}
                <div>
                  <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    หมวดหมู่สินค้า (Category)
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                    className={`w-full rounded-xl px-3 py-2 focus:outline-none transition-colors border cursor-pointer ${
                      isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600' : 'bg-[#0f1422] border-[#2b3a55] text-white focus:border-emerald-500'
                    }`}
                  >
                    <option value="เครื่องดื่ม">เครื่องดื่ม</option>
                    <option value="ขนม">ขนม</option>
                    <option value="ของใช้ส่วนตัว">ของใช้ส่วนตัว</option>
                    <option value="อาหารแห้ง">อาหารแห้ง</option>
                    <option value="SERVICE">SERVICE (บริการ)</option>
                    <option value="CUSTOM">+ กำหนดเอง...</option>
                  </select>
                  {productForm.category === 'CUSTOM' && (
                    <input
                      type="text"
                      value={productForm.custom_category || ''}
                      onChange={(e) => setProductForm(prev => ({ ...prev, custom_category: e.target.value }))}
                      placeholder="ระบุหมวดหมู่ที่ต้องการ..."
                      className={`w-full mt-2 rounded-xl px-3 py-2 focus:outline-none transition-colors border ${
                        isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600' : 'bg-[#0f1422] border-[#2b3a55] text-white focus:border-emerald-500'
                      }`}
                    />
                  )}
                  <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    🗂️ หมวดหมู่สำหรับจัดแท็บ Filter บนหน้าจอ Staff POS
                  </p>
                </div>

                {/* Unit Name */}
                <div>
                  <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    หน่วยนับ (Unit)
                  </label>
                  <input
                    type="text"
                    value={productForm.unit_name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, unit_name: e.target.value }))}
                    placeholder="เช่น ชิ้น, ขวด, กล่อง, ซอง"
                    className={`w-full rounded-xl px-3 py-2 focus:outline-none transition-colors border ${
                      isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600' : 'bg-[#0f1422] border-[#2b3a55] text-white focus:border-emerald-500'
                    }`}
                  />
                  <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    🥛 เช่น ชิ้น, ขวด, กล่อง, ซอง (แสดงบนสลิปใบเสร็จและหน้าจอขาย)
                  </p>
                </div>

                {/* Selling Price */}
                <div>
                  <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    ราคาขายปลีกหน้าร้าน (฿) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productForm.selling_price}
                    onChange={(e) => setProductForm(prev => ({ ...prev, selling_price: e.target.value }))}
                    placeholder="0.00"
                    className={`w-full rounded-xl px-3 py-2 font-mono font-bold focus:outline-none transition-colors border ${
                      isLight ? 'bg-white border-slate-300 text-emerald-600 focus:border-emerald-600' : 'bg-[#0f1422] border-[#2b3a55] text-emerald-400 focus:border-emerald-500'
                    }`}
                  />
                  <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    🏷️ <strong>ราคาที่พลทหารจ่ายจริง</strong> ตอนยิงซื้อหน้าร้าน POS (ตัดวงเงินสวัสดิการหรือเงินสด)
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    สถานะเปิดขาย (Active Status)
                  </label>
                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="is_active"
                        checked={productForm.is_active === true}
                        onChange={() => setProductForm(prev => ({ ...prev, is_active: true }))}
                        className="text-emerald-600 focus:ring-0"
                      />
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">🟢 เปิดขาย (Active)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="is_active"
                        checked={productForm.is_active === false}
                        onChange={() => setProductForm(prev => ({ ...prev, is_active: false }))}
                        className="text-slate-600 focus:ring-0"
                      />
                      <span className="text-slate-500">⚪ ระงับการขาย</span>
                    </label>
                  </div>
                </div>

                {/* Product Image Upload & Google Drive Folder Selector */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-[#2b3a55]">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-emerald-500" />
                      <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        รูปภาพสินค้า (Product Image) & แหล่งที่มา
                      </span>
                    </div>

                    {/* Image Mode Selector Tabs */}
                    <div className={`p-0.5 rounded-lg flex items-center border ${
                      isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#151c2e] border-[#2b3a55]'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setImageSourceTab('UPLOAD')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          imageSourceTab === 'UPLOAD'
                            ? isLight ? 'bg-white text-emerald-600 shadow-xs' : 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        <Upload className="w-3 h-3" />
                        อัปโหลดเข้า Google Drive
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageSourceTab('URL')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          imageSourceTab === 'URL'
                            ? isLight ? 'bg-white text-emerald-600 shadow-xs' : 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        <LinkIcon className="w-3 h-3" />
                        ระบุ Direct Link URL
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-start">
                    {/* Image Preview Box */}
                    <div className="sm:col-span-1">
                      <div className={`w-full aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden relative group ${
                        imagePreviewUrl 
                          ? 'border-emerald-500/50 bg-black/5' 
                          : isLight ? 'border-slate-300 bg-slate-100/60' : 'border-[#2b3a55] bg-[#0c101a]'
                      }`}>
                        {imagePreviewUrl ? (
                          <>
                            <img
                              src={imagePreviewUrl}
                              alt={productForm.product_name || 'Product'}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600 text-white opacity-90 hover:opacity-100 shadow-md transition-opacity cursor-pointer"
                              title="ลบรูปภาพ (หากเป็นไฟล์ใน Google Drive ระบบจะย้ายลงถังขยะอัตโนมัติ)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center p-3 text-slate-400">
                            <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-40" />
                            <span className="text-[10px] block">ยังไม่มีรูปภาพ</span>
                          </div>
                        )}
                        {isUploadingImage && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mb-1" />
                            <span className="text-[10px] font-bold">กำลังอัปโหลด...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Image Actions & Inputs */}
                    <div className="sm:col-span-3 space-y-3">
                      {imageSourceTab === 'UPLOAD' ? (
                        <>
                          {/* Google Drive Folder Selector */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold flex-shrink-0">
                              <Folder className="w-3.5 h-3.5" />
                              โฟลเดอร์บันทึก:
                            </div>
                            <select
                              value={selectedFolderId}
                              onChange={(e) => handleFolderChange(e.target.value)}
                              className={`text-xs rounded-lg px-2.5 py-1.5 border focus:outline-none cursor-pointer flex-1 w-full ${
                                isLight ? 'bg-amber-50/60 border-amber-200 text-slate-800' : 'bg-[#182030] border-amber-500/30 text-amber-200'
                              }`}
                            >
                              <option value="">📁 โฟลเดอร์หลัก (Root Folder / ค่าเริ่มต้น)</option>
                              {driveFolders
                                .filter(f => f.drive_status !== 'DELETED')
                                .map(f => (
                                  <option key={f.folder_id} value={f.folder_id}>
                                    📁 {f.folder_name} {f.is_default ? '⭐ (ค่าเริ่มต้น)' : ''}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png, image/jpeg, image/webp, image/gif"
                            onChange={handleImageFileSelect}
                            className="hidden"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={isUploadingImage}
                              onClick={() => fileInputRef.current?.click()}
                              className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-xs ${
                                isUploadingImage
                                  ? 'bg-slate-400 text-white cursor-not-allowed'
                                  : isLight
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              }`}
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {productForm.image_url ? 'เปลี่ยนรูปภาพใหม่ (Replace)' : 'อัปโหลดรูปภาพสินค้า'}
                            </button>

                            {productForm.image_url && (
                              <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="px-3 py-2 rounded-xl font-semibold border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-colors text-xs cursor-pointer"
                              >
                                ลบรูปภาพ
                              </button>
                            )}
                          </div>

                          <div className="space-y-1">
                            <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              💡 <strong>ระบบจัดการอัจฉริยะ:</strong> รูปภาพจะถูกบันทึกลง Google Drive โฟลเดอร์ที่เลือก โดยตั้งชื่อตามมาตรฐาน <code className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">PROD_&#123;barcode&#125;_&#123;timestamp&#125;.jpg</code>
                            </p>
                            <p className={`text-[10px] ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                              ✨ ระบบจดจำโฟลเดอร์ที่เลือกไว้ล่าสุดอัตโนมัติ และเมื่อเปลี่ยนรูปภาพใหม่ ระบบจะลบรูปเก่าใน Drive ออกทันทีเพื่อไม่ให้เป็นขยะ
                            </p>
                          </div>
                        </>
                      ) : (
                        /* Direct Link URL Tab */
                        <div className="space-y-2">
                          <label className={`block font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            ลิงก์รูปภาพภายนอก / Google Drive Link (URL)
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="url"
                                value={customImageUrlInput}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCustomImageUrlInput(val);
                                  const normalized = normalizeDriveImageUrl(val);
                                  setProductForm(prev => ({ ...prev, image_url: normalized }));
                                  setImagePreviewUrl(normalized);
                                }}
                                placeholder="เช่น https://lh3.googleusercontent.com/... หรือ ลิงก์แชร์ Google Drive"
                                className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                                  isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600' : 'bg-[#0f1422] border-[#2b3a55] text-white focus:border-emerald-500'
                                }`}
                              />
                            </div>
                            {customImageUrlInput && (
                              <button
                                type="button"
                                onClick={() => handleApplyCustomImageUrl(customImageUrlInput)}
                                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
                              >
                                ใช้งาน
                              </button>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              🔗 <strong>รองรับ Google Drive Share Link:</strong> วางลิงก์แชร์จาก Google Drive ได้ทันที ระบบจะแปลงเป็น Direct Image URL ให้โดยอัตโนมัติ
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: ข้อมูลคลัง ราคาทุน และผู้ฝากขาย (Inventory & Cost Details) */}
            <div className={`p-4 rounded-xl border space-y-4 ${
              isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#141b2b] border-[#223048]'
            }`}>
              <div className="font-bold flex items-center gap-2 text-sm text-slate-900 dark:text-white">
                <Boxes className="w-4 h-4 text-blue-500" />
                2. ข้อมูลคลัง ราคาทุน และผู้ฝากขาย (Inventory & Cost Details)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Stock Quantity */}
                <div>
                  <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {isEditing ? 'สต็อกคงเหลือปัจจุบันในคลัง' : 'จำนวนสต็อกเปิดร้านเริ่มต้น'}
                  </label>
                  {isEditing ? (
                    <div className={`w-full rounded-xl px-3.5 py-2 font-mono font-bold flex items-center justify-between border ${
                      isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-[#0f1422] border-[#2b3a55] text-slate-200'
                    }`}>
                      <span>{productForm.stock_qty} {productForm.unit_name || 'ชิ้น'}</span>
                      <span className="text-[10px] font-normal text-slate-400">💡 เติมสต็อกใช้ปุ่ม "รับเข้าสต็อก"</span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      value={productForm.stock_qty}
                      onChange={(e) => setProductForm(prev => ({ ...prev, stock_qty: e.target.value }))}
                      placeholder="0"
                      className={`w-full rounded-xl px-3 py-2 font-mono focus:outline-none transition-colors border ${
                        isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-600' : 'bg-[#0f1422] border-[#2b3a55] text-white focus:border-blue-500'
                      }`}
                    />
                  )}
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {isEditing 
                      ? '📦 จำนวนคงเหลือใน Inventory_Stocks ปัจจุบัน' 
                      : '📦 จำนวนสินค้าที่มีอยู่ในคลังตอนเริ่มต้น (ระบบจะสร้างยอดคงเหลือใน Inventory_Stocks)'}
                  </span>
                </div>

                {/* Cost Price */}
                <div>
                  <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    ราคาทุนต่อหน่วย (฿)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productForm.cost_price}
                    onChange={(e) => setProductForm(prev => ({ ...prev, cost_price: e.target.value }))}
                    placeholder="0.00"
                    className={`w-full rounded-xl px-3 py-2 font-mono focus:outline-none transition-colors border ${
                      isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-600' : 'bg-[#0f1422] border-[#2b3a55] text-white focus:border-blue-500'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    📦 <strong>ราคาทุนที่ซื้อมาจริง</strong> (บันทึกลง Inventory_Stocks ใช้คำนวณกำไรสุทธิและมูลค่าคลัง)
                  </span>
                </div>

                {/* Seller ID */}
                <div>
                  <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    ผู้จัดจำหน่าย / ผู้ฝากขาย (Seller)
                  </label>
                  <select
                    value={productForm.seller_id}
                    onChange={(e) => setProductForm(prev => ({ ...prev, seller_id: e.target.value }))}
                    className={`w-full rounded-xl px-3 py-2 focus:outline-none transition-colors border cursor-pointer ${
                      isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-600' : 'bg-[#0f1422] border-[#2b3a55] text-white focus:border-blue-500'
                    }`}
                  >
                    <option value="">-- สินค้าของหน่วย/กองร้อย (ส่วนกลาง) --</option>
                    {liveSellers.map(s => (
                      <option key={`seller_opt_${s.seller_id}`} value={s.seller_id}>
                        🏪 {s.seller_name} ({s.seller_id})
                      </option>
                    ))}
                  </select>
                  <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    🏪 เลือกเจ้าของสินค้า (หากเป็นสินค้าของหน่วยให้เลือกส่วนกลาง หรือเลือกจ่า/แอดมินผู้ฝากขาย)
                  </p>
                </div>

                {/* Low Stock Threshold */}
                <div>
                  <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    จุดเตือนสินค้าใกล้หมด (Low Stock Alert)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={productForm.low_stock_threshold || '5'}
                    onChange={(e) => setProductForm(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                    placeholder="5"
                    className={`w-full rounded-xl px-3 py-2 font-mono focus:outline-none transition-colors border ${
                      isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-600' : 'bg-[#0f1422] border-[#2b3a55] text-white focus:border-blue-500'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    แจ้งเตือนสีส้มเมื่อสินค้าในคลังเหลือน้อยกว่าจำนวนนี้
                  </span>
                </div>
              </div>

              {/* Dynamic Profit Calculation Preview */}
              {Number(productForm.selling_price) > 0 && Number(productForm.cost_price) > 0 && (
                <div className={`p-3 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${
                  Number(productForm.selling_price) >= Number(productForm.cost_price)
                    ? isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                }`}>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span>💡 สรุปกำไรประมาณการต่อหน่วย:</span>
                  </div>
                  <div className="font-mono text-xs font-bold">
                    {Number(productForm.selling_price) >= Number(productForm.cost_price) ? '+' : ''}
                    ฿{(Number(productForm.selling_price) - Number(productForm.cost_price)).toFixed(2)} บาท/หน่วย
                    <span className="ml-1.5 opacity-80 text-[11px]">
                      (มาร์จิ้น {(((Number(productForm.selling_price) - Number(productForm.cost_price)) / Number(productForm.selling_price)) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: หน่วยนับเสริม & บาร์โค้ดแพ็ค/ลัง (Multi-Unit Pack Conversions) */}
            <div className={`p-4 rounded-xl border space-y-3.5 ${
              isLight ? 'bg-indigo-50/40 border-indigo-200/70' : 'bg-[#151c2e] border-indigo-500/20'
            }`}>
              <div className="flex items-center justify-between">
                <div className="font-bold flex items-center gap-2 text-sm text-slate-900 dark:text-white">
                  <Boxes className="w-4 h-4 text-indigo-500" />
                  3. หน่วยนับเสริม & บาร์โค้ดแพ็ค/ลัง (Multi-Unit Pack Conversions)
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                  {uomConversions.length} หน่วยเสริม
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                เพิ่มบาร์โค้ดสำหรับขายแบบแพ็ค กล่อง หรือลัง โดยระบบจะตัด/รับเข้าสต็อกที่สินค้าหลักอัตโนมัติตามอัตราส่วน
              </p>

              {/* Existing Linked Conversions List */}
              {uomConversions.length > 0 ? (
                <div className="space-y-2">
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-[#2b3a55]">
                    <table className="w-full text-left text-xs">
                      <thead className={`text-[10px] uppercase font-bold border-b ${
                        isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#111726] text-slate-400 border-[#2b3a55]'
                      }`}>
                        <tr>
                          <th className="py-2 px-2.5">บาร์โค้ดแพ็ค</th>
                          <th className="py-2 px-2.5">ชื่อหน่วยนับ</th>
                          <th className="py-2 px-2.5 text-center">อัตราแตกหน่วย</th>
                          <th className="py-2 px-2.5 text-right">ราคาขายแพ็ค</th>
                          <th className="py-2 px-2.5 text-right">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-[#222d42] text-slate-300'}`}>
                        {uomConversions.map((uom) => (
                          <tr key={uom.barcode} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-[#192236]'}>
                            <td className="py-2 px-2.5 font-mono font-bold text-indigo-600 dark:text-cyan-400">
                              {uom.barcode}
                            </td>
                            <td className="py-2 px-2.5 font-semibold">
                              {uom.unit_name}
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono">
                              1 {uom.unit_name} = <strong className="text-emerald-600 dark:text-emerald-400">{uom.conversion_factor}</strong> {productForm.unit_name || 'ชิ้น'}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ฿{(Number(uom.selling_price) || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteUomConversion(uom)}
                                className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="ลบหน่วยเสริมนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className={`p-3 rounded-lg border text-center text-[11px] ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-[#101728] border-[#222d42] text-slate-400'
                }`}>
                  ยังไม่มีหน่วยนับเสริมสำหรับสินค้านี้ (สามารถเพิ่มบาร์โค้ดแพ็ค/ลังได้ด้านล่าง)
                </div>
              )}

              {/* Add New UOM Conversion Form Inline */}
              <div className={`p-3 rounded-xl border ${
                isLight ? 'bg-white border-indigo-200' : 'bg-[#101726] border-[#253552]'
              }`}>
                <div className="font-bold mb-2.5 flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300">
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มหน่วยนับเสริมใหม่ (Add Pack / Carton Unit)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">บาร์โค้ดแพ็ค *</label>
                      <button
                        type="button"
                        onClick={handleGenerateUomBarcode}
                        className="text-[9px] text-indigo-600 dark:text-cyan-400 hover:underline cursor-pointer"
                      >
                        สุ่มรหัส
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newUomBarcode}
                      onChange={(e) => setNewUomBarcode(e.target.value)}
                      placeholder="เช่น 8850123006"
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono border focus:outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600' : 'bg-[#0b0f19] border-[#28374f] text-white focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-1 text-slate-600 dark:text-slate-300">ชื่อหน่วยนับ *</label>
                    <input
                      type="text"
                      value={newUomName}
                      onChange={(e) => setNewUomName(e.target.value)}
                      placeholder="เช่น แพ็ค 6, ลัง 24"
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs border focus:outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600' : 'bg-[#0b0f19] border-[#28374f] text-white focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-1 text-slate-600 dark:text-slate-300">อัตราคูณ (ชิ้น/หน่วย) *</label>
                    <input
                      type="number"
                      min="2"
                      value={newUomFactor}
                      onChange={(e) => setNewUomFactor(e.target.value)}
                      placeholder="เช่น 6"
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono border focus:outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600' : 'bg-[#0b0f19] border-[#28374f] text-white focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-1 text-slate-600 dark:text-slate-300">ราคาขายต่อหน่วยนี้ (฿) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newUomPrice}
                      onChange={(e) => setNewUomPrice(e.target.value)}
                      placeholder="เช่น 55.00"
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold border focus:outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300 text-emerald-600 focus:border-indigo-600' : 'bg-[#0b0f19] border-[#28374f] text-emerald-400 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-2.5">
                  <button
                    type="button"
                    onClick={handleAddUomConversion}
                    disabled={isSavingUom}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                      isLight ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-500'
                    }`}
                  >
                    {isSavingUom ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        กำลังบันทึกหน่วย...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        + บันทึกหน่วยนับเสริมนี้
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className={`flex items-center justify-end gap-3 p-4 border-t ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
          }`}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSavingProduct}
              className={`px-4 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-300'
              }`}
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={isSavingProduct}
              className={`px-6 py-2.5 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                isLight 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' 
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-900/30'
              }`}
            >
              {isSavingProduct ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isEditing ? 'บันทึกการแก้ไข' : 'ยืนยันเพิ่มสินค้า'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
