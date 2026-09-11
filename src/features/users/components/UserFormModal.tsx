import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User as UserIcon,
  Shield,
  UserCheck,
  Store,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Check,
  Folder,
  ChevronDown,
  ChevronUp,
  Globe,
  MessageSquare,
  Mail,
  Smartphone
} from 'lucide-react';
import { api, type DriveFolder, normalizeDriveImageUrl } from '../../../core/api.ts';
import type { User, UserRole, Seller } from '../../../types/schema.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { useTheme } from '../../../hooks/useTheme.ts';

export interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: Partial<User>) => Promise<boolean>;
  initialData?: User | null;
  sellers: Seller[];
  driveFolders?: DriveFolder[];
}

interface UserFormData {
  username: string;
  password_hash: string;
  pin_hash: string;
  full_name: string;
  role: UserRole;
  seller_id: string;
  avatar_url: string;
  email: string;
  google_id: string;
  line_user_id: string;
  line_notify_token: string;
  is_active: boolean;
}

const DEFAULT_FORM: UserFormData = {
  username: '',
  password_hash: '',
  pin_hash: '1234',
  full_name: '',
  role: 'STAFF',
  seller_id: '',
  avatar_url: '',
  email: '',
  google_id: '',
  line_user_id: '',
  line_notify_token: '',
  is_active: true
};

