import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Clock, X, Calendar } from 'lucide-react';

export default function FollowUpForm({ shop, onClose, onSaved }) {
  const { currentUser } = useAuth();
  const { shops, getFormattedDate, getFormattedTime, getTodayMarket, addFollowup } = useData();

  const [selectedShopId, setSelectedShopId] = useState(shop ? shop.id : (shops[0]?.id || ''));
  const targetShop = shops.find((s) => s.id === selectedShopId) || shop || shops[0];

  const todayDate = getFormattedDate();
  const todayMarket = getTodayMarket(currentUser?.id, todayDate);

  const [followUpDate, setFollowUpDate] = useState('25-08-2026');
  const [reason, setReason] = useState('Payment Recovery & Next Order');
  const [expectedOrderKg, setExpectedOrderKg] = useState(25);
  const [expectedCollection, setExpectedCollection] = useState(5200);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetShop) return;

    setSubmitting(true);
    setTimeout(() => {
      const createdFlw = addFollowup({
        shopId: targetShop.id,
        shopName: targetShop.name,
        marketId: targetShop.marketId || todayMarket?.marketId || 'mkt-pachore',
        marketerId: currentUser?.id,
        marketerName: currentUser?.name,
        followUpDate,
        reason,
        expectedOrderKg: Number(expectedOrderKg),
        expectedCollection: Number(expectedCollection),
        remark,
      });

      setSubmitting(false);
      alert('FOLLOW-UP ADDED ✓\nWill appear automatically on scheduled date!');
      if (onSaved) onSaved(createdFlw);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        <div className="bg-gradient-to-r from-blue-800 via-indigo-800 to-slate-900 text-white p-5 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-xs text-blue-300 font-bold uppercase tracking-wider">FOLLOW-UP SYSTEM</p>
          <h2 className="text-2xl font-black mt-0.5">SCHEDULE FOLLOW-UP</h2>
          <p className="text-xs text-blue-200 font-medium">Patel Sahab Spices • Reminders</p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Select Shop</label>
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-bold text-slate-800"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.owner})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Follow-up Date (DD-MM-YYYY)</label>
            <input
              type="text"
              required
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              placeholder="25-08-2026"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Follow-up Reason</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Owner requested call next Monday for cheque payment"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Expected Order (KG)</label>
              <input
                type="number"
                value={expectedOrderKg}
                onChange={(e) => setExpectedOrderKg(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Expected Collection (₹)</label>
              <input
                type="number"
                value={expectedCollection}
                onChange={(e) => setExpectedCollection(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Remark</label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Bring 500g Haldi sample pack"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
          >
            {submitting ? 'SAVING...' : 'SAVE FOLLOW-UP ✓'}
          </button>
        </form>
      </div>
    </div>
  );
}
