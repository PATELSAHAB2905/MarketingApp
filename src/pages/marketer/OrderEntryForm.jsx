import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import ShopHistoryModal from '../../components/common/ShopHistoryModal';
import { syncOrderToSheets, getSheetsWebhookUrl } from '../../services/sheetsService';
import { ArrowLeft, Plus, Trash2, ShoppingBag, X, CheckCircle2, History, AlertTriangle, RefreshCw, Wifi, WifiOff, FileText, Search } from 'lucide-react';

export default function OrderEntryForm({ shop, editingOrder, onClose, onOrderSubmitted }) {
  const { currentUser } = useAuth();
  const { products, shops, orders, gstConfig, getFormattedDate, getFormattedTime, getTodayMarket, marketRoutes, addOrder, updateOrder, updateOrderSyncStatus } = useData();

  const [selectedShopId, setSelectedShopId] = useState(
    editingOrder ? editingOrder.shopId : (shop ? shop.id : (shops[0]?.id || ''))
  );
  const [shopSearchQuery, setShopSearchQuery] = useState('');
  const targetShop = shops.find((s) => s.id === selectedShopId) || shop || shops[0];
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Filter shops for Target Shop selection with Search
  const searchedShops = shops.filter((s) => {
    if (!shopSearchQuery) return true;
    const q = shopSearchQuery.toLowerCase().trim();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.owner && s.owner.toLowerCase().includes(q)) ||
      (s.mobile && s.mobile.includes(q)) ||
      (s.marketName && s.marketName.toLowerCase().includes(q)) ||
      (s.connectedMarketName && s.connectedMarketName.toLowerCase().includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q))
    );
  });

  // Clean initial order state or populate from editingOrder
  const [items, setItems] = useState(() => {
    if (editingOrder?.items && editingOrder.items.length > 0) {
      return editingOrder.items.map((i, idx) => ({
        itemId: i.itemId || `item-${Date.now()}-${idx}`,
        orderType: i.orderType || (i.quantityPouch ? 'POUCH_10' : 'KG'),
        productId: i.productId || products.find(p => p.name === i.productName)?.id || '',
        productName: i.productName || '',
        packSize: i.packSize || '500g',
        quantity: i.quantity || (i.orderType === 'POUCH_10' ? i.quantityPouch : (i.quantityKg ?? 1)),
        mrp: i.mrp || 10,
        sellingPrice: i.sellingPrice ?? i.pricePerKg ?? '',
        unitPrice: i.unitPrice ?? i.pricePerKg ?? i.sellingPrice ?? '',
        subtotal: i.subtotal || 0,
      }));
    }
    return [];
  });
  const [remark, setRemark] = useState(editingOrder?.remark || '');
  const [submitting, setSubmitting] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [syncToast, setSyncToast] = useState(null); // {status, message}

  const todayDate = getFormattedDate();
  const todayMarket = getTodayMarket(currentUser?.id, todayDate);

  // Unsaved Data Back Button Protection
  const handleBack = () => {
    if (items.length > 0) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  const getKgPerPack = (packSizeStr) => {
    if (packSizeStr === '1kg') return 1;
    if (packSizeStr === '500g') return 0.5;
    if (packSizeStr === '200g') return 0.2;
    if (packSizeStr === '100g') return 0.1;
    if (packSizeStr === '50g') return 0.05;
    if (packSizeStr === '25g') return 0.025;
    return 0.5;
  };

  // ADD ITEM: Fresh blank item with unique itemId (Selling price is fully manual for ₹10 pouch!)
  const handleAddItem = () => {
    const newItem = {
      itemId: `item-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      orderType: 'KG', // 'KG' or 'POUCH_10'
      productId: '',
      productName: '',
      packSize: '',
      quantity: '',
      mrp: 10,
      sellingPrice: '', // Fully manual / editable by marketer (No fixed price, no buttons!)
      unitPrice: '',
      subtotal: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleDeleteItem = (itemId) => {
    setItems((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const handleUpdateItem = (itemId, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.itemId !== itemId) return item;

        const updated = { ...item, [field]: value };

        if (field === 'productId') {
          const p = products.find((prod) => prod.id === value);
          if (p && (updated.unitPrice === '' || updated.unitPrice === undefined || updated.unitPrice === null)) {
            updated.unitPrice = p.ratePerKg || '';
          }
        }

        if (field === 'orderType' && value === 'POUCH_10') {
          updated.packSize = '₹10 MRP Pouch';
          updated.mrp = 10;
        }

        return updated;
      })
    );
  };

  // Item Calculations
  const calculatedItems = items.map((item) => {
    const prod = products.find((p) => p.id === item.productId);
    const prodName = prod ? prod.name : 'Select Spice Product';

    if (item.orderType === 'POUCH_10') {
      const qtyPouch = Number(item.quantity) || 0;
      const pricePerPouch = Number(item.sellingPrice) || 0;
      const subtotal = qtyPouch * pricePerPouch; // Pouch Qty × Manual Selling Price
      return {
        ...item,
        productName: prodName ? `${prodName} (₹10 MRP Pouch)` : '₹10 MRP Pouch',
        unit: 'POUCH',
        mrp: 10,
        sellingPrice: pricePerPouch,
        quantityPouch: qtyPouch,
        quantityKg: 0, // CRITICAL: Never convert ₹10 MRP Pouch into KG!
        subtotal,
      };
    } else {
      const qtyKg = Number(item.quantity) || 0;
      const rate = Number(item.unitPrice) || (prod ? prod.ratePerKg : 200);
      const subtotal = qtyKg * rate; // Quantity (KG) × Selling Price per KG
      return {
        ...item,
        productName: prodName,
        unit: 'KG',
        mrp: null,
        sellingPrice: rate,
        quantityPouch: 0,
        quantityKg: qtyKg,
        subtotal,
      };
    }
  });

  const totalKg = calculatedItems.reduce((sum, i) => sum + i.quantityKg, 0);
  const totalPouches = calculatedItems.reduce((sum, i) => sum + i.quantityPouch, 0);
  const subtotal = calculatedItems.reduce((sum, i) => sum + i.subtotal, 0);

  // GST Calculation
  const gstRate = gstConfig.gstEnabled ? (gstConfig.gstRate || 5) : 0;
  let gstAmount = 0;
  let grandTotal = subtotal;

  if (gstConfig.gstEnabled) {
    if (gstConfig.gstMode === 'Inclusive') {
      gstAmount = Math.round((subtotal * gstRate) / (100 + gstRate));
      grandTotal = subtotal;
    } else {
      gstAmount = Math.round((subtotal * gstRate) / 100);
      grandTotal = subtotal + gstAmount;
    }
  }

  // Final Order Submission
  // Final Order Submission
  const handleFinalSubmit = () => {
    if (!targetShop) {
      alert('Please select a valid shop');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least 1 product item');
      return;
    }

    setSubmitting(true);

    try {
      // Resolve route name from marketRoutes
      const routeObj = todayMarket?.routeId
        ? marketRoutes?.find((r) => r.id === todayMarket.routeId)
        : null;
      const routeName = routeObj?.name || todayMarket?.marketName || '';

      let savedOrder = null;
      if (editingOrder) {
        savedOrder = updateOrder(editingOrder.id, {
          shopId: targetShop.id,
          shopName: targetShop.name,
          marketId: targetShop.marketId || editingOrder.marketId || todayMarket?.marketId || '',
          marketName: editingOrder.marketName || todayMarket?.marketName || '',
          routeId: editingOrder.routeId || todayMarket?.routeId || '',
          routeName: editingOrder.routeName || routeName,
          connectedMarketId: editingOrder.connectedMarketId || todayMarket?.connectedMarketId || '',
          connectedMarketName: editingOrder.connectedMarketName || todayMarket?.connectedMarketName || '',
          marketerId: currentUser?.id,
          marketerName: currentUser?.name,
          date: editingOrder.date || todayDate,
          time: getFormattedTime(),
          totalKg,
          totalPouches,
          subtotal,
          gstRate,
          gstAmount,
          gstMode: gstConfig.gstMode,
          grandTotal,
          items: calculatedItems,
          remark,
        });
      } else {
        savedOrder = addOrder({
          shopId: targetShop.id,
          shopName: targetShop.name,
          marketId: targetShop.marketId || todayMarket?.marketId || '',
          marketName: todayMarket?.marketName || '',
          routeId: todayMarket?.routeId || '',
          routeName,
          connectedMarketId: todayMarket?.connectedMarketId || '',
          connectedMarketName: todayMarket?.connectedMarketName || '',
          marketerId: currentUser?.id,
          marketerName: currentUser?.name,
          date: todayDate,
          time: getFormattedTime(),
          totalKg,
          totalPouches,
          subtotal,
          gstRate,
          gstAmount,
          gstMode: gstConfig.gstMode,
          grandTotal,
          items: calculatedItems,
          remark,
        });
      }

      setSubmitting(false);
      setShowReviewModal(false);

      // Trigger Google Sheets sync in background (non-blocking)
      const webhookUrl = getSheetsWebhookUrl();
      if (webhookUrl && savedOrder) {
        setSyncToast({ status: 'syncing', message: 'Syncing to Google Sheets...' });
        syncOrderToSheets(savedOrder, currentUser?.name, webhookUrl).then((result) => {
          updateOrderSyncStatus(savedOrder.id, result.status, result.message);
          if (result.success) {
            setSyncToast({
              status: 'synced',
              message: result.status === 'duplicate' ? '✓ Already synced' : '✓ Synced to Google Sheets',
            });
          } else {
            setSyncToast({
              status: 'failed',
              message: '⚠ Sync failed – order saved locally. Retry from Admin → Sheets Setup.',
            });
          }
          setTimeout(() => setSyncToast(null), 5000);
        });
      }

      if (onOrderSubmitted) onOrderSubmitted(savedOrder);
    } catch (err) {
      console.error('Order submission error:', err);
      alert('Error submitting order: ' + err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 via-orange-700 to-red-800 text-white p-4 relative flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1 font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>BACK</span>
            </button>
            <div>
              <h2 className="text-lg font-black leading-tight">
                {editingOrder ? `EDIT ORDER: ${editingOrder.id}` : 'CURRENT ORDER ENTRY'}
              </h2>
            </div>
          </div>
          <button onClick={handleBack} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-slate-800 pb-36">
          
          {/* Target Shop Selector with Search and Live Due Balance */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-[11px] font-black text-slate-700 uppercase">Target Shop *</label>
              {targetShop && (
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    (targetShop.outstanding || 0) > 0
                      ? 'bg-red-100 text-red-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  Due: ₹{(targetShop.outstanding || 0).toLocaleString('en-IN')}{(targetShop.outstanding || 0) <= 0 ? ' — No Due' : ''}
                </span>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={shopSearchQuery}
                onChange={(e) => setShopSearchQuery(e.target.value)}
                placeholder="Search Shop Name, Mobile or Market..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <select
              value={selectedShopId}
              onChange={(e) => {
                setSelectedShopId(e.target.value);
                setShopSearchQuery('');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none"
            >
              {searchedShops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} • {s.connectedMarketName || s.marketName || 'Pachore'} • Due: ₹{(s.outstanding || 0).toLocaleString('en-IN')}{(s.outstanding || 0) <= 0 ? ' (No Due)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* READ-ONLY PREVIOUS ORDER CARD & SHOP HISTORY TRIGGER */}
          {targetShop && (() => {
            const pastOrders = orders
              .filter((o) => o.shopId === targetShop.id || (o.shopName && o.shopName.toLowerCase().trim() === targetShop.name?.toLowerCase().trim()))
              .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            const lastOrd = pastOrders[0];

            return (
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-2.5 border border-slate-800 shadow-xs">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                  <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <History className="w-3.5 h-3.5" />
                    PAST PURCHASE REFERENCE
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {lastOrd?.date || targetShop.lastOrderDate || 'No past orders'}
                  </span>
                </div>

                {lastOrd && lastOrd.items && lastOrd.items.length > 0 ? (
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1.5">
                      {lastOrd.items.slice(0, 3).map((it, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-amber-200"
                        >
                          {it.productName} ({it.packSize || '500g'}): {it.quantityKg || it.quantityPouch} Qty @ ₹{it.pricePerKg || it.sellingPrice}
                        </span>
                      ))}
                    </div>
                    {lastOrd.items.length > 3 && (
                      <p className="text-[10px] text-slate-400">+{lastOrd.items.length - 3} more products in last order</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">No previous purchase records found for this shop.</p>
                )}

                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="w-full py-1.5 bg-white/10 hover:bg-white/20 text-amber-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all border border-white/10"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-300" />
                  <span>View Complete Shop Purchase & Payment History 📜</span>
                </button>
              </div>
            );
          })()}

          {/* ITEM ENTRY CARDS (Dynamic & Multi-Item Supported) */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wide">
                ORDER ITEMS ({items.length})
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ADD ITEM</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-2">
                <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">No items added yet</p>
                <p className="text-[11px] text-slate-400">Click "+ ADD ITEM" above to add spice products.</p>
              </div>
            ) : (
              items.map((item, index) => {
                const currentProd = products.find((p) => p.id === item.productId);

                return (
                  <div
                    key={item.itemId}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-xs relative"
                  >
                    {/* Item Row Header */}
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-300 flex items-center justify-center text-[10px] font-black">
                          {index + 1}
                        </span>
                        <div className="flex bg-slate-100 rounded-xl p-0.5 text-[10px] font-extrabold">
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.itemId, 'orderType', 'KG')}
                            className={`px-2 py-1 rounded-lg transition-all ${
                              item.orderType === 'KG' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600'
                            }`}
                          >
                            KG ORDER
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.itemId, 'orderType', 'POUCH_10')}
                            className={`px-2 py-1 rounded-lg transition-all ${
                              item.orderType === 'POUCH_10' ? 'bg-red-700 text-white shadow-xs' : 'text-slate-600'
                            }`}
                          >
                            ₹10 MRP POUCH
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.itemId)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Product Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Spice Product *</label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleUpdateItem(item.itemId, 'productId', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900"
                      >
                        <option value="">-- Select Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* KG ORDER vs ₹10 MRP POUCH ORDER */}
                    {item.orderType === 'KG' ? (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pack Size</label>
                          <select
                            value={item.packSize}
                            onChange={(e) => handleUpdateItem(item.itemId, 'packSize', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800"
                          >
                            <option value="">Select Pack</option>
                            {(currentProd?.packSizes || ['50g', '100g', '200g', '500g', '1kg']).map((sz) => (
                              <option key={sz} value={sz}>
                                {sz}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity (KG) *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="e.g. 5 or 10.5"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.itemId, 'quantity', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-black text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rate/KG (₹)</label>
                          <input
                            type="number"
                            placeholder={currentProd?.ratePerKg ? `₹${currentProd.ratePerKg}` : '240'}
                            value={item.unitPrice ?? ''}
                            onChange={(e) => handleUpdateItem(item.itemId, 'unitPrice', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    ) : (
                      /* ₹10 MRP POUCH ORDER WITH FULLY MANUAL SELLING PRICE ENTRY */
                      <div className="space-y-2 bg-red-50/70 border border-red-200 p-3 rounded-2xl">
                        <div className="flex justify-between items-center text-xs border-b border-red-200/60 pb-1.5">
                          <span className="font-black text-red-900 uppercase">₹10 MRP POUCH ORDER</span>
                          <span className="px-2 py-0.5 bg-red-700 text-white rounded font-bold text-[10px]">
                            MRP: ₹10 (Fixed Reference)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">
                              Pouch Quantity *
                            </label>
                            <input
                              type="number"
                              min="1"
                              placeholder="e.g. 500"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.itemId, 'quantity', e.target.value)}
                              className="w-full bg-white border-2 border-red-300 rounded-xl p-2 text-xs font-black text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-extrabold text-red-900 uppercase mb-1">
                              Actual Selling Price (₹) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="e.g. 7.20 or 8.00"
                              value={item.sellingPrice ?? ''}
                              onChange={(e) => handleUpdateItem(item.itemId, 'sellingPrice', e.target.value)}
                              className="w-full bg-white border-2 border-red-300 rounded-xl p-2 text-xs font-black text-slate-900"
                            />
                          </div>
                        </div>

                        {item.quantity && item.sellingPrice && (
                          <div className="bg-white p-2 rounded-xl border border-red-200 text-right text-xs">
                            <span className="text-slate-500 font-semibold">Calculation: </span>
                            <span className="font-extrabold text-slate-800">
                              {item.quantity} Pouches × ₹{item.sellingPrice} = 
                            </span>
                            <span className="font-black text-red-700 ml-1 text-sm">
                              ₹{(Number(item.quantity) * Number(item.sellingPrice)).toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Calculated Subtotal */}
                    <div className="flex justify-between items-center pt-1 text-xs border-t border-slate-100">
                      <span className="text-slate-500 font-semibold">
                        {item.orderType === 'POUCH_10'
                          ? `${item.quantity || 0} Pouches @ ₹${item.sellingPrice || 0}/pouch`
                          : `Total Weight: ${calculatedItems[index]?.quantityKg || 0} KG`}
                      </span>
                      <span className="font-black text-slate-900">
                        Subtotal: ₹{(calculatedItems[index]?.subtotal || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Remark */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Remark / Special Instructions</label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Deliver by tomorrow morning"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium"
            />
          </div>
        </div>

        {/* STICKY BOTTOM ORDER SUMMARY */}
        <div className="p-4 bg-slate-900 text-white border-t border-slate-800 space-y-2 flex-shrink-0">
          <div className="grid grid-cols-2 gap-2 text-[11px] text-amber-200 font-bold border-b border-slate-800 pb-2">
            <span>KG ORDER: {totalKg} KG</span>
            <span className="text-right">₹10 POUCH ORDER: {totalPouches} Pouches</span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Subtotal:</span>
              <span className="font-extrabold text-white">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            {gstConfig.gstEnabled && (
              <div className="flex justify-between text-amber-300">
                <span>GST @ {gstRate}% ({gstConfig.gstMode}):</span>
                <span className="font-extrabold">₹{gstAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-sm">
              <span className="font-black text-amber-400">GRAND TOTAL</span>
              <span className="text-2xl font-black text-white">₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => setShowReviewModal(true)}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white rounded-xl font-black text-sm shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
          >
            REVIEW & SUBMIT ORDER ✓
          </button>
        </div>
      </div>

      {/* Unsaved Changes Safety Dialog */}
      {showUnsavedPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full space-y-4 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
            <div>
              <h3 className="font-black text-slate-900 text-lg">Unsaved Order</h3>
              <p className="text-xs text-slate-500 mt-1">You have entered order items that are not submitted yet.</p>
            </div>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => setShowUnsavedPrompt(false)}
                className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl"
              >
                Continue Editing
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl"
              >
                Leave Without Saving
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheets Sync Status Toast */}
      {syncToast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 transition-all max-w-xs text-center ${
          syncToast.status === 'syncing' ? 'bg-amber-600 text-white' :
          syncToast.status === 'synced'  ? 'bg-emerald-700 text-white' :
                                            'bg-red-700 text-white'
        }`}>
          {syncToast.status === 'syncing' ? <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" /> :
           syncToast.status === 'synced'  ? <Wifi className="w-3.5 h-3.5 shrink-0" /> :
                                             <WifiOff className="w-3.5 h-3.5 shrink-0" />}
          {syncToast.message}
        </div>
      )}


      {/* Order Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-black text-slate-900 text-base uppercase">
                  {editingOrder ? 'SAVE CHANGES?' : 'ORDER REVIEW'}
                </h3>
                {editingOrder && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    Are you sure you want to update this transaction?
                  </p>
                )}
              </div>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs max-h-60 overflow-y-auto">
              <p className="font-bold text-slate-700">Shop: {targetShop?.name}</p>
              {calculatedItems.map((item, idx) => (
                <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <p className="font-extrabold text-slate-900">{item.productName}</p>
                    <p className="text-[10px] text-slate-500">
                      {item.orderType === 'POUCH_10'
                        ? `${item.quantityPouch} Pouches @ ₹${item.sellingPrice}/pouch (MRP ₹10)`
                        : `${item.quantityKg} KG (${item.packSize || 'Standard'})`}
                    </p>
                  </div>
                  <span className="font-black text-slate-900">₹{item.subtotal.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 text-white p-3 rounded-2xl text-xs space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {gstConfig.gstEnabled && (
                <div className="flex justify-between text-amber-300">
                  <span>GST ({gstRate}%):</span>
                  <span className="font-bold">₹{gstAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-slate-800">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              {editingOrder && (
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
              >
                {submitting
                  ? (editingOrder ? 'SAVING CHANGES...' : 'SUBMITTING ORDER...')
                  : (editingOrder ? 'SAVE CHANGES ✓' : 'CONFIRM SUBMIT ORDER ✓')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shop History Modal Trigger */}
      {showHistoryModal && targetShop && (
        <ShopHistoryModal
          shop={targetShop}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
}
