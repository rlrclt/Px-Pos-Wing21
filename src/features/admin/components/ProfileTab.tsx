import React, { useState, useEffect, useRef } from 'react';
import { 
  User as UserIcon, Store, Key, Lock, Eye, EyeOff, 
  Mail, MessageSquare, Bell, Upload, Globe, CheckCircle2, 
  AlertTriangle, RefreshCw, Folder, Save, 
  Link as LinkIcon, Unlink, ShieldCheck, Check,
  ChevronRight, Shield, Fingerprint, Info,
  BadgeCheck, Undo2, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User, AuthUser } from '../../../types/schema.ts';
import { api, type DriveFolder, normalizeDriveImageUrl } from '../../../core/api.ts';
import { useTheme } from '../../../hooks/useTheme.ts';
import { useToast } from '../../../hooks/useToast.ts';
import { triggerGoogleSignIn } from '../../../services/googleAuthService.ts';
import { triggerLineLogin } from '../../../services/lineAuthService.ts';
import { lineBotService } from '../../../services/lineBotService.ts';

export interface ProfileTabProps {
  currentUser: AuthUser | { name?: string; full_name?: string; role: string; seller_id?: string; avatar_url?: string; user_id?: string } | null;
  users: User[];
  onUpdateProfile: (userId: string, updates: Partial<User>) => Promise<boolean>;
  driveFolders?: DriveFolder[];
  onRefreshUsers?: () => void;
}

type SettingsCategory = 'personal' | 'security' | 'connected_accounts' | 'line_alerts' | 'permissions';

interface CategoryMenuItem {
  id: SettingsCategory;
  title: string;
  titleEn: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: 'blue' | 'amber' | 'emerald' | 'purple' | 'rose';
}

const DEFAULT_FOLDER_KEY = 'px_pos_default_folder_id';

