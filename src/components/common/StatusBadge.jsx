import React from 'react';

export default function StatusBadge({ status, type = 'general' }) {
  if (!status) return null;

  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';

  if (type === 'shop' || type === 'customer') {
    if (status === 'Customer' || status === 'Active') {
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (status === 'Lead') {
      bgClass = 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (status === 'New') {
      bgClass = 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (status === 'Inactive') {
      bgClass = 'bg-slate-100 text-slate-500 border-slate-200';
    }
  } else if (type === 'route') {
    if (status.includes('Temporary')) {
      bgClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
    } else {
      bgClass = 'bg-blue-50 text-blue-800 border-blue-200';
    }
  } else if (type === 'return') {
    if (status === 'Expired' || status === 'Damaged') {
      bgClass = 'bg-red-50 text-red-700 border-red-200';
    } else if (status === 'Old Stock') {
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
    } else {
      bgClass = 'bg-orange-50 text-orange-700 border-orange-200';
    }
  } else if (type === 'handover') {
    if (status === 'Verified') {
      bgClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
    } else {
      bgClass = 'bg-red-100 text-red-800 border-red-300 font-bold';
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bgClass}`}>
      {status}
    </span>
  );
}
