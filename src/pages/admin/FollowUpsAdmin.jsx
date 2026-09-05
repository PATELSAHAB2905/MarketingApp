import React from 'react';
import { useData } from '../../context/DataContext';
import { Clock, Store, IndianRupee } from 'lucide-react';

export default function FollowUpsAdmin() {
  const { followups } = useData();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">PENDING FOLLOW-UPS MANAGEMENT</h1>
          <p className="text-xs text-slate-500 font-medium">Scheduled payment recovery & next order follow-up reminders</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-amber-300 uppercase text-[10px] font-bold">
            <tr>
              <th className="p-3.5">Follow-up Date</th>
              <th className="p-3.5">Shop Name</th>
              <th className="p-3.5">Marketer</th>
              <th className="p-3.5">Reason / Note</th>
              <th className="p-3.5 text-right">Expected Order</th>
              <th className="p-3.5 text-right">Expected Collection</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {followups.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400 font-bold">
                  No active follow-ups scheduled.
                </td>
              </tr>
            ) : (
              followups.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-slate-900">{f.followUpDate}</td>
                  <td className="p-3.5 font-bold text-slate-800">{f.shopName}</td>
                  <td className="p-3.5 text-slate-600 font-semibold">{f.marketerName}</td>
                  <td className="p-3.5 text-slate-700">{f.reason}</td>
                  <td className="p-3.5 text-right font-bold text-slate-900">{f.expectedOrderKg} KG</td>
                  <td className="p-3.5 text-right font-black text-emerald-700">₹{(f.expectedCollection || 0).toLocaleString('en-IN')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
