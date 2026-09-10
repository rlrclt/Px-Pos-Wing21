import React, { useState } from 'react';
import { 
  Upload, X, Download, FileUp, RefreshCw, CheckCircle2, 
  AlertTriangle, AlertCircle, Check, FileSpreadsheet, FileText 
} from 'lucide-react';
import { 
  api, 
  parseProductFile, 
  validateProductRows, 
  downloadProductTemplate,
  type ProductImportMode, 
  type ProductValidationSummary 
} from '../../../core/api.ts';
import type { ProductCatalog, Seller } from '../../../types/schema.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { useTheme } from '../../../hooks/useTheme.ts';

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveProducts: ProductCatalog[];
  liveSellers: Seller[];
  onSuccess?: () => void;
}

export const ProductImportModal: React.FC<ProductImportModalProps> = ({
  isOpen,
  onClose,
  liveProducts,
  liveSellers,
  onSuccess
}) => {
  const { isLight } = useTheme();
  const { showToast, dismissToast } = useToast();

  const [uploadProductMode, setUploadProductMode] = useState<ProductImportMode>('NEW_PRODUCTS');
  const [uploadProductFile, setUploadProductFile] = useState<File | null>(null);
  const [isParsingProductFile, setIsParsingProductFile] = useState(false);
  const [isImportingProducts, setIsImportingProducts] = useState(false);
  const [productValidationSummary, setProductValidationSummary] = useState<ProductValidationSummary | null>(null);
  const [uploadProductFilterStatus, setUploadProductFilterStatus] = useState<'ALL' | 'VALID' | 'DUPLICATE' | 'ERROR'>('ALL');
  const [productImportResult, setProductImportResult] = useState<{
    success: boolean;
    count_imported?: number;
    count_updated?: number;
    count_skipped?: number;
    count_logged?: number;
    message?: string;
  } | null>(null);

  // Download template sub-modal
  const [isDownloadProductTemplateOpen, setIsDownloadProductTemplateOpen] = useState(false);
  const [downloadProductFormat, setDownloadProductFormat] = useState<'csv' | 'excel_xml'>('csv');

  if (!isOpen) return null;

  const handleProductFileSelected = async (file: File) => {
    setUploadProductFile(file);
    setIsParsingProductFile(true);
    setProductValidationSummary(null);
    setProductImportResult(null);

    try {
      const rawRows = await parseProductFile(file);
      if (rawRows.length === 0) {
        showToast({
          type: 'warning',
          title: 'ไม่พบข้อมูลในไฟล์',
          message: 'ไฟล์ที่เลือกไม่มีข้อมูลหรือหัวตารางไม่ตรงกับเทมเพลตมาตรฐาน'
        });
        setIsParsingProductFile(false);
        return;
      }

      const summary = validateProductRows(uploadProductMode, rawRows, liveProducts, liveSellers);
      setProductValidationSummary(summary);
      setUploadProductFilterStatus('ALL');
      showToast({
        type: 'info',
        title: 'ตรวจสอบไฟล์สินค้าเรียบร้อย',
        message: `พบข้อมูล ${summary.total} รายการ (ถูกต้อง ${summary.validCount}, ซ้ำ ${summary.duplicateCount}, ข้อผิดพลาด ${summary.errorCount})`
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'ไม่สามารถอ่านไฟล์ได้',
        message: err.message || 'โครงสร้างไฟล์ไม่ถูกต้อง'
      });
    } finally {
      setIsParsingProductFile(false);
    }
  };

  const toggleProductRowSelection = (rowIndex: number) => {
    if (!productValidationSummary) return;
    const updatedRows = productValidationSummary.rows.map(r => {
      if (r.rowIndex === rowIndex) {
        return { ...r, isSelected: !r.isSelected };
      }
      return r;
    });
    setProductValidationSummary({
      ...productValidationSummary,
      rows: updatedRows
    });
  };

  const toggleSelectAllProducts = (select: boolean) => {
    if (!productValidationSummary) return;
    const updatedRows = productValidationSummary.rows.map(r => {
      if (r.validationStatus === 'ERROR') return { ...r, isSelected: false };
      return { ...r, isSelected: select };
    });
    setProductValidationSummary({
      ...productValidationSummary,
      rows: updatedRows
    });
  };

  const handleExecuteProductImport = async (strategy: 'SKIP_DUPLICATES' | 'UPSERT') => {
    if (!productValidationSummary) return;
    const selectedRows = productValidationSummary.rows.filter(r => r.isSelected && r.validationStatus !== 'ERROR');
    if (selectedRows.length === 0) {
      showToast({
        type: 'warning',
        title: 'ไม่มีรายการที่เลือก',
        message: 'กรุณาเลือกรายการที่ต้องการนำเข้าอย่างน้อย 1 รายการ (รายการที่มี Error จะไม่สามารถนำเข้าได้)'
      });
      return;
    }

    const payloadItems = selectedRows.map(r => ({
      barcode: r.barcode,
      product_name: r.product_name,
      category: r.category,
      unit_name: r.unit_name,
      selling_price: r.selling_price,
      cost_price: r.cost_price,
      stock_qty: r.stock_qty,
      seller_id: r.seller_id,
      low_stock_threshold: r.low_stock_threshold,
      parent_barcode: r.parent_barcode,
      conversion_factor: r.conversion_factor,
      is_active: r.is_active
    }));

    setIsImportingProducts(true);
    const toastId = showToast({
      type: 'loading',
      title: 'กำลังประมวลผลข้อมูลสินค้า...',
      message: `กำลังส่งข้อมูล ${payloadItems.length} รายการในโหมด ${uploadProductMode}`
    }, 0);

    try {
      const res = await api.batchImportProducts(uploadProductMode, payloadItems, strategy);
      dismissToast(toastId);
      if (res.success) {
        setProductImportResult({
          success: true,
          count_imported: res.count_imported,
          count_updated: res.count_updated,
          count_skipped: res.count_skipped,
          count_logged: res.count_logged,
          message: res.message
        });
        showToast({
          type: 'success',
          title: 'ประมวลผลข้อมูลสินค้าสำเร็จ!',
          message: res.message || `เพิ่มใหม่ ${res.count_imported || 0} รายการ, อัปเดต ${res.count_updated || 0} รายการ, บันทึกสต็อก ${res.count_logged || 0} รายการ`
        });
        if (onSuccess) onSuccess();
      } else {
        showToast({
          type: 'error',
          title: 'เกิดข้อผิดพลาดในการนำเข้า',
          message: res.error || 'ไม่สามารถบันทึกข้อมูลลง Google Sheet ได้'
        });
      }
    } catch (err: any) {
      dismissToast(toastId);
      showToast({
        type: 'error',
        title: 'บันทึกล้มเหลว',
        message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Google Apps Script'
      });
    } finally {
      setIsImportingProducts(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadProductTemplate(uploadProductMode, downloadProductFormat);
    setIsDownloadProductTemplateOpen(false);
    showToast({
      type: 'success',
      title: 'ดาวน์โหลดสำเร็จ',
      message: `ดาวน์โหลดไฟล์แม่แบบสินค้า (${downloadProductFormat.toUpperCase()}) โหมด ${uploadProductMode} เรียบร้อย`
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className={`border rounded-2xl w-full max-w-5xl max-h-[94vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0e131f] border-[#2b3a55]'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-5 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isLight ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'
              }`}>
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  ศูนย์นำเข้าและอัปเดตข้อมูลสินค้าอัจฉริยะ (Multi-Mode Smart Import Hub)
                </h3>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  รองรับ 3 โหมดงาน พร้อมระบบพรีวิวคัดกรองความถูกต้องและอัปเดตตรง Master Sheet
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!isImportingProducts) {
                  onClose();
                  setProductValidationSummary(null);
                  setProductImportResult(null);
                }
              }}
              disabled={isImportingProducts}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-600' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-400 hover:text-white'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto space-y-4 text-xs">
            {/* Step 1: Mode Switcher Tabs */}
            <div>
              <label className={`block font-semibold mb-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                1. เลือกโหมดการนำเข้า (Import Mode):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setUploadProductMode('NEW_PRODUCTS');
                    if (uploadProductFile) handleProductFileSelected(uploadProductFile);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    uploadProductMode === 'NEW_PRODUCTS'
                      ? isLight
                        ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                        : 'bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-200 font-bold'
                      : isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-[#161b26] hover:bg-[#1f2637] border-[#21262d] text-slate-400'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <div>🟢 สินค้าใหม่ + สต็อกเปิดร้าน</div>
                    <div className="text-[10px] font-normal opacity-75">New Products + Stock</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUploadProductMode('UPDATE_CATALOG');
                    if (uploadProductFile) handleProductFileSelected(uploadProductFile);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    uploadProductMode === 'UPDATE_CATALOG'
                      ? isLight
                        ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-bold'
                        : 'bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/20 text-blue-200 font-bold'
                      : isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-[#161b26] hover:bg-[#1f2637] border-[#21262d] text-slate-400'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <div>🔵 ปรับปรุงราคา / แคตตาล็อก</div>
                    <div className="text-[10px] font-normal opacity-75">Catalog & Price Update</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUploadProductMode('RESTOCK');
                    if (uploadProductFile) handleProductFileSelected(uploadProductFile);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    uploadProductMode === 'RESTOCK'
                      ? isLight
                        ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 font-bold'
                        : 'bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/20 text-amber-200 font-bold'
                      : isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-[#161b26] hover:bg-[#1f2637] border-[#21262d] text-slate-400'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <div>🟠 รับสต็อกล็อตใหม่เข้าคลัง</div>
                    <div className="text-[10px] font-normal opacity-75">Restock & Batch Receiving</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 2: Dropzone File Picker */}
            <div>
              <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                2. เลือกไฟล์สำหรับนำเข้า (.csv, .xlsx, .xls, .xml, .txt):
              </label>
              <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                uploadProductFile
                  ? isLight ? 'border-blue-500 bg-blue-50/50' : 'border-indigo-500 bg-indigo-950/20'
                  : isLight ? 'border-slate-300 hover:border-slate-400 bg-slate-50' : 'border-[#283550] hover:border-[#3b4e75] bg-[#141a29]'
              }`}>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls, .xml, .txt"
                  id="productFileInput"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProductFileSelected(file);
                  }}
                />
                <label htmlFor="productFileInput" className="cursor-pointer flex flex-col items-center justify-center">
                  <FileUp className={`w-8 h-8 mb-2 ${isLight ? 'text-blue-600' : 'text-indigo-400'}`} />
                  <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                    {uploadProductFile ? uploadProductFile.name : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    รองรับไฟล์ Excel, CSV UTF-8 พร้อมวิเคราะห์ความสัมพันธ์สินค้าแพ็ค/เดี่ยวอัตโนมัติ
                  </span>
                </label>
              </div>

              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setIsDownloadProductTemplateOpen(true)}
                  className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-[#1c2438] hover:bg-[#283550] border-[#2b3a55] text-slate-300'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  ดาวน์โหลดไฟล์แม่แบบสินค้า ({uploadProductMode})
                </button>
              </div>
            </div>

            {/* Loading State */}
            {isParsingProductFile && (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className={`w-8 h-8 mx-auto animate-spin mb-3 ${isLight ? 'text-blue-600' : 'text-indigo-400'}`} />
                <p className="font-semibold text-xs">กำลังอ่านไฟล์สินค้าและตรวจสอบความถูกต้องตามโหมดที่เลือก...</p>
              </div>
            )}

            {/* Success Report Banner */}
            {productImportResult && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
              }`}>
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-sm">🟢 ดำเนินการอัปเดตข้อมูลสินค้าสำเร็จ!</div>
                  <p className="text-xs">
                    {productImportResult.message || `เพิ่มใหม่ ${productImportResult.count_imported || 0} รายการ, อัปเดต ${productImportResult.count_updated || 0} รายการ, ข้าม ${productImportResult.count_skipped || 0} รายการ, บันทึกสต็อก ${productImportResult.count_logged || 0} รายการ`}
                  </p>
                </div>
              </div>
            )}

            {/* Validation Summary & Preview Table */}
            {productValidationSummary && !isParsingProductFile && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-3.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
                  }`}>
                    <div className="text-[11px] text-slate-500 font-medium">รายการทั้งหมดในไฟล์</div>
                    <div className={`text-xl font-bold font-mono mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {productValidationSummary.total} <span className="text-xs font-normal text-slate-500">รายการ</span>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${
                    isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/30 border-emerald-500/30'
                  }`}>
                    <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ถูกต้องสมบูรณ์
                    </div>
                    <div className="text-xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
                      {productValidationSummary.validCount} <span className="text-xs font-normal opacity-75">รายการ</span>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${
                    isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/30 border-amber-500/30'
                  }`}>
                    <div className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> พบข้อมูลซ้ำ
                    </div>
                    <div className="text-xl font-bold font-mono mt-1 text-amber-600 dark:text-amber-400">
                      {productValidationSummary.duplicateCount} <span className="text-xs font-normal opacity-75">รายการ</span>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${
                    isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-950/30 border-rose-500/30'
                  }`}>
                    <div className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> ผิดพลาด (Error)
                    </div>
                    <div className="text-xl font-bold font-mono mt-1 text-rose-600 dark:text-rose-400">
                      {productValidationSummary.errorCount} <span className="text-xs font-normal opacity-75">รายการ</span>
                    </div>
                  </div>
                </div>

                {/* Filter Tabs & Bulk Select */}
                <div className={`flex flex-wrap items-center justify-between gap-3 pt-2 pb-1 border-b ${
                  isLight ? 'border-slate-200' : 'border-[#21262d]'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setUploadProductFilterStatus('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors cursor-pointer ${
                        uploadProductFilterStatus === 'ALL'
                          ? isLight ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'
                          : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#161b26] text-slate-400 hover:bg-[#202838]'
                      }`}
                    >
                      ทั้งหมด ({productValidationSummary.total})
                    </button>

                    <button
                      type="button"
                      onClick={() => setUploadProductFilterStatus('VALID')}
                      className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors cursor-pointer ${
                        uploadProductFilterStatus === 'VALID'
                          ? 'bg-emerald-600 text-white'
                          : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#161b26] text-slate-400 hover:bg-[#202838]'
                      }`}
                    >
                      🟢 ถูกต้อง ({productValidationSummary.validCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setUploadProductFilterStatus('DUPLICATE')}
                      className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors cursor-pointer ${
                        uploadProductFilterStatus === 'DUPLICATE'
                          ? 'bg-amber-600 text-white'
                          : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#161b26] text-slate-400 hover:bg-[#202838]'
                      }`}
                    >
                      🟡 ซ้ำในระบบ ({productValidationSummary.duplicateCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setUploadProductFilterStatus('ERROR')}
                      className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors cursor-pointer ${
                        uploadProductFilterStatus === 'ERROR'
                          ? 'bg-rose-600 text-white'
                          : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#161b26] text-slate-400 hover:bg-[#202838]'
                      }`}
                    >
                      🔴 ผิดพลาด ({productValidationSummary.errorCount})
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelectAllProducts(true)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                        isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#161b26] hover:bg-[#202838] text-slate-300'
                      }`}
                    >
                      เลือกทั้งหมด
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSelectAllProducts(false)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                        isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#161b26] hover:bg-[#202838] text-slate-300'
                      }`}
                    >
                      ยกเลิกการเลือก
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className={`rounded-xl border overflow-hidden ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#111622] border-[#21262d]'
                }`}>
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className={`border-b text-[11px] font-semibold ${
                          isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-[#161b26] text-slate-400 border-[#21262d]'
                        }`}>
                          <th className="py-2.5 px-3 w-10 text-center">เลือก</th>
                          <th className="py-2.5 px-3">แถว</th>
                          <th className="py-2.5 px-3">บาร์โค้ด</th>
                          <th className="py-2.5 px-3">ชื่อสินค้า</th>
                          <th className="py-2.5 px-3">หมวดหมู่</th>
                          <th className="py-2.5 px-3 text-right">ราคาขาย</th>
                          <th className="py-2.5 px-3 text-right">สต็อกในไฟล์</th>
                          <th className="py-2.5 px-3">หน่วย/การผูกแพ็ค</th>
                          <th className="py-2.5 px-3">สถานะตรวจสอบ</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-[#1e2638]'}`}>
                        {productValidationSummary.rows
                          .filter(r => {
                            if (uploadProductFilterStatus === 'ALL') return true;
                            return r.validationStatus === uploadProductFilterStatus;
                          })
                          .map((row) => {
                            const isError = row.validationStatus === 'ERROR';
                            const isDuplicate = row.validationStatus === 'DUPLICATE';
                            return (
                              <tr 
                                key={`prod_row_${row.rowIndex}`}
                                className={`transition-colors ${
                                  isError 
                                    ? isLight ? 'bg-rose-50/40' : 'bg-rose-950/10'
                                    : isDuplicate
                                      ? isLight ? 'bg-amber-50/40' : 'bg-amber-950/10'
                                      : isLight ? 'hover:bg-slate-50' : 'hover:bg-[#161b26]'
                                }`}
                              >
                                <td className="py-2 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={row.isSelected}
                                    disabled={isError || isImportingProducts}
                                    onChange={() => toggleProductRowSelection(row.rowIndex)}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-30"
                                  />
                                </td>
                                <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">
                                  {row.rowIndex}
                                </td>
                                <td className="py-2 px-3 font-mono font-semibold">
                                  {row.barcode || <span className="text-rose-500 italic">ว่าง</span>}
                                </td>
                                <td className="py-2 px-3 font-medium">
                                  {row.product_name || <span className="text-rose-500 italic">ว่าง</span>}
                                </td>
                                <td className="py-2 px-3 text-slate-500">
                                  {row.category}
                                </td>
                                <td className="py-2 px-3 font-mono text-right text-emerald-600 dark:text-emerald-400 font-bold">
                                  ฿{row.selling_price.toLocaleString()}
                                </td>
                                <td className="py-2 px-3 font-mono text-right">
                                  {row.stock_qty}
                                </td>
                                <td className="py-2 px-3 text-[11px]">
                                  {row.parent_barcode ? (
                                    <span className="inline-flex items-center gap-1 text-blue-600 dark:text-cyan-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                      📦 แพ็ค ({row.conversion_factor} ชิ้น ➜ {row.parent_barcode})
                                    </span>
                                  ) : (
                                    <span>{row.unit_name || 'ชิ้น'}</span>
                                  )}
                                </td>
                                <td className="py-2 px-3">
                                  {isError ? (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                        <AlertCircle className="w-3 h-3" /> ผิดพลาด
                                      </span>
                                      <div className="text-[10px] text-rose-600 dark:text-rose-400">
                                        {row.errors.join(', ')}
                                      </div>
                                    </div>
                                  ) : isDuplicate ? (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                        <AlertTriangle className="w-3 h-3" /> ซ้ำในระบบ
                                      </span>
                                      {row.warnings.length > 0 && (
                                        <div className="text-[10px] text-amber-700 dark:text-amber-400">
                                          {row.warnings.join(', ')}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                        <CheckCircle2 className="w-3 h-3" /> พร้อมนำเข้า
                                      </span>
                                      {row.warnings.length > 0 && (
                                        <div className="text-[10px] text-blue-600 dark:text-cyan-400">
                                          {row.warnings.join(', ')}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
          }`}>
            <div className="text-[11px] text-slate-500">
              {productValidationSummary ? (
                <span>
                  เลือกนำเข้า <strong>{productValidationSummary.rows.filter(r => r.isSelected && r.validationStatus !== 'ERROR').length}</strong> จาก {productValidationSummary.total} รายการ
                </span>
              ) : (
                <span>เลือกไฟล์เพื่อเริ่มต้นการตรวจสอบ</span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isImportingProducts}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-300'
                }`}
              >
                ปิด
              </button>

              {uploadProductMode === 'NEW_PRODUCTS' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleExecuteProductImport('SKIP_DUPLICATES')}
                    disabled={isImportingProducts || !productValidationSummary || productValidationSummary.rows.filter(r => r.isSelected && r.validationStatus !== 'ERROR').length === 0}
                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border disabled:opacity-50 ${
                      isLight 
                        ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800 shadow-2xs' 
                        : 'bg-emerald-950/40 hover:bg-emerald-900/40 border-emerald-500/40 text-emerald-300'
                    }`}
                    title="นำเข้าเฉพาะรายการที่ถูกต้อง และข้ามบาร์โค้ดที่มีอยู่แล้วในระบบ"
                  >
                    {isImportingProducts ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    นำเข้า (ข้ามรายการซ้ำ)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecuteProductImport('UPSERT')}
                    disabled={isImportingProducts || !productValidationSummary || productValidationSummary.rows.filter(r => r.isSelected && r.validationStatus !== 'ERROR').length === 0}
                    className={`flex-1 sm:flex-none px-4 py-2.5 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                      isLight 
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' 
                        : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-900/30'
                    }`}
                    title="นำเข้าทั้งหมด โดยหากพบบาร์โค้ดซ้ำจะอัปเดตข้อมูลทับของเดิม"
                  >
                    {isImportingProducts ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    นำเข้าทั้งหมด (อัปเดตทับ)
                  </button>
                </>
              )}

              {uploadProductMode === 'UPDATE_CATALOG' && (
                <button
                  type="button"
                  onClick={() => handleExecuteProductImport('UPSERT')}
                  disabled={isImportingProducts || !productValidationSummary || productValidationSummary.rows.filter(r => r.isSelected && r.validationStatus !== 'ERROR').length === 0}
                  className={`flex-1 sm:flex-none px-5 py-2.5 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                    isLight 
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' 
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
                  }`}
                  title="อัปเดตข้อมูลในแคตตาล็อกสินค้า Master Sheet"
                >
                  {isImportingProducts ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  อัปเดตข้อมูลแคตตาล็อกสินค้า
                </button>
              )}

              {uploadProductMode === 'RESTOCK' && (
                <button
                  type="button"
                  onClick={() => handleExecuteProductImport('UPSERT')}
                  disabled={isImportingProducts || !productValidationSummary || productValidationSummary.rows.filter(r => r.isSelected && r.validationStatus !== 'ERROR').length === 0}
                  className={`flex-1 sm:flex-none px-5 py-2.5 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                    isLight 
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' 
                      : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'
                  }`}
                  title="เพิ่มยอดสต็อกและบันทึกประวัติรับสินค้าเข้าคลัง"
                >
                  {isImportingProducts ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  ยืนยันรับสต็อกเข้าคลัง
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Template Download Modal */}
      {isDownloadProductTemplateOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#0e131f] border-[#2b3a55]'
          }`}>
            <div className={`flex items-center justify-between p-5 border-b ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isLight ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'
                }`}>
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    ดาวน์โหลดไฟล์แม่แบบสินค้า ({uploadProductMode})
                  </h3>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    เลือกรูปแบบไฟล์ที่ต้องการนำไปกรอกข้อมูล
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDownloadProductTemplateOpen(false)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-600' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-400 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className={`block font-semibold mb-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  เลือกรูปแบบไฟล์แม่แบบ (Format)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDownloadProductFormat('csv')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      downloadProductFormat === 'csv'
                        ? isLight
                          ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-900'
                          : 'bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-200'
                        : isLight
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-[#161b26] hover:bg-[#1f2637] border-[#21262d] text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        CSV UTF-8 (.csv)
                      </span>
                      {downloadProductFormat === 'csv' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-indigo-400" />}
                    </div>
                    <span className="text-[10px] opacity-75">
                      รองรับภาษาไทย 100% เปิดได้ทั้ง Excel และ Google Sheets
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDownloadProductFormat('excel_xml')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      downloadProductFormat === 'excel_xml'
                        ? isLight
                          ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-900'
                          : 'bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-200'
                        : isLight
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-[#161b26] hover:bg-[#1f2637] border-[#21262d] text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-500" />
                        Excel XML (.xls)
                      </span>
                      {downloadProductFormat === 'excel_xml' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-indigo-400" />}
                    </div>
                    <span className="text-[10px] opacity-75">
                      ตารางพร้อมหัวสี สไตล์ Microsoft Excel
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-end gap-3 p-4 border-t ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
            }`}>
              <button
                type="button"
                onClick={() => setIsDownloadProductTemplateOpen(false)}
                className={`px-4 py-2 rounded-xl font-semibold transition-colors cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-300'
                }`}
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className={`px-5 py-2.5 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                  isLight 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' 
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-900/30'
                }`}
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลดเทมเพลต ({downloadProductFormat === 'csv' ? 'CSV' : 'Excel'})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
