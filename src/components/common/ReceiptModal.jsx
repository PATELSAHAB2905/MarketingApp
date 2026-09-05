import React from 'react';
import { CheckCircle2, Share2, Printer, X, ShieldCheck } from 'lucide-react';

export default function ReceiptModal({ collection, onClose }) {
  if (!collection) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const text = `*PATEL SAHAB SPICES COLLECTION RECEIPT*\nReceipt No: ${collection.receiptNumber}\nShop: ${collection.shopName || 'Shop'}\nAmount: ₹${collection.amount?.toLocaleString('en-IN')}\nPayment Mode: ${collection.paymentMode}\nDate: ${collection.createdDate} ${collection.createdTime}\nReceived By: ${collection.marketerName || 'Marketer'}\n\nThank you for choosing Patel Sahab Spices!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Patel Sahab Spices Collection Receipt',
          text: text,
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Receipt details copied to clipboard! You can now paste and share on WhatsApp.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-700 via-red-800 to-amber-700 text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
              <CheckCircle2 className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">COLLECTION SUCCESSFUL ✓</h2>
              <p className="text-xs text-amber-200 font-medium">Patel Sahab Spices Official Receipt</p>
            </div>
          </div>
        </div>

        {/* Printable Area */}
        <div id="printable-receipt" className="p-6 bg-white space-y-4">
          <div className="text-center border-b border-dashed border-slate-200 pb-4">
            <h3 className="text-lg font-black tracking-wider text-slate-800 uppercase">PATEL SAHAB SPICES</h3>
            <p className="text-xs text-slate-500">Pure & Blended Quality Spices • Marketing Dept.</p>
            <span className="inline-block mt-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold rounded-full">
              Receipt No: {collection.receiptNumber || 'RCP-847291'}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Shop Name:</span>
              <span className="font-bold text-slate-800 text-right">{collection.shopName || 'Shop'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Payment Mode:</span>
              <span className="font-semibold text-slate-700 px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                {collection.paymentMode}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Date & Time:</span>
              <span className="font-medium text-slate-700">{collection.createdDate} {collection.createdTime}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Marketer:</span>
              <span className="font-medium text-slate-700">{collection.marketerName || 'Marketer'}</span>
            </div>
            {collection.remark && (
              <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-2">
                <span className="text-slate-500">Remark:</span>
                <span className="font-medium text-slate-600 italic">{collection.remark}</span>
              </div>
            )}
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Amount Collected</p>
            <p className="text-3xl font-black text-emerald-700 mt-0.5">
              ₹{Number(collection.amount || 0).toLocaleString('en-IN')}
            </p>
          </div>

          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Digital transaction record locked in Patel Sahab Spices System</span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <Share2 className="w-4 h-4" />
            SHARE RECEIPT
          </button>
          <button
            onClick={handlePrint}
            className="py-3 px-4 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
