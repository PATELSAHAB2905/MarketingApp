import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  Map, Plus, Edit2, Trash2, ChevronRight, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, MapPin, X, Check, AlertTriangle, Building2,
  Search, Layers, Sparkles, CheckSquare, Square,
} from 'lucide-react';

export default function MarketRoutesMaster() {
  const {
    masterMarketGroups, setMasterMarketGroups,
    marketRoutes, addMarketRoute, updateMarketRoute, deleteMarketRoute,
    connectedMarkets, addConnectedMarket, updateConnectedMarket, deleteConnectedMarket,
  } = useData();

  const [expandedRouteId, setExpandedRouteId] = useState(null);
  const [activeTab, setActiveTab] = useState('routes'); // 'routes' | 'directory'

  // Route Modal states
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [routeForm, setRouteForm] = useState({ name: '', notes: '', selectedCms: [] });
  const [routeSearchQuery, setRouteSearchQuery] = useState('');
  const [cmSearchQuery, setCmSearchQuery] = useState('');

  // Connected Market Modal states
  const [showCmModal, setShowCmModal] = useState(false);
  const [editingCm, setEditingCm] = useState(null);
  const [cmParentRouteId, setCmParentRouteId] = useState(null);
  const [cmForm, setCmForm] = useState({ name: '', distanceKm: '', priority: '', notes: '' });

  // Master Places Directory state
  const [newPlaceName, setNewPlaceName] = useState('');
  const [directorySearch, setDirectorySearch] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'route'|'cm', id, name }

  // Filtered master place options for dropdowns/pickers
  const filteredRoutePlaces = useMemo(() => {
    return masterMarketGroups.filter(p => p.toLowerCase().includes(routeSearchQuery.toLowerCase()));
  }, [masterMarketGroups, routeSearchQuery]);

  const filteredCmPlaces = useMemo(() => {
    return masterMarketGroups.filter(p => p.toLowerCase().includes(cmSearchQuery.toLowerCase()));
  }, [masterMarketGroups, cmSearchQuery]);

  // ----- Route Handlers -----
  const openAddRoute = () => {
    setEditingRoute(null);
    setRouteForm({ name: '', notes: '', selectedCms: [] });
    setRouteSearchQuery('');
    setCmSearchQuery('');
    setShowRouteModal(true);
  };

  const openEditRoute = (route) => {
    setEditingRoute(route);
    const existingCms = connectedMarkets.filter(c => c.routeId === route.id).map(c => c.name);
    setRouteForm({ name: route.name, notes: route.notes || '', selectedCms: existingCms });
    setRouteSearchQuery('');
    setCmSearchQuery('');
    setShowRouteModal(true);
  };

  const handleSaveRoute = (e) => {
    e.preventDefault();
    if (!routeForm.name.trim()) return;

    const trimmedName = routeForm.name.trim();

    if (editingRoute) {
      updateMarketRoute(editingRoute.id, { name: trimmedName, notes: routeForm.notes.trim() });

      // Add any newly selected connected markets
      routeForm.selectedCms.forEach((cmName) => {
        const alreadyExists = connectedMarkets.some(c => c.routeId === editingRoute.id && c.name.toLowerCase() === cmName.toLowerCase());
        if (!alreadyExists) {
          addConnectedMarket({
            name: cmName,
            routeId: editingRoute.id,
            routeName: trimmedName,
            active: true,
          });
        }
      });
    } else {
      const newRoute = addMarketRoute({ name: trimmedName, notes: routeForm.notes.trim() });

      // Add selected connected markets to this new route
      routeForm.selectedCms.forEach((cmName, idx) => {
        addConnectedMarket({
          name: cmName,
          routeId: newRoute.id,
          routeName: trimmedName,
          priority: idx + 1,
          active: true,
        });
      });
    }

    // Auto-add name to masterMarketGroups if not present
    if (!masterMarketGroups.some(p => p.toLowerCase() === trimmedName.toLowerCase())) {
      setMasterMarketGroups(prev => [trimmedName, ...prev]);
    }

    setShowRouteModal(false);
  };

  const handleToggleRoute = (route) => {
    updateMarketRoute(route.id, { active: !route.active });
  };

  // ----- Connected Market Handlers -----
  const openAddCm = (routeId) => {
    setEditingCm(null);
    setCmParentRouteId(routeId);
    const route = marketRoutes.find(r => r.id === routeId);
    setCmForm({ name: '', distanceKm: '', priority: '', notes: '', routeName: route?.name || '' });
    setCmSearchQuery('');
    setShowCmModal(true);
  };

  const openEditCm = (cm) => {
    setEditingCm(cm);
    setCmParentRouteId(cm.routeId);
    setCmForm({
      name: cm.name,
      distanceKm: cm.distanceKm || '',
      priority: cm.priority || '',
      notes: cm.notes || '',
      routeName: cm.routeName || '',
    });
    setCmSearchQuery('');
    setShowCmModal(true);
  };

  const handleSaveCm = (e) => {
    e.preventDefault();
    if (!cmForm.name.trim()) return;
    const route = marketRoutes.find(r => r.id === cmParentRouteId);
    const trimmedName = cmForm.name.trim();

    const payload = {
      name: trimmedName,
      distanceKm: cmForm.distanceKm ? Number(cmForm.distanceKm) : null,
      priority: cmForm.priority ? Number(cmForm.priority) : null,
      notes: cmForm.notes.trim(),
      routeId: cmParentRouteId,
      routeName: route?.name || cmForm.routeName,
    };

    if (editingCm) {
      updateConnectedMarket(editingCm.id, payload);
    } else {
      addConnectedMarket(payload);
    }

    // Add to masterMarketGroups if missing
    if (!masterMarketGroups.some(p => p.toLowerCase() === trimmedName.toLowerCase())) {
      setMasterMarketGroups(prev => [trimmedName, ...prev]);
    }

    setShowCmModal(false);
  };

  const handleToggleCm = (cm) => {
    updateConnectedMarket(cm.id, { active: !cm.active });
  };

  const handleDeleteConfirmed = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'route') {
      deleteMarketRoute(deleteConfirm.id);
      if (expandedRouteId === deleteConfirm.id) setExpandedRouteId(null);
    } else {
      deleteConnectedMarket(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  const handleAddNewPlaceToDirectory = (e) => {
    e.preventDefault();
    if (!newPlaceName.trim()) return;
    const name = newPlaceName.trim();
    if (!masterMarketGroups.some(p => p.toLowerCase() === name.toLowerCase())) {
      setMasterMarketGroups(prev => [name, ...prev]);
    }
    setNewPlaceName('');
  };

  const getCmsForRoute = (routeId) =>
    connectedMarkets.filter(c => c.routeId === routeId).sort((a, b) => (a.priority || 99) - (b.priority || 99));

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase flex items-center gap-2">
            <Map className="w-6 h-6 text-red-700" />
            MARKET ROUTES & CONNECTED MARKETS MASTER
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Two-Level Market Structure: <strong>Market Route</strong> (e.g., Akodia) → <strong>Connected Markets</strong> (e.g., Gulana, Mohammad Kheda, Bolai)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddRoute}
            className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            + ADD MARKET ROUTE
          </button>
        </div>
      </div>

      {/* Tabs: Routes Hierarchy vs Master Places Library */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('routes')}
          className={`pb-3 px-4 text-xs font-black uppercase transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'routes'
              ? 'border-red-700 text-red-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Market Routes Hierarchy ({marketRoutes.length} Routes)</span>
        </button>

        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3 px-4 text-xs font-black uppercase transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'directory'
              ? 'border-red-700 text-red-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>Master Places & Groups Directory ({masterMarketGroups.length} Places)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ROUTES & CONNECTED MARKETS LIST                                   */}
      {/* ========================================================================= */}
      {activeTab === 'routes' && (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex justify-between items-center">
            <div>
              <p className="font-bold uppercase tracking-wider text-amber-950">How It Works:</p>
              <p className="mt-0.5">
                1. Create a <strong>Market Route</strong> (e.g. <code>Akodia</code>, <code>Kalapipal</code>, <code>Pachore</code>).
              </p>
              <p>
                2. Inside that Route, attach <strong>Connected Markets / Mandis</strong> (e.g. <code>Gulana</code>, <code>Mohammad Kheda</code>, <code>Bolai</code>).
              </p>
              <p className="text-amber-800 font-semibold mt-1">
                Marketers assigned to a route can filter and view shops for any specific connected market or all at once!
              </p>
            </div>
          </div>

          {/* Route List */}
          <div className="space-y-3">
            {marketRoutes.length === 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
                No routes yet. Click <strong>+ ADD MARKET ROUTE</strong> to create the first route.
              </div>
            )}

            {marketRoutes.map((route) => {
              const cms = getCmsForRoute(route.id);
              const isExpanded = expandedRouteId === route.id;

              return (
                <div
                  key={route.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                >
                  {/* Route Header */}
                  <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => setExpandedRouteId(isExpanded ? null : route.id)}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center font-black text-sm flex-shrink-0">
                        <Map className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-base">{route.name} Route</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              route.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {route.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          {cms.length} Connected Markets • {route.notes || 'Main Territory'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openAddCm(route.id)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Connected Market</span>
                      </button>

                      <button
                        onClick={() => openEditRoute(route)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
                        title="Edit Route"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteConfirm({ type: 'route', id: route.id, name: route.name })}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                        title="Delete Route"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setExpandedRouteId(isExpanded ? null : route.id)}
                        className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
                      </button>
                    </div>
                  </div>

                  {/* Connected Markets Accordion Body */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                          CONNECTED MARKETS IN {route.name.toUpperCase()} ROUTE ({cms.length})
                        </span>
                      </div>

                      {cms.length === 0 ? (
                        <p className="py-4 text-center text-xs text-slate-400 font-bold">
                          No connected markets added yet. Click "Add Connected Market" above.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {cms.map((cm) => (
                            <div
                              key={cm.id}
                              className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex justify-between items-center"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-red-600" />
                                  <span className="font-extrabold text-xs text-slate-900">{cm.name}</span>
                                </div>
                                {cm.distanceKm && (
                                  <p className="text-[10px] text-slate-400 font-semibold pl-5">
                                    {cm.distanceKm} KM • Priority: #{cm.priority || 1}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditCm(cm)}
                                  className="p-1 text-slate-400 hover:text-slate-700"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm({ type: 'cm', id: cm.id, name: cm.name })}
                                  className="p-1 text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MASTER PLACES DIRECTORY (100+ PLACES)                             */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase">
                Master Places, Townships & Mandi Directory
              </h2>
              <p className="text-xs text-slate-500">
                All 100+ market groups provided for your business. Use these place names when creating Routes or Connected Markets.
              </p>
            </div>

            {/* Add New Place Form */}
            <form onSubmit={handleAddNewPlaceToDirectory} className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={newPlaceName}
                onChange={(e) => setNewPlaceName(e.target.value)}
                placeholder="+ Add New Town/Mandi Name"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl font-black text-xs shadow-xs"
              >
                Add Place
              </button>
            </form>
          </div>

          {/* Search Place */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={directorySearch}
              onChange={(e) => setDirectorySearch(e.target.value)}
              placeholder="Search in 100+ place names..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:ring-2 focus:ring-red-600 outline-none"
            />
          </div>

          {/* Places Chips Grid */}
          <div className="flex flex-wrap gap-2 max-h-[60vh] overflow-y-auto p-1">
            {masterMarketGroups
              .filter(p => !directorySearch || p.toLowerCase().includes(directorySearch.toLowerCase()))
              .map((place, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <MapPin className="w-3 h-3 text-red-600 flex-shrink-0" />
                  <span>{place}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT ROUTE WITH MASTER PLACE PICKER & CONNECTED MARKETS   */}
      {/* ========================================================================= */}
      {showRouteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {editingRoute ? 'EDIT MARKET ROUTE' : 'ADD NEW MARKET ROUTE'}
                </h2>
                <p className="text-xs text-slate-500">
                  Select route name from your 100+ master place list and pick connected markets.
                </p>
              </div>
              <button onClick={() => setShowRouteModal(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-4 text-xs">
              {/* Route Name Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">1. Route Name *</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Search or enter route name (e.g. Akodia, Kalapipal, Pachore)"
                    value={routeForm.name}
                    onChange={(e) => {
                      setRouteForm((f) => ({ ...f, name: e.target.value }));
                      setRouteSearchQuery(e.target.value);
                    }}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
                  />

                  {/* Quick Pick suggestions from Master Places */}
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-xl">
                    {filteredRoutePlaces.slice(0, 15).map((place, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setRouteForm((f) => ({ ...f, name: place }))}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          routeForm.name.toLowerCase() === place.toLowerCase()
                            ? 'bg-red-700 text-white'
                            : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {place}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Connected Markets Multi-Picker */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">
                  2. Select Connected Markets for this Route ({routeForm.selectedCms.length} Selected)
                </label>
                <p className="text-[10px] text-slate-400 mb-1.5">
                  Pick places from your 100+ master list that belong under this route (e.g. For Akodia: Gulana, Mohammad Kheda, Bolai, etc.).
                </p>

                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={cmSearchQuery}
                      onChange={(e) => setCmSearchQuery(e.target.value)}
                      placeholder="Filter connected market places..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                    {filteredCmPlaces.map((place, idx) => {
                      const isSelected = routeForm.selectedCms.some(c => c.toLowerCase() === place.toLowerCase());
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (isSelected) {
                              setRouteForm(f => ({ ...f, selectedCms: f.selectedCms.filter(c => c.toLowerCase() !== place.toLowerCase()) }));
                            } else {
                              setRouteForm(f => ({ ...f, selectedCms: [...f.selectedCms, place] }));
                            }
                          }}
                          className={`p-1.5 rounded-lg border text-[11px] font-bold cursor-pointer flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'bg-red-50 border-red-500 text-red-950 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          )}
                          <span className="truncate">{place}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">Notes / Area Details</label>
                <input
                  type="text"
                  placeholder="e.g., Shajapur District – main route"
                  value={routeForm.notes}
                  onChange={(e) => setRouteForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-red-600 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRouteModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-700 hover:bg-red-800 text-white font-black rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {editingRoute ? 'Save Changes' : 'Create Route & Markets ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT SINGLE CONNECTED MARKET                              */}
      {/* ========================================================================= */}
      {showCmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {editingCm ? 'EDIT CONNECTED MARKET' : 'ADD CONNECTED MARKET'}
                </h2>
                <p className="text-xs text-slate-500">
                  Under Route: <strong>{marketRoutes.find(r => r.id === cmParentRouteId)?.name}</strong>
                </p>
              </div>
              <button onClick={() => setShowCmModal(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCm} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">Market / Village Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Gulana, Mohammad Kheda, Bolai"
                  value={cmForm.name}
                  onChange={(e) => {
                    setCmForm((f) => ({ ...f, name: e.target.value }));
                    setCmSearchQuery(e.target.value);
                  }}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                />

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-xl mt-1.5">
                  {filteredCmPlaces.slice(0, 10).map((place, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setCmForm((f) => ({ ...f, name: place }))}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-slate-700 hover:bg-amber-100 border border-slate-200"
                    >
                      {place}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Distance (KM)</label>
                  <input
                    type="number"
                    placeholder="e.g., 65"
                    value={cmForm.distanceKm}
                    onChange={(e) => setCmForm((f) => ({ ...f, distanceKm: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2 font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Priority (Order)</label>
                  <input
                    type="number"
                    placeholder="e.g., 1"
                    value={cmForm.priority}
                    onChange={(e) => setCmForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2 font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCmModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {editingCm ? 'Save Changes' : 'Add Market ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE CONFIRMATION                                             */}
      {/* ========================================================================= */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="font-black text-slate-900">CONFIRM DELETE</h2>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-700">
              Are you sure you want to delete <strong className="text-red-700">"{deleteConfirm.name}"</strong>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 text-xs"
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
