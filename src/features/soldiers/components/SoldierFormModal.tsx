import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Image as ImageIcon, 
  Upload, RefreshCw, Check, Folder
} from 'lucide-react';
import { api, type DriveFolder, normalizeDriveImageUrl } from '../../../core/api.ts';
import type { Soldier, SoldierStatus } from '../../../types/schema.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { useTheme } from '../../../hooks/useTheme.ts';

export interface SoldierFormData {
  px_code: string;
  national_id: string;
  full_name: string;
  unit: string;
  credit_limit: string;
  deductions: string;
  photo_url?: string;
  status: SoldierStatus;
}

interface SoldierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSoldier: Soldier | null;
  batchId: string;
  driveFolders?: DriveFolder[];
  onSuccess?: () => void;
}

const DEFAULT_FORM: SoldierFormData = {
  px_code: '',
  national_id: '',
  full_name: '',
  unit: 'ร้อย 1',
  credit_limit: '2000',
  deductions: '0',
  photo_url: '',
  status: 'ACTIVE'
};

const DEFAULT_FOLDER_KEY = 'px_default_soldier_image_folder_id';

export const SoldierFormModal: React.FC<SoldierFormModalProps> = ({
  isOpen,
  onClose,
  editingSoldier,
  batchId,
  driveFolders = [],
  onSuccess
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<SoldierFormData>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  useEffect(() => {
    if (editingSoldier) {
      setFormData({
        px_code: editingSoldier.px_code || '',
        national_id: editingSoldier.national_id || '',
        full_name: editingSoldier.full_name || '',
        unit: editingSoldier.unit || 'ร้อย 1',
        credit_limit: String(editingSoldier.credit_limit ?? '2000'),
        deductions: String(editingSoldier.deductions ?? '0'),
        photo_url: editingSoldier.photo_url || '',
        status: editingSoldier.status || 'ACTIVE'
      });
    } else {
      // Auto-generate PX Code for new soldier
      const timestamp = Date.now().toString().slice(-4);
      const random = Math.floor(Math.random() * 90 + 10);
      setFormData({
        ...DEFAULT_FORM,
        px_code: `W21-${batchId.replace(/[^0-9]/g, '') || '691'}-${timestamp}${random}`
      });
    }
  }, [editingSoldier, isOpen, batchId]);

  useEffect(() => {
    if (driveFolders.length > 0) {
      const saved = localStorage.getItem(DEFAULT_FOLDER_KEY);
      const defaultFolder = driveFolders.find(f => f.is_default || f.is_linked);
      if (saved && driveFolders.some(f => f.folder_id === saved)) {
        setSelectedFolderId(saved);
      } else if (defaultFolder) {
        setSelectedFolderId(defaultFolder.folder_id);
      } else {
        setSelectedFolderId(driveFolders[0].folder_id);
      }
    }
  }, [driveFolders]);

  if (!isOpen) return null;

  const isEditing = !!editingSoldier;

  const handleFolderChange = (newFolderId: string) => {
    setSelectedFolderId(newFolderId);
    localStorage.setItem(DEFAULT_FOLDER_KEY, newFolderId);
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({ type: 'warning', title: 'ไฟล์ไม่ถูกต้อง', message: 'กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WEBP)' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast({ type: 'warning', title: 'ขนาดไฟล์เกินกำหนด', message: 'ขนาดรูปภาพต้องไม่เกิน 5 MB' });
      return;
    }

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await api.uploadSoldierImage({
          batch_id: batchId,
          px_code: formData.px_code || 'NEW',
          image_base64: base64Data,
          mime_type: file.type,
          folder_id: selectedFolderId || undefined
        });

        if (res.success && res.image_url) {
          setFormData(prev => ({ ...prev, photo_url: res.image_url }));
          showToast({
            type: 'success',
            title: 'อัปโหลดรูปภาพสำเร็จ!',
            message: 'จัดเก็บใน Google Drive เรียบร้อย'
          });
        } else {
          showToast({
            type: 'error',
            title: 'อัปโหลดรูปภาพไม่สำเร็จ',
            message: res.error || res.message || 'เกิดข้อผิดพลาดในการอัปโหลด'
          });
        }
        setIsUploadingImage(false);
      };
      reader.onerror = () => {
        showToast({ type: 'error', title: 'อ่านไฟล์ไม่สำเร็จ', message: 'ไม่สามารถประมวลผลไฟล์รูปภาพได้' });
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message || 'อัปโหลดล้มเหลว' });
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pxCode = formData.px_code.trim();
    const fullName = formData.full_name.trim();
    const nationalId = formData.national_id.trim();

    if (!pxCode) {
      showToast({ type: 'warning', title: 'กรุณากรอกรหัส PX', message: 'รหัสประจำตัวทหารห้ามเว้นว่าง' });
      return;
    }
    if (!fullName) {
      showToast({ type: 'warning', title: 'กรุณากรอกชื่อ-สกุล', message: 'ยศและชื่อ-นามสกุลห้ามเว้นว่าง' });
      return;
    }

    const creditLimit = Number(formData.credit_limit);
    if (isNaN(creditLimit) || creditLimit < 0) {
      showToast({ type: 'warning', title: 'วงเงินไม่ถูกต้อง', message: 'วงเงินสวัสดิการต้องเป็นตัวเลขมากกว่าหรือเท่ากับ 0' });
      return;
    }

    const deductions = Number(formData.deductions);
    if (isNaN(deductions) || deductions < 0) {
      showToast({ type: 'warning', title: 'ยอดหักอื่นไม่ถูกต้อง', message: 'ยอดหักต้องเป็นตัวเลขมากกว่าหรือเท่ากับ 0' });
      return;
    }

    setIsSaving(true);
    try {
      const soldierPayload: Partial<Soldier> = {
        px_code: pxCode,
        national_id: nationalId,
        full_name: fullName,
        unit: formData.unit.trim() || 'ร้อย 1',
        credit_limit: creditLimit,
        deductions: deductions,
        photo_url: formData.photo_url?.trim() || '',
        status: formData.status
      };

      const res = await api.saveSoldier(batchId, soldierPayload);
      if (res.success) {
        showToast({
          type: 'success',
          title: isEditing ? 'อัปเดตข้อมูลทหารสำเร็จ!' : 'เพิ่มพลทหารใหม่สำเร็จ!',
          message: res.message || `${fullName} บันทึกเข้าผลัด ${batchId} เรียบร้อย`
        });
        if (onSuccess) onSuccess();
        onClose();
      } else {
        showToast({
          type: 'error',
          title: 'บันทึกข้อมูลไม่สำเร็จ',
          message: res.error || 'เกิดข้อผิดพลาดในการบันทึก'
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className={`relative w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh] ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#12151B] border-[#222734] text-slate-100'
          }`}
        >
          {/* Header */}
          <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">
                  {isEditing ? `แก้ไขข้อมูลพลทหาร: ${editingSoldier?.full_name}` : 'เพิ่มพลทหารใหม่ (รายคน)'}
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  ผลัดทหาร: <span className="font-semibold text-blue-500">{batchId}</span> (บันทึกลงชีตเฉพาะผลัด)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isLight ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600' : 'bg-[#1E222D] border-[#2E3444] hover:bg-[#282D3D] text-slate-300'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* Top Row: PX Code & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  รหัสประจำตัว PX (Barcode) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.px_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, px_code: e.target.value }))}
                  placeholder="เช่น W21-691-001"
                  className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#181B22] border-[#262A36] text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  สถานะความพร้อม (Status)
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as SoldierStatus }))}
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border focus:outline-hidden ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#181B22] border-[#262A36] text-white'
                  }`}
                >
                  <option value="ACTIVE">🟢 พร้อมใช้งาน (ACTIVE)</option>
                  <option value="SUSPENDED">🟡 ระงับใช้จ่าย (SUSPENDED - ป่วย/กักบริเวณ)</option>
                  <option value="DISCHARGED">🔴 ปลดประจำการ (DISCHARGED)</option>
                </select>
              </div>
            </div>

            {/* Name & National ID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  ยศ - ชื่อ - นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="เช่น พลทหาร สมชาย ใจดี"
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#181B22] border-[#262A36] text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  สังกัด / กองร้อย
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="เช่น ร้อย 1"
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#181B22] border-[#262A36] text-white'
                  }`}
                />
              </div>
            </div>

            {/* National ID & Financials */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  เลขบัตร ปชช. (13 หลัก)
                </label>
                <input
                  type="text"
                  maxLength={13}
                  value={formData.national_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, national_id: e.target.value }))}
                  placeholder="1234567890123"
                  className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-hidden ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#181B22] border-[#262A36] text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 text-blue-500`}>
                  วงเงินสวัสดิการ (บาท)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: e.target.value }))}
                  placeholder="2000"
                  className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-hidden ${
                    isLight ? 'bg-blue-50/50 border-blue-200 text-blue-700' : 'bg-blue-950/20 border-blue-800 text-blue-300'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 text-rose-500`}>
                  หักอื่นๆ ส่งกองบิน (บาท)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={formData.deductions}
                  onChange={(e) => setFormData(prev => ({ ...prev, deductions: e.target.value }))}
                  placeholder="0"
                  className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-hidden ${
                    isLight ? 'bg-rose-50/50 border-rose-200 text-rose-700' : 'bg-rose-950/20 border-rose-800 text-rose-300'
                  }`}
                />
              </div>
            </div>

            {/* Profile Avatar Image Section */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <ImageIcon className="w-4 h-4 text-blue-500" /> รูปประจำตัวพลทหาร
                </span>

                <div className="flex rounded-lg border overflow-hidden p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setImageTab('upload')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      imageTab === 'upload' ? 'bg-blue-600 text-white' : isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    อัปโหลดเข้า Drive
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageTab('url')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      imageTab === 'url' ? 'bg-blue-600 text-white' : isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    ใส่ลิงก์ URL
                  </button>
                </div>
              </div>

              {/* Image Preview & Controls */}
              <div className="flex items-center gap-4">
                <div className={`w-20 h-20 rounded-xl border flex items-center justify-center overflow-hidden shrink-0 ${
                  isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#12151B] border-[#2A303F]'
                }`}>
                  {formData.photo_url ? (
                    <img
                      src={normalizeDriveImageUrl(formData.photo_url)}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Photo';
                      }}
                    />
                  ) : (
                    <User className={`w-8 h-8 opacity-30 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  {imageTab === 'upload' ? (
                    <div className="space-y-2">
                      {driveFolders.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <select
                            value={selectedFolderId}
                            onChange={(e) => handleFolderChange(e.target.value)}
                            className={`w-full px-2 py-1 text-xs rounded-lg border ${
                              isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#12151B] border-[#262A36] text-slate-200'
                            }`}
                          >
                            {driveFolders.map(f => (
                              <option key={f.folder_id} value={f.folder_id}>
                                📁 {f.folder_name} {f.is_default ? '(ค่าเริ่มต้น)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageFileSelect}
                        accept="image/*"
                        className="hidden"
                      />

                      <button
                        type="button"
                        disabled={isUploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-xl border border-blue-500/30 text-blue-500 hover:bg-blue-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingImage ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> กำลังอัปโหลด...
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" /> เลือกรูปภาพจากเครื่อง
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="url"
                        value={formData.photo_url || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, photo_url: e.target.value }))}
                        placeholder="https://drive.google.com/... หรือ URL รูปภาพ"
                        className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#12151B] border-[#262A36] text-white'
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-[#262A36]">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  isLight ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700' : 'bg-[#181B22] border-[#262A36] hover:bg-[#202738] text-slate-300'
                }`}
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> {isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มพลทหาร'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
