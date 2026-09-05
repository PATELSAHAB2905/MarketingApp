import React from 'react';
import {
  LayoutDashboard,
  Navigation,
  CalendarDays,
  ShoppingBag,
  IndianRupee,
  RotateCcw,
  Store,
  MapPin,
  Calendar,
  Users,
  Clock,
  Fuel,
  Target,
  BarChart,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  Map,
  Database,
} from 'lucide-react';

export default function AdminSidebar({ activeTab, setActiveTab }) {
  const menuGroups = [
    {
      title: 'OPERATIONS',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'mdo', label: 'MDO 30-Day Report', icon: FileSpreadsheet },
        { id: 'tracking', label: 'Live Tracking', icon: Navigation },
        { id: 'daily', label: 'Daily Marketing', icon: CalendarDays },
      ],
    },
    {
      title: 'TRANSACTIONS & LEDGERS',
      items: [
        { id: 'all-transactions', label: 'All Transactions (Vyapar)', icon: FileSpreadsheet },
        { id: 'party-statement', label: 'Party Statement (Vyapar)', icon: FileSpreadsheet },
        { id: 'orders', label: 'Orders', icon: ShoppingBag },
        { id: 'collections', label: 'Collections & Handover', icon: IndianRupee },
        { id: 'returns', label: 'Returns Analysis', icon: RotateCcw },
        { id: 'followups', label: 'Follow-ups', icon: Clock },
      ],
    },
    {
      title: 'MASTERS & ROUTES',
      items: [
        { id: 'shops', label: 'Shops Master', icon: Store },
        { id: 'markets', label: 'Markets Master', icon: MapPin },
        { id: 'market-routes-master', label: 'Market Routes', icon: Map },
        { id: 'routes', label: 'Routes & Overrides', icon: Calendar },
        { id: 'marketers', label: 'Marketers Master', icon: Users },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { id: 'old-data-import', label: 'Old Party Data Import', icon: Database },
        { id: 'fuel', label: 'Fuel Management', icon: Fuel },
        { id: 'targets', label: 'Targets', icon: Target },
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart },
        { id: 'data-import', label: 'Vyapar Data Import', icon: Database },
        { id: 'sheets-setup', label: 'Sheets Setup & Sync', icon: FileSpreadsheet },
        { id: 'sheets', label: 'Raw Data Export', icon: FileSpreadsheet },
        { id: 'audit', label: 'Audit Trail Logs', icon: ShieldCheck },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen hidden md:block flex-shrink-0 border-r border-slate-800">
      <div className="p-4 space-y-6">
        <div className="px-2 py-1 bg-gradient-to-r from-red-950 to-slate-900 border border-red-900/40 rounded-xl">
          <p className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">PATEL SAHAB ADMIN</p>
          <p className="text-xs text-slate-400">Management Control Center</p>
        </div>

        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {group.title}
            </h3>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-red-700 to-amber-700 text-white shadow-md'
                      : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
