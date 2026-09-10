import { Sparkles, CheckCircle2, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast.ts';

interface ToastContainerProps {
  isLoading?: boolean;
}

export function ToastContainer({ isLoading = false }: ToastContainerProps) {
  const { toasts, dismissToast } = useToast();

  return (
    <>
      {/* Top Shimmer Loading Bar */}
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 h-1 z-50 overflow-hidden bg-transparent pointer-events-none">
          <div className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 animate-pulse w-full shadow-lg shadow-cyan-500/50" />
        </div>
      )}

      {/* Floating Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(toast => {
          let bgClass = 'bg-[#0f172a] border-slate-700 text-slate-200';
          let icon = <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />;

          if (toast.type === 'success') {
            bgClass = 'bg-[#062419] border-emerald-500/40 text-emerald-100 shadow-emerald-950/50';
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
          } else if (toast.type === 'error') {
            bgClass = 'bg-[#2a0e14] border-rose-500/40 text-rose-100 shadow-rose-950/50';
            icon = <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />;
          } else if (toast.type === 'warning') {
            bgClass = 'bg-[#291e0a] border-amber-500/40 text-amber-100 shadow-amber-950/50';
            icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
          } else if (toast.type === 'loading') {
            bgClass = 'bg-[#0e1e38] border-cyan-500/40 text-cyan-100 shadow-cyan-950/50';
            icon = <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 ${bgClass}`}
            >
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold leading-tight">{toast.title}</div>
                {toast.message && (
                  <div className="text-[11px] opacity-80 mt-0.5 leading-snug break-words">{toast.message}</div>
                )}
              </div>
              {toast.type !== 'loading' && (
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
