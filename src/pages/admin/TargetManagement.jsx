import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  Target, Plus, Edit2, Trash2, X, Check, TrendingUp, Users,
  ChevronDown, AlertTriangle, Calendar, BarChart3, Award,
} from 'lucide-react';

const TARGET_TYPES = ['Daily', 'Weekly', 'Monthly'];

const getAchievementColor = (pct) => {
  if (pct >= 90) return 'text-emerald-700 bg-emerald-50';
  if (pct >= 70) return 'text-amber-700 bg-amber-50';
  return 'text-red-700 bg-red-50';
};

const getBarColor = (pct) => {
  if (pct >= 90) return 'bg-emerald-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-red-500';
};

const pct = (actual, target) => {
  if (!target || target === 0) return 0;
  return Math.min(Math.round((actual / target) * 100), 999);
};

export default function TargetManagement() {
  const {
    marketers, targets, addTarget, updateTarget, deleteTarget,
    orders, collections, visits, getFormattedDate,
  } = useData();

  const [activeTab, setActiveTab] = useState('targets'); // 'targets' | 'actual'
  const [filterMarketerId, setFilterMarketerId] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const EMPTY_FORM = {
    marketerId: marketers[0]?.id || '',
    targetType: 'Daily',
    startDate: '',
    endDate: '',
    dailyKg: '',
    dailyCollection: '',
    dailyVisits: '',
    dailyNewCustomers: '',
    weeklyKg: '',
    weeklyCollection: '',
    weeklyVisits: '',
    weeklyNewCustomers: '',
    monthlyKg: '',
    monthlyCollection: '',
    monthlyVisits: '',
    monthlyNewCustomers: '',
  };

  const [form, setForm] = useState(EMPTY_FORM);

  const openAdd = () => {
    setEditingTarget(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditingTarget(t);
    setForm({
      marketerId: t.marketerId,
      targetType: t.targetType || 'Daily',
      startDate: t.startDate || '',
      endDate: t.endDate || '',
      dailyKg: t.dailyKg ?? '',
      dailyCollection: t.dailyCollection ?? '',
      dailyVisits: t.dailyVisits ?? '',
      dailyNewCustomers: t.dailyNewCustomers ?? '',
      weeklyKg: t.weeklyKg ?? '',
      weeklyCollection: t.weeklyCollection ?? '',
      weeklyVisits: t.weeklyVisits ?? '',
      weeklyNewCustomers: t.weeklyNewCustomers ?? '',
      monthlyKg: t.monthlyKg ?? '',
      monthlyCollection: t.monthlyCollection ?? '',
      monthlyVisits: t.monthlyVisits ?? '',
      monthlyNewCustomers: t.monthlyNewCustomers ?? '',
    });
    setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const marketer = marketers.find(m => m.id === form.marketerId);
    const payload = {
      marketerId: form.marketerId,
      marketerName: marketer?.name || '',
      targetType: form.targetType,
      startDate: form.startDate,
      endDate: form.endDate,
      dailyKg: form.dailyKg !== '' ? Number(form.dailyKg) : null,
      dailyCollection: form.dailyCollection !== '' ? Number(form.dailyCollection) : null,
      dailyVisits: form.dailyVisits !== '' ? Number(form.dailyVisits) : null,
      dailyNewCustomers: form.dailyNewCustomers !== '' ? Number(form.dailyNewCustomers) : null,
      weeklyKg: form.weeklyKg !== '' ? Number(form.weeklyKg) : null,
      weeklyCollection: form.weeklyCollection !== '' ? Number(form.weeklyCollection) : null,
      weeklyVisits: form.weeklyVisits !== '' ? Number(form.weeklyVisits) : null,
      weeklyNewCustomers: form.weeklyNewCustomers !== '' ? Number(form.weeklyNewCustomers) : null,
      monthlyKg: form.monthlyKg !== '' ? Number(form.monthlyKg) : null,
      monthlyCollection: form.monthlyCollection !== '' ? Number(form.monthlyCollection) : null,
      monthlyVisits: form.monthlyVisits !== '' ? Number(form.monthlyVisits) : null,
      monthlyNewCustomers: form.monthlyNewCustomers !== '' ? Number(form.monthlyNewCustomers) : null,
      active: true,
    };

    if (editingTarget) {
      updateTarget(editingTarget.id, payload);
    } else {
      addTarget(payload);
    }
    setShowModal(false);
  };

  const handleToggleActive = (t) => {
    updateTarget(t.id, { active: !t.active });
  };

  const handleDeleteConfirmed = () => {
    if (deleteConfirm) {
      deleteTarget(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  // Compute actuals for today (for Target vs Actual)
  const today = getFormattedDate();

  const getActuals = (marketerId) => {
    const todayOrders = orders.filter(o => o.marketerId === marketerId && o.createdDate === today);
    const todayCollections = collections.filter(c => c.marketerId === marketerId && c.createdDate === today);
    const todayVisits = visits.filter(v => v.marketerId === marketerId && v.createdDate === today);
    const actualKg = todayOrders.reduce((s, o) => s + (o.totalKg || 0), 0);
    const actualCollection = todayCollections.reduce((s, c) => s + (c.amount || 0), 0);
    const actualVisits = todayVisits.length;
    const actualNew = (todayVisits.filter(v => v.isNewShop)).length;
    return { actualKg, actualCollection, actualVisits, actualNew };
  };

  const filteredTargets = filterMarketerId === 'all'
    ? targets
    : targets.filter(t => t.marketerId === filterMarketerId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase flex items-center gap-2">
            <Target className="w-6 h-6 text-red-700" />
            TARGET MANAGEMENT
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Create, edit, and track daily/weekly/monthly targets vs actuals
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          + NEW TARGET
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl w-fit">
        {[
          { key: 'targets', label: 'Target List', icon: Target },
          { key: 'actual', label: 'Target vs Actual', icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter by Marketer */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-slate-500 uppercase">Filter by Marketer:</span>
        <select
          value={filterMarketerId}
          onChange={e => setFilterMarketerId(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="all">All Marketers</option>
          {marketers.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* ===== TAB: TARGET LIST ===== */}
      {activeTab === 'targets' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {filteredTargets.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No targets found. Click <strong>+ NEW TARGET</strong> to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-amber-300 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Marketer</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Period</th>
                    <th className="p-3.5 text-right">KG Target</th>
                    <th className="p-3.5 text-right">Collection</th>
                    <th className="p-3.5 text-right">Visits</th>
                    <th className="p-3.5 text-right">New Shops</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTargets.map((t) => {
                    const marketer = marketers.find(m => m.id === t.marketerId);
                    return (
                      <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${!t.active ? 'opacity-50' : ''}`}>
                        <td className="p-3.5 font-extrabold text-slate-900">
                          {marketer?.name || t.marketerName || t.marketerId}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            t.targetType === 'Daily' ? 'bg-blue-100 text-blue-800' :
                            t.targetType === 'Weekly' ? 'bg-purple-100 text-purple-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {t.targetType || 'Daily'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {t.startDate && t.endDate ? `${t.startDate} → ${t.endDate}` : 'Open-ended'}
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900">
                          {t.dailyKg != null ? `${t.dailyKg} KG` : '—'}
                        </td>
                        <td className="p-3.5 text-right font-black text-emerald-700">
                          {t.dailyCollection != null ? `₹${t.dailyCollection.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-800">
                          {t.dailyVisits != null ? `${t.dailyVisits}` : '—'}
                        </td>
                        <td className="p-3.5 text-right font-bold text-purple-700">
                          {t.dailyNewCustomers != null ? `${t.dailyNewCustomers}` : '—'}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleActive(t)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                              t.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {t.active ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEdit(t)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(t)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: TARGET VS ACTUAL ===== */}
      {activeTab === 'actual' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-800 font-medium">
            Showing <strong>today's actuals ({today})</strong> vs applicable daily targets.
          </div>

          {marketers
            .filter(m => filterMarketerId === 'all' || m.id === filterMarketerId)
            .map(marketer => {
              const actuals = getActuals(marketer.id);
              // Find applicable daily target for today
              const applicableTargets = targets.filter(t => {
                if (t.marketerId !== marketer.id) return false;
                if (!t.active) return false;
                if (t.startDate && t.endDate) {
                  const toN = d => {
                    const p = d.split('-');
                    return parseInt(p[2] + p[1] + p[0], 10);
                  };
                  return toN(today) >= toN(t.startDate) && toN(today) <= toN(t.endDate);
                }
                return true;
              });
              const target = applicableTargets[0];

              const kgPct = pct(actuals.actualKg, target?.dailyKg);
              const colPct = pct(actuals.actualCollection, target?.dailyCollection);
              const visPct = pct(actuals.actualVisits, target?.dailyVisits);
              const newPct = pct(actuals.actualNew, target?.dailyNewCustomers);

              return (
                <div key={marketer.id} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-900 text-amber-300 font-black text-sm flex items-center justify-center">
                        {marketer.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900">{marketer.name}</h3>
                        <p className="text-xs text-slate-400">{today} • Daily Performance</p>
                      </div>
                    </div>
                    {!target && (
                      <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full font-bold">No active target</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* KG */}
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Sales KG</p>
                          <p className="text-2xl font-black text-slate-900 mt-0.5">{actuals.actualKg} <span className="text-sm font-bold text-slate-500">KG</span></p>
                        </div>
                        {target?.dailyKg != null && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${getAchievementColor(kgPct)}`}>
                            {kgPct}%
                          </span>
                        )}
                      </div>
                      {target?.dailyKg != null && (
                        <>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${getBarColor(kgPct)}`} style={{ width: `${Math.min(kgPct, 100)}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400">Target: <strong>{target.dailyKg} KG</strong></p>
                        </>
                      )}
                    </div>

                    {/* Collection */}
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Collection</p>
                          <p className="text-2xl font-black text-slate-900 mt-0.5">₹{actuals.actualCollection.toLocaleString('en-IN')}</p>
                        </div>
                        {target?.dailyCollection != null && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${getAchievementColor(colPct)}`}>
                            {colPct}%
                          </span>
                        )}
                      </div>
                      {target?.dailyCollection != null && (
                        <>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${getBarColor(colPct)}`} style={{ width: `${Math.min(colPct, 100)}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400">Target: <strong>₹{target.dailyCollection.toLocaleString('en-IN')}</strong></p>
                        </>
                      )}
                    </div>

                    {/* Visits */}
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Shop Visits</p>
                          <p className="text-2xl font-black text-slate-900 mt-0.5">{actuals.actualVisits} <span className="text-sm font-bold text-slate-500">Shops</span></p>
                        </div>
                        {target?.dailyVisits != null && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${getAchievementColor(visPct)}`}>
                            {visPct}%
                          </span>
                        )}
                      </div>
                      {target?.dailyVisits != null && (
                        <>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${getBarColor(visPct)}`} style={{ width: `${Math.min(visPct, 100)}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400">Target: <strong>{target.dailyVisits} Shops</strong></p>
                        </>
                      )}
                    </div>

                    {/* New Customers */}
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">New Shops</p>
                          <p className="text-2xl font-black text-slate-900 mt-0.5">{actuals.actualNew} <span className="text-sm font-bold text-slate-500">Shops</span></p>
                        </div>
                        {target?.dailyNewCustomers != null && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${getAchievementColor(newPct)}`}>
                            {newPct}%
                          </span>
                        )}
                      </div>
                      {target?.dailyNewCustomers != null && (
                        <>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${getBarColor(newPct)}`} style={{ width: `${Math.min(newPct, 100)}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400">Target: <strong>{target.dailyNewCustomers} Shops</strong></p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ===== CREATE / EDIT TARGET MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900">
                {editingTarget ? 'EDIT TARGET' : 'CREATE NEW TARGET'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <form id="target-form" onSubmit={handleSave} className="space-y-5 text-sm">
                {/* Marketer + Type + Period */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1 text-xs uppercase">SELECT MARKETER *</label>
                    <select
                      required
                      value={form.marketerId}
                      onChange={e => setForm(f => ({ ...f, marketerId: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {marketers.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1 text-xs uppercase">TARGET TYPE *</label>
                    <select
                      value={form.targetType}
                      onChange={e => setForm(f => ({ ...f, targetType: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {TARGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1 text-xs uppercase">START DATE (DD-MM-YYYY)</label>
                    <input
                      type="text"
                      placeholder="01-08-2026"
                      value={form.startDate}
                      onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1 text-xs uppercase">END DATE (DD-MM-YYYY)</label>
                    <input
                      type="text"
                      placeholder="31-08-2026"
                      value={form.endDate}
                      onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                {/* Daily Targets */}
                <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
                  <h3 className="font-black text-blue-900 text-xs uppercase">DAILY TARGETS</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1 text-xs">Sales KG Target</label>
                      <input
                        type="number"
                        placeholder="e.g., 130"
                        value={form.dailyKg}
                        onChange={e => setForm(f => ({ ...f, dailyKg: e.target.value }))}
                        className="w-full border border-blue-200 bg-white rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1 text-xs">Collection Target (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g., 25000"
                        value={form.dailyCollection}
                        onChange={e => setForm(f => ({ ...f, dailyCollection: e.target.value }))}
                        className="w-full border border-blue-200 bg-white rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1 text-xs">Shop Visit Target</label>
                      <input
                        type="number"
                        placeholder="e.g., 30"
                        value={form.dailyVisits}
                        onChange={e => setForm(f => ({ ...f, dailyVisits: e.target.value }))}
                        className="w-full border border-blue-200 bg-white rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1 text-xs">New Shop Target</label>
                      <input
                        type="number"
                        placeholder="e.g., 3"
                        value={form.dailyNewCustomers}
                        onChange={e => setForm(f => ({ ...f, dailyNewCustomers: e.target.value }))}
                        className="w-full border border-blue-200 bg-white rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Weekly Targets */}
                <div className="bg-purple-50 rounded-2xl p-4 space-y-3">
                  <h3 className="font-black text-purple-900 text-xs uppercase">WEEKLY TARGETS <span className="font-normal text-purple-500">(optional)</span></h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1 text-xs">Weekly KG</label>
                      <input
                        type="number"
                        placeholder="e.g., 650"
                        value={form.weeklyKg}
                        onChange={e => setForm(f => ({ ...f, weeklyKg: e.target.value }))}
                        className="w-full border border-purple-200 bg-white rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1 text-xs">Weekly Collection (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g., 125000"
                        value={form.weeklyCollection}
                        onChange={e => setForm(f => ({ ...f, weeklyCollection: e.target.value }))}
                        className="w-full border border-purple-200 bg-white rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Monthly Targets */}
                <div className="bg-emerald-50 rounded-2xl p-4 space-y-3">
                  <h3 className="font-black text-emerald-900 text-xs uppercase">MONTHLY TARGETS <span className="font-normal text-emerald-500">(optional)</span></h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1 text-xs">Monthly KG</label>
                      <input
                        type="number"
                        placeholder="e.g., 2800"
                        value={form.monthlyKg}
                        onChange={e => setForm(f => ({ ...f, monthlyKg: e.target.value }))}
                        className="w-full border border-emerald-200 bg-white rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1 text-xs">Monthly Collection (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g., 540000"
                        value={form.monthlyCollection}
                        onChange={e => setForm(f => ({ ...f, monthlyCollection: e.target.value }))}
                        className="w-full border border-emerald-200 bg-white rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="target-form"
                className="flex-1 py-3 bg-red-700 text-white font-bold rounded-xl hover:bg-red-800 transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {editingTarget ? 'SAVE CHANGES' : 'CREATE TARGET'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="font-black text-slate-900">CONFIRM DELETE</h2>
                <p className="text-xs text-slate-500">
                  Target for <strong>{deleteConfirm.marketerName || deleteConfirm.marketerId}</strong>
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-700">
              This target record will be permanently deleted. Historical performance data will be unaffected.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
