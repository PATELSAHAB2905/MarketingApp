import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { RotateCcw, AlertTriangle, X, CheckCircle2, Edit } from 'lucide-react';

export default function ReturnForm({ shop, editingReturn = null, onClose, onReturnSubmitted }) {
  const { currentUser } = useAuth();
  const { products, shops, getFormattedDate, getFormattedTime, getTodayMarket, addReturn, updateReturn } = useData();

  const [selectedShopId, setSelectedShopId] = useState(
    editingReturn?.shopId || (shop ? shop.id : (shops[0]?.id || ''))
  );
  const targetShop = shops.find((s) => s.id === selectedShopId) || shop || shops[0];

  const [productId, setProductId] = useState(
    editingReturn?.productId || (products[0]?.id || 'p-1')
  );
  const [packSize, setPackSize] = useState(editingReturn?.packSize || '500g');
  const [quantity, setQuantity] = useState(
    editingReturn ? (editingReturn.returnKg ?? editingReturn.quantity ?? 5) : 5
  );
  const [reason, setReason] = useState(editingReturn?.reason || 'Old Stock');
  const [remark, setRemark] = useState(editingReturn?.remark || editingReturn?.notes || '');
  const [submitting, setSubmitting] = useState(false);

  const todayDate = getFormattedDate();
  const todayMarket = getTodayMarket(currentUser?.id, todayDate);

  const selectedProd = products.find((p) => p.id === productId) || products[0];

  const returnKg = Number(quantity) || 0;
  const returnValue = returnKg * (selectedProd?.ratePerKg || 200);

  const returnReasons = [
    'Old Stock',
    'Damaged',
    'Expired',
    'Packaging Problem',
    'Customer Complaint',
    'Wrong Product',
    'Other',
  ];

  // If editingReturn changes, update state
  useEffect(() => {
    if (editingReturn) {
      if (editingReturn.shopId) setSelectedShopId(editingReturn.shopId);
      if (editingReturn.productId) setProductId(editingReturn.productId);
      if (editingReturn.packSize) setPackSize(editingReturn.packSize);
      if (editingReturn.returnKg !== undefined || editingReturn.quantity !== undefined) {
        setQuantity(editingReturn.returnKg ?? editingReturn.quantity);
      }
      if (editingReturn.reason) setReason(editingReturn.reason);
      if (editingReturn.remark || editingReturn.notes) {
        setRemark(editingReturn.remark || editingReturn.notes);
      }
    }
  }, [editingReturn]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetShop) return;
    if (quantity <= 0) {
      alert('Please enter return quantity (KG)');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      let savedReturn;
      if (editingReturn) {
        // Update existing return in-place
        savedReturn = updateReturn(editingReturn.id, {
          shopId: targetShop.id,
          shopName: targetShop.name,
          marketId: targetShop.marketId || todayMarket?.marketId || 'mkt-pachore',
          marketerId: currentUser?.id,
          marketerName: currentUser?.name,
          productId: selectedProd.id,
          productName: selectedProd.name,
          packSize,
          quantity: returnKg,
          returnKg,
          returnValue,
          reason,
          remark,
          notes: remark,
        });
      } else {
        // Create new return
        savedReturn = addReturn({
          shopId: targetShop.id,
          shopName: targetShop.name,
          marketId: targetShop.marketId || todayMarket?.marketId || 'mkt-pachore',
          marketerId: currentUser?.id,
          marketerName: currentUser?.name,
          date: todayDate,
          time: getFormattedTime(),
          productId: selectedProd.id,
          productName: selectedProd.name,
          packSize,
          quantity: returnKg,
          returnKg,
          returnValue,
          reason,
          remark,
          notes: remark,
        });
      }

      setSubmitting(false);
      if (onReturnSubmitted) onReturnSubmitted(savedReturn);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-900 text-white p-5 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-xs text-amber-300 font-bold uppercase tracking-wider">
            {editingReturn ? 'EDIT RETURN' : 'RETURN MANAGEMENT'}
          </p>
          <h2 className="text-2xl font-black mt-0.5 flex items-center gap-2">
            {editingReturn && <Edit className="w-6 h-6 text-amber-400" />}
            <span>{editingReturn ? 'EDIT STOCK RETURN' : 'RECORD STOCK RETURN'}</span>
          </h2>
          <p className="text-xs text-slate-300 font-medium">
            {editingReturn ? `Updating Return #${editingReturn.id}` : 'Patel Sahab Spices • Separate Return Entry'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {/* Shop Selector */}
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

          {/* High Return Warning Banner */}
          {targetShop?.highReturnWarning && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-2xl flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold uppercase">⚠ HIGH RETURN SHOP WARNING</p>
                <p className="mt-0.5 text-amber-800">
                  This shop has repeated returns (Last 3 visits: 18 KG returns recorded). Please verify reason carefully.
                </p>
              </div>
            </div>
          )}

          {/* Product & Pack Selection */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Product</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Pack Size</label>
              <select
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800"
              >
                {(selectedProd?.packSizes || ['50g', '100g', '200g', '500g', '1kg']).map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity (KG) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Return Quantity (KG) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="e.g. 2.5 or 5 KG"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-base font-extrabold text-slate-900"
            />
          </div>

          {/* Return Calculation Banner */}
          <div className="bg-slate-900 text-white p-3 rounded-xl flex justify-between items-center text-xs">
            <span className="font-bold text-slate-300">Calculated Return Weight & Value:</span>
            <span className="font-black text-amber-400 text-sm">
              {returnKg} KG • ₹{returnValue.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Return Reason</label>
            <div className="grid grid-cols-2 gap-2">
              {returnReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`p-2 rounded-xl border text-xs font-bold text-left transition-all ${
                    reason === r
                      ? 'bg-amber-50 border-amber-600 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Remark / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Remark / Notes / Batch</label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Batch #2025-06 seal broken during transit"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-medium"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-700 text-white rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
          >
            {submitting ? 'SAVING RETURN...' : editingReturn ? 'UPDATE RETURN ✓' : 'SUBMIT RETURN ✓'}
          </button>
        </form>
      </div>
    </div>
  );
}
