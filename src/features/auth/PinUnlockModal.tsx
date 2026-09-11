import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  LogOut, 
  Delete, 
  AlertCircle, 
  KeyRound
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore.ts';

interface PinUnlockModalProps {
  isOpen: boolean;
}

export const PinUnlockModal: React.FC<PinUnlockModalProps> = ({ isOpen }) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const currentUser = useAuthStore((s) => s.currentUser);
  const unlockWithPin = useAuthStore((s) => s.unlockWithPin);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  const handleKeyPress = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg(null);
      if (nextPin.length === 4 || nextPin.length === 6) {
        // Auto-verify if 4 digits entered
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg(null);
  };

  const verifyPin = (pinToTest: string) => {
    const success = unlockWithPin(pinToTest);
    if (success) {
      setPin('');
      setErrorMsg(null);
    } else {
      setIsShaking(true);
      setErrorMsg('รหัส PIN ไม่ถูกต้อง');
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      handleKeyPress(e.key);
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else if (e.key === 'Enter') {
      verifyPin(pin);
    }
  };

  if (!isOpen || !currentUser) return null;

  return (
    <AnimatePresence>
      <div 
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl outline-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            x: isShaking ? [-12, 12, -8, 8, -4, 4, 0] : 0 
          }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-slate-100 flex flex-col items-center"
        >
          {/* Header & Lock Indicator */}
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-full border-2 border-cyan-500/40 p-0.5 overflow-hidden shadow-lg shadow-cyan-500/20 bg-slate-800">
              <img
                src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt={currentUser.full_name}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 bg-amber-500 text-slate-950 rounded-full shadow-md">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="text-center mb-4">
            <h3 className="font-bold text-lg text-white flex items-center justify-center gap-1.5">
              <span>{currentUser.full_name}</span>
            </h3>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                @{currentUser.username}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                currentUser.role === 'ADMIN' 
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
                  : currentUser.role === 'STAFF'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              หน้าจอถูกล็อค กรุณากรอกรหัส PIN เพื่อกลับมาใช้งานต่อ
            </p>
          </div>

          {/* PIN Indicators (4-6 Dots) */}
          <div className="flex items-center justify-center gap-3 my-3">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <motion.div
                  key={idx}
                  animate={{ scale: isFilled ? 1.2 : 1 }}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    isFilled 
                      ? 'bg-cyan-400 border-cyan-400 shadow-md shadow-cyan-400/50' 
                      : 'border-slate-700 bg-slate-950/60'
                  }`}
                />
              );
            })}
          </div>

          {/* Error Message */}
          <div className="h-6 flex items-center justify-center mb-2">
            {errorMsg && (
              <span className="text-xs font-medium text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errorMsg}
              </span>
            )}
          </div>

          {/* Touch Number Pad */}
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] mb-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-lg font-bold text-slate-100 hover:text-white border border-slate-700/60 active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow-xs"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-12 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-xs font-bold text-slate-400 hover:text-slate-200 border border-slate-700/40 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            >
              ล้าง
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-lg font-bold text-slate-100 hover:text-white border border-slate-700/60 active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow-xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-12 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/40 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => logout()}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700/80 text-xs font-semibold text-slate-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
            <button
              type="button"
              onClick={() => verifyPin(pin)}
              disabled={pin.length === 0}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-xs font-bold text-white shadow-md shadow-cyan-600/20 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>ปลดล็อค</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
