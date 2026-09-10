import React from 'react';
import { X, RefreshCw, CheckCircle2, AlertTriangle, Bug } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme.ts';

interface DebugSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoadingPing: boolean;
  pingResult: any;
  onRunTestPing: () => void;
}

export const DebugSheetModal: React.FC<DebugSheetModalProps> = ({
  isOpen,
  onClose,
  isLoadingPing,
  pingResult,
  onRunTestPing
}) => {
  const { isLight } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0e131f] border-[#2b3a55]'
      }`}>
        <div className={`flex items-center justify-between p-5 border-b ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isLight ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
            }`}>
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                วินิจฉัยการเชื่อมต่อ Google Apps Script (Diagnostics)
              </h3>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                ทดสอบ Ping API Endpoint และตรวจสอบสถานะ Master Sheet / Batch Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-600' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">ผลการทดสอบการตอบสนอง:</span>
            <button
              onClick={onRunTestPing}
              disabled={isLoadingPing}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isLight ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPing ? 'animate-spin' : ''}`} />
              {isLoadingPing ? 'กำลังทดสอบ...' : 'ทดสอบ Ping ใหม่'}
            </button>
          </div>

          {pingResult ? (
            <div className={`p-4 rounded-xl border space-y-2 font-mono text-[11px] overflow-x-auto ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#141a29] border-[#21262d] text-cyan-300'
            }`}>
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-emerald-600 dark:text-emerald-400">GAS Endpoint ตอบกลับสำเร็จ (200 OK)</span>
              </div>
              <pre className="whitespace-pre-wrap">{JSON.stringify(pingResult, null, 2)}</pre>
            </div>
          ) : (
            <div className={`p-8 text-center rounded-xl border border-dashed text-slate-400 ${
              isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#141a29] border-[#21262d]'
            }`}>
              {isLoadingPing ? (
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  <span>กำลังส่งคำขอ Ping ไปยัง Google Apps Script...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-amber-500 opacity-60" />
                  <span>กดปุ่ม &quot;ทดสอบ Ping ใหม่&quot; เพื่อตรวจสอบการเชื่อมต่อ</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`flex items-center justify-end p-4 border-t ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141a29] border-[#21262d]'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl font-semibold transition-colors cursor-pointer ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#1c2438] hover:bg-[#283550] text-slate-300'
            }`}
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
