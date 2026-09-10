import React, { useState, useEffect } from 'react';
import { 
  Upload, X, Download, FileUp, RefreshCw, CheckCircle2, 
  AlertTriangle, AlertCircle, Check, FileSpreadsheet, FileText 
} from 'lucide-react';
import { 
  api, 
  validateSoldierRows, 
  parseSoldierFile, 
  downloadSoldierTemplate,
  type ValidationSummary 
} from '../../../core/api.ts';
import type { Soldier } from '../../../types/schema.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { useTheme } from '../../../hooks/useTheme.ts';

interface SoldierImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBatches: { batch_id: string; batch_name: string }[];
  currentBatchId: string;
  onSuccess?: (batchId: string) => void;
}

export const SoldierImportModal: React.FC<SoldierImportModalProps> = ({
  isOpen,
  onClose,
  availableBatches,
  currentBatchId,
  onSuccess
}) => {
  const { isLight } = useTheme();
  const { showToast, dismissToast } = useToast();

  const [uploadBatchId, setUploadBatchId] = useState<string>(currentBatchId || '');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isImportingSoldiers, setIsImportingSoldiers] = useState(false);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [uploadFilterStatus, setUploadFilterStatus] = useState<'ALL' | 'VALID' | 'DUPLICATE' | 'ERROR'>('ALL');
  const [importResult, setImportResult] = useState<{
    success: boolean;
    count_imported?: number;
    count_updated?: number;
    count_skipped?: number;
    message?: string;
  } | null>(null);

  // Template download state
  const [isDownloadTemplateOpen, setIsDownloadTemplateOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'csv' | 'excel_xml'>('csv');

  useEffect(() => {
    if (currentBatchId) {
      setUploadBatchId(currentBatchId);
    }
  }, [currentBatchId]);

  if (!isOpen) return null;

  const handleFileSelected = async (file: File) => {
    setUploadFile(file);
    setIsParsingFile(true);
    setValidationSummary(null);
    setImportResult(null);

    try {
      const rawRows = await parseSoldierFile(file);
      if (rawRows.length === 0) {
        showToast({
          type: 'warning',
          title: 'ไม่พบข้อมูลในไฟล์',
          message: 'ไฟล์ที่เลือกไม่มีข้อมูลหรือหัวตารางไม่ตรงกับเทมเพลตมาตรฐาน'
        });
        setIsParsingFile(false);
        return;
      }

      const existingList: Soldier[] = await api.getSoldiers(uploadBatchId);
      const summary = validateSoldierRows(rawRows, existingList);
      setValidationSummary(summary);
      setUploadFilterStatus('ALL');
      showToast({
        type: 'info',
        title: 'ตรวจสอบไฟล์เรียบร้อย',
        message: `พบข้อมูล ${summary.total} รายการ (ถูกต้อง ${summary.validCount}, ซ้ำ ${summary.duplicateCount}, ข้อผิดพลาด ${summary.errorCount})`
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'ไม่สามารถอ่านไฟล์ได้',
        message: err.message || 'โครงสร้างไฟล์ไม่ถูกต้อง'
      });
    } finally {
      setIsParsingFile(false);
    }
  };

  const toggleRowSelection = (rowIndex: number) => {
    if (!validationSummary) return;
    const updatedRows = validationSummary.rows.map(r => {
      if (r.rowIndex === rowIndex) {
        return { ...r, isSelected: !r.isSelected };
      }
      return r;
    });
    setValidationSummary({
      ...validationSummary,
      rows: updatedRows
    });
  };

  const toggleSelectAll = (select: boolean) => {
    if (!validationSummary) return;
    const updatedRows = validationSummary.rows.map(r => {
      if (r.validationStatus === 'ERROR') return { ...r, isSelected: false };
      return { ...r, isSelected: select };
    });
    setValidationSummary({
      ...validationSummary,
      rows: updatedRows
    });
  };

  const handleExecuteImport = async (mode: 'SKIP_DUPLICATES' | 'UPSERT') => {
    if (!validationSummary) return;
    const selectedRows = validationSummary.rows.filter(r => r.isSelected && r.validationStatus !== 'ERROR');
    if (selectedRows.length === 0) {
      showToast({
        type: 'warning',
        title: 'ไม่มีรายการที่เลือก',
        message: 'กรุณาเลือกรายการที่ต้องการนำเข้าอย่างน้อย 1 รายการ (รายการที่มี Error จะไม่สามารถนำเข้าได้)'
      });
      return;
    }

    const payloadSoldiers = selectedRows.map(r => ({
      px_code: r.px_code,
      national_id: r.national_id,
      full_name: r.full_name,
      unit: r.unit,
      credit_limit: r.credit_limit,
      deductions: r.deductions,
      photo_url: r.photo_url || '',
      status: r.status
    }));

    setIsImportingSoldiers(true);
    const toastId = showToast({
      type: 'loading',
      title: 'กำลังนำเข้าข้อมูลทหาร...',
      message: `กำลังส่งข้อมูล ${payloadSoldiers.length} รายการไปยัง Google Sheet ผลัด ${uploadBatchId}`
    }, 0);

    try {
      const res = await api.batchImportSoldiers(uploadBatchId, payloadSoldiers, mode);
      dismissToast(toastId);
      if (res.success) {
        setImportResult({
          success: true,
          count_imported: res.count_imported,
          count_updated: res.count_updated,
          count_skipped: res.count_skipped,
          message: res.message
        });
        showToast({
          type: 'success',
          title: 'นำเข้าข้อมูลทหารสำเร็จ!',
          message: `เพิ่มใหม่ ${res.count_imported || 0} รายการ, อัปเดต ${res.count_updated || 0} รายการ, ข้าม ${res.count_skipped || 0} รายการ`
        });
        if (onSuccess) {
          onSuccess(uploadBatchId);
        }
      } else {
        showToast({
          type: 'error',
          title: 'เกิดข้อผิดพลาดในการนำเข้า',
          message: res.message || 'ไม่สามารถบันทึกข้อมูลลง Google Sheet ได้'
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
      setIsImportingSoldiers(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadSoldierTemplate(downloadFormat, uploadBatchId);
    setIsDownloadTemplateOpen(false);
    showToast({
      type: 'success',
      title: 'ดาวน์โหลดสำเร็จ',
      message: `ดาวน์โหลดไฟล์แม่แบบทหาร (${downloadFormat.toUpperCase()}) เรียบร้อย`
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className={`border rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
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
                  นำเข้าข้อมูลทหารแบบกลุ่ม & ตรวจสอบความถูกต้อง (Batch Upload)
                </h3>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  ตรวจสอบข้อมูลซ้ำ ข้อผิดพลาด และความสมบูรณ์ก่อนบันทึกลง Google Sheet
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!isImportingSoldiers) {
                  onClose();
                  setValidationSummary(null);
                  setImportResult(null);
                }
              }}
              disabled={isImportingSoldiers}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-600' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-400 hover:text-white'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto space-y-4 text-xs">
            {/* Step 1: Batch & File Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  รหัสผลัดปลายทาง (Target Batch)
                </label>
                <select
                  value={uploadBatchId}
                  onChange={(e) => {
                    setUploadBatchId(e.target.value);
                    if (uploadFile) {
                      handleFileSelected(uploadFile);
                    }
                  }}
                  disabled={isImportingSoldiers}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                    isLight 
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white' 
                      : 'bg-[#161b26] border-[#2b3a55] text-white focus:border-indigo-500'
                  }`}
                >
                  {availableBatches.map(b => (
                    <option key={`upload_batch_${b.batch_id}`} value={b.batch_id}>
                      🏷️ {b.batch_name} ({b.batch_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  เลือกไฟล์ข้อมูลทหาร (.csv, .xlsx, .xls)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="soldier-file-input"
                    accept=".csv, .xlsx, .xls, .txt, .xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file);
                    }}
                    disabled={isImportingSoldiers}
                    className="hidden"
                  />
                  <label
                    htmlFor="soldier-file-input"
                    className={`flex-1 px-4 py-2 rounded-xl border-2 border-dashed font-medium text-center cursor-pointer transition-colors flex items-center justify-center gap-2 ${
                      isLight 
                        ? 'border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-700' 
                        : 'border-[#2b3a55] bg-[#141a29] hover:bg-[#1a2337] text-indigo-300'
                    }`}
                  >
                    <FileUp className="w-4 h-4" />
                    <span>{uploadFile ? uploadFile.name : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง'}</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsDownloadTemplateOpen(true)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-[#1c2438] hover:bg-[#283550] border-[#2b3a55] text-slate-300'
                    }`}
                    title="ดาวน์โหลดไฟล์แม่แบบเพื่อนำไปกรอก"
                  >
                    <Download className="w-3.5 h-3.5" />
                    เทมเพลต
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isParsingFile && (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className={`w-8 h-8 mx-auto animate-spin mb-3 ${isLight ? 'text-blue-600' : 'text-indigo-400'}`} />
                <p className="font-semibold text-xs">กำลังอ่านไฟล์และตรวจสอบความถูกต้องของข้อมูล...</p>
              </div>
            )}

            {/* Success Report Banner */}
            {importResult && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
              }`}>
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-sm">🟢 นำเข้าข้อมูลลง Google Sheet สำเร็จ!</div>
                  <p className="text-xs">
                    {importResult.message || `บันทึกข้อมูลเข้าชีต Soldiers_${uploadBatchId} เรียบร้อย`}
                  </p>
                  <div className="flex gap-4 pt-1 text-[11px] font-mono">
                    <span>เพิ่มใหม่: <strong>{importResult.count_imported || 0}</strong> นาย</span>
                    <span>อัปเดต: <strong>{importResult.count_updated || 0}</strong> นาย</span>
                    <span>ข้าม: <strong>{importResult.count_skipped || 0}</strong> นาย</span>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Summary Cards */}
            {validationSummary && !isParsingFile && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-3.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
                  }`}>
                    <div className="text-[11px] text-slate-500 font-medium">ข้อมูลทั้งหมดในไฟล์</div>
                    <div className={`text-xl font-bold font-mono mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {validationSummary.total} <span className="text-xs font-normal text-slate-500">นาย</span>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${
                    isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/30 border-emerald-500/30'
                  }`}>
                    <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมนำเข้า (ถูกต้อง)
                    </div>
                    <div className="text-xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
                      {validationSummary.validCount} <span className="text-xs font-normal opacity-75">นาย</span>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${
                    isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/30 border-amber-500/30'
                  }`}>
                    <div className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> พบข้อมูลซ้ำในระบบ
                    </div>
                    <div className="text-xl font-bold font-mono mt-1 text-amber-600 dark:text-amber-400">
                      {validationSummary.duplicateCount} <span className="text-xs font-normal opacity-75">นาย</span>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${
                    isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-950/30 border-rose-500/30'
                  }`}>
                    <div className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> ข้อผิดพลาด (Error)
                    </div>
                    <div className="text-xl font-bold font-mono mt-1 text-rose-600 dark:text-rose-400">
                      {validationSummary.errorCount} <span className="text-xs font-normal opacity-75">นาย</span>
                    </div>
                  </div>
                </div>

                {/* Filter Tabs & Bulk Actions */}
                <div className={`flex flex-wrap items-center justify-between gap-3 pt-2 pb-1 border-b ${
                  isLight ? 'border-slate-200' : 'border-[#21262d]'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setUploadFilterStatus('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors cursor-pointer ${
                        uploadFilterStatus === 'ALL'
                          ? isLight ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'
                          : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#161b26] text-slate-400 hover:bg-[#202838]'
                      }`}
                    >
                      ทั้งหมด ({validationSummary.total})
                    </button>

                    <button
                      type="button"
                      onClick={() => setUploadFilterStatus('VALID')}
                      className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors cursor-pointer ${
                        uploadFilterStatus === 'VALID'
                          ? 'bg-emerald-600 text-white'
                          : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#161b26] text-slate-400 hover:bg-[#202838]'
                      }`}
                    >
                      🟢 ถูกต้อง ({validationSummary.validCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setUploadFilterStatus('DUPLICATE')}
                      className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors cursor-pointer ${
                        uploadFilterStatus === 'DUPLICATE'
                          ? 'bg-amber-600 text-white'
                          : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#161b26] text-slate-400 hover:bg-[#202838]'
                      }`}
                    >
                      🟡 ซ้ำ ({validationSummary.duplicateCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setUploadFilterStatus('ERROR')}
                      className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors cursor-pointer ${
                        uploadFilterStatus === 'ERROR'
                          ? 'bg-rose-600 text-white'
                          : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#161b26] text-slate-400 hover:bg-[#202838]'
                      }`}
                    >
                      🔴 ผิดพลาด ({validationSummary.errorCount})
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelectAll(true)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                        isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#161b26] hover:bg-[#202838] text-slate-300'
                      }`}
                    >
                      เลือกทั้งหมด
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSelectAll(false)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                        isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#161b26] hover:bg-[#202838] text-slate-300'
                      }`}
                    >
                      ยกเลิกการเลือก
                    </button>
                  </div>
                </div>

                {/* Pre-Validation Interactive Table */}
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
                          <th className="py-2.5 px-3">รหัสทหาร</th>
                          <th className="py-2.5 px-3">เลขบัตรประชาชน</th>
                          <th className="py-2.5 px-3">ชื่อ-สกุล</th>
                          <th className="py-2.5 px-3">สังกัด</th>
                          <th className="py-2.5 px-3 text-right">วงเงิน</th>
                          <th className="py-2.5 px-3">สถานะตรวจสอบ</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-[#1e2638]'}`}>
                        {validationSummary.rows
                          .filter(r => {
                            if (uploadFilterStatus === 'ALL') return true;
                            return r.validationStatus === uploadFilterStatus;
                          })
                          .map((row) => {
                            const isError = row.validationStatus === 'ERROR';
                            const isDuplicate = row.validationStatus === 'DUPLICATE';
                            return (
                              <tr 
                                key={`parsed_row_${row.rowIndex}`}
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
                                    disabled={isError || isImportingSoldiers}
                                    onChange={() => toggleRowSelection(row.rowIndex)}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-30"
                                  />
                                </td>
                                <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">
                                  {row.rowIndex}
                                </td>
                                <td className="py-2 px-3 font-mono font-semibold">
                                  {row.px_code || <span className="text-rose-500 italic">ว่าง</span>}
                                </td>
                                <td className="py-2 px-3 font-mono text-[11px]">
                                  {row.national_id ? (
                                    row.national_id.length === 13 ? (
                                      row.national_id
                                    ) : (
                                      <span className="text-rose-500 font-semibold">{row.national_id}</span>
                                    )
                                  ) : (
                                    <span className="text-slate-400 italic">ไม่ระบุ</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 font-medium">
                                  {row.full_name || <span className="text-rose-500 italic">ว่าง</span>}
                                </td>
                                <td className="py-2 px-3 text-slate-500">
                                  {row.unit}
                                </td>
                                <td className="py-2 px-3 font-mono text-right">
                                  ฿{row.credit_limit.toLocaleString()}
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
                                      <div className="text-[10px] text-amber-700 dark:text-amber-400">
                                        {row.warnings.join(', ')}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                      <CheckCircle2 className="w-3 h-3" /> พร้อมนำเข้า
                                    </span>
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
              {validationSummary ? (
                <span>
                  เลือกนำเข้า <strong>{validationSummary.rows.filter(r => r.isSelected && r.validationStatus !== 'ERROR').length}</strong> จาก {validationSummary.total} นาย
                </span>
              ) : (
                <span>เลือกไฟล์เพื่อเริ่มต้นการตรวจสอบ</span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isImportingSoldiers}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-300'
                }`}
              >
                ปิด
              </button>

              <button
                type="button"
                onClick={() => handleExecuteImport('SKIP_DUPLICATES')}
                disabled={isImportingSoldiers || !validationSummary || validationSummary.rows.filter(r => r.isSelected && r.validationStatus !== 'ERROR').length === 0}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border disabled:opacity-50 ${
                  isLight 
                    ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800 shadow-2xs' 
                    : 'bg-emerald-950/40 hover:bg-emerald-900/40 border-emerald-500/40 text-emerald-300'
                }`}
                title="นำเข้าเฉพาะรายการที่ถูกต้อง และข้ามรายการที่ซ้ำกับในระบบ"
              >
                {isImportingSoldiers ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
                นำเข้า (ข้ามรายการซ้ำ)
              </button>

              <button
                type="button"
                onClick={() => handleExecuteImport('UPSERT')}
                disabled={isImportingSoldiers || !validationSummary || validationSummary.rows.filter(r => r.isSelected && r.validationStatus !== 'ERROR').length === 0}
                className={`flex-1 sm:flex-none px-4 py-2.5 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                  isLight 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' 
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-900/30'
                }`}
                title="นำเข้าทั้งหมด โดยหากพบรายการซ้ำจะทำการอัปเดตข้อมูลทับข้อมูลเดิม"
              >
                {isImportingSoldiers ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                นำเข้าและอัปเดตทับ (Upsert)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Template Download Sub-Modal */}
      {isDownloadTemplateOpen && (
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
                    ดาวน์โหลดไฟล์แม่แบบทหาร
                  </h3>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    เลือกรูปแบบไฟล์ที่ต้องการนำไปกรอกข้อมูล
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDownloadTemplateOpen(false)}
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
                    onClick={() => setDownloadFormat('csv')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      downloadFormat === 'csv'
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
                      {downloadFormat === 'csv' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-indigo-400" />}
                    </div>
                    <span className="text-[10px] opacity-75">
                      รองรับภาษาไทย 100% เปิดได้ทั้ง Excel และ Google Sheets
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDownloadFormat('excel_xml')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      downloadFormat === 'excel_xml'
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
                      {downloadFormat === 'excel_xml' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-indigo-400" />}
                    </div>
                    <span className="text-[10px] opacity-75">
                      ตารางพร้อมหัวสี สไตล์ Microsoft Excel
                    </span>
                  </button>
                </div>
              </div>

              <div className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#141a29] border-[#21262d] text-slate-400'
              }`}>
                <span className="font-semibold block text-slate-500 dark:text-slate-300">
                  คอลัมน์มาตรฐานที่มีในไฟล์เทมเพลต (8 คอลัมน์):
                </span>
                <code className="text-[10px] block font-mono bg-black/10 dark:bg-black/30 p-2 rounded-lg break-all">
                  px_code, national_id, full_name, unit, credit_limit, deductions, photo_url, status
                </code>
              </div>
            </div>

            <div className={`flex items-center justify-end gap-3 p-4 border-t ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
            }`}>
              <button
                type="button"
                onClick={() => setIsDownloadTemplateOpen(false)}
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
                ดาวน์โหลดเทมเพลต ({downloadFormat === 'csv' ? 'CSV' : 'Excel'})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
