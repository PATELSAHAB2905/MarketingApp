import React from 'react';
import { useData } from '../../context/DataContext';
import { Fuel, IndianRupee, MapPin } from 'lucide-react';

export default function FuelManagement() {
  const { markets } = useData();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">FUEL / TRAVEL MANAGEMENT</h1>
          <p className="text-xs text-slate-500 font-medium">Configure distance rules, rate per KM, and max fuel limits per market route</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-amber-300 uppercase text-[10px] font-bold">
            <tr>
              <th className="p-3.5">Market Route</th>
              <th className="p-3.5">District</th>
              <th className="p-3.5 text-right">Approved Distance (KM)</th>
              <th className="p-3.5 text-right">Fuel Rate (₹/KM)</th>
              <th className="p-3.5 text-right">Expected Fuel Expense (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {markets.map((m) => {
              const expectedFuel = (m.distanceKm || 50) * (m.fuelRateKm || 2);
              return (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-black text-slate-900 uppercase">{m.name}</td>
                  <td className="p-3.5 text-slate-500 font-semibold">{m.district}</td>
                  <td className="p-3.5 text-right font-extrabold text-slate-800">{m.distanceKm || 80} KM</td>
                  <td className="p-3.5 text-right font-bold text-slate-700">₹{m.fuelRateKm || 2}/KM</td>
                  <td className="p-3.5 text-right font-black text-emerald-700 text-sm">₹{expectedFuel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
