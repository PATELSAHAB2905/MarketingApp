import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/common/StatusBadge';
import { Calendar, Plus, MapPin, Users, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';

export default function MarketsRoutes() {
  const {
    markets,
    marketers,
    weeklyRoutes,
    tempAssignments,
    addTempAssignment,
    removeTempAssignment,
    getFormattedDate,
  } = useData();

  const [showTempModal, setShowTempModal] = useState(false);
  const [tempMarketerId, setTempMarketerId] = useState(marketers[0]?.id || 'marketer-2');
  const [tempMarketId, setTempMarketId] = useState(markets[0]?.id || 'mkt-pachore');
  const [tempDate, setTempDate] = useState(getFormattedDate());
  const [reason, setReason] = useState('Sachin Absent - Covering Pachore Route');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleCreateTempOverride = (e) => {
    e.preventDefault();
    const mkt = markets.find((m) => m.id === tempMarketId);
    addTempAssignment({
      marketerId: tempMarketerId,
      marketId: tempMarketId,
      marketName: mkt ? mkt.name : 'Assigned Market',
      date: tempDate,
      reason,
    });
    setShowTempModal(false);
    alert('TEMPORARY ROUTE OVERRIDE CREATED ✓\nWill take precedence on ' + tempDate + ' without altering permanent routes.');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">WEEKLY ROUTES & OVERRIDES</h1>
          <p className="text-xs text-slate-500 font-medium">Manage permanent weekly route schedules & single-day temporary assignments</p>
        </div>
        <button
          onClick={() => setShowTempModal(true)}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-md"
        >
          <Plus className="w-4 h-4" />
          TEMPORARY DAY OVERRIDE
        </button>
      </div>

      {/* Temporary Overrides Banner */}
      {tempAssignments.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-3xl space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              ACTIVE TEMPORARY SINGLE-DAY ASSIGNMENTS
            </h2>
          </div>

          <div className="space-y-2">
            {tempAssignments.map((t) => {
              const marketerObj = marketers.find((m) => m.id === t.marketerId);
              return (
                <div key={t.id} className="bg-white p-3 rounded-2xl border border-amber-200 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-extrabold text-slate-900">{marketerObj?.name || 'Marketer'}</span>
                    <span className="text-slate-500"> → Assigned to </span>
                    <span className="font-black text-amber-800 uppercase">{t.marketName}</span>
                    <span className="text-slate-400"> on {t.date}</span>
                    <p className="text-[11px] text-amber-700 italic mt-0.5">"{t.reason}"</p>
                  </div>
                  <button
                    onClick={() => removeTempAssignment(t.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600"
                    title="Remove Temporary Override"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Permanent Weekly Route Schedule Matrix */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
          <Calendar className="w-5 h-5 text-red-700" />
          PERMANENT WEEKLY ROUTE CALENDAR
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-amber-300 uppercase text-[10px] font-bold">
                <th className="p-3 border border-slate-800">Marketer Name</th>
                {daysOfWeek.map((day) => (
                  <th key={day} className="p-3 border border-slate-800 text-center">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {marketers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="p-3 border border-slate-200 font-extrabold text-slate-900 bg-slate-50">
                    {m.name}
                  </td>
                  {daysOfWeek.map((day) => {
                    const route = weeklyRoutes.find(
                      (r) => r.marketerId === m.id && r.day.toLowerCase() === day.toLowerCase()
                    );
                    return (
                      <td key={day} className="p-3 border border-slate-200 text-center font-bold">
                        {route ? (
                          <span className="px-2 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs block">
                            {route.marketName}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic">Off</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Temporary Override Modal */}
      {showTempModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <h2 className="text-xl font-black text-slate-900">CREATE SINGLE-DAY TEMPORARY ASSIGNMENT</h2>
            <form onSubmit={handleCreateTempOverride} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Select Marketer</label>
                <select
                  value={tempMarketerId}
                  onChange={(e) => setTempMarketerId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                >
                  {marketers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Select Temporary Market</label>
                <select
                  value={tempMarketId}
                  onChange={(e) => setTempMarketId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                >
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Assignment Date (DD-MM-YYYY)</label>
                <input
                  type="text"
                  required
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTempModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-600 text-white font-bold rounded-xl"
                >
                  Create Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
