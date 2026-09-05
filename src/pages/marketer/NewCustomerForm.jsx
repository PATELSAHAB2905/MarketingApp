import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { UserPlus, X, MapPin, CheckCircle2 } from 'lucide-react';

export default function NewCustomerForm({ onClose, onCreated }) {
  const { currentUser } = useAuth();
  const { markets, getFormattedDate, getTodayMarket, addNewShop } = useData();

  const todayDate = getFormattedDate();
  const todayMarket = getTodayMarket(currentUser?.id, todayDate);

  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [marketId, setMarketId] = useState(todayMarket?.marketId || 'mkt-pachore');
  const [isLead, setIsLead] = useState(true);
  const [expectedOrder, setExpectedOrder] = useState('20 KG Mirchi/Haldi');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !owner || !mobile) {
      alert('Please fill shop name, owner name and mobile number');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const newShopRecord = addNewShop({
        name,
        owner,
        mobile,
        address: address || `${todayMarket?.marketName || 'Main Market'} Road`,
        marketId,
        isLead,
        expectedOrder,
        remark,
        createdByMarketerId: currentUser?.id,
        createdDate: todayDate,
      });

      setSubmitting(false);
      if (onCreated) onCreated(newShopRecord);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-5 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-xs text-purple-300 font-bold uppercase tracking-wider">NEW ONBOARDING</p>
          <h2 className="text-2xl font-black mt-0.5">ADD NEW CUSTOMER / LEAD</h2>
          <p className="text-xs text-purple-200 font-medium">Patel Sahab Spices • Market Expansion</p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Shop Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vikas Kirana Bhandar"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Owner Name *</label>
              <input
                type="text"
                required
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Vikas Soni"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="98260XXXXX"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Market Location</label>
            <select
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold"
            >
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.district})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Address / Landmark</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Bus Stand Road, Pachore"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium"
            />
          </div>

          <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 space-y-2">
            <p className="text-xs font-bold text-purple-900 uppercase">Status Allocation</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsLead(true)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold ${
                  isLead ? 'bg-purple-700 text-white shadow-xs' : 'bg-white text-purple-800 border border-purple-200'
                }`}
              >
                Lead (Potential)
              </button>
              <button
                type="button"
                onClick={() => setIsLead(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold ${
                  !isLead ? 'bg-purple-700 text-white shadow-xs' : 'bg-white text-purple-800 border border-purple-200'
                }`}
              >
                Direct Customer
              </button>
            </div>
            <p className="text-[11px] text-purple-700 italic">
              {isLead
                ? 'Lead status will automatically convert to Customer on first confirmed order!'
                : 'Customer status created immediately.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-purple-800 to-indigo-900 text-white rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
          >
            {submitting ? 'ONBOARDING NEW SHOP...' : 'SAVE NEW CUSTOMER ✓'}
          </button>
        </form>
      </div>
    </div>
  );
}
