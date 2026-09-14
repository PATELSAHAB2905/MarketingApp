import React from 'react';
import { AlertTriangle, Clock, ArrowRight, X } from 'lucide-react';

export default function LogoutBlockedModal({ isOpen, onClose, onGoToEndDay }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white max-w-sm w-full rounded-3xl p-6 text-center space-y-4 shadow-2xl border border-red-200 animate-in zoom-in-95">
        <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto border border-red-200">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-slate-900 uppercase">
            Logout Blocked
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            You cannot logout while your business day is <strong>ACTIVE</strong>.
          </p>
          <p className="text-[11px] text-red-700 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200 mt-2">
            Please submit <strong>End My Day</strong> first before logging out.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-98 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onGoToEndDay) onGoToEndDay();
            }}
            className="flex-1 py-3 px-3 rounded-xl bg-gradient-to-r from-red-700 to-amber-700 hover:from-red-800 hover:to-amber-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
          >
            <span>Go to End My Day</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
