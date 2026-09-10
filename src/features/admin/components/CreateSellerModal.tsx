import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Store, Percent, Phone, User, Check, AlertCircle, Sparkles,
  Upload, Image as ImageIcon, Link as LinkIcon, RefreshCw, Trash2, Folder
} from 'lucide-react';
import type { Seller, DriveFolder } from '../../../types/schema.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { api } from '../../../core/api.ts';

const DEFAULT_SELLER_FOLDER_KEY = 'px_pos_default_seller_folder_id';

interface CreateSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (seller: Partial<Seller>) => Promise<boolean>;
  initialData?: Seller | null;
  existingSellers: Seller[];
  driveFolders?: DriveFolder[];
}

export const CreateSellerModal: React.FC<CreateSellerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingSellers,
  driveFolders = []
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();

  const [sellerId, setSellerId] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [shopSubname, setShopSubname] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [feePct, setFeePct] = useState('10');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Avatar Tab Mode & Upload State (Drive Upload vs Direct URL)
  const [avatarMode, setAvatarMode] = useState<'upload' | 'url'>('upload');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(() => {
    return localStorage.getItem(DEFAULT_SELLER_FOLDER_KEY) || '';
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setSellerId(initialData.seller_id);
        const match = initialData.seller_name.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
          setSellerName(match[1].trim());
          setShopSubname(match[2].trim());
        } else {
          setSellerName(initialData.seller_name);
          setShopSubname('');
        }
        setContactInfo(initialData.contact_info || '');
        setFeePct(String(Math.round((initialData.default_fee_pct || 0.1) * 100)));
        setAvatarUrl(initialData.avatar_url || '');
        setCustomUrlInput(initialData.avatar_url || '');
        setIsActive(initialData.is_active !== false);
      } else {
        const existingNums = existingSellers
          .map(s => parseInt(s.seller_id.replace(/^S/i, ''), 10))
          .filter(n => !isNaN(n));
        const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
        setSellerId(`S${String(nextNum).padStart(2, '0')}`);
        setSellerName('');
        setShopSubname('');
        setContactInfo('');
        setFeePct('10');
        setAvatarUrl('');
        setCustomUrlInput('');
        setIsActive(true);
      }
      setError(null);
    }
  }, [isOpen, initialData, existingSellers]);

  if (!isOpen) return null;

  const handleFolderChange = (folderId: string) => {
    setSelectedFolderId(folderId);
    localStorage.setItem(DEFAULT_SELLER_FOLDER_KEY, folderId);
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

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await api.uploadSellerAvatar({
          seller_id: sellerId || 'NEW',
          image_base64: base64Data,
          mime_type: file.type,
          folder_id: selectedFolderId || undefined
        });

        if (res.success && res.image_url) {
          setAvatarUrl(res.image_url);
          setCustomUrlInput(res.image_url);
          showToast({
            type: 'success',
            title: 'อัปโหลดรูปโปรไฟล์สำเร็จ!',
            message: 'จัดเก็บใน Google Drive เรียบร้อย'
          });
        } else {
          showToast({
            type: 'error',
            title: 'อัปโหลดรูปภาพไม่สำเร็จ',
            message: res.error || res.message || 'เกิดข้อผิดพลาดในการอัปโหลด'
          });
        }
        setIsUploading(false);
      };
      reader.onerror = () => {
        showToast({ type: 'error', title: 'อ่านไฟล์ไม่สำเร็จ', message: 'ไม่สามารถประมวลผลไฟล์รูปภาพได้' });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message || 'อัปโหลดล้มเหลว' });
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerName.trim()) {
      setError('กรุณาระบุชื่อผู้ฝากขาย / ชื่อจ่า');
      return;
    }

    const fullName = shopSubname.trim() 
      ? `${sellerName.trim()} (${shopSubname.trim()})`
      : sellerName.trim();

    setIsSubmitting(true);
    setError(null);

    const payload: Partial<Seller> = {
      seller_id: sellerId.trim().toUpperCase(),
      seller_name: fullName,
      contact_info: contactInfo.trim(),
      default_fee_pct: (Number(feePct) || 0) / 100,
      avatar_url: avatarUrl.trim(),
      is_active: isActive
    };

    const ok = await onSave(payload);
    setIsSubmitting(false);
    if (ok) onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`w-full max-w-xl rounded-3xl shadow-2xl border overflow-hidden my-6 ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#111726] border-[#22304d] text-white'
          }`}
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">
                  {initialData ? 'แก้ไขข้อมูลผู้ฝากขาย' : 'เพิ่มผู้ฝากขายใหม่ (Consignment Seller)'}
                </h3>
                <p className="text-xs text-slate-400">กำหนดรหัส รูปโปรไฟล์ร้านค้า และส่วนแบ่ง GP</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Profile Avatar Section */}
            <div className={`p-4 rounded-2xl border space-y-3 ${
              isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#141b2c] border-[#1f2a3f]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  <span>รูปโปรไฟล์ / โลโก้ร้านค้า (Store Avatar)</span>
                </span>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarUrl('');
                      setCustomUrlInput('');
                    }}
                    className="text-[11px] text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>ลบรูปภาพ</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                {/* Avatar Preview Box */}
                <div className={`w-24 h-24 rounded-2xl overflow-hidden border-2 border-dashed flex items-center justify-center shrink-0 relative ${
                  avatarUrl 
                    ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20' 
                    : isLight ? 'border-slate-300 bg-white' : 'border-slate-700 bg-[#182030]'
                }`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <User className="w-8 h-8 mx-auto opacity-40 mb-1" />
                      <span className="text-[9px] block">ยังไม่มีรูป</span>
                    </div>
                  )}

                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                    </div>
                  )}
                </div>

                {/* Avatar Controls Tabs */}
                <div className="flex-1 w-full space-y-2.5">
                  <div className="flex border-b border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setAvatarMode('upload')}
                      className={`pb-1.5 px-3 font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                        avatarMode === 'upload'
                          ? 'border-blue-500 text-blue-500'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>อัปโหลดรูปภาพ (Google Drive)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarMode('url')}
                      className={`pb-1.5 px-3 font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                        avatarMode === 'url'
                          ? 'border-blue-500 text-blue-500'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>ระบุลิงก์รูป (URL)</span>
                    </button>
                  </div>

                  {/* Mode 1: Drive File Upload */}
                  {avatarMode === 'upload' && (
                    <div className="space-y-2">
                      {driveFolders.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <select
                            value={selectedFolderId}
                            onChange={(e) => handleFolderChange(e.target.value)}
                            className={`text-[11px] rounded-lg px-2 py-1 border focus:outline-none cursor-pointer w-full ${
                              isLight ? 'bg-white border-slate-300' : 'bg-[#182030] border-[#293854] text-slate-200'
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
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/gif"
                        onChange={handleImageFileSelect}
                        className="hidden"
                      />

                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer shadow-xs ${
                          isUploading
                            ? 'bg-slate-400 text-white cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{avatarUrl ? 'เปลี่ยนรูปภาพใหม่ (Replace)' : 'เลือกไฟล์ภาพเพื่ออัปโหลด'}</span>
                      </button>
                    </div>
                  )}

                  {/* Mode 2: Direct URL */}
                  {avatarMode === 'url' && (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={customUrlInput}
                        onChange={(e) => {
                          setCustomUrlInput(e.target.value);
                          setAvatarUrl(e.target.value);
                        }}
                        placeholder="วางลิงก์รูปภาพ เช่น https://..."
                        className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-mono ${
                          isLight ? 'bg-white border-slate-300' : 'bg-[#182030] border-[#293854]'
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  รหัสผู้ฝากขาย
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!!initialData}
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    placeholder="S03"
                    className={`w-full py-2.5 px-3 rounded-xl border font-mono font-bold text-xs ${
                      initialData ? 'opacity-50 cursor-not-allowed' : ''
                    } ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#182030] border-[#293854]'}`}
                  />
                  {!initialData && (
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 absolute right-2.5 top-3 pointer-events-none" />
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  ชื่อเจ้าของ / ผู้ฝากขาย <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    placeholder="จ.ส.อ. สมชาย บุญมี"
                    className={`w-full py-2.5 pl-9 pr-3 rounded-xl border text-xs font-semibold ${
                      isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#182030] border-[#293854]'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                ชื่อร้านค้า / ร้านย่อย (อุปกรณ์/ขนม)
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={shopSubname}
                  onChange={(e) => setShopSubname(e.target.value)}
                  placeholder="ร้านขนมและเครื่องดื่ม"
                  className={`w-full py-2.5 pl-9 pr-3 rounded-xl border text-xs ${
                    isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#182030] border-[#293854]'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  เบอร์โทร / LINE ติดต่อ
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="081-234-5678 / Line ID"
                    className={`w-full py-2.5 pl-9 pr-3 rounded-xl border text-xs ${
                      isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#182030] border-[#293854]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  ค่า GP มาตรฐาน (%)
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={feePct}
                    onChange={(e) => setFeePct(e.target.value)}
                    placeholder="10"
                    className={`w-full py-2.5 pl-9 pr-3 rounded-xl border text-xs font-mono font-bold ${
                      isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#182030] border-[#293854]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Active Switch */}
            <div className={`pt-2 flex items-center justify-between p-3 rounded-2xl border transition-colors ${
              isActive 
                ? isLight ? 'border-emerald-200 bg-emerald-50/40' : 'border-emerald-500/25 bg-emerald-950/20'
                : isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-[#141923]'
            }`}>
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>สถานะคู่ค้า / เปิดใช้งาน</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    isActive ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                  }`}>
                    {isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className={`text-[10px] mt-0.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {isActive 
                    ? '🟢 เปิดแสดงและวางขายสินค้าทั้งหมดของร้านค้านี้ในระบบ' 
                    : '🔴 ซ่อนและระงับการขายสินค้าทั้งหมดของร้านค้านี้ชั่วคราว'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Submit Buttons */}
            <div className="pt-3 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{initialData ? 'บันทึกการแก้ไข' : 'ยืนยันเพิ่มผู้ฝากขาย'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
