import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import SyncIndicator from '../common/SyncIndicator';
import { Flame, Shield, User, LogOut, RefreshCw, Smartphone } from 'lucide-react';

export default function TopNavbar() {
  const { currentUser, switchRole, logout } = useAuth();
  const { getFormattedDate, marketers, resetToSeedData } = useData();

  const handleRoleChange = (e) => {
    const val = e.target.value;
    if (val === 'ADMIN') {
      switchRole('ADMIN');
    } else {
      switchRole('MARKETER', val);
    }
  };

  return (
    <header className="bg-gradient-to-r from-red-900 via-red-800 to-amber-900 text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md transform hover:scale-105 transition-transform">
            <Flame className="w-6 h-6 text-red-950 fill-amber-300" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-amber-200 uppercase leading-none">
              PATEL SAHAB SPICES
            </h1>
            <p className="text-[11px] text-red-200 font-medium tracking-tight mt-0.5">
              Marketing Management System
            </p>
          </div>
        </div>

        {/* Sync & Role Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <SyncIndicator />
          </div>

          {/* Quick Role / Marketer Switcher */}
          <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md p-1 rounded-xl border border-white/10">
            <span className="text-[11px] font-semibold text-amber-300 px-2 hidden md:inline">
              Role:
            </span>
            <select
              value={currentUser?.role === 'ADMIN' ? 'ADMIN' : currentUser?.id || 'marketer-1'}
              onChange={handleRoleChange}
              className="bg-white/10 text-white text-xs font-bold py-1 px-2.5 rounded-lg border-0 focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="ADMIN" className="bg-slate-900 text-amber-300 font-bold">
                👑 Admin / Management Panel
              </option>
              {marketers.map(m => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                  📱 Marketer: {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Demo Data Button */}
          <button
            onClick={() => {
              if (window.confirm('Reset app data to default Patel Sahab Spices demo state?')) {
                resetToSeedData();
                window.location.reload();
              }
            }}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1"
            title="Reset to fresh demo seed data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">Reset Data</span>
          </button>
        </div>
      </div>
    </header>
  );
}
