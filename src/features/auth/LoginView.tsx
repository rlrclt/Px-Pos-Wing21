import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../../core/api.ts';
import { useAuthStore } from '../../store/useAuthStore.ts';
import type { AuthUser } from '../../types/schema.ts';

interface LoginViewProps {
  onLoginSuccess?: (user: AuthUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

      <motion.div
        animate={{
          x: [20, -30, 40, 20],
          y: [-20, 30, -30, -20],
          scale: [1, 1.15, 0.85, 1],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-12 left-12 w-[360px] h-[360px] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none"
      />

      {/* 3. Floating Ambient Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { top: '15%', left: '20%', size: 4, duration: 7, delay: 0 },
          { top: '25%', left: '75%', size: 6, duration: 9, delay: 1 },
          { top: '65%', left: '15%', size: 5, duration: 8, delay: 2 },
          { top: '75%', left: '85%', size: 4, duration: 10, delay: 0.5 },
          { top: '45%', left: '10%', size: 3, duration: 6, delay: 3 },
          { top: '80%', left: '40%', size: 5, duration: 11, delay: 1.5 },
          { top: '10%', left: '60%', size: 4, duration: 8.5, delay: 2.5 },
        ].map((p, idx) => (
          <motion.div
            key={idx}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut',
            }}
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
            }}
            className="absolute rounded-full shadow-lg bg-blue-400 shadow-blue-400/50"
          />
        ))}
      </div>

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
                placeholder="กรอกชื่อผู้ใช้ เช่น admin หรือ seller_s01"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              รหัสผ่าน / PIN 4 หลัก
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
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
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
