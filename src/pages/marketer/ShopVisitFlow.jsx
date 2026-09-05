import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/common/StatusBadge';
import ShopHistoryModal from '../../components/common/ShopHistoryModal';
import ShopPhotoCapture from '../../components/common/ShopPhotoCapture';
import {
  ArrowLeft,
  Home,
  Play,
  CheckCircle2,
  Phone,
  MapPin,
  IndianRupee,
  ShoppingBag,
  RotateCcw,
  Clock,
  AlertTriangle,
  X,
  FileText,
} from 'lucide-react';

export default function ShopVisitFlow({
  shop,
  onClose,
  onGoHome,
  onOpenOrder,
  onOpenCollection,
  onOpenReturn,
  onOpenFollowup,
}) {
  const { currentUser } = useAuth();
  const { getFormattedDate, getFormattedTime, getTodayMarket, addShopVisit } = useData();

  const [visitStarted, setVisitStarted] = useState(false);
  const [visitTime, setVisitTime] = useState(null);
  const [selectedOutcomes, setSelectedOutcomes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'back_shops' or 'go_home'

  const todayDate = getFormattedDate();
  const todayMarket = getTodayMarket(currentUser?.id, todayDate);

  // Browser / Mobile Device Back Button Listener
  useEffect(() => {
    window.history.pushState({ shopVisitOpen: true }, '');

    const handlePopState = (e) => {
      if (visitStarted && selectedOutcomes.length > 0) {
        setPendingAction('back_shops');
        setShowUnsavedPrompt(true);
      } else {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [visitStarted, selectedOutcomes]);

  const handleBackToShops = () => {
    if (visitStarted && selectedOutcomes.length > 0) {
      setPendingAction('back_shops');
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  const handleGoHomeClick = () => {
    if (visitStarted && selectedOutcomes.length > 0) {
      setPendingAction('go_home');
      setShowUnsavedPrompt(true);
    } else {
      if (onGoHome) onGoHome();
      else onClose();
    }
  };

  const handleConfirmLeave = () => {
    setShowUnsavedPrompt(false);
    if (pendingAction === 'go_home' && onGoHome) {
      onGoHome();
    } else {
      onClose();
    }
  };

  const outcomesList = [
    { id: 'Order Received', label: 'Order Received', icon: ShoppingBag, color: 'text-amber-600' },
    { id: 'Payment Collected', label: 'Payment Collected', icon: IndianRupee, color: 'text-emerald-600' },
    { id: 'Return Received', label: 'Return Received', icon: RotateCcw, color: 'text-red-600' },
    { id: 'Follow-up Required', label: 'Follow-up Required', icon: Clock, color: 'text-blue-600' },
    { id: 'No Order', label: 'No Order Needed Today', icon: CheckCircle2, color: 'text-slate-500' },
    { id: 'Shop Closed', label: 'Shop Closed', icon: AlertTriangle, color: 'text-slate-500' },
    { id: 'Owner Unavailable', label: 'Owner Not Available', icon: AlertTriangle, color: 'text-slate-500' },
  ];

  const toggleOutcome = (outcomeId) => {
    if (selectedOutcomes.includes(outcomeId)) {
      setSelectedOutcomes(selectedOutcomes.filter((o) => o !== outcomeId));
    } else {
      setSelectedOutcomes([...selectedOutcomes, outcomeId]);
    }
  };

  const handleStartVisit = () => {
    setVisitTime(getFormattedTime());
    setVisitStarted(true);
  };

  const handleFinishVisit = () => {
    setSubmitting(true);
    setTimeout(() => {
      addShopVisit({
        shopId: shop.id,
        shopName: shop.name,
        marketId: shop.marketId,
        marketerId: currentUser?.id,
        marketerName: currentUser?.name,
        date: todayDate,
        time: visitTime || getFormattedTime(),
        outcomes: selectedOutcomes.length ? selectedOutcomes : ['Visited'],
        gpsLocation: { lat: shop.lat || 23.7021, lng: shop.lng || 76.7112 },
      });
      setSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        
        {/* HEADER WITH PROMINENT NAVIGATION BUTTONS (← SHOPS & 🏠 DASHBOARD) */}
        <div className="bg-gradient-to-r from-red-900 via-red-800 to-amber-900 text-white p-4 relative flex-shrink-0 space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleBackToShops}
                className="py-1 px-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all flex items-center gap-1 font-black text-xs border border-white/20"
                title="Back to Shops List"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
                <span>SHOPS</span>
              </button>

              <button
                type="button"
                onClick={handleGoHomeClick}
                className="py-1 px-2.5 rounded-full bg-amber-400 hover:bg-amber-500 active:scale-95 text-red-950 transition-all flex items-center gap-1 font-black text-xs shadow-xs"
                title="Go to Home Dashboard"
              >
                <Home className="w-3.5 h-3.5" />
                <span>DASHBOARD</span>
              </button>
            </div>

            <StatusBadge status={shop.status || 'Customer'} type="shop" />
          </div>

          <div>
            <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">
              SHOP VISIT • {todayMarket?.marketName || 'Pachore'}
            </span>
            <h2 className="text-xl font-black text-white mt-0.5">{shop.name}</h2>
            <p className="text-xs text-red-200 font-medium flex items-center gap-2 mt-0.5">
              <span>Owner: <strong>{shop.owner}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-amber-300" />
                {shop.mobile}
              </span>
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {/* Shop Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Outstanding</span>
              <span className={`font-extrabold text-sm ${shop.outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                ₹{(shop.outstanding || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Last Order</span>
              <span className="font-bold text-slate-800 text-sm">
                {shop.lastOrderKg ? `${shop.lastOrderKg} KG` : 'None'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Last Visit</span>
              <span className="font-medium text-slate-700 text-xs">
                {shop.lastVisitDate || 'Never'}
              </span>
            </div>
          </div>

          {/* VIEW PAST SHOP HISTORY & RATES BUTTON */}
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-amber-300 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border border-slate-800 shadow-xs active:scale-98 transition-all"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>VIEW PAST PURCHASE & PAYMENT HISTORY 📜</span>
          </button>

          {!visitStarted ? (
            <div className="space-y-4 pt-1">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center gap-3">
                <MapPin className="w-6 h-6 text-amber-700 flex-shrink-0" />
                <div className="text-xs text-amber-900">
                  <p className="font-bold">GPS Location Verified</p>
                  <p className="text-amber-700">{shop.address || 'Main Market, Pachore'}</p>
                </div>
              </div>

              <button
                onClick={handleStartVisit}
                className="w-full py-4 bg-gradient-to-r from-red-700 via-red-800 to-amber-700 text-white rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 transform active:scale-95 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                START SHOP VISIT
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex justify-between items-center text-xs font-bold text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  VISIT IN PROGRESS
                </span>
                <span>Started: {visitTime}</span>
              </div>

              {/* Direct Transaction Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onOpenOrder}
                  className="p-3 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-2xl text-left flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-black text-amber-900">TAKE ORDER</p>
                    <p className="text-[11px] text-amber-700">Add spice products</p>
                  </div>
                  <ShoppingBag className="w-5 h-5 text-amber-700" />
                </button>
                <button
                  onClick={onOpenCollection}
                  className="p-3 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-2xl text-left flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-black text-emerald-900">COLLECTION</p>
                    <p className="text-[11px] text-emerald-700">Collect payment</p>
                  </div>
                  <IndianRupee className="w-5 h-5 text-emerald-700" />
                </button>
                <button
                  onClick={onOpenReturn}
                  className="p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-2xl text-left flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-black text-slate-800">RECORD RETURN</p>
                    <p className="text-[11px] text-slate-500">Old/damaged stock</p>
                  </div>
                  <RotateCcw className="w-5 h-5 text-slate-600" />
                </button>
                <button
                  onClick={onOpenFollowup}
                  className="p-3 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-2xl text-left flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-black text-blue-900">FOLLOW-UP</p>
                    <p className="text-[11px] text-blue-700">Schedule visit</p>
                  </div>
                  <Clock className="w-5 h-5 text-blue-700" />
                </button>
              </div>

              {/* Select Outcomes */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">WHAT HAPPENED IN VISIT?</p>
                <div className="grid grid-cols-2 gap-2">
                  {outcomesList.map((item) => {
                    const isSelected = selectedOutcomes.includes(item.id);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleOutcome(item.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 text-left transition-all ${
                          isSelected
                            ? 'bg-red-50 border-red-500 text-red-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${item.color}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 📷 SHOP PHOTO (Available strictly after Start Shop Visit) */}
              <div className="pt-2 border-t border-slate-200">
                <ShopPhotoCapture shop={shop} />
              </div>

              <button
                onClick={handleFinishVisit}
                disabled={submitting}
                className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-sm shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
              >
                {submitting ? 'SAVING VISIT...' : 'COMPLETE SHOP VISIT ✓'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* UNSAVED DATA PROTECTION DIALOG */}
      {showUnsavedPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full space-y-4 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
            <div>
              <h3 className="font-black text-slate-900 text-lg">UNSAVED CHANGES</h3>
              <p className="text-xs text-slate-500 mt-1">
                You have entered visit information that has not been saved yet.
              </p>
            </div>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => setShowUnsavedPrompt(false)}
                className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl"
              >
                CONTINUE EDITING
              </button>
              <button
                onClick={handleConfirmLeave}
                className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl"
              >
                LEAVE WITHOUT SAVING
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shop History Modal */}
      {showHistoryModal && (
        <ShopHistoryModal
          shop={shop}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
}
