import React from 'react';
import { useData } from '../../context/DataContext';
import { Shield, Clock } from 'lucide-react';

export default function AuditLogs() {
  const { auditLogs } = useData();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">SYSTEM AUDIT TRAIL LOGS</h1>
          <p className="text-xs text-slate-500 font-medium">Immutability log for tracking record creations, route modifications, and Target changes</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-amber-300 uppercase text-[10px] font-bold">
            <tr>
              <th className="p-3.5">Timestamp</th>
              <th className="p-3.5">User</th>
              <th className="p-3.5">Role</th>
              <th className="p-3.5">Action</th>
              <th className="p-3.5">Record Identifier</th>
              <th className="p-3.5">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400 font-bold font-sans">
                  No system audit logs recorded yet today.
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-slate-800">{log.date} {log.time}</td>
                  <td className="p-3.5 font-extrabold text-slate-900">{log.user}</td>
                  <td className="p-3.5 text-slate-600 font-bold">{log.role}</td>
                  <td className="p-3.5 text-emerald-700 font-black">{log.action}</td>
                  <td className="p-3.5 font-bold text-slate-800">{log.record}</td>
                  <td className="p-3.5 text-slate-500 max-w-xs truncate">{log.newValue}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
