import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/common/StatusBadge';
import ReceiptModal from '../../components/common/ReceiptModal';
import MorningCheckIn from './MorningCheckIn';
import ShopsList from './ShopsList';
import ShopVisitFlow from './ShopVisitFlow';
import OrderEntryForm from './OrderEntryForm';
import CollectionForm from './CollectionForm';
import ReturnForm from './ReturnForm';
import NewCustomerForm from './NewCustomerForm';
import ComplaintForm from './ComplaintForm';
import FollowUpForm from './FollowUpForm';
import MarketFeedbackForm from './MarketFeedbackForm';
import EndOfDayCheckout from './EndOfDayCheckout';
import MarketerPerformance from './MarketerPerformance';
import MarketerPartyStatement from './MarketerPartyStatement';

import {
  Play,
  Store,
  PlusCircle,
  IndianRupee,
  RotateCcw,
  UserPlus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  MapPin,
  MessageSquare,
  Award,
  Sparkles,
  Edit,
  ShoppingBag,
  FileSpreadsheet,
  History,
  ArrowLeft,
  X,
  Receipt,
  Eye,
} from 'lucide-react';

export default function MarketerDashboard({ activeTab, setActiveTab }) {
  const { currentUser } = useAuth();
  const {
    getFormattedDate,
    getTodayMarket,
    getAuthorizedShops,
    targets,
    checkIns,
    visits,
    orders,
    collections,
    returns,
    followups,
    shops,
  } = useData();

  const [activeModal, setActiveModal] = useState(null); // 'checkin', 'shops', 'visit', 'order', 'collection', 'return', 'new_shop', 'complaint', 'followup', 'feedback', 'eod', 'today_history', 'today_orders', 'today_collections', 'today_returns'
  const [selectedShop, setSelectedShop] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingCollection, setEditingCollection] = useState(null);
  const [editingReturn, setEditingReturn] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [viewingReturn, setViewingReturn] = useState(null);
  const [lastReceiptCollection, setLastReceiptCollection] = useState(null);

  const todayDate = getFormattedDate();
  const todayMarket = getTodayMarket(currentUser?.id, todayDate);
  const authorizedShops = getAuthorizedShops(currentUser?.id, todayDate);

  // Filter today's attendance/session for this marketer
  const todayCheckIn = checkIns.find(
    (c) => c.marketerId === currentUser?.id && (c.date === todayDate || c.createdDate === todayDate)
  );

  const isDayActive = Boolean(todayCheckIn && todayCheckIn.status === 'ACTIVE' && !todayCheckIn.endTime && !todayCheckIn.isDayEnded);
  const isDayEnded = Boolean(todayCheckIn && (todayCheckIn.status === 'INACTIVE' || todayCheckIn.endTime || todayCheckIn.isDayEnded));

  const todayVisits = visits.filter(
    (v) => v.marketerId === currentUser?.id && (v.date === todayDate || v.createdDate === todayDate)
  );

  const todayOrders = orders.filter(
    (o) => o.marketerId === currentUser?.id && (o.date === todayDate || o.createdDate === todayDate)
  );

  const todayCollections = collections.filter(
    (c) => c.marketerId === currentUser?.id && (c.date === todayDate || c.createdDate === todayDate)
  );

  const todayReturns = returns.filter(
    (r) => r.marketerId === currentUser?.id && (r.date === todayDate || r.createdDate === todayDate)
  );

  const todayFollowups = followups.filter(
    (f) => f.marketerId === currentUser?.id && (f.date === todayDate || f.createdDate === todayDate)
  );

  // Calculations
  const totalOrderKg = todayOrders.reduce((sum, o) => sum + (o.totalKg || 0), 0);
  const totalOrderValue = todayOrders.reduce((sum, o) => sum + (o.grandTotal || o.totalValue || 0), 0);
  const totalCollectionValue = todayCollections.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalReturnKg = todayReturns.reduce((sum, r) => sum + (r.returnKg ?? r.quantity ?? 0), 0);
  const totalReturnValue = todayReturns.reduce((sum, r) => sum + (r.returnValue || 0), 0);

  // Automatic Customer Connected count logic
  const customersConnectedCount = todayVisits.length;

  // Target metrics for marketer
  const marketerTarget = targets.find((t) => t.marketerId === currentUser?.id) || {
    dailyKg: 130,
    dailyCollection: 25000,
    dailyVisits: 30,
    dailyNewCustomers: 3,
  };

  const kgAchievementPct = Math.min(
    100,
    Math.round((totalOrderKg / (marketerTarget.dailyKg || 1)) * 100)
  );
  const collAchievementPct = Math.min(
    100,
    Math.round((totalCollectionValue / (marketerTarget.dailyCollection || 1)) * 100)
  );
  const visitAchievementPct = Math.min(
    100,
    Math.round((customersConnectedCount / (marketerTarget.dailyVisits || 1)) * 100)
  );

  // Open shop visit flow
  const handleSelectShop = (shop) => {
    setSelectedShop(shop);
    setActiveModal('visit');
  };

  // Open order for editing
  const handleEditOrder = (order) => {
    setEditingOrder(order);
    const sh = shops.find(s => s.id === order.shopId);
    if (sh) setSelectedShop(sh);
    setActiveModal('order');
  };

  // Open return for editing
  const handleEditReturn = (ret) => {
    setEditingReturn(ret);
    const sh = shops.find(s => s.id === ret.shopId);
    if (sh) setSelectedShop(sh);
    setActiveModal('return');
  };

  // Render tab views
  const renderMainContent = () => {
    if (activeTab === 'statements' || activeTab === 'parties') {
      return (
        <div className="pb-24 max-w-4xl mx-auto">
          <MarketerPartyStatement onGoHome={() => setActiveTab('home')} />
        </div>
      );
    }

    if (activeTab === 'shops') {
      return (
        <div className="pb-24 p-4 max-w-md mx-auto">
          <ShopsList
            onSelectShop={handleSelectShop}
            onGoHome={() => setActiveTab('home')}
            onAddNewShop={() => setActiveModal('new_shop')}
          />
        </div>
      );
    }

    if (activeTab === 'followups') {
      return (
        <div className="pb-24 p-4 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">TODAY'S FOLLOW-UPS</h2>
            <button
              onClick={() => setActiveModal('followup')}
              className="px-3 py-1.5 bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <PlusCircle className="w-4 h-4" />
              Add Follow-up
            </button>
          </div>
          {todayFollowups.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">No Pending Follow-ups Today</p>
              <p className="text-xs text-slate-400 mt-1">Great job! All market follow-ups are clear.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayFollowups.map((f) => (
                <div key={f.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800">{f.shopName || 'Shop'}</h3>
                      <p className="text-xs text-slate-500">{f.reason}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-xs font-semibold rounded border border-amber-200">
                      {f.followUpDate}
                    </span>
                  </div>
                  {f.remark && <p className="text-xs text-slate-600 italic mt-2">"{f.remark}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'summary') {
      return (
        <div className="pb-24 p-4 max-w-md mx-auto">
          <MarketerPerformance />
        </div>
      );
    }

    if (activeTab === 'more') {
      return (
        <div className="pb-24 p-4 max-w-md mx-auto space-y-4">
          <h2 className="text-lg font-bold text-slate-800">MORE OPTIONS</h2>

          <button
            onClick={() => setActiveTab('statements')}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 p-4 rounded-2xl flex items-center justify-between shadow-md active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-950 text-amber-300 rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-black text-sm uppercase">Party Statements (Vyapar Ledgers)</p>
                <p className="text-xs text-slate-900 font-medium">View live running ledgers, sales & receipts</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-950" />
          </button>

          <button
            onClick={() => setActiveModal('feedback')}
            className="w-full bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-sm">Market Feedback</p>
                <p className="text-xs text-slate-500">Log competitor pricing & demand</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          <button
            onClick={() => setActiveModal('complaint')}
            className="w-full bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 text-red-700 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-sm">Retailer Complaint</p>
                <p className="text-xs text-slate-500">Quality, packaging or delivery complaint</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          <button
            onClick={() => setActiveModal('eod')}
            className="w-full bg-gradient-to-r from-red-700 to-amber-700 text-white p-4 rounded-2xl flex items-center justify-between shadow-md active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-300" />
              </div>
              <div className="text-left">
                <p className="font-black text-base">END MY DAY (CHECKOUT)</p>
                <p className="text-xs text-amber-200">
                  {isDayEnded
                    ? `Day Ended at ${todayCheckIn.endTime} ⚪`
                    : isDayActive
                    ? `Active (${todayCheckIn.startTime || todayCheckIn.createdTime}) • Tap to End Day`
                    : 'Please Start My Day first'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      );
    }

    // Default: 'home' tab
    return (
      <div className="pb-24 p-4 max-w-md mx-auto space-y-4">
        {/* 1. Header Greeting & Today's Market */}
        <div className="bg-gradient-to-br from-red-900 via-red-800 to-amber-900 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-amber-300 font-semibold tracking-wide">
                GOOD MORNING, {currentUser?.name?.split(' ')[0]?.toUpperCase() || 'MARKETER'} 👋
              </p>
              <p className="text-[11px] text-red-200 mt-0.5">{todayDate}</p>
          </div>
          <StatusBadge
            status={todayMarket?.routeType || 'Normal Fixed Route'}
            type="route"
          />
        </div>

        <div className="mt-2 pt-3 border-t border-white/10 flex justify-between items-center">
          <div>
            <p className="text-[10px] text-red-200 uppercase font-bold tracking-widest">TODAY'S MARKET</p>
            <h2 className="text-3xl font-black tracking-tight text-amber-300 uppercase">
              {todayMarket?.marketName || 'PACHORE'}
            </h2>
            <p className="text-xs text-amber-100/90 mt-0.5 flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-amber-300" />
              <span>{authorizedShops.length} Assigned Shops</span>
            </p>
          </div>

          {!todayCheckIn ? (
            <button
              onClick={() => setActiveModal('checkin')}
              className="py-3 px-5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-red-950 rounded-2xl font-black text-sm shadow-lg flex items-center gap-2 transform active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-red-950" />
              <span>START MY DAY</span>
            </button>
          ) : isDayActive ? (
            <div className="flex flex-col items-end gap-1.5">
              <div className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {todayCheckIn.sessions?.length > 1
                    ? `Session ${todayCheckIn.sessions.length} Active (${todayCheckIn.startTime}) 🟢`
                    : `Day Active (${todayCheckIn.startTime || todayCheckIn.createdTime}) 🟢`}
                </span>
              </div>
              <button
                onClick={() => setActiveModal('eod')}
                className="py-1 px-3 bg-red-950/80 hover:bg-red-900 border border-amber-400/40 text-amber-300 rounded-xl font-extrabold text-[11px] shadow-xs active:scale-95 transition-all"
              >
                END MY DAY →
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1.5">
              <div className="bg-slate-800/90 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Session {todayCheckIn.sessions?.length || 1} Ended ({todayCheckIn.endTime}) ⚪</span>
              </div>
              <button
                onClick={() => setActiveModal('checkin')}
                className="py-2.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-red-950 rounded-2xl font-black text-xs shadow-lg flex items-center gap-1.5 transform active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-red-950" />
                <span>START MY DAY (SESSION {(todayCheckIn.sessions?.length || 1) + 1})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Today's Targets & Live Progress */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-red-700" />
            TODAY'S TARGET & PROGRESS
          </h3>
          <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
            Live
          </span>
        </div>

        {/* Target 1: Sales Order KG */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-700">Order KG Target</span>
            <span className="text-slate-900">
              {totalOrderKg} / {marketerTarget.dailyKg} KG ({kgAchievementPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-600 to-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${kgAchievementPct}%` }}
            />
          </div>
        </div>

        {/* Target 2: Collection */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-700">Collection Target</span>
            <span className="text-slate-900">
              ₹{totalCollectionValue.toLocaleString('en-IN')} / ₹{marketerTarget.dailyCollection.toLocaleString('en-IN')} ({collAchievementPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${collAchievementPct}%` }}
            />
          </div>
        </div>

        {/* Target 3: Customers Connected */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-700">Customer Connect Target</span>
            <span className="text-slate-900">
              {customersConnectedCount} / {marketerTarget.dailyVisits} Shops ({visitAchievementPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${visitAchievementPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Large Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setActiveTab('shops')}
          className="bg-gradient-to-br from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white p-4 rounded-2xl shadow-md font-extrabold text-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-red-600"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Store className="w-6 h-6 text-amber-300" />
          </div>
          <span>VISIT SHOP</span>
        </button>

        <button
          onClick={() => {
            setEditingOrder(null);
            setActiveModal('order');
          }}
          className="bg-gradient-to-br from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white p-4 rounded-2xl shadow-md font-extrabold text-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-amber-500"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <PlusCircle className="w-6 h-6 text-amber-200" />
          </div>
          <span>ADD ORDER</span>
        </button>

        <button
          onClick={() => setActiveModal('collection')}
          className="bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white p-4 rounded-2xl shadow-md font-extrabold text-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-emerald-500"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <IndianRupee className="w-6 h-6 text-emerald-200" />
          </div>
          <span>COLLECTION</span>
        </button>

        <button
          onClick={() => setActiveModal('return')}
          className="bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white p-4 rounded-2xl shadow-md font-extrabold text-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-slate-700"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <RotateCcw className="w-6 h-6 text-amber-400" />
          </div>
          <span>RETURN</span>
        </button>
      </div>

      {/* VYAPAR-STYLE PARTY STATEMENTS SHORTCUT */}
      <button
        onClick={() => setActiveTab('statements')}
        className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 p-3.5 rounded-2xl shadow-md font-black text-xs flex items-center justify-between active:scale-98 transition-all border border-amber-400"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-slate-950" />
          </div>
          <div className="text-left">
            <p className="font-black text-xs text-slate-950 uppercase tracking-wide">PARTY STATEMENTS (VYAPAR LEDGERS) 📜</p>
            <p className="text-[10px] text-slate-900 font-semibold">View running party ledger, sales, payments & dues</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-950" />
      </button>

      {/* Secondary Quick Action Row */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setActiveModal('new_shop')}
          className="bg-white p-3 rounded-2xl border border-slate-200 text-slate-800 font-bold text-xs flex flex-col items-center gap-1.5 shadow-xs hover:bg-slate-50 active:scale-95"
        >
          <UserPlus className="w-5 h-5 text-purple-600" />
          <span>NEW CUSTOMER</span>
        </button>
        <button
          onClick={() => setActiveModal('followup')}
          className="bg-white p-3 rounded-2xl border border-slate-200 text-slate-800 font-bold text-xs flex flex-col items-center gap-1.5 shadow-xs hover:bg-slate-50 active:scale-95"
        >
          <Clock className="w-5 h-5 text-amber-600" />
          <span>FOLLOW-UP</span>
        </button>
        <button
          onClick={() => setActiveModal('eod')}
          className="bg-white p-3 rounded-2xl border border-slate-200 text-slate-800 font-bold text-xs flex flex-col items-center gap-1.5 shadow-xs hover:bg-slate-50 active:scale-95"
        >
          <Award className="w-5 h-5 text-red-600" />
          <span>END DAY</span>
        </button>
      </div>

      {/* 4. TODAY HISTORY ACCESS CARD */}
      <div
        onClick={() => setActiveModal('today_history')}
        className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md p-4.5 transition-all cursor-pointer active:scale-98 group space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 group-hover:scale-105 transition-transform">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-wide text-slate-900">
                  TODAY HISTORY
                </h3>
                <span className="bg-amber-100 text-amber-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-amber-200">
                  {todayOrders.length} Orders • {todayCollections.length} Coll. • {todayReturns.length} Returns
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                View today's orders, collections & returns →
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-700 transition-colors" />
        </div>
      </div>

      {/* 5. Today's Market Summary Card */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl space-y-3 shadow-lg">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            TODAY'S FIELD SUMMARY ({todayMarket?.marketName || 'Pachore'})
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <p className="text-slate-400">Customers Connected</p>
            <p className="text-xl font-black text-white mt-0.5">{customersConnectedCount}</p>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <p className="text-slate-400">Orders Taken</p>
            <p className="text-xl font-black text-amber-400 mt-0.5">
              {todayOrders.length} ({totalOrderKg} KG)
            </p>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <p className="text-slate-400">Total Collection</p>
            <p className="text-xl font-black text-emerald-400 mt-0.5">
              ₹{totalCollectionValue.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <p className="text-slate-400">Total Returns</p>
            <p className="text-xl font-black text-red-400 mt-0.5">
              ₹{totalReturnValue.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

return (
  <>
    {renderMainContent()}

    {/* Global Modals & Workflows (Accessible from ANY tab: Shops, Statements, Follow-ups, Home) */}
    {activeModal === 'checkin' && (
        <MorningCheckIn onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'visit' && selectedShop && (
        <ShopVisitFlow
          shop={selectedShop}
          onClose={() => {
            setActiveModal(null);
            setSelectedShop(null);
          }}
          onOpenOrder={() => {
            setEditingOrder(null);
            setActiveModal('order');
          }}
          onOpenCollection={() => setActiveModal('collection')}
          onOpenReturn={() => setActiveModal('return')}
          onOpenFollowup={() => setActiveModal('followup')}
        />
      )}
      {activeModal === 'order' && (
        <OrderEntryForm
          shop={selectedShop}
          editingOrder={editingOrder}
          onClose={() => {
            setActiveModal(null);
            setEditingOrder(null);
          }}
          onOrderSubmitted={() => {
            setActiveModal(null);
            setEditingOrder(null);
          }}
        />
      )}
      {activeModal === 'collection' && (
        <CollectionForm
          shop={selectedShop}
          editingCollection={editingCollection}
          onClose={() => {
            setActiveModal(null);
            setEditingCollection(null);
          }}
          onCollectionSubmitted={(col) => {
            setLastReceiptCollection(col);
            setActiveModal(null);
            setEditingCollection(null);
          }}
        />
      )}
      {activeModal === 'return' && (
        <ReturnForm
          shop={selectedShop}
          editingReturn={editingReturn}
          onClose={() => {
            setActiveModal(null);
            setEditingReturn(null);
          }}
          onReturnSubmitted={() => {
            setActiveModal(null);
            setEditingReturn(null);
          }}
        />
      )}
      {activeModal === 'new_shop' && (
        <NewCustomerForm
          onClose={() => setActiveModal(null)}
          onCreated={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'followup' && (
        <FollowUpForm
          shop={selectedShop}
          onClose={() => setActiveModal(null)}
          onSaved={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'eod' && (
        <EndOfDayCheckout onClose={() => setActiveModal(null)} />
      )}

      {/* ===== TODAY HISTORY MAIN SELECTION MODAL ===== */}
      {activeModal === 'today_history' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white p-4 relative flex-shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1 font-bold text-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>DASHBOARD</span>
                </button>
                <div>
                  <h2 className="text-lg font-black leading-tight">TODAY HISTORY</h2>
                  <p className="text-[10px] text-amber-300 font-bold">{todayDate} • Asia/Kolkata</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selection Options Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Select category to view today's activities:
              </p>

              {/* 1. MY ORDERS TODAY Card */}
              <div
                onClick={() => setActiveModal('today_orders')}
                className="bg-slate-50 hover:bg-amber-50/60 border-2 border-slate-200 hover:border-amber-400 p-4.5 rounded-2xl shadow-xs transition-all cursor-pointer active:scale-98 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase">MY ORDERS TODAY</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">View today's orders →</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] font-black text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md">
                        {todayOrders.length} Orders
                      </span>
                      <span className="text-[11px] font-bold text-slate-600">
                        {totalOrderKg} KG
                      </span>
                      <span className="text-[11px] font-black text-emerald-700">
                        ₹{totalOrderValue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-amber-700 transition-colors" />
              </div>

              {/* 2. MY COLLECTION TODAY Card */}
              <div
                onClick={() => setActiveModal('today_collections')}
                className="bg-slate-50 hover:bg-emerald-50/60 border-2 border-slate-200 hover:border-emerald-400 p-4.5 rounded-2xl shadow-xs transition-all cursor-pointer active:scale-98 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <IndianRupee className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase">MY COLLECTION TODAY</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">View today's collections →</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] font-black text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                        {todayCollections.length} Recoveries
                      </span>
                      <span className="text-[11px] font-black text-emerald-700">
                        ₹{totalCollectionValue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-emerald-700 transition-colors" />
              </div>

              {/* 3. MY RETURNS TODAY Card */}
              <div
                onClick={() => setActiveModal('today_returns')}
                className="bg-slate-50 hover:bg-red-50/60 border-2 border-slate-200 hover:border-red-400 p-4.5 rounded-2xl shadow-xs transition-all cursor-pointer active:scale-98 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <RotateCcw className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase">MY RETURNS TODAY</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">View today's returns →</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] font-black text-red-900 bg-red-100/80 px-2 py-0.5 rounded-md">
                        {todayReturns.length} Returns
                      </span>
                      <span className="text-[11px] font-bold text-slate-600">
                        {totalReturnKg} KG
                      </span>
                      <span className="text-[11px] font-black text-red-700">
                        ₹{totalReturnValue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-red-700 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MY ORDERS TODAY DETAIL LIST MODAL ===== */}
      {activeModal === 'today_orders' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-800 via-orange-800 to-red-900 text-white p-4 relative flex-shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('today_history')}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1 font-bold text-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>TODAY HISTORY</span>
                </button>
                <div>
                  <h2 className="text-base font-black leading-tight">MY ORDERS TODAY ({todayOrders.length})</h2>
                  <p className="text-[10px] text-amber-200 font-bold">{todayDate} • Total: ₹{totalOrderValue.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Orders List Body */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 text-slate-800">
              {todayOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No orders submitted yet today.</p>
                  <p className="text-xs text-slate-500">Tap below to take an order for a shop.</p>
                  <button
                    onClick={() => {
                      setActiveModal('order');
                    }}
                    className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    + Add New Order
                  </button>
                </div>
              ) : (
                todayOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 hover:border-amber-300 transition-all text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-black text-slate-900 text-sm block">{ord.shopName}</span>
                        {(ord.connectedMarketName || ord.marketName || ord.address) && (
                          <p className="text-[11px] text-amber-900 font-bold flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-red-600 flex-shrink-0" />
                            <span>{ord.connectedMarketName || ord.marketName || ord.address}</span>
                          </p>
                        )}
                        <span className="font-mono text-[10px] text-slate-400 font-bold block mt-0.5">
                          Inv #{ord.invoiceNo || ord.id} • {ord.time}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-700 text-sm block">
                          ₹{(ord.grandTotal || ord.totalValue || 0).toLocaleString('en-IN')}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 justify-end">
                          <button
                            type="button"
                            onClick={() => setViewingOrder(ord)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-all shadow-2xs border border-slate-200"
                            title="View Order Details"
                          >
                            <Eye className="w-3 h-3 text-slate-600" />
                            <span>View</span>
                          </button>
                          {ord.source !== 'OLD IMPORT' && ord.dataSource !== 'OLD IMPORT' && (
                            <button
                              type="button"
                              onClick={() => handleEditOrder(ord)}
                              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-all shadow-2xs border border-amber-200"
                              title="Edit Order"
                            >
                              <Edit className="w-3 h-3 text-amber-700" />
                              <span>Edit</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Items & Prices */}
                    <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-200/60">
                      {ord.items?.map((item, idx) => {
                        const isPouch = item.orderType === 'POUCH_10';
                        const rate = isPouch
                          ? (item.sellingPrice ?? item.unitPrice ?? 10)
                          : (item.pricePerKg ?? item.sellingPrice ?? item.unitPrice ?? 240);
                        return (
                          <span
                            key={idx}
                            className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-medium"
                          >
                            <strong>{item.productName}</strong> ({item.packSize || (isPouch ? '₹10 MRP' : '')}){' '}
                            {isPouch ? `${item.quantityPouch || 0} Pouches` : `${item.quantityKg ?? item.quantity ?? 0} KG`}{' '}
                            @ <span className="font-bold text-emerald-700">₹{rate}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MY COLLECTION TODAY DETAIL LIST MODAL ===== */}
      {activeModal === 'today_collections' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-950 text-white p-4 relative flex-shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('today_history')}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1 font-bold text-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>TODAY HISTORY</span>
                </button>
                <div>
                  <h2 className="text-base font-black leading-tight">MY COLLECTION TODAY ({todayCollections.length})</h2>
                  <p className="text-[10px] text-emerald-200 font-bold">{todayDate} • Total: ₹{totalCollectionValue.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Collections List Body */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 text-slate-800">
              {todayCollections.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <IndianRupee className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No payment collections recorded today.</p>
                  <p className="text-xs text-slate-500">Tap below to record payment collection from a shop.</p>
                  <button
                    onClick={() => {
                      setActiveModal('collection');
                    }}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    + Record Collection
                  </button>
                </div>
              ) : (
                todayCollections.map((col) => {
                  const shopObj = shops.find((s) => s.id === col.shopId);
                  return (
                    <div
                      key={col.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 hover:border-emerald-300 transition-all text-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-slate-900 text-sm block">{col.shopName}</span>
                          {(col.connectedMarketName || col.marketName || shopObj?.connectedMarketName || shopObj?.marketName) && (
                            <p className="text-[11px] text-emerald-900 font-bold flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-emerald-700 flex-shrink-0" />
                              <span>{col.connectedMarketName || col.marketName || shopObj?.connectedMarketName || shopObj?.marketName}</span>
                            </p>
                          )}
                          <span className="font-mono text-[10px] text-slate-400 font-bold block mt-0.5">
                            {col.receiptNumber ? `Rec #${col.receiptNumber} • ` : (col.refNo ? `Ref #${col.refNo} • ` : '')}{col.time || col.createdTime || 'Today'}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-black text-emerald-700 text-base block">
                            ₹{(col.amount || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-200 mt-1">
                            {col.paymentMode || 'Cash'}
                          </span>
                        </div>
                      </div>

                      {/* Notes & View/Edit Actions */}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                        <span className="text-[11px] text-slate-500 italic">
                          {col.remark || 'Payment received'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setLastReceiptCollection(col)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-slate-200 shadow-2xs"
                            title="View Receipt"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>View</span>
                          </button>
                          {col.source !== 'OLD IMPORT' && col.dataSource !== 'OLD IMPORT' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCollection(col);
                                setActiveModal('collection');
                              }}
                              className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-emerald-200 shadow-2xs"
                              title="Edit Collection"
                            >
                              <Edit className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Edit</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MY RETURNS TODAY DETAIL LIST MODAL ===== */}
      {activeModal === 'today_returns' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-900 via-rose-900 to-amber-950 text-white p-4 relative flex-shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('today_history')}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1 font-bold text-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>TODAY HISTORY</span>
                </button>
                <div>
                  <h2 className="text-base font-black leading-tight">MY RETURNS TODAY ({todayReturns.length})</h2>
                  <p className="text-[10px] text-red-200 font-bold">{todayDate} • Total: ₹{totalReturnValue.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Return Total Summary Banner (Section 7) */}
            <div className="p-3.5 bg-slate-900 text-white border-b border-slate-800 flex-shrink-0">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">TOTAL RETURNS</span>
                  <span className="text-sm font-black text-white mt-0.5 block">{todayReturns.length} Returns</span>
                </div>
                <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">TOTAL QUANTITY</span>
                  <span className="text-sm font-black text-amber-400 mt-0.5 block">{totalReturnKg} KG</span>
                </div>
                <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">TOTAL VALUE</span>
                  <span className="text-sm font-black text-red-400 mt-0.5 block">₹{totalReturnValue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Returns List Body */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 text-slate-800">
              {todayReturns.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <RotateCcw className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No returns recorded today.</p>
                  <p className="text-xs text-slate-500">Tap below to record stock return from a shop.</p>
                  <button
                    onClick={() => {
                      setEditingReturn(null);
                      setActiveModal('return');
                    }}
                    className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    + Record Return
                  </button>
                </div>
              ) : (
                todayReturns.map((ret) => {
                  const shopObj = shops.find((s) => s.id === ret.shopId);
                  const retKg = ret.returnKg ?? ret.quantity ?? 0;
                  return (
                    <div
                      key={ret.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 hover:border-red-300 transition-all text-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-slate-900 text-sm block">{ret.shopName}</span>
                          {(ret.connectedMarketName || ret.marketName || shopObj?.connectedMarketName || shopObj?.marketName) && (
                            <p className="text-[11px] text-red-900 font-bold flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-red-600 flex-shrink-0" />
                              <span>{ret.connectedMarketName || ret.marketName || shopObj?.connectedMarketName || shopObj?.marketName}</span>
                            </p>
                          )}
                          <span className="font-mono text-[10px] text-slate-400 font-bold block mt-0.5">
                            Return #{ret.id} • {ret.time || ret.createdTime || 'Today'}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-black text-red-700 text-sm block">
                            ₹{(ret.returnValue || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[11px] font-extrabold text-slate-700 block mt-0.5">
                            {retKg} KG
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 justify-end">
                            <button
                              type="button"
                              onClick={() => setViewingReturn(ret)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-all shadow-2xs border border-slate-200"
                              title="View Return Details"
                            >
                              <Eye className="w-3 h-3 text-slate-600" />
                              <span>View</span>
                            </button>
                            {ret.source !== 'OLD IMPORT' && ret.dataSource !== 'OLD IMPORT' && (
                              <button
                                type="button"
                                onClick={() => handleEditReturn(ret)}
                                className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-all shadow-2xs border border-red-200"
                                title="Edit Return"
                              >
                                <Edit className="w-3 h-3 text-red-700" />
                                <span>Edit</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Return Product & Reason */}
                      <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-extrabold text-slate-900">
                            {ret.productName || 'Spices Product'} ({ret.packSize || 'Standard'})
                          </span>
                          <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[10px]">
                            {ret.reason || 'Old Stock'}
                          </span>
                        </div>
                        {(ret.remark || ret.notes) && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5">
                            Note: {ret.remark || ret.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== FULL ORDER DETAIL / INVOICE VIEW MODAL ===== */}
      {viewingOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white p-4.5 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">ORDER INVOICE DETAILS</p>
                <h2 className="text-lg font-black font-mono">{viewingOrder.id}</h2>
                <p className="text-xs text-slate-300">
                  {viewingOrder.date} • {viewingOrder.time}
                </p>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Shop Name</span>
                  <span className="font-bold text-slate-900 text-sm">{viewingOrder.shopName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Market / Route</span>
                  <span className="font-bold text-slate-800">{viewingOrder.connectedMarketName || viewingOrder.marketName || '—'}</span>
                </div>
              </div>

              <div>
                <h3 className="font-black text-slate-900 text-xs uppercase mb-2">Ordered Products Breakdown</h3>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-amber-300 uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Product</th>
                        <th className="p-2.5">Pack</th>
                        <th className="p-2.5 text-right">Quantity (KG)</th>
                        <th className="p-2.5 text-right">Rate</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {viewingOrder.items?.map((item, idx) => {
                        const isPouch = item.orderType === 'POUCH_10';
                        const rate = isPouch
                          ? (item.sellingPrice ?? item.unitPrice ?? 10)
                          : (item.pricePerKg ?? item.sellingPrice ?? item.unitPrice ?? 240);
                        const qtyText = isPouch
                          ? `${item.quantityPouch || item.quantity || 0} Pouches`
                          : `${item.quantityKg ?? item.quantity ?? 0} KG`;
                        const sub = item.subtotal != null
                          ? item.subtotal
                          : isPouch
                            ? (item.quantityPouch || item.quantity || 0) * rate
                            : (item.quantityKg || 0) * rate;

                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-extrabold text-slate-900">{item.productName}</td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 font-bold rounded text-[10px]">
                                {item.packSize || (isPouch ? '₹10 MRP' : 'Standard')}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-800">{qtyText}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-700">
                              ₹{rate} {isPouch ? '/pouch' : '/KG'}
                            </td>
                            <td className="p-2.5 text-right font-black text-slate-900">
                              ₹{sub.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal:</span>
                  <span className="font-bold text-white">₹{(viewingOrder.subtotal || viewingOrder.grandTotal || 0).toLocaleString('en-IN')}</span>
                </div>
                {viewingOrder.gstAmount > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>GST:</span>
                    <span className="font-bold">₹{viewingOrder.gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-white pt-1.5 border-t border-slate-800">
                  <span>Grand Total:</span>
                  <span className="text-amber-400">₹{(viewingOrder.grandTotal || viewingOrder.totalValue || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {viewingOrder.source !== 'OLD IMPORT' && viewingOrder.dataSource !== 'OLD IMPORT' && (
                  <button
                    onClick={() => {
                      const ordToEdit = viewingOrder;
                      setViewingOrder(null);
                      handleEditOrder(ordToEdit);
                    }}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit This Order</span>
                  </button>
                )}
                <button
                  onClick={() => setViewingOrder(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== FULL RETURN DETAIL VIEW MODAL ===== */}
      {viewingReturn && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-red-900 via-rose-900 to-amber-950 text-white p-4.5 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">RETURN TRANSACTION DETAILS</p>
                <h2 className="text-lg font-black font-mono">{viewingReturn.id}</h2>
                <p className="text-xs text-slate-300">
                  {viewingReturn.date} • {viewingReturn.time}
                </p>
              </div>
              <button
                onClick={() => setViewingReturn(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Shop Name</span>
                  <span className="font-bold text-slate-900 text-sm">{viewingReturn.shopName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Market / Route</span>
                  <span className="font-bold text-slate-800">{viewingReturn.connectedMarketName || viewingReturn.marketName || '—'}</span>
                </div>
              </div>

              {/* Product Details */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Product</span>
                  <span className="font-extrabold text-slate-900 text-sm">{viewingReturn.productName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Pack Size</span>
                  <span className="font-bold text-slate-800">{viewingReturn.packSize || 'Standard'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Return Quantity</span>
                  <span className="font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                    {viewingReturn.returnKg ?? viewingReturn.quantity ?? 0} KG
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Return Value</span>
                  <span className="font-black text-red-700 text-base">
                    ₹{(viewingReturn.returnValue || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Reason & Remark */}
              <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-amber-900 font-extrabold text-[10px] uppercase">Reason:</span>
                  <span className="font-black text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md text-[10px]">
                    {viewingReturn.reason || 'Old Stock'}
                  </span>
                </div>
                {(viewingReturn.remark || viewingReturn.notes) && (
                  <div>
                    <span className="text-amber-900 font-bold text-[10px] uppercase block">Remark / Notes:</span>
                    <p className="text-xs text-amber-950 italic mt-0.5">{viewingReturn.remark || viewingReturn.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {viewingReturn.source !== 'OLD IMPORT' && viewingReturn.dataSource !== 'OLD IMPORT' && (
                  <button
                    onClick={() => {
                      const retToEdit = viewingReturn;
                      setViewingReturn(null);
                      handleEditReturn(retToEdit);
                    }}
                    className="flex-1 py-3 bg-red-700 hover:bg-red-800 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit This Return</span>
                  </button>
                )}
                <button
                  onClick={() => setViewingReturn(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shareable Receipt Modal */}
      {lastReceiptCollection && (
        <ReceiptModal
          collection={lastReceiptCollection}
          onClose={() => setLastReceiptCollection(null)}
        />
      )}
    </>
  );
}
