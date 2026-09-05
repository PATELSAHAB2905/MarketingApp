import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { MessageSquare, X } from 'lucide-react';

export default function MarketFeedbackForm({ onClose }) {
  const { currentUser } = useAuth();
  const { getFormattedDate, getFormattedTime, getTodayMarket, addMarketFeedback } = useData();

  const todayDate = getFormattedDate();
  const todayMarket = getTodayMarket(currentUser?.id, todayDate);

  const [competitorActivity, setCompetitorActivity] = useState('Normal');
  const [productDemand, setProductDemand] = useState('High');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      addMarketFeedback({
        marketerId: currentUser?.id,
        marketerName: currentUser?.name,
        marketId: todayMarket?.marketId || 'mkt-pachore',
        marketName: todayMarket?.marketName || 'Pachore',
        date: todayDate,
        time: getFormattedTime(),
        competitorActivity,
        productDemand,
        remark,
      });

      setSubmitting(false);
      alert('MARKET FEEDBACK SUBMITTED ✓');
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-xs text-blue-300 font-bold uppercase tracking-wider">MARKET FEEDBACK</p>
          <h2 className="text-2xl font-black mt-0.5">FIELD MARKET REPORT</h2>
          <p className="text-xs text-blue-200 font-medium">{todayMarket?.marketName || 'Pachore'} Market</p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Competitor Activity</label>
            <div className="grid grid-cols-3 gap-2">
              {['Normal', 'Increased', 'Decreased'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setCompetitorActivity(opt)}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-bold ${
                    competitorActivity === opt
                      ? 'bg-blue-800 text-white border-blue-800 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Spice Product Demand</label>
            <div className="grid grid-cols-3 gap-2">
              {['High', 'Normal', 'Low'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setProductDemand(opt)}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-bold ${
                    productDemand === opt
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Anything Important / Remarks</label>
            <textarea
              rows={3}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Local competitor lowered 500g Haldi rate by ₹5/kg. Retailer demand high for 1kg Garam Masala."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
          >
            {submitting ? 'SUBMITTING...' : 'SUBMIT FEEDBACK ✓'}
          </button>
        </form>
      </div>
    </div>
  );
}
