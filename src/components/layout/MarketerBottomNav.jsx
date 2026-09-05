import React from 'react';
import { Home, Store, FileSpreadsheet, CalendarCheck, Menu } from 'lucide-react';

export default function MarketerBottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'home', label: 'HOME', icon: Home },
    { id: 'shops', label: 'SHOPS', icon: Store },
    { id: 'statements', label: 'LEDGERS', icon: FileSpreadsheet },
    { id: 'followups', label: 'FOLLOW-UP', icon: CalendarCheck },
    { id: 'more', label: 'MORE', icon: Menu },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg px-2 py-1.5 flex justify-around items-center md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              isActive
                ? 'text-red-700 font-extrabold scale-105'
                : 'text-slate-500 font-medium hover:text-slate-700'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-red-700 stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
