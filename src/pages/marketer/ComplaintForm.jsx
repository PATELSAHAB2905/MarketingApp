import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { AlertTriangle, X, Camera } from 'lucide-react';

export default function ComplaintForm({ shop, onClose }) {
  const { currentUser } = useAuth();
  const { shops, getFormattedDate, getFormattedTime, getTodayMarket, addComplaint } = useData();

  const [selectedShopId, setSelectedShopId] = useState(shop ? shop.id : (shops[0]?.id || ''));
  const targetShop = shops.find((s) => s.id === selectedShopId) || shop || shops[0];

  const [complaintType, setComplaintType] = useState('Product Quality');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const todayDate = getFormattedDate();
  const todayMarket = getTodayMarket(currentUser?.id, todayDate);

  const complaintTypes = [
    'Product Quality',
    'Packing',
    'Rate',
    'Delivery',
    'Short Quantity',
    'Damaged',
    'Return',
    'Other',
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetShop) return;

    setSubmitting(true);
    setTimeout(() => {
      addComplaint({
        shopId: targetShop.id,
        shopName: targetShop.name,
        marketId: targetShop.marketId || todayMarket?.marketId || 'mkt-pachore',
        marketerId: currentUser?.id,
        marketerName: currentUser?.name,
        date: todayDate,
        time: getFormattedTime(),
        complaintType,
        remark,
      });

      setSubmitting(false);
      alert('Complaint logged successfully for Management resolution!');
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        <div className="bg-gradient-to-r from-red-800 to-rose-900 text-white p-5 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-xs text-rose-300 font-bold uppercase tracking-wider">RETAILER COMPLAINT</p>
          <h2 className="text-2xl font-black mt-0.5">LOG COMPLAINT</h2>
          <p className="text-xs text-rose-100 font-medium">Patel Sahab Spices • Quality & Service Feedback</p>
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
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Complaint Category</label>
            <div className="grid grid-cols-2 gap-2">
              {complaintTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setComplaintType(type)}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    complaintType === type
                      ? 'bg-red-50 border-red-500 text-red-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Short Remark / Description</label>
            <textarea
              rows={3}
              required
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Retailer complained Mirchi batch 500g pouch sealing missing on 2 packets"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-red-700 to-rose-900 text-white rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
          >
            {submitting ? 'LOGGING COMPLAINT...' : 'SUBMIT COMPLAINT ✓'}
          </button>
        </form>
      </div>
    </div>
  );
}
