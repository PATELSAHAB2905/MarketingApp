import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import SyncIndicator from '../common/SyncIndicator';
import ChangePasswordModal from '../common/ChangePasswordModal';
import { Flame, Shield, User, LogOut, KeyRound, Smartphone } from 'lucide-react';

export default function TopNavbar() {
  const { currentUser, logout } = useAuth();
  const [showPassModal, setShowPassModal] = useState(false);

  const handleLogout = () => {
    if (window.confirm('Kya aap sure hain ki Logout karna chahte hain?')) {
      logout();
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <>
      <header className="bg-gradient-to-r from-red-900 via-red-800 to-amber-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 md:px-4 py-2 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md transform hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 md:w-6 md:h-6 text-red-950 fill-amber-300" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-black tracking-wider text-amber-200 uppercase leading-none">
                PATEL SAHAB SPICES
              </h1>
              <p className="text-[10px] md:text-[11px] text-red-200 font-medium tracking-tight mt-0.5">
                Marketing Management System
              </p>
            </div>
          </div>

          {/* Sync & User Controls */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden sm:block">
              <SyncIndicator />
            </div>

            {/* Authenticated User Profile Pill */}
            {currentUser && (
              <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md py-1 px-2.5 rounded-xl border border-white/10 text-xs">
                <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
                <div className="text-left">
                  <span className="font-extrabold text-white block text-[11px] md:text-xs leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[9px] text-amber-300 uppercase font-black tracking-wider">
                    {isAdmin ? '👑 ADMIN' : '📱 MARKETER'}
                  </span>
                </div>
              </div>
            )}

            {/* Change Password Quick Trigger */}
            <button
              onClick={() => setShowPassModal(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 hover:text-white transition-colors"
              title="Change Password"
            >
              <KeyRound className="w-4 h-4" />
            </button>

            {/* Secure Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-red-950/60 hover:bg-red-950 border border-red-500/30 text-red-200 hover:text-white transition-colors flex items-center gap-1.5"
              title="Logout from Application"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline text-[11px] font-bold">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPassModal}
        onClose={() => setShowPassModal(false)}
      />
    </>
  );
}