const DEFAULT_FOLDER_KEY = 'px_default_user_avatar_folder_id';

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  sellers = [],
  driveFolders = []
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<UserFormData>(DEFAULT_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      setFormData({
        username: initialData.username || '',
        password_hash: initialData.password_hash || '',
        pin_hash: initialData.pin_hash || '1234',
        full_name: initialData.full_name || '',
        role: initialData.role || 'STAFF',
        seller_id: initialData.seller_id || '',
        avatar_url: initialData.avatar_url || '',
        email: initialData.email || '',
        google_id: initialData.google_id || '',
        line_user_id: initialData.line_user_id || '',
        line_notify_token: initialData.line_notify_token || '',
        is_active: initialData.is_active !== undefined ? initialData.is_active : true
      });
      // If user has integration values, expand the section
      if (initialData.google_id || initialData.line_user_id || initialData.line_notify_token) {
        setShowIntegrations(true);
      }
    } else {
      setFormData(DEFAULT_FORM);
      setShowIntegrations(false);
    }
  }, [initialData, isOpen]);

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
        const res = await api.uploadDriveFile({
          file_name: `USER_${formData.username || 'NEW'}`,
          image_base64: base64Data,
          mime_type: file.type,
          folder_id: selectedFolderId || undefined
        });

        if (res.success && res.image_url) {
          setFormData(prev => ({ ...prev, avatar_url: res.image_url! }));
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

    const username = formData.username.trim();
    const fullName = formData.full_name.trim();
    const pin = formData.pin_hash.trim();

    if (!username) {
      showToast({ type: 'warning', title: 'กรุณากรอก Username', message: 'ชื่อผู้ใช้สำหรับเข้าสู่ระบบห้ามเว้นว่าง' });
      return;
    }

    if (!fullName) {
      showToast({ type: 'warning', title: 'กรุณากรอกชื่อ-สกุล', message: 'ยศและชื่อ-นามสกุลห้ามเว้นว่าง' });
      return;
    }

    if (!pin || !/^\d{4,6}$/.test(pin)) {
      showToast({ type: 'warning', title: 'รหัส PIN ไม่ถูกต้อง', message: 'PIN ต้องเป็นตัวเลข 4-6 หลักเท่านั้น' });
      return;
    }

    if (formData.role === 'SELLER' && !formData.seller_id) {
      showToast({ type: 'warning', title: 'กรุณาเลือกร้านค้า', message: 'สำหรับบทบาทผู้ฝากขาย จำเป็นต้องผูกกับร้านค้าในระบบ' });
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<User> = {
        username,
        full_name: fullName,
        role: formData.role,
        seller_id: formData.role === 'SELLER' ? formData.seller_id : undefined,
        pin_hash: pin,
        password_hash: formData.password_hash.trim() || undefined,
        avatar_url: formData.avatar_url.trim() || undefined,
        email: formData.email.trim() || undefined,
        google_id: formData.google_id.trim() || undefined,
        line_user_id: formData.line_user_id.trim() || undefined,
        line_notify_token: formData.line_notify_token.trim() || undefined,
        is_active: formData.is_active
      };

      if (initialData?.user_id) {
        payload.user_id = initialData.user_id;
      }

      const success = await onSave(payload);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'บันทึกไม่สำเร็จ',
        message: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้ใช้'
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
          className="fixed inset-0 bg-black/80 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#12151B] border-[#222734] text-slate-100'
          }`}
        >
          {/* Header */}
          <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold border ${
                formData.role === 'ADMIN'
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  : formData.role === 'SELLER'
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
              }`}>
                {formData.role === 'ADMIN' ? (
                  <Shield className="w-5 h-5" />
                ) : formData.role === 'SELLER' ? (
                  <Store className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">
                  {isEditing ? `แก้ไขข้อมูลผู้ใช้งาน: ${initialData?.full_name}` : 'เพิ่มผู้ใช้งานใหม่'}
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {isEditing ? `รหัสบัญชี: ${initialData?.user_id}` : 'กำหนดบทบาท สิทธิ์เข้าถึง และรหัสความปลอดภัย'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                  : 'bg-[#1E222D] border-[#2E3444] hover:bg-[#282D3D] text-slate-300'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {/* 1. Role Selection Pills */}
            <div className="space-y-2">
              <label className={`block text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                บทบาทและสิทธิ์การเข้าถึง (Role) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {/* ADMIN */}
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'ADMIN', seller_id: '' }))}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer ${
                    formData.role === 'ADMIN'
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-500 ring-2 ring-rose-500/20 shadow-sm'
                      : isLight
                      ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                      : 'bg-[#181B22] border-[#262A36] hover:bg-[#1E222D] text-slate-400'
                  }`}
                >
                  <Shield className="w-5 h-5" />
                  <div>
                    <div className="text-xs font-bold">ADMIN</div>
                    <div className="text-[10px] opacity-75">ผู้ดูแลระบบสูงสุด</div>
                  </div>
                </button>

                {/* STAFF */}
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'STAFF', seller_id: '' }))}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer ${
                    formData.role === 'STAFF'
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                      : isLight
                      ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                      : 'bg-[#181B22] border-[#262A36] hover:bg-[#1E222D] text-slate-400'
                  }`}
                >
                  <UserCheck className="w-5 h-5" />
                  <div>
                    <div className="text-xs font-bold">STAFF</div>
                    <div className="text-[10px] opacity-75">แคชเชียร์ / คลัง</div>
                  </div>
                </button>

                {/* SELLER */}
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'SELLER' }))}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer ${
                    formData.role === 'SELLER'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                      : isLight
                      ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                      : 'bg-[#181B22] border-[#262A36] hover:bg-[#1E222D] text-slate-400'
                  }`}
                >
                  <Store className="w-5 h-5" />
                  <div>
                    <div className="text-xs font-bold">SELLER</div>
                    <div className="text-[10px] opacity-75">ร้านค้าฝากขาย</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 1.1 Linked Seller Dropdown (Shown only when role === 'SELLER') */}
            {formData.role === 'SELLER' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-4 rounded-xl border space-y-2 ${
                  isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Store className="w-4 h-4" /> เลือกร้านค้าผู้ฝากขายที่ต้องการผูกบัญชี <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">
                    {sellers.length} ร้านค้าในระบบ
                  </span>
                </div>

                <select
                  required={formData.role === 'SELLER'}
                  value={formData.seller_id}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const found = sellers.find(s => s.seller_id === selId);
                    setFormData(prev => ({
                      ...prev,
                      seller_id: selId,
                      // Auto-fill full name if empty
                      full_name: prev.full_name || (found ? found.seller_name : prev.full_name)
                    }));
                  }}
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 ${
                    isLight ? 'bg-white border-emerald-300 text-slate-900' : 'bg-[#181B22] border-emerald-700/50 text-white'
                  }`}
                >
                  <option value="">-- กรุณาเลือกร้านค้า --</option>
                  {sellers.map((s) => {
                    const fee = typeof s.default_fee_pct === 'number'
                      ? (s.default_fee_pct < 1 ? s.default_fee_pct * 100 : s.default_fee_pct)
                      : 0;
                    return (
                      <option key={s.seller_id} value={s.seller_id}>
                        🏪 [{s.seller_id}] {s.seller_name} (GP {fee}%) {s.is_active ? '' : '⚠️ [ปิดใช้งาน]'}
                      </option>
                    );
                  })}
                </select>
              </motion.div>
            )}

            {/* 2. Basic Info (Username, Full Name, Email) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  ชื่อผู้ใช้ (Username) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().trim() }))}
                    placeholder="เช่น cashier_01 หรือ admin_it"
                    className={`w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#181B22] border-[#262A36] text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  ยศ - ชื่อ - นามสกุล (Full Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="เช่น พ.อ.อ. สมชาย ใจมั่น"
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#181B22] border-[#262A36] text-white'
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  อีเมล (Email / Google Account)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="user@example.com หรืออีเมลสำหรับลงชื่อเข้าใช้"
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#181B22] border-[#262A36] text-white'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* 3. Security & Credentials (Password & PIN) */}
            <div className={`p-4 rounded-xl border space-y-3.5 ${
              isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
            }`}>
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  ความปลอดภัยและรหัสผ่านเข้าใช้งาน (Security)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Password */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    รหัสผ่าน (Password) {isEditing && <span className="text-[10px] opacity-75">(เว้นว่างหากไม่ต้องการเปลี่ยน)</span>}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password_hash}
                      onChange={(e) => setFormData(prev => ({ ...prev, password_hash: e.target.value }))}
                      placeholder={isEditing ? '••••••••' : 'ตั้งรหัสผ่าน'}
                      className={`w-full pl-9 pr-9 py-2 text-xs font-mono rounded-xl border focus:outline-hidden ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#12151B] border-[#2A303F] text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 4-Digit Quick PIN */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    รหัส PIN ปลดล็อคด่วน (4-6 หลัก) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showPin ? 'text' : 'password'}
                      required
                      maxLength={6}
                      value={formData.pin_hash}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setFormData(prev => ({ ...prev, pin_hash: val }));
                      }}
                      placeholder="เช่น 1234"
                      className={`w-full pl-9 pr-9 py-2 text-xs font-mono font-bold tracking-widest rounded-xl border focus:outline-hidden ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#12151B] border-[#2A303F] text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Avatar & Photo Upload Section */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <ImageIcon className="w-4 h-4 text-blue-500" /> รูปโปรไฟล์ผู้ใช้งาน (Avatar)
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

              {/* Avatar Preview & Controls */}
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center overflow-hidden shrink-0 shadow-xs ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#12151B] border-[#2A303F]'
                }`}>
                  {formData.avatar_url ? (
                    <img
                      src={normalizeDriveImageUrl(formData.avatar_url)}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Photo';
                      }}
                    />
                  ) : (
                    <UserIcon className={`w-7 h-7 opacity-30 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
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
                        value={formData.avatar_url || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
                        placeholder="https://drive.google.com/... หรือ URL รูปภาพโปรไฟล์"
                        className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#12151B] border-[#262A36] text-white'
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Integration Settings Accordion */}
            <div className={`rounded-xl border overflow-hidden transition ${
              isLight ? 'border-slate-200 bg-slate-50/50' : 'border-[#262A36] bg-[#181B22]/50'
            }`}>
              <button
                type="button"
                onClick={() => setShowIntegrations(!showIntegrations)}
                className={`w-full p-3 flex items-center justify-between text-xs font-bold cursor-pointer ${
                  isLight ? 'hover:bg-slate-100/70 text-slate-700' : 'hover:bg-[#1E222D] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  <span>การเชื่อมต่อระบบภายนอก (Google OAuth & LINE Messaging)</span>
                </div>
                {showIntegrations ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showIntegrations && (
                <div className="p-4 pt-1 space-y-3 border-t border-slate-200 dark:border-[#262A36]">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Google Account ID (OAuth Sub)
                    </label>
                    <input
                      type="text"
                      value={formData.google_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, google_id: e.target.value }))}
                      placeholder="เช่น 109283746501928374"
                      className={`w-full px-3 py-1.5 text-xs font-mono rounded-lg border ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#12151B] border-[#2A303F] text-white'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        LINE User ID (Uxxxxxxxx...)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-emerald-500">
                          <Smartphone className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          value={formData.line_user_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, line_user_id: e.target.value }))}
                          placeholder="U1234567890abcdef..."
                          className={`w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded-lg border ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#12151B] border-[#2A303F] text-white'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        LINE Notify Token
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-emerald-500">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          value={formData.line_notify_token}
                          onChange={(e) => setFormData(prev => ({ ...prev, line_notify_token: e.target.value }))}
                          placeholder="Token สำหรับส่งข้อความแจ้งเตือน"
                          className={`w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded-lg border ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#12151B] border-[#2A303F] text-white'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Active Switch */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'
            }`}>
              <div>
                <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  สถานะการเปิดใช้งานบัญชี (Account Status)
                </span>
                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {formData.is_active ? '🟢 บัญชีเปิดใช้งานปกติ สามารถเข้าสู่ระบบได้' : '🔴 ระงับการใช้งานชั่วคราว (เข้าสู่ระบบไม่ได้)'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  formData.is_active ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    formData.is_active ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Submit & Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-[#262A36]">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  isLight
                    ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    : 'bg-[#181B22] border-[#262A36] hover:bg-[#202738] text-slate-300'
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
                    <Check className="w-3.5 h-3.5" /> {isEditing ? 'บันทึกการแก้ไข' : 'สร้างบัญชีผู้ใช้'}
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
