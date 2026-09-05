import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  IndianRupee,
  CreditCard,
  X,
  CheckCircle2,
  Share2,
  Clock,
  ShieldCheck,
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';

export default function CollectionForm({ shop, editingCollection, onClose, onCollectionSubmitted }) {
  const { currentUser } = useAuth();
  const { shops, creditPolicy, getFormattedDate, getFormattedTime, getTodayMarket, addCollection, updateCollection } = useData();

  const [selectedShopId, setSelectedShopId] = useState(
    editingCollection ? editingCollection.shopId : (shop ? shop.id : (shops[0]?.id || ''))
  );
  const targetShop = shops.find((s) => s.id === selectedShopId) || shop || shops[0];

  const [amount, setAmount] = useState(
    editingCollection ? editingCollection.amount : (targetShop?.outstanding || 5000)
  );
  const [paymentMode, setPaymentMode] = useState(editingCollection?.paymentMode || 'Cash');
  const [invoiceRef, setInvoiceRef] = useState(
    editingCollection?.invoiceRef || editingCollection?.refNo || 'INV-2026-084'
  );
  const [remark, setRemark] = useState(editingCollection?.remark || '');
  const [slipPhoto, setSlipPhoto] = useState(editingCollection?.slipPhoto || null); // base64 string
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const todayDate = getFormattedDate();
  const todayMarket = getTodayMarket(currentUser?.id, todayDate);

  const paymentModes = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'];

  const previousOutstanding = targetShop?.outstanding || 0;
  const remainingOutstanding = Math.max(0, previousOutstanding - (Number(amount) || 0));

  // 21-Day Payment Credit Policy Status (Rule 11)
  const invoiceDate = targetShop?.lastOrderDate || '01-08-2026';

  const handlePhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setSlipPhoto(uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!targetShop) return;
    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid collection amount');
      return;
    }

    if (editingCollection) {
      setShowConfirmModal(true);
    } else {
      executeSave();
    }
  };

  const executeSave = () => {
    setShowConfirmModal(false);
    setSubmitting(true);

    setTimeout(() => {
      let collectionRecord = null;
      if (editingCollection) {
        collectionRecord = updateCollection(editingCollection.id, {
          shopId: targetShop.id,
          shopName: targetShop.name,
          marketId: targetShop.marketId || editingCollection.marketId || todayMarket?.marketId || 'mkt-pachore',
          marketerId: currentUser?.id,
          marketerName: currentUser?.name,
          date: editingCollection.date || todayDate,
          time: getFormattedTime(),
          invoiceRef,
          previousOutstanding: editingCollection.previousOutstanding || previousOutstanding,
          amount: Number(amount),
          remainingOutstanding,
          paymentMode,
          slipPhoto,
          remark,
        });
      } else {
        collectionRecord = addCollection({
          shopId: targetShop.id,
          shopName: targetShop.name,
          marketId: targetShop.marketId || todayMarket?.marketId || 'mkt-pachore',
          marketerId: currentUser?.id,
          marketerName: currentUser?.name,
          date: todayDate,
          time: getFormattedTime(),
          invoiceRef,
          previousOutstanding,
          amount: Number(amount),
          remainingOutstanding,
          paymentMode,
          slipPhoto, // Uploaded Physical Collection Slip Photo
          remark,
        });
      }

      setSubmitting(false);
      if (onCollectionSubmitted) onCollectionSubmitted(collectionRecord);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white p-5 relative flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-xs text-emerald-300 font-bold uppercase tracking-wider">
            {editingCollection ? 'EDIT PAYMENT RECOVERY' : 'PAYMENT RECOVERY'}
          </p>
          <h2 className="text-2xl font-black mt-0.5">
            {editingCollection ? `EDIT COLLECTION: ${editingCollection.receiptNumber || editingCollection.id}` : 'COLLECT PAYMENT'}
          </h2>
          <p className="text-xs text-emerald-100 font-medium">{targetShop?.name || 'Shop'}</p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800 pb-20">
          {/* Shop Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Select Shop</label>
            <select
              value={selectedShopId}
              onChange={(e) => {
                const sid = e.target.value;
                setSelectedShopId(sid);
                const s = shops.find((sh) => sh.id === sid);
                if (s) setAmount(s.outstanding || 5000);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-bold text-slate-800"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Due: ₹{(s.outstanding || 0).toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          {/* 21-Day Payment Credit Policy Status */}
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-2 border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="text-amber-400 font-bold uppercase flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                21-DAY CREDIT POLICY STATUS
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-semibold text-[10px]">
                Within 21-Day Period
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 border-t border-slate-800 pt-2">
              <div>
                <span className="text-slate-400 block text-[10px]">Invoice Date:</span>
                <span className="font-bold">{invoiceDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Due Date (21 Days):</span>
                <span className="font-bold text-amber-200">22-08-2026</span>
              </div>
            </div>
          </div>

          {/* Outstanding Summary Breakdown */}
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between text-emerald-900">
              <span>Invoice Reference:</span>
              <span className="font-bold">{invoiceRef}</span>
            </div>
            <div className="flex justify-between text-emerald-900">
              <span>Previous Shop Outstanding:</span>
              <span className="font-black text-slate-900">₹{previousOutstanding.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-emerald-900 pt-1 border-t border-emerald-200">
              <span>Remaining Outstanding After Collection:</span>
              <span className="font-black text-emerald-700 text-sm">₹{remainingOutstanding.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Collection Amount Entry */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Amount Collected (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-xl font-black text-slate-400">₹</span>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000"
                className="w-full bg-white border-2 border-emerald-500 rounded-2xl py-3 pl-9 pr-4 text-xl font-black text-slate-900 focus:ring-2 focus:ring-emerald-600 shadow-xs"
              />
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Payment Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {paymentModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold transition-all ${
                    paymentMode === mode
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* PHYSICAL COLLECTION SLIP / RECEIPT PHOTO UPLOAD */}
          <div className="space-y-2 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-700" />
                Physical Collection Slip Photo
              </label>
              <span className="text-[10px] font-semibold text-slate-400">Optional / Verification</span>
            </div>

            {slipPhoto ? (
              <div className="relative rounded-2xl overflow-hidden border border-emerald-300 bg-black/5 p-2 flex items-center justify-between">
                <img
                  src={slipPhoto}
                  alt="Collection Slip"
                  className="w-16 h-16 object-cover rounded-xl border border-white shadow-xs"
                />
                <div className="flex-1 px-3">
                  <p className="text-xs font-bold text-emerald-800">Slip Photo Captured ✓</p>
                  <p className="text-[10px] text-slate-500">Will be verified in Management Dashboard</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSlipPhoto(null)}
                  className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl"
                  title="Remove photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {/* Camera Direct Button */}
                <label className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 font-bold text-xs cursor-pointer active:scale-95 transition-all">
                  <Camera className="w-4 h-4 text-emerald-700" />
                  <span>Take Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                </label>

                {/* Upload Gallery Button */}
                <label className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer active:scale-95 transition-all">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Remark / Ref */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Transaction Reference / Remark
            </label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Physical Slip #402 / Cash handed over / UPI Ref"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-medium"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 text-white rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
          >
            {submitting
              ? (editingCollection ? 'SAVING CHANGES...' : 'RECORDING COLLECTION...')
              : (editingCollection ? 'SAVE CHANGES ✓' : 'RECORD COLLECTION ✓')}
          </button>
        </form>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-xs w-full space-y-4 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 uppercase">Save Changes?</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Are you sure you want to update this transaction?
                </p>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 text-left mt-2">
                  <p>Shop: <strong>{targetShop?.name}</strong></p>
                  <p>New Amount: <strong className="text-emerald-700">₹{Number(amount).toLocaleString('en-IN')}</strong></p>
                  <p>Mode: <strong>{paymentMode}</strong></p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeSave}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
