import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, Image as ImageIcon, CheckCircle2, AlertCircle, 
  RefreshCw, Folder, Trash2, Search, HardDrive, CloudLightning, 
  AlertTriangle, ShieldCheck, RotateCcw
} from 'lucide-react';
import { api, type DriveFolder, matchFileToSoldier, type FileSoldierMatch } from '../../../core/api.ts';
import type { Soldier } from '../../../types/schema.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { useTheme } from '../../../hooks/useTheme.ts';

interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  match: FileSoldierMatch;
  manualSoldier: Soldier | null;
  status: 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
  errorMessage?: string;
  uploadedUrl?: string;
}

interface BatchSoldierPhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  soldiers: Soldier[];
  driveFolders?: DriveFolder[];
  onSuccess?: () => void;
}

const DEFAULT_FOLDER_KEY = 'px_default_soldier_image_folder_id';

export const BatchSoldierPhotoUploadModal: React.FC<BatchSoldierPhotoUploadModalProps> = ({
  isOpen,
  onClose,
  batchId,
  soldiers,
  driveFolders = [],
  onSuccess
}) => {
  const { isLight } = useTheme();
  const { showToast, dismissToast } = useToast();

  const [activeTab, setActiveTab] = useState<'LOCAL_FILES' | 'DRIVE_SCAN'>('LOCAL_FILES');
  const [items, setItems] = useState<UploadItem[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'MATCHED' | 'UNMATCHED' | 'CONFLICT' | 'ERROR'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Confirmation and Summary Dialog State
  const [showPreUploadSummary, setShowPreUploadSummary] = useState(false);
  const [showPostUploadReport, setShowPostUploadReport] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(true);

  // Folder target
  const [selectedFolderId, setSelectedFolderId] = useState<string>(() => {
    return localStorage.getItem(DEFAULT_FOLDER_KEY) || (driveFolders[0]?.folder_id || '');
  });

  // Upload progress
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [isDriveScanning, setIsDriveScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ matched_count: number; matched?: any[] } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect duplicate soldier assignments (Conflicts)
  const duplicatePxCodes = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const soldier = item.manualSoldier || item.match.soldier;
      if (soldier?.px_code) {
        counts[soldier.px_code] = (counts[soldier.px_code] || 0) + 1;
      }
    });
    return new Set(Object.keys(counts).filter(px => counts[px] > 1));
  }, [items]);

  const matchedItems = items.filter(i => (i.manualSoldier || i.match.soldier));
  const unmatchedItems = items.filter(i => !(i.manualSoldier || i.match.soldier));
  const conflictItems = items.filter(i => {
    const s = i.manualSoldier || i.match.soldier;
    return s && duplicatePxCodes.has(s.px_code);
  });
  const errorItems = items.filter(i => i.status === 'ERROR');
  const successItems = items.filter(i => i.status === 'SUCCESS');

  if (!isOpen) return null;

  const handleFilesAdded = (files: FileList | File[]) => {
    const newItems: UploadItem[] = [];
    const validImageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

    if (validImageFiles.length === 0) {
      showToast({ type: 'warning', title: 'ไม่พบไฟล์รูปภาพ', message: 'กรุณาเลือกไฟล์รูปภาพ (.jpg, .jpeg, .png, .webp)' });
      return;
    }

    validImageFiles.forEach(file => {
      const match = matchFileToSoldier(file.name, soldiers);
      newItems.push({
        id: Utilities_getRandomId(),
        file,
        previewUrl: URL.createObjectURL(file),
        match,
        manualSoldier: null,
        status: 'PENDING'
      });
    });

    setItems(prev => [...prev, ...newItems]);
    showToast({ 
      type: 'success', 
      title: 'เพิ่มรูปภาพสำเร็จ', 
      message: `นำเข้า ${newItems.length} รูป (จับคู่อัตโนมัติได้ ${newItems.filter(i => i.match.soldier).length} นาย)` 
    });
  };

  const handleManualSelectSoldier = (itemId: string, soldierIdOrPx: string) => {
    const selected = soldiers.find(s => s.px_code === soldierIdOrPx || (s as any).soldier_id === soldierIdOrPx) || null;
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          manualSoldier: selected,
          match: selected 
            ? { soldier: selected, matchType: 'MANUAL', confidence: 1, matchReason: 'กำหนดเองโดยผู้ใช้' }
            : item.match
        };
      }
      return item;
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => {
      const target = prev.find(i => i.id === itemId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(i => i.id !== itemId);
    });
  };

  const handleClearAll = () => {
    items.forEach(i => {
      if (i.previewUrl) URL.revokeObjectURL(i.previewUrl);
    });
    setItems([]);
  };

  // Pre-Upload Validation Check
  const handlePreUploadCheck = () => {
    if (items.length === 0) {
      showToast({ type: 'warning', title: 'ยังไม่ได้เลือกไฟล์รูปภาพ' });
      return;
    }
    if (matchedItems.length === 0) {
      showToast({ 
        type: 'warning', 
        title: 'ไม่มีรายการที่จับคู่ได้', 
        message: 'กรุณาจับคู่รูปภาพกับรายชื่อทหารอย่างน้อย 1 รายการก่อนอัปโหลด' 
      });
      return;
    }
    // Open Pre-Upload Validation Summary modal
    setShowPreUploadSummary(true);
  };

  // Execute Upload Process
  const handleExecuteUpload = async () => {
    setShowPreUploadSummary(false);

    let itemsToUpload = items.filter(i => {
      const soldier = i.manualSoldier || i.match.soldier;
      if (!soldier) return false;
      if (i.status === 'SUCCESS') return false;
      if (!overwriteExisting && soldier.photo_url) return false;
      return true;
    });

    if (itemsToUpload.length === 0) {
      showToast({ type: 'warning', title: 'ไม่มีรายการพร้อมอัปโหลด' });
      return;
    }

    setIsUploading(true);
    const total = itemsToUpload.length;
    let completed = 0;
    const updatesToBatch: Array<{ px_code: string; photo_url: string }> = [];

    setUploadProgress({ current: 0, total, percent: 0 });

    // Chunk size: 3 concurrent uploads
    const chunkSize = 3;
    for (let i = 0; i < itemsToUpload.length; i += chunkSize) {
      const chunk = itemsToUpload.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (item) => {
        const soldier = item.manualSoldier || item.match.soldier;
        if (!soldier) return;

        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'UPLOADING' } : it));

        try {
          const base64 = await fileToBase64(item.file);
          const res = await api.uploadSoldierImage({
            batch_id: batchId,
            px_code: soldier.px_code,
            image_base64: base64,
            mime_type: item.file.type || 'image/jpeg',
            folder_id: selectedFolderId
          });

          if (res.success && res.image_url) {
            updatesToBatch.push({ px_code: soldier.px_code, photo_url: res.image_url });
            setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'SUCCESS', uploadedUrl: res.image_url } : it));
          } else {
            setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'ERROR', errorMessage: res.error || 'อัปโหลดล้มเหลว' } : it));
          }
        } catch (err: any) {
          setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'ERROR', errorMessage: err.message } : it));
        } finally {
          completed++;
          setUploadProgress({
            current: completed,
            total,
            percent: Math.round((completed / total) * 100)
          });
        }
      }));
    }

    // Single Batch Update to Sheet
    if (updatesToBatch.length > 0) {
      try {
        await api.batchUpdateSoldierPhotos(batchId, updatesToBatch);
        showToast({
          type: 'success',
          title: 'อัปเดตรูปประจำตัวสำเร็จ',
          message: `บันทึกรูปประจำตัวทหาร ${updatesToBatch.length} นายลงชีตผลัด ${batchId} เรียบร้อย`
        });
        if (onSuccess) onSuccess();
      } catch (err: any) {
        showToast({ type: 'error', title: 'อัปเดตชีตล้มเหลว', message: err.message });
      }
    }

    setIsUploading(false);
    setShowPostUploadReport(true);
  };

  // Google Drive Folder Scan Execution
  const handleExecuteDriveScan = async () => {
    if (!selectedFolderId) {
      showToast({ type: 'warning', title: 'กรุณาเลือกโฟลเดอร์ Google Drive' });
      return;
    }

    setIsDriveScanning(true);
    const toastId = showToast({
      type: 'loading',
      title: 'กำลังสแกนโฟลเดอร์ Google Drive...',
      message: `กำลังค้นหารูปภาพและจับคู่กับรายชื่อทหารผลัด ${batchId}`
    }, 0);

    try {
      const res = await api.scanDriveFolderForSoldierPhotos(batchId, selectedFolderId);
      if (res.success) {
        setScanResult({
          matched_count: res.matched_count || 0,
          matched: res.matched || []
        });
        showToast({
          type: 'success',
          title: 'สแกนและจับคู่สำเร็จ!',
          message: `จับคู่รูปภาพและบันทึกลงชีตเรียบร้อยแล้ว ${res.matched_count || 0} นาย`
        });
        if (onSuccess) onSuccess();
      } else {
        showToast({ type: 'error', title: 'การสแกนล้มเหลว', message: res.error || 'ไม่พบรูปภาพที่ตรงกัน' });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
    } finally {
      dismissToast(toastId);
      setIsDriveScanning(false);
    }
  };

  const filteredItems = items.filter(item => {
    const isMatched = !!(item.manualSoldier || item.match.soldier);
    const isConflict = item.manualSoldier || item.match.soldier ? duplicatePxCodes.has((item.manualSoldier || item.match.soldier)!.px_code) : false;

    if (filterType === 'MATCHED' && !isMatched) return false;
    if (filterType === 'UNMATCHED' && isMatched) return false;
    if (filterType === 'CONFLICT' && !isConflict) return false;
    if (filterType === 'ERROR' && item.status !== 'ERROR') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const s = item.manualSoldier || item.match.soldier;
    return (
      item.file.name.toLowerCase().includes(q) ||
      (s && (s.full_name.toLowerCase().includes(q) || s.px_code.toLowerCase().includes(q) || (s.unit && s.unit.toLowerCase().includes(q))))
    );
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`relative w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#12151B] border-[#2A303F] text-slate-100'
          }`}
        >
          {/* Header */}
          <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50/70' : 'border-[#262A36] bg-[#161B22]/70'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight">ระบบอัปโหลดรูปโปรไฟล์พลทหารแบบกลุ่ม</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    ผลัด {batchId}
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  ระบบตรวจจับ ตรวจสอบความถูกต้อง (Validation) และรายงานข้อขัดแย้งก่อนบันทึกลง Google Sheets
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isUploading || isDriveScanning}
              className={`p-2 rounded-xl border transition cursor-pointer disabled:opacity-50 ${
                isLight ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-500' : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-400'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className={`px-5 pt-3 border-b flex gap-2 shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50/40' : 'border-[#262A36] bg-[#14171E]/40'
          }`}>
            <button
              type="button"
              onClick={() => setActiveTab('LOCAL_FILES')}
              className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'LOCAL_FILES'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" /> อัปโหลดไฟล์จากเครื่อง (Bulk Drop & Match)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DRIVE_SCAN')}
              className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'DRIVE_SCAN'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <CloudLightning className="w-3.5 h-3.5" /> ดึงจากโฟลเดอร์ Google Drive (Drive Sync)
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {activeTab === 'LOCAL_FILES' ? (
              <>
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFilesAdded(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer group ${
                    isLight 
                      ? 'border-blue-300 bg-blue-50/40 hover:bg-blue-50/80 hover:border-blue-500' 
                      : 'border-blue-900/50 bg-blue-950/10 hover:bg-blue-950/20 hover:border-blue-600'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFilesAdded(e.target.files);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    ลากไฟล์รูปภาพทั้งหมดมาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                  </div>
                  <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                    รองรับไฟล์ภาพ JPG, PNG, WEBP หลายร้อยไฟล์พร้อมกัน • ระบบจับคู่จาก รหัส PX, เลข ปชช., หรือ ชื่อ ในชื่อไฟล์
                  </p>
                </div>

                {/* Target Folder Selector */}
                {driveFolders.length > 0 && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
                  }`}>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Folder className="w-4 h-4 text-blue-500" />
                      <span>บันทึกลงโฟลเดอร์ Google Drive:</span>
                    </div>
                    <select
                      value={selectedFolderId}
                      onChange={(e) => {
                        setSelectedFolderId(e.target.value);
                        localStorage.setItem(DEFAULT_FOLDER_KEY, e.target.value);
                      }}
                      className={`px-3 py-1.5 rounded-lg border font-semibold outline-hidden cursor-pointer ${
                        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#12151B] border-[#2A303F] text-slate-200'
                      }`}
                    >
                      {driveFolders.map(f => (
                        <option key={f.folder_id} value={f.folder_id}>
                          {f.folder_name} {f.is_default ? '(เริ่มต้น)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Conflict / Warning Notice Bar */}
                {conflictItems.length > 0 && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                    isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>ตรวจพบรูปภาพที่จับคู่ซ้ำกับทหารคนเดียวกันจำนวน <strong>{conflictItems.length} รูป</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFilterType('CONFLICT')}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-[11px] cursor-pointer hover:bg-amber-600"
                    >
                      ดูรายการซ้ำ
                    </button>
                  </div>
                )}

                {/* Items List / Match Matrix */}
                {items.length > 0 && (
                  <div className="space-y-3">
                    {/* Header Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFilterType('ALL')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            filterType === 'ALL' 
                              ? 'bg-blue-600 text-white shadow-xs' 
                              : isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#181B22] text-slate-400'
                          }`}
                        >
                          ทั้งหมด ({items.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterType('MATCHED')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                            filterType === 'MATCHED' 
                              ? 'bg-emerald-600 text-white shadow-xs' 
                              : isLight ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-950/40 text-emerald-400'
                          }`}
                        >
                          🟢 พร้อมอัปโหลด ({matchedItems.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterType('UNMATCHED')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                            filterType === 'UNMATCHED' 
                              ? 'bg-amber-600 text-white shadow-xs' 
                              : isLight ? 'bg-amber-50 text-amber-700' : 'bg-amber-950/40 text-amber-400'
                          }`}
                        >
                          🟡 รอระบุตัวตน ({unmatchedItems.length})
                        </button>
                        {conflictItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setFilterType('CONFLICT')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                              filterType === 'CONFLICT' 
                                ? 'bg-rose-600 text-white shadow-xs' 
                                : isLight ? 'bg-rose-50 text-rose-700' : 'bg-rose-950/40 text-rose-400'
                            }`}
                          >
                            🔴 ข้อขัดแย้ง ({conflictItems.length})
                          </button>
                        )}
                        {errorItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setFilterType('ERROR')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                              filterType === 'ERROR' 
                                ? 'bg-rose-600 text-white shadow-xs' 
                                : isLight ? 'bg-rose-100 text-rose-800' : 'bg-rose-950 text-rose-300'
                            }`}
                          >
                            ⚠️ ผิดพลาด ({errorItems.length})
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`relative flex items-center px-2.5 py-1 rounded-lg border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
                        }`}>
                          <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="ค้นหาชื่อไฟล์, ทหาร..."
                            className="text-xs bg-transparent border-none outline-none w-28 sm:w-36"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleClearAll}
                          disabled={isUploading}
                          className="px-2.5 py-1 text-xs text-rose-500 hover:text-rose-600 font-semibold cursor-pointer disabled:opacity-50"
                        >
                          ล้างรายการทั้งหมด
                        </button>
                      </div>
                    </div>

                    {/* Table of Matches */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#262A36] max-h-72">
                      <table className="w-full text-left text-xs">
                        <thead className={`text-[11px] uppercase border-b sticky top-0 z-10 ${
                          isLight ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-[#161B22] text-slate-400 border-[#262A36]'
                        }`}>
                          <tr>
                            <th className="py-2.5 px-3">รูปถ่าย</th>
                            <th className="py-2.5 px-3">ชื่อไฟล์</th>
                            <th className="py-2.5 px-3">พลทหารที่จับคู่ (Matched Soldier)</th>
                            <th className="py-2.5 px-3">เงื่อนไขที่ตรง</th>
                            <th className="py-2.5 px-3 text-center">สถานะ</th>
                            <th className="py-2.5 px-3 text-right">ลบ</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isLight ? 'divide-slate-100 text-slate-700' : 'divide-[#262A36] text-slate-300'}`}>
                          {filteredItems.map(item => {
                            const soldier = item.manualSoldier || item.match.soldier;
                            const isConflict = soldier ? duplicatePxCodes.has(soldier.px_code) : false;

                            return (
                              <tr key={item.id} className={`${
                                isConflict 
                                  ? (isLight ? 'bg-rose-50/50 hover:bg-rose-50' : 'bg-rose-950/20 hover:bg-rose-950/30')
                                  : (isLight ? 'hover:bg-slate-50' : 'hover:bg-[#181B22]/60')
                              }`}>
                                <td className="py-2 px-3">
                                  <img
                                    src={item.previewUrl}
                                    alt=""
                                    className="w-9 h-9 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs"
                                  />
                                </td>
                                <td className="py-2 px-3 font-mono text-[11px] max-w-[150px] truncate" title={item.file.name}>
                                  {item.file.name}
                                </td>
                                <td className="py-2 px-3">
                                  {soldier ? (
                                    <div className="flex items-center gap-2">
                                      <div className="font-bold text-xs">{soldier.full_name}</div>
                                      <span className="font-mono text-[10px] text-slate-400">
                                        ({soldier.px_code})
                                      </span>
                                      {isConflict && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500 text-white">
                                          ซ้ำ
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <select
                                      onChange={(e) => handleManualSelectSoldier(item.id, e.target.value)}
                                      className={`text-xs px-2 py-1 rounded-lg border font-medium outline-hidden cursor-pointer max-w-[200px] ${
                                        isLight ? 'bg-white border-amber-300 text-amber-900' : 'bg-[#181B22] border-amber-700/50 text-amber-300'
                                      }`}
                                    >
                                      <option value="">-- เลือกพลทหารที่ตรงกับรูป --</option>
                                      {soldiers.map(s => (
                                        <option key={s.px_code} value={s.px_code}>
                                          {s.px_code} - {s.full_name} ({s.unit || '-'})
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </td>
                                <td className="py-2 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.match.matchType === 'PX_CODE'
                                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                      : item.match.matchType === 'NATIONAL_ID'
                                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                      : item.match.matchType === 'NAME'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                      : item.match.matchType === 'MANUAL'
                                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  }`}>
                                    {item.match.matchType === 'PX_CODE' && 'รหัส PX'}
                                    {item.match.matchType === 'NATIONAL_ID' && 'เลข ปชช.'}
                                    {item.match.matchType === 'NAME' && 'ชื่อตรงกัน'}
                                    {item.match.matchType === 'INDEX' && 'ลำดับเลข'}
                                    {item.match.matchType === 'MANUAL' && 'เลือกเอง'}
                                    {item.match.matchType === 'NONE' && 'ไม่พบชื่อ'}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {item.status === 'SUCCESS' && (
                                    <span className="text-emerald-500 flex items-center justify-center gap-1 font-bold text-[10px]">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> สำเร็จ
                                    </span>
                                  )}
                                  {item.status === 'UPLOADING' && (
                                    <span className="text-blue-500 flex items-center justify-center gap-1 font-bold text-[10px]">
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> กำลังส่ง...
                                    </span>
                                  )}
                                  {item.status === 'ERROR' && (
                                    <span className="text-rose-500 flex items-center justify-center gap-1 font-bold text-[10px]" title={item.errorMessage}>
                                      <AlertCircle className="w-3.5 h-3.5" /> ผิดพลาด
                                    </span>
                                  )}
                                  {item.status === 'PENDING' && (
                                    <span className="text-slate-400 text-[10px]">พร้อม</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(item.id)}
                                    disabled={isUploading}
                                    className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Drive Scan Tab */
              <div className="space-y-4 py-4">
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-blue-50/50 border-blue-200' : 'bg-blue-950/20 border-blue-900/40'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <CloudLightning className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400">สแกนรูปภาพจากโฟลเดอร์ Google Drive โดยตรง</h4>
                      <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        ระบบจะทำการสแกนไฟล์รูปในโฟลเดอร์ Google Drive ที่เลือก ตั้งค่าสิทธิ์สาธารณะ และจับคู่กับรหัส PX / เลข ปชช. / ชื่อทหารลง Google Sheet โดยอัตโนมัติ
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className={`text-xs font-bold block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      เลือกโฟลเดอร์ Google Drive ที่เก็บรูปทหาร:
                    </label>
                    <select
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-hidden ${
                        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#181B22] border-[#262A36] text-slate-200'
                      }`}
                    >
                      {driveFolders.map(f => (
                        <option key={f.folder_id} value={f.folder_id}>
                          📁 {f.folder_name} ({f.folder_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {scanResult && (
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>สแกนและบันทึกข้อมูลเรียบร้อยแล้ว: {scanResult.matched_count} นาย</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      ระบบได้บันทึกลิงก์รูปถ่ายลงใน Google Sheet ของผลัด {batchId} เรียบร้อยแล้ว
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-bold text-blue-500">
                  <span>กำลังอัปโหลดรูปภาพขึ้น Google Drive ({uploadProgress.current}/{uploadProgress.total})...</span>
                  <span>{uploadProgress.percent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-[#262A36] overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress.percent}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className={`p-4 sm:p-5 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50/70' : 'border-[#262A36] bg-[#161B22]/70'
          }`}>
            <div className="text-xs text-slate-400">
              {activeTab === 'LOCAL_FILES' ? (
                <span>พร้อมอัปโหลด: <strong className="text-emerald-500">{matchedItems.length}</strong> / {items.length} รูป {unmatchedItems.length > 0 ? `(รอระบุ ${unmatchedItems.length} รูป)` : ''}</span>
              ) : (
                <span>โฟลเดอร์ที่เลือก: <strong className="text-blue-500">{driveFolders.find(f => f.folder_id === selectedFolderId)?.folder_name || selectedFolderId}</strong></span>
              )}
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading || isDriveScanning}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                  isLight ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700' : 'bg-[#181B22] border-[#262A36] hover:bg-[#202738] text-slate-300'
                }`}
              >
                ปิดหน้าต่าง
              </button>

              {activeTab === 'LOCAL_FILES' ? (
                <button
                  type="button"
                  onClick={handlePreUploadCheck}
                  disabled={isUploading || matchedItems.length === 0}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> กำลังอัปโหลด ({uploadProgress.current}/{uploadProgress.total})
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> ตรวจสอบ & อัปโหลด ({matchedItems.length} รูป)
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleExecuteDriveScan}
                  disabled={isDriveScanning || !selectedFolderId}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {isDriveScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> กำลังสแกนโฟลเดอร์...
                    </>
                  ) : (
                    <>
                      <CloudLightning className="w-4 h-4" /> เริ่มสแกนรูปในโฟลเดอร์
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Pre-Upload Validation Summary & Action Choice Modal */}
        {showPreUploadSummary && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className={`relative max-w-md w-full rounded-2xl p-5 border shadow-2xl space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#12151B] border-[#2A303F] text-slate-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">สรุปรายงานก่อนเริ่มอัปโหลด (Validation Report)</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    ผลัดทหาร: <span className="font-mono text-blue-500">{batchId}</span>
                  </p>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className={`p-3.5 rounded-xl border text-xs space-y-2 font-mono ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
              }`}>
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> พร้อมอัปโหลด & บันทึก:</span>
                  <span className="font-bold">{matchedItems.length} รูป</span>
                </div>
                {unmatchedItems.length > 0 && (
                  <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                    <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> ยังไม่ได้ระบุตัวตน (จะข้ามไป):</span>
                    <span className="font-bold">{unmatchedItems.length} รูป</span>
                  </div>
                )}
                {conflictItems.length > 0 && (
                  <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                    <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> รายการซ้ำกัน:</span>
                    <span className="font-bold">{conflictItems.length} รูป</span>
                  </div>
                )}
              </div>

              {/* Overwrite Options */}
              <div className="space-y-2 pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>เขียนทับรูปโปรไฟล์เดิมของทหารคนนั้น (ถ้ามีอยู่แล้ว)</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPreUploadSummary(false)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-[#181B22] hover:bg-[#202738] border-[#262A36] text-slate-300'
                  }`}
                >
                  กลับไปแก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteUpload()}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> ยืนยันเริ่มอัปโหลด
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Post-Upload Summary & Error Retry Dialog */}
        {showPostUploadReport && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className={`relative max-w-md w-full rounded-2xl p-5 border shadow-2xl space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#12151B] border-[#2A303F] text-slate-100'
            }`}>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold">ผลการอัปโหลดรูปภาพ</h3>
              </div>

              <div className={`p-4 rounded-xl border space-y-2 text-xs font-mono ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
              }`}>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>🟢 อัปโหลดสำเร็จ:</span>
                  <span className="font-bold">{successItems.length} รูป</span>
                </div>
                {errorItems.length > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>🔴 อัปโหลดล้มเหลว:</span>
                    <span className="font-bold">{errorItems.length} รูป</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                {errorItems.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPostUploadReport(false);
                        setFilterType('ERROR');
                      }}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold ${
                        isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#181B22] border-[#262A36] text-slate-300'
                      }`}
                    >
                      ดูรายการที่ผิดพลาด
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPostUploadReport(false);
                        handleExecuteUpload();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> ลองส่งซ้ำที่ Error
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPostUploadReport(false);
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                  >
                    เสร็จสิ้น & ปิดหน้าต่าง
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

function Utilities_getRandomId(): string {
  return 'PHOTO-' + Math.random().toString(36).substring(2, 9);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