export const ProfileTab: React.FC<ProfileTabProps> = ({
  currentUser,
  users,
  onUpdateProfile,
  driveFolders = [],
  onRefreshUsers
}) => {
  const { isLight } = useTheme();
  const { showToast } = useToast();

  // Drill-Down Navigation State: null = Settings Hub (Main Menu), or specific category ID
  const [activeCategory, setActiveCategory] = useState<SettingsCategory | null>(null);

  // Find the authoritative user profile from users list or currentUser
  const currentUserId = (currentUser as any)?.user_id || (currentUser as any)?.id || '';
  const authoritativeUser = users.find(u => u.user_id === currentUserId) || (currentUser as any);

  // Form State
  const [formData, setFormData] = useState<{
    full_name: string;
    username: string;
    email: string;
    seller_id: string;
    password_hash: string;
    pin_hash: string;
    google_id: string;
    line_user_id: string;
    line_notify_token: string;
    avatar_url: string;
  }>({
    full_name: '',
    username: '',
    email: '',
    seller_id: '',
    password_hash: '',
    pin_hash: '',
    google_id: '',
    line_user_id: '',
    line_notify_token: '',
    avatar_url: ''
  });

  const [initialDataSnapshot, setInitialDataSnapshot] = useState<typeof formData | null>(null);

  // Sync with authoritative user data
  useEffect(() => {
    if (authoritativeUser) {
      const initial = {
        full_name: authoritativeUser.full_name || authoritativeUser.name || '',
        username: authoritativeUser.username || '',
        email: authoritativeUser.email || '',
        seller_id: authoritativeUser.seller_id || '',
        password_hash: authoritativeUser.password_hash || '',
        pin_hash: authoritativeUser.pin_hash || '1234',
        google_id: authoritativeUser.google_id || '',
        line_user_id: authoritativeUser.line_user_id || '',
        line_notify_token: authoritativeUser.line_notify_token || '',
        avatar_url: authoritativeUser.avatar_url || ''
      };
      setFormData(initial);
      setInitialDataSnapshot(initial);
    }
  }, [authoritativeUser?.user_id, authoritativeUser?.updated_at, authoritativeUser?.full_name, authoritativeUser?.email, authoritativeUser?.avatar_url]);

  // Visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingLine, setIsTestingLine] = useState(false);

  // Drive folder selection
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (driveFolders.length > 0) {
      const savedFolder = localStorage.getItem(DEFAULT_FOLDER_KEY);
      if (savedFolder && driveFolders.some(f => f.folder_id === savedFolder)) {
        setSelectedFolderId(savedFolder);
      } else {
        setSelectedFolderId(driveFolders[0].folder_id);
      }
    }
  }, [driveFolders]);

  const handleFolderChange = (newFolderId: string) => {
    setSelectedFolderId(newFolderId);
    localStorage.setItem(DEFAULT_FOLDER_KEY, newFolderId);
  };

  // Image Upload Handler
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
          file_name: `AVATAR_${formData.username || currentUserId || 'USER'}`,
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

  // Google OAuth Link
  const handleConnectGoogle = async () => {
    try {
      const googleProfile = await triggerGoogleSignIn();
      if (googleProfile && (googleProfile.google_id || googleProfile.email)) {
        setFormData(prev => ({
          ...prev,
          google_id: googleProfile.google_id,
          email: prev.email || googleProfile.email
        }));
        showToast({
          type: 'success',
          title: 'เชื่อมต่อบัญชี Google สำเร็จ 🎉',
          message: `ผูกกับ ${googleProfile.email || googleProfile.name} เรียบร้อย (กดบันทึกเพื่อยืนยัน)`
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'เชื่อมต่อ Google ไม่สำเร็จ',
        message: err.message || 'เกิดข้อผิดพลาดในการยืนยันตัวตน'
      });
    }
  };

  const handleDisconnectGoogle = () => {
    setFormData(prev => ({ ...prev, google_id: '' }));
    showToast({
      type: 'info',
      title: 'ยกเลิกการเชื่อมต่อ Google',
      message: 'ลบการผูกบัญชี Google ออกแล้ว (กดบันทึกเพื่อยืนยัน)'
    });
  };

  // LINE Connect
  const handleConnectLine = async () => {
    try {
      const lineProfile = await triggerLineLogin();
      if (lineProfile && lineProfile.line_user_id) {
        setFormData(prev => ({
          ...prev,
          line_user_id: lineProfile.line_user_id
        }));
        showToast({
          type: 'success',
          title: 'เชื่อมต่อ LINE สำเร็จ 💬',
          message: `ผูก LINE User ID: ${lineProfile.line_user_id} (${lineProfile.display_name}) เรียบร้อย (กดบันทึกเพื่อยืนยัน)`
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'เชื่อมต่อ LINE ไม่สำเร็จ',
        message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
      });
    }
  };

  const handleDisconnectLine = () => {
    setFormData(prev => ({ ...prev, line_user_id: '', line_notify_token: '' }));
    showToast({
      type: 'info',
      title: 'ยกเลิกการเชื่อมต่อ LINE',
      message: 'ลบการผูกบัญชี LINE ออกแล้ว (กดบันทึกเพื่อยืนยัน)'
    });
  };

  // Test LINE Notification (Flex Message & Notify Token)
  const handleTestLineNotify = async () => {
    if (!formData.line_notify_token && !formData.line_user_id) {
      showToast({
        type: 'warning',
        title: 'ยังไม่ได้ระบุ LINE Token หรือ User ID',
        message: 'กรุณากรอก LINE Notify Token หรือเชื่อมต่อ LINE ก่อนทดสอบ'
      });
      return;
    }

    setIsTestingLine(true);
    try {
      let sentCount = 0;

      // 1. If LINE User ID is linked, send Rich Flex Message via Messaging API
      if (formData.line_user_id) {
        const todayStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        const flexContents = lineBotService.buildDailySalesFlex({
          dateStr: todayStr,
          totalSales: 8450,
          totalOrders: 42,
          cashTotal: 3200,
          creditTotal: 5250,
          shopName: 'PX สวัสดิการ พัน.อย.บน.21'
        });

        await api.sendLinePushNotification({
          target_user_id: formData.line_user_id,
          flex_contents: flexContents,
          alt_text: '🔔 ทดสอบการแจ้งเตือนยอดขายประจำวัน (PX Wing 21)'
        });
        sentCount++;
      }

      // 2. If LINE Notify Token is linked, send notify test
      if (formData.line_notify_token) {
        await api.sendLineNotifyTest(
          formData.line_notify_token,
          `🔔 ทดสอบส่งข้อความแจ้งเตือนจากระบบ PX Wing 21 ถึง ${formData.full_name || 'ผู้ดูแลระบบ'}`
        );
        sentCount++;
      }

      showToast({
        type: 'success',
        title: 'ทดสอบส่งการแจ้งเตือนสำเร็จ 🔔',
        message: `ส่งการแจ้งเตือนเรียบร้อย (${formData.line_user_id ? 'LINE Bot Flex Card' : ''} ${formData.line_notify_token ? '+ LINE Notify' : ''})`
      });
    } catch (e: any) {
      showToast({
        type: 'error',
        title: 'ส่งการแจ้งเตือนไม่สำเร็จ',
        message: e.message || 'เกิดข้อผิดพลาดในการส่ง LINE'
      });
    } finally {
      setIsTestingLine(false);
    }
  };

  // Save changes handler
  const handleSave = async () => {
    if (!currentUserId) {
      showToast({ type: 'error', title: 'ไม่พบรหัสผู้ใช้', message: 'ไม่สามารถระบุตัวตนของผู้ใช้ปัจจุบันได้' });
      return;
    }

    if (!formData.full_name.trim()) {
      showToast({ type: 'warning', title: 'กรุณากรอกชื่อ-สกุล', message: 'ชื่อ-นามสกุลห้ามเว้นว่าง' });
      return;
    }

    if (!formData.username.trim()) {
      showToast({ type: 'warning', title: 'กรุณากรอก Username', message: 'ชื่อผู้ใช้ห้ามเว้นว่าง' });
      return;
    }

    if (formData.pin_hash && !/^\d{4,6}$/.test(formData.pin_hash)) {
      showToast({ type: 'warning', title: 'รหัส PIN ไม่ถูกต้อง', message: 'PIN ต้องเป็นตัวเลข 4-6 หลักเท่านั้น' });
      return;
    }

    setIsSaving(true);
    try {
      const updates: Partial<User> = {
        full_name: formData.full_name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim() || undefined,
        password_hash: formData.password_hash.trim() || undefined,
        pin_hash: formData.pin_hash.trim() || undefined,
        google_id: formData.google_id.trim() || undefined,
        line_user_id: formData.line_user_id.trim() || undefined,
        line_notify_token: formData.line_notify_token.trim() || undefined,
        avatar_url: formData.avatar_url.trim() || undefined,
        role: authoritativeUser?.role || currentUser?.role || 'ADMIN',
        seller_id: authoritativeUser?.role === 'SELLER' ? formData.seller_id : undefined
      };

      const success = await onUpdateProfile(currentUserId, updates);
      if (success) {
        setInitialDataSnapshot({ ...formData });
        if (onRefreshUsers) onRefreshUsers();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (initialDataSnapshot) {
      setFormData({ ...initialDataSnapshot });
      showToast({ type: 'info', title: 'รีเซ็ตข้อมูลแล้ว', message: 'คืนค่าข้อมูลกลับสู่การบันทึกล่าสุด' });
    }
  };

  const isDirty = initialDataSnapshot && JSON.stringify(formData) !== JSON.stringify(initialDataSnapshot);
  const userRole = (authoritativeUser?.role || currentUser?.role || 'ADMIN').toUpperCase();
  const isPinDefault = formData.pin_hash === '1234';

  // Category Menu Definitions
  const menuCategories: CategoryMenuItem[] = [
    {
      id: 'personal',
      title: 'ข้อมูลส่วนตัว',
      titleEn: 'Personal Details',
      subtitle: 'ชื่อ-นามสกุล, ชื่อผู้ใช้, รูปโปรไฟล์, อีเมล',
      icon: UserIcon,
      badge: 'โปรไฟล์',
      badgeColor: 'blue'
    },
    {
      id: 'security',
      title: 'รหัสผ่านและความปลอดภัย',
      titleEn: 'Password & PIN Security',
      subtitle: 'รหัสผ่านหลัก, รหัส PIN ด่วน 4-6 หลัก',
      icon: Key,
      badge: isPinDefault ? 'เตือน PIN' : 'ปลอดภัย',
      badgeColor: isPinDefault ? 'amber' : 'emerald'
    },
    {
      id: 'connected_accounts',
      title: 'บัญชีที่เชื่อมต่อสำหรับล็อกอิน',
      titleEn: 'Connected Accounts',
      subtitle: 'Google Sign-In, LINE Login',
      icon: Globe,
      badge: formData.google_id || formData.line_user_id ? 'ผูกแล้ว' : undefined,
      badgeColor: 'emerald'
    },
    {
      id: 'line_alerts',
      title: 'การแจ้งเตือนผ่าน LINE',
      titleEn: 'LINE Alerts',
      subtitle: 'LINE Notify Token, ทดสอบส่งแจ้งเตือน',
      icon: Bell,
      badge: formData.line_notify_token ? 'เปิดแจ้งเตือน' : undefined,
      badgeColor: 'purple'
    },
    {
      id: 'permissions',
      title: 'สิทธิ์และการเข้าถึงระบบ',
      titleEn: 'Role & Permissions',
      subtitle: 'บทบาท (Role), สถานะบัญชี, ข้อมูลร้าน',
      icon: ShieldCheck,
      badge: userRole,
      badgeColor: userRole === 'ADMIN' ? 'rose' : userRole === 'SELLER' ? 'emerald' : 'blue'
    }
  ];

  const currentCategoryObj = menuCategories.find(c => c.id === activeCategory);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-28">
      <AnimatePresence mode="wait">
        
        {/* ============================================================ */}
        {/* VIEW 1: SETTINGS HUB / MAIN MENU (When activeCategory === null) */}
        {/* ============================================================ */}
        {activeCategory === null ? (
          <motion.div
            key="settings-hub"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
            className="space-y-6"
          >
            {/* Top Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">
                  <Shield className="w-3.5 h-3.5" />
                  Meta-Style Accounts Center
                </div>
                <h1 className={`text-2xl font-black tracking-tight flex items-center gap-2.5 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  การตั้งค่าบัญชี (Account Settings)
                </h1>
                <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  เลือกหมวดหมู่ที่ต้องการจัดการเพื่อเข้าไปแก้ไขการตั้งค่าแบบเต็มหน้า
                </p>
              </div>

              {onRefreshUsers && (
                <button
                  type="button"
                  onClick={onRefreshUsers}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition cursor-pointer self-start sm:self-auto shadow-xs ${
                    isLight ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#181B22] hover:bg-[#222734] border-[#262A36] text-slate-300'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                  รีเฟรชข้อมูล
                </button>
              )}
            </div>

            {/* Profile Hero Card */}
            <div className={`p-5 rounded-2xl border relative overflow-hidden shadow-xs transition ${
              isLight 
                ? 'bg-gradient-to-br from-white via-slate-50 to-blue-50/40 border-slate-200' 
                : 'bg-gradient-to-br from-[#12151B] via-[#161B24] to-[#121826] border-[#262A36]'
            }`}>
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className={`w-18 h-18 rounded-2xl border-2 flex items-center justify-center overflow-hidden shrink-0 shadow-md ${
                  isLight ? 'bg-white border-blue-500/30' : 'bg-[#181B22] border-blue-500/40'
                }`}>
                  {formData.avatar_url ? (
                    <img
                      src={normalizeDriveImageUrl(formData.avatar_url)}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Photo';
                      }}
                    />
                  ) : (
                    <UserIcon className={`w-9 h-9 opacity-40 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h2 className={`text-lg font-black truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {formData.full_name || 'ผู้ใช้งาน'}
                    </h2>
                    <BadgeCheck className="w-5 h-5 text-blue-500 shrink-0" />
                  </div>
                  <p className={`text-xs font-mono mt-0.5 truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    @{formData.username || 'username'} • <span className="font-sans font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500">{userRole}</span>
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      เข้าสู่ระบบและพร้อมใช้งาน (Active)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveCategory('personal')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs shadow-blue-500/20 shrink-0"
                >
                  แก้ไขข้อมูล <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Hub Category List Menu (Facebook Style) */}
            <div className={`rounded-2xl border overflow-hidden shadow-xs divide-y ${
              isLight ? 'bg-white border-slate-200 divide-slate-100' : 'bg-[#12151B] border-[#222734] divide-[#1E2330]'
            }`}>
              <div className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-between ${
                isLight ? 'bg-slate-50/80 text-slate-500' : 'bg-[#161B24] text-slate-400'
              }`}>
                <span>หมวดหมู่การตั้งค่า (Settings Menu)</span>
                <span className="text-[11px] font-normal lowercase opacity-75">คลิกเพื่อเข้าสู่หน้าการตั้งค่า</span>
              </div>

              {menuCategories.map((cat) => {
                const Icon = cat.icon;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full text-left p-4.5 flex items-center justify-between gap-4 transition-all cursor-pointer group ${
                      isLight 
                        ? 'hover:bg-blue-50/60 text-slate-800' 
                        : 'hover:bg-[#181B22] text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs ${
                        cat.id === 'personal'
                          ? 'bg-blue-500/10 text-blue-500'
                          : cat.id === 'security'
                          ? 'bg-amber-500/10 text-amber-500'
                          : cat.id === 'connected_accounts'
                          ? 'bg-indigo-500/10 text-indigo-500'
                          : cat.id === 'line_alerts'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold group-hover:text-blue-500 transition-colors">
                            {cat.title}
                          </span>
                          {cat.badge && (
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              cat.badgeColor === 'rose'
                                ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                : cat.badgeColor === 'emerald'
                                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                : cat.badgeColor === 'amber'
                                ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                : cat.badgeColor === 'purple'
                                ? 'bg-purple-500/15 text-purple-500 border border-purple-500/30'
                                : 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                            }`}>
                              {cat.badge}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {cat.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold hidden sm:inline ${
                        isLight ? 'text-slate-400 group-hover:text-blue-600' : 'text-slate-500 group-hover:text-blue-400'
                      }`}>
                        จัดการ
                      </span>
                      <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${
                        isLight ? 'text-slate-300 group-hover:text-blue-500' : 'text-slate-600 group-hover:text-blue-400'
                      }`} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Security Status Strip */}
            <div className={`p-4.5 rounded-2xl border space-y-3 shadow-xs ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#12151B] border-[#222734]'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <Fingerprint className="w-4 h-4 text-blue-500" />
                  สรุปความปลอดภัยของบัญชี
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  !isPinDefault && (formData.google_id || formData.line_user_id)
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                }`}>
                  {!isPinDefault && (formData.google_id || formData.line_user_id) ? 'ความปลอดภัยระดับสูง' : 'ระดับปานกลาง'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'}`}>
                  <div className="text-[11px] text-slate-400 mb-1">รหัส PIN ปลดล็อค POS</div>
                  <div className={`text-xs font-mono font-bold ${isPinDefault ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {isPinDefault ? '⚠️ ค่าเริ่มต้น 1234' : '✓ ตั้งค่าเรียบร้อย'}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'}`}>
                  <div className="text-[11px] text-slate-400 mb-1">Google OAuth</div>
                  <div className={`text-xs font-bold ${formData.google_id ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {formData.google_id ? '✓ เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181B22] border-[#262A36]'}`}>
                  <div className="text-[11px] text-slate-400 mb-1">LINE แจ้งเตือน</div>
                  <div className={`text-xs font-bold ${formData.line_notify_token ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {formData.line_notify_token ? '✓ เปิดใช้งาน' : 'ยังไม่ตั้งค่า'}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ============================================================ */
          /* VIEW 2: DEDICATED FULL PAGE (When activeCategory !== null)   */
          /* ============================================================ */
          <motion.div
            key={`detail-${activeCategory}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.18 }}
            className="space-y-6"
          >
            {/* Top Navigation Bar: Back Button & Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-[#262A36]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className={`p-2.5 rounded-xl border flex items-center justify-center transition cursor-pointer shadow-xs ${
                    isLight 
                      ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' 
                      : 'bg-[#181B22] hover:bg-[#222734] border-[#2A303F] text-slate-200'
                  }`}
                  title="ย้อนกลับไปหน้าการตั้งค่าหลัก"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <span 
                      onClick={() => setActiveCategory(null)}
                      className="hover:underline cursor-pointer"
                    >
                      การตั้งค่าบัญชี
                    </span>
                    <span>/</span>
                    <span className="text-blue-500 font-bold">
                      {currentCategoryObj?.title}
                    </span>
                  </div>
                  <h1 className={`text-xl font-black tracking-tight flex items-center gap-2 mt-0.5 ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    {currentCategoryObj?.title}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600' : 'bg-[#181B22] hover:bg-[#222734] border-[#2A303F] text-slate-400'
                  }`}
                >
                  ← ย้อนกลับ
                </button>
              </div>
            </div>

            {/* 👤 1. ข้อมูลส่วนตัว (Personal Details) */}
            {activeCategory === 'personal' && (
              <div className={`p-6 rounded-2xl border space-y-6 shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#12151B] border-[#222734]'
              }`}>
                <div>
                  <h2 className={`text-base font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    ข้อมูลส่วนตัว (Personal Details)
                  </h2>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    จัดการข้อมูลพื้นฐานของคุณ เช่น ชื่อ-นามสกุล ชื่อผู้ใช้สำหรับล็อกอิน อีเมล และรูปโปรไฟล์
                  </p>
                </div>

                {/* Section A: Photo Uploader */}
                <div className={`p-4 rounded-xl border space-y-4 ${
                  isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#181B22]/60 border-[#262A36]'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-[#262A36]">
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      <Upload className="w-3.5 h-3.5 text-blue-500" />
                      รูปภาพโปรไฟล์ (Profile Avatar)
                    </span>

                    {/* Mode Toggle */}
                    <div className={`flex rounded-lg border p-0.5 text-[11px] font-semibold self-start sm:self-auto ${
                      isLight ? 'bg-white border-slate-200' : 'bg-[#12151B] border-[#2A303F]'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setImageTab('upload')}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          imageTab === 'upload'
                            ? 'bg-blue-600 text-white shadow-xs font-bold'
                            : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        📁 อัปโหลด Google Drive
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageTab('url')}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          imageTab === 'url'
                            ? 'bg-blue-600 text-white shadow-xs font-bold'
                            : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🔗 ใส่ลิงก์ URL
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Avatar Preview */}
                    <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center overflow-hidden shrink-0 shadow-sm ${
                      isLight ? 'bg-white border-blue-500/30' : 'bg-[#12151B] border-blue-500/40'
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
                        <UserIcon className="w-8 h-8 opacity-30 text-slate-500" />
                      )}
                    </div>

                    <div className="flex-1 w-full space-y-3">
                      {imageTab === 'upload' ? (
                        <div className="space-y-2.5">
                          {driveFolders.length > 0 && (
                            <div className="flex items-center gap-2 text-xs">
                              <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>โฟลเดอร์ Google Drive:</span>
                              <select
                                value={selectedFolderId}
                                onChange={(e) => handleFolderChange(e.target.value)}
                                className={`px-2 py-1 text-xs rounded-lg border focus:outline-hidden ${
                                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#12151B] border-[#2A303F] text-slate-200'
                                }`}
                              >
                                {driveFolders.map(folder => (
                                  <option key={folder.folder_id} value={folder.folder_id}>
                                    {folder.folder_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageFileSelect}
                              accept="image/*"
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingImage}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              {isUploadingImage ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  กำลังอัปโหลด...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3.5 h-3.5" />
                                  เลือกรูปภาพจากเครื่อง
                                </>
                              )}
                            </button>

                            {formData.avatar_url && (
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, avatar_url: '' }))}
                                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                              >
                                ลบรูป
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            รองรับไฟล์ JPG, PNG, WEBP ขนาดไม่เกิน 5MB
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <input
                            type="url"
                            value={formData.avatar_url}
                            onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
                            placeholder="https://images.unsplash.com/... หรือ Google Drive Link"
                            className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden transition ${
                              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#12151B] border-[#2A303F] text-white'
                            }`}
                          />
                          {formData.avatar_url && (
                            <p className="text-[10px] text-emerald-500 font-mono truncate">
                              ✓ พร้อมใช้งาน: {normalizeDriveImageUrl(formData.avatar_url)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section B: Text Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      ชื่อ-นามสกุล (ยศและชื่อเต็ม) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="เช่น จ.ส.อ. สมศักดิ์ มีชัย"
                      className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-hidden transition ${
                        isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500' : 'bg-[#181B22] border-[#2A303F] text-white focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      ชื่อผู้ใช้งาน (Username สำหรับ Login) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="เช่น admin_w21"
                      className={`w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border focus:outline-hidden transition ${
                        isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500' : 'bg-[#181B22] border-[#2A303F] text-white focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      อีเมลติดต่อ (Email Address)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="name@wing21.rtaf.mi.th"
                        className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border focus:outline-hidden transition ${
                          isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500' : 'bg-[#181B22] border-[#2A303F] text-white focus:border-blue-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 🔐 2. รหัสผ่านและความปลอดภัย (Password & PIN Security) */}
            {activeCategory === 'security' && (
              <div className={`p-6 rounded-2xl border space-y-6 shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#12151B] border-[#222734]'
              }`}>
                <div>
                  <h2 className={`text-base font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    รหัสผ่านและความปลอดภัย (Password & PIN Security)
                  </h2>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    ตั้งค่ารหัสผ่านหลักสำหรับเข้าสู่ระบบหลังบ้าน และรหัส PIN 4-6 หลักสำหรับปลดล็อคหน้าจอขายด่วน
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Master Password */}
                  <div className={`p-4 rounded-xl border space-y-3 ${
                    isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#181B22]/60 border-[#262A36]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        <Lock className="w-4 h-4 text-amber-500" />
                        รหัสผ่านเข้าสู่ระบบ (Master Password)
                      </label>
                      <span className="text-[10px] text-slate-400">สำหรับ Login หลัก</span>
                    </div>

                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password_hash}
                        onChange={(e) => setFormData(prev => ({ ...prev, password_hash: e.target.value }))}
                        placeholder="กรอกรหัสผ่านใหม่ (เว้นว่างหากไม่ต้องการเปลี่ยน)"
                        className={`w-full px-3.5 pr-10 py-2.5 text-xs font-mono rounded-xl border focus:outline-hidden transition ${
                          isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500' : 'bg-[#12151B] border-[#2A303F] text-white focus:border-amber-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* PIN Code */}
                  <div className={`p-4 rounded-xl border space-y-3 ${
                    isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#181B22]/60 border-[#262A36]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        <Key className="w-4 h-4 text-amber-500" />
                        รหัส PIN ปลดล็อคด่วน (Quick PIN 4-6 หลัก) <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">สำหรับ POS Lock</span>
                    </div>

                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        maxLength={6}
                        value={formData.pin_hash}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setFormData(prev => ({ ...prev, pin_hash: val }));
                        }}
                        placeholder="เช่น 1234"
                        className={`w-full px-3.5 pr-10 py-2.5 text-xs font-mono font-bold tracking-widest rounded-xl border focus:outline-hidden transition ${
                          isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500' : 'bg-[#12151B] border-[#2A303F] text-white focus:border-amber-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Default PIN Warning */}
                    {isPinDefault && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                          <strong>แจ้งเตือนความปลอดภัย:</strong> ปัจจุบันบัญชีใช้รหัส PIN เริ่มต้น <code>1234</code> แนะนำให้เปลี่ยนเป็นรหัส 4-6 หลักที่เป็นความลับ เพื่อความปลอดภัยสูงสุด
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 🌐 3. บัญชีที่เชื่อมต่อสำหรับล็อกอิน (Connected Accounts) */}
            {activeCategory === 'connected_accounts' && (
              <div className={`p-6 rounded-2xl border space-y-6 shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#12151B] border-[#222734]'
              }`}>
                <div>
                  <h2 className={`text-base font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    บัญชีที่เชื่อมต่อสำหรับล็อกอิน (Connected Accounts)
                  </h2>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    ผูกบัญชี Google หรือ LINE เพื่อให้สามารถล็อกอินเข้าสู่ระบบได้สะดวกรวดเร็วโดยไม่ต้องจำรหัสผ่าน
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Google Account Connection */}
                  <div className={`p-4 rounded-xl border space-y-3.5 ${
                    isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#181B22]/60 border-[#262A36]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-sm">
                          G
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            Google Account (1-Click Sign-In)
                          </div>
                          <div className="text-[11px] text-slate-400">
                            ล็อกอินเข้าสู่ระบบด้วยบัญชี Google
                          </div>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        formData.google_id 
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' 
                          : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {formData.google_id ? <Check className="w-3 h-3" /> : null}
                        {formData.google_id ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className={`block text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        Google Account ID / Email
                      </label>
                      <input
                        type="text"
                        value={formData.google_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, google_id: e.target.value }))}
                        placeholder="google_id หรือ email ที่เชื่อมต่อ"
                        className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border focus:outline-hidden transition ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#12151B] border-[#2A303F] text-white'
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {formData.google_id ? (
                        <button
                          type="button"
                          onClick={handleDisconnectGoogle}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Unlink className="w-3.5 h-3.5" /> ยกเลิกการเชื่อมต่อ Google
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConnectGoogle}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs shadow-indigo-500/20"
                        >
                          <LinkIcon className="w-3.5 h-3.5" /> 🔗 เชื่อมต่อบัญชี Google
                        </button>
                      )}
                    </div>
                  </div>

                  {/* LINE Login Account */}
                  <div className={`p-4 rounded-xl border space-y-3.5 ${
                    isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#181B22]/60 border-[#262A36]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm">
                          L
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            LINE Account (LINE Login)
                          </div>
                          <div className="text-[11px] text-slate-400">
                            เข้าสู่ระบบผ่านแอปพลิเคชัน LINE
                          </div>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        formData.line_user_id 
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' 
                          : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {formData.line_user_id ? <Check className="w-3 h-3" /> : null}
                        {formData.line_user_id ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className={`block text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        LINE User ID (Uxxxxxxxx...)
                      </label>
                      <input
                        type="text"
                        value={formData.line_user_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, line_user_id: e.target.value }))}
                        placeholder="เช่น U89a1b2c3d4e5f6..."
                        className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border focus:outline-hidden transition ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#12151B] border-[#2A303F] text-white'
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {formData.line_user_id ? (
                        <button
                          type="button"
                          onClick={handleDisconnectLine}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Unlink className="w-3.5 h-3.5" /> ยกเลิกการเชื่อมต่อ LINE
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConnectLine}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs shadow-emerald-500/20"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> 💬 เชื่อมต่อ LINE Account
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 🔔 4. การแจ้งเตือนผ่าน LINE (LINE Alerts & Bot) */}
            {activeCategory === 'line_alerts' && (
              <div className={`p-6 rounded-2xl border space-y-6 shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#12151B] border-[#222734]'
              }`}>
                <div>
                  <h2 className={`text-base font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    การแจ้งเตือนผ่าน LINE & LINE Bot (LINE Alerts & Messaging Bot)
                  </h2>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    เชื่อมต่อบอททางการของระบบและตั้งค่า Token เพื่อรับการแจ้งเตือนยอดขายประจำวัน สรุปปิดกะ POS และรายงานตัดยอดสวัสดิการ
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Card A: LINE Bot Official Account Add Friend */}
                  <div className={`p-4 rounded-xl border space-y-3.5 ${
                    isLight ? 'bg-gradient-to-br from-emerald-50/70 to-teal-50/50 border-emerald-200' : 'bg-gradient-to-br from-emerald-950/25 to-[#161B24] border-emerald-900/40'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#06C755] text-white flex items-center justify-center font-bold text-lg shadow-md shadow-[#06C755]/20">
                          <MessageSquare className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            LINE Official Account (บอทแจ้งเตือนประจำระบบ)
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            ID: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">@pxwing21</span> (ระบบสวัสดิการ พัน.อย.บน.21)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <a
                          href="https://line.me/R/ti/p/@pxwing21"
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#06C755] hover:bg-[#05b34c] text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          + เพิ่มเพื่อน LINE Bot
                        </a>
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg text-xs leading-relaxed border ${
                      isLight ? 'bg-white/80 border-emerald-100 text-slate-700' : 'bg-[#12151B]/80 border-emerald-900/30 text-slate-300'
                    }`}>
                      💡 <strong>วิธีเปิดรับการแจ้งเตือน:</strong> กดปุ่ม <em>+ เพิ่มเพื่อน LINE Bot</em> หรือผูก <strong>LINE User ID</strong> ด้านล่าง บอทจะสามารถส่งการ์ดสรุปยอดขาย (Flex Message) และรายงานสวัสดิการเข้าแชทของคุณโดยตรง
                    </div>
                  </div>

                  {/* Card B: LINE Messaging API & Notify Token Input */}
                  <div className={`p-4 rounded-xl border space-y-3.5 ${
                    isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#181B22]/60 border-[#262A36]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        <Bell className="w-4 h-4 text-emerald-500" />
                        LINE Notify Token หรือ Messaging Token
                      </label>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        formData.line_notify_token || formData.line_user_id
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' 
                          : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {formData.line_notify_token || formData.line_user_id ? 'พร้อมส่งแจ้งเตือน' : 'ยังไม่ได้ตั้งค่า'}
                      </span>
                    </div>

                    <input
                      type="text"
                      value={formData.line_notify_token}
                      onChange={(e) => setFormData(prev => ({ ...prev, line_notify_token: e.target.value }))}
                      placeholder="ใส่ LINE Notify Token (สำหรับกลุ่ม) หรือ Token บอทแจ้งเตือน"
                      className={`w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border focus:outline-hidden transition ${
                        isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500' : 'bg-[#12151B] border-[#2A303F] text-white focus:border-emerald-500'
                      }`}
                    />

                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={handleTestLineNotify}
                        disabled={isTestingLine}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition cursor-pointer shadow-xs ${
                          isLight 
                            ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800' 
                            : 'bg-[#12151B] hover:bg-[#222734] border-[#2A303F] text-slate-200'
                        }`}
                      >
                        <Bell className="w-3.5 h-3.5 text-amber-500" />
                        {isTestingLine ? 'กำลังส่งทดสอบ...' : '🔔 ทดสอบส่งการ์ดแจ้งเตือน (Flex Card)'}
                      </button>

                      {formData.line_user_id && (
                        <span className="text-[11px] font-mono text-slate-400">
                          (ส่งเข้า User ID: {formData.line_user_id})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Information Box */}
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                    isLight ? 'bg-blue-50/60 border-blue-200/80 text-blue-900' : 'bg-blue-950/20 border-blue-900/40 text-blue-300'
                  }`}>
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed space-y-1">
                      <strong className="block font-bold">ข้อมูลการแจ้งเตือนอัตโนมัติ:</strong>
                      <p>
                        เมื่อผูกบัญชี LINE แล้ว ระบบจะส่งข้อความแจ้งเตือนอัตโนมัติในกรณี:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                        <li>สรุปยอดขายประจำวันและรายงานปิดกะ POS (Flex Message)</li>
                        <li>แจ้งเตือนเมื่อมีการตัดยอดสวัสดิการประจำเดือน (Monthly Deductions)</li>
                        <li>รายงานข้อผิดพลาดหรือการบันทึกข้อมูลสำคัญ</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 🛡️ 5. สิทธิ์และการเข้าถึงระบบ (Role & Permissions) */}
            {activeCategory === 'permissions' && (
              <div className={`p-6 rounded-2xl border space-y-6 shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#12151B] border-[#222734]'
              }`}>
                <div>
                  <h2 className={`text-base font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    สิทธิ์และการเข้าถึงระบบ (Role & Permissions)
                  </h2>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    ตรวจสอบสิทธิ์การใช้งาน บทบาทในระบบ และขอบเขตการเข้าถึงข้อมูลของบัญชีนี้
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Role Card */}
                  <div className={`p-4 rounded-xl border space-y-3 ${
                    isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#181B22]/60 border-[#262A36]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        ระดับสิทธิ์ปัจจุบัน (Account Role)
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                        userRole === 'ADMIN'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : userRole === 'SELLER'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                      }`}>
                        {userRole}
                      </span>
                    </div>

                    <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                      isLight ? 'bg-white border border-slate-200 text-slate-700' : 'bg-[#12151B] border border-[#2A303F] text-slate-300'
                    }`}>
                      {userRole === 'ADMIN' && (
                        <p>👑 <strong>ผู้ดูแลระบบสูงสุด (System Administrator):</strong> เข้าถึงและควบคุมได้ทุกฟังก์ชัน ทั้งระบบคลังสินค้า ร้านค้า สวัสดิการทหาร เงินเดือน และการตั้งค่าระบบทั้งหมด</p>
                      )}
                      {userRole === 'SELLER' && (
                        <p>🏪 <strong>ผู้ดูแลร้านค้า (Seller Operator):</strong> เข้าถึงเฉพาะหน้าขาย POS สต็อกสินค้าของร้าน และออเดอร์ของร้านตนเอง</p>
                      )}
                      {userRole !== 'ADMIN' && userRole !== 'SELLER' && (
                        <p>🛡️ <strong>เจ้าหน้าที่ทั่วไป (Officer):</strong> เข้าถึงฟังก์ชันการทำงานตามสิทธิ์ที่ได้รับมอบหมาย</p>
                      )}
                    </div>
                  </div>

                  {/* Seller Store Link if SELLER */}
                  {userRole === 'SELLER' && (
                    <div className={`p-4 rounded-xl border space-y-3 ${
                      isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            ร้านค้าที่สังกัด (Seller ID)
                          </span>
                        </div>
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                          {formData.seller_id || 'S01'}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                        บัญชีนี้ถูกผูกเข้ากับรหัสร้านค้านี้โดยเฉพาะ ข้อมูลยอดขายและสินค้าจะถูกจัดกลุ่มเข้ากับร้านค้านี้
                      </p>
                    </div>
                  )}

                  {/* System Identifiers */}
                  <div className={`p-4 rounded-xl border space-y-2.5 text-xs ${
                    isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#181B22]/60 border-[#262A36]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>User ID ภายในระบบ:</span>
                      <span className="font-mono font-bold">{currentUserId || 'USR-01'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>สถานะบัญชี:</span>
                      <span className="text-emerald-500 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        🟢 บัญชีเปิดใช้งานปกติ (Active)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* ============================================================ */}
      {/* 💾 FLOATING SAVE / RESET ACTION BAR (Accounts Center Footer) */}
      {/* ============================================================ */}
      <div className={`sticky bottom-4 z-20 p-4 rounded-2xl border shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 transition backdrop-blur-md ${
        isLight 
          ? 'bg-white/95 border-slate-300/80 text-slate-900 shadow-slate-200/50' 
          : 'bg-[#12151B]/95 border-[#2A303F] text-white shadow-black/60'
      }`}>
        <div className="flex items-center gap-2">
          {isDirty ? (
            <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
              <span>คุณมีการแก้ไขข้อมูลที่ยังไม่ได้บันทึก</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>ข้อมูลการตั้งค่าทั้งหมดได้รับการบันทึกล่าสุดแล้ว</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' 
                  : 'bg-[#181B22] hover:bg-[#242A38] border-[#262A36] text-slate-300'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5" />
              คืนค่าเดิม (Reset)
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                กำลังบันทึกข้อมูล...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                💾 บันทึกการเปลี่ยนแปลง (Save Changes)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

