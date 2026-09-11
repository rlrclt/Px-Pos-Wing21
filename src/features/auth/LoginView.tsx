import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { api } from '../../core/api.ts';
import { useAuthStore } from '../../store/useAuthStore.ts';
import type { AuthUser } from '../../types/schema.ts';
import { triggerGoogleSignIn } from '../../services/googleAuthService.ts';
import { triggerLineLogin } from '../../services/lineAuthService.ts';

interface LoginViewProps {
  onLoginSuccess?: (user: AuthUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLineLoading, setIsLineLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const authLogin = useAuthStore((s) => s.login);

  const performLogin = async (loginUser: string, loginPin: string) => {
    if (!loginUser.trim() || !loginPin.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้และรหัส PIN');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.login(loginUser.trim(), loginPin.trim());
      if (res.success && res.user) {
        authLogin(res.user);
        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        }
      } else {
        setErrorMsg(res.error || 'ชื่อผู้ใช้หรือรหัส PIN ไม่ถูกต้อง');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMsg(null);
    try {
      const googleProfile = await triggerGoogleSignIn();
      if (googleProfile && (googleProfile.google_id || googleProfile.email)) {
        const res = await api.googleLogin({
          google_id: googleProfile.google_id,
          email: googleProfile.email
        });

        if (res.success && res.user) {
          authLogin(res.user);
          if (onLoginSuccess) {
            onLoginSuccess(res.user);
          }
        } else {
          setErrorMsg(res.error || 'ยังไม่พบบัญชีที่ผูกกับ Google นี้ กรุณาเข้าสู่ระบบด้วย Username/PIN ก่อน');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLineLogin = async () => {
    setIsLineLoading(true);
    setErrorMsg(null);
    try {
      const lineProfile = await triggerLineLogin();
      if (lineProfile && lineProfile.line_user_id) {
        const res = await api.lineLogin({
          line_user_id: lineProfile.line_user_id
        });

        if (res.success && res.user) {
          authLogin(res.user);
          if (onLoginSuccess) {
            onLoginSuccess(res.user);
          }
        } else {
          setErrorMsg(res.error || 'ยังไม่พบบัญชีที่ผูกกับ LINE นี้ กรุณาเข้าสู่ระบบด้วย Username/PIN ก่อน');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถเข้าสู่ระบบด้วย LINE ได้');
    } finally {
      setIsLineLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(username, pin);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 text-slate-100 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* 1. Subtle High-Tech Grid Mesh */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* 2. Dynamic Floating Animated Glow Orbs */}
      <motion.div
        animate={{
          x: [-40, 50, -20, -40],
          y: [-30, 40, -10, -30],
          scale: [1, 1.25, 0.9, 1],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full blur-[140px] pointer-events-none bg-blue-600/25"
      />

      <motion.div
        animate={{
          x: [50, -40, 30, 50],
          y: [40, -50, 20, 40],
          scale: [1.1, 0.9, 1.25, 1.1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-10 right-1/4 w-[420px] h-[420px] bg-indigo-600/20 rounded-full blur-[130px] pointer-events-none"
      />

      <motion.div
        animate={{
          x: [-30, 40, -50, -30],
          y: [30, -30, 40, 30],
          scale: [0.95, 1.2, 1, 0.95],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-12 right-12 w-[340px] h-[340px] bg-cyan-500/20 rounded-full blur-[110px] pointer-events-none"
      />

      {/* Main Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md bg-slate-900/85 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10"
      >
        {/* Header / Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 mb-3">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            PX หน่วยฝึกทหารใหม่
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">
              พัน.อย.บน.21
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            ระบบบริหารจัดการสวัสดิการ (Admin & Seller Portal)
          </p>
        </div>

        {/* Error Notification Alert */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-sm overflow-hidden"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1-Click Social Sign-In Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || isLoading || isLineLoading}
            className="py-2.5 px-3 rounded-xl font-bold text-xs bg-white hover:bg-slate-100 text-slate-800 flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-black/20 disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span>Google Login</span>
          </button>

          {/* LINE Sign In */}
          <button
            type="button"
            onClick={handleLineLogin}
            disabled={isLineLoading || isLoading || isGoogleLoading}
            className="py-2.5 px-3 rounded-xl font-bold text-xs bg-[#06C755] hover:bg-[#05b34c] text-white flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-[#06C755]/20 disabled:opacity-50"
          >
            {isLineLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <MessageSquare className="w-4 h-4 fill-current" />
            )}
            <span>LINE Login</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-5">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
            หรือเข้าสู่ระบบด้วย Username
          </span>
          <div className="border-t border-slate-800 w-full" />
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น admin หรือ seller_s01"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              รหัส PIN 4 หลัก
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="กรอกรหัส PIN 4 หลัก"
                className="w-full pl-10 pr-11 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading || isLineLoading}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] mt-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>กำลังตรวจสอบสิทธิ์...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบ (Sign In)</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

