import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { SystemSettings } from '../types';

interface SettingsProps {
  showToast: (msg: string, type?: 'success' | 'warning' | 'danger') => void;
}

export default function Settings({ showToast }: SettingsProps) {
  const [depotName, setDepotName] = useState('Gandhinagar Depot GJT4');
  const [currency, setCurrency] = useState('INR (Rs)');
  const [distanceUnit, setDistanceUnit] = useState('Kilometers');
  const [passcode, setPasscode] = useState('TRANSIT_ADMIN_2026');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        if (data) {
          setDepotName(data.depotName || 'Gandhinagar Depot GJT4');
          setCurrency(data.currency || 'INR (Rs)');
          setDistanceUnit(data.distanceUnit || 'Kilometers');
          if (data.fleetManagerPasscode) {
            setPasscode(data.fleetManagerPasscode);
          }
        }
      } catch (error) {
        // Fallback to default
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.updateSettings({ depotName, currency, distanceUnit, fleetManagerPasscode: passcode });
      showToast('Settings updated successfully!', 'success');
    } catch (error) {
      showToast('Failed to update settings.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 font-sans" id="settings-screen">
      <div className="flex flex-col gap-1.5 border-b border-slate-800/60 pb-5">
        <h2 className="text-xl font-bold text-white tracking-tight">System Settings & RBAC Policy</h2>
        <p className="text-xs text-slate-500">Configure global workspace parameters and review access control permissions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left pane - General */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <i className="fas fa-sliders-h text-indigo-400 text-sm"></i>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">General Configurations</h3>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="form-group flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Depot Name</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                value={depotName}
                onChange={(e) => setDepotName(e.target.value)}
                placeholder="Gandhinagar Depot GJT4"
                required
              />
            </div>

            <div className="form-group flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Currency Code</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="INR (Rs)"
                required
              />
            </div>

            <div className="form-group flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Distance Unit</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                value={distanceUnit}
                onChange={(e) => setDistanceUnit(e.target.value)}
                placeholder="Kilometers"
                required
              />
            </div>

            <div className="form-group flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                <i className="fas fa-key"></i> Manager Signup Passcode
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="TRANSIT_ADMIN_2026"
                required
              />
              <span className="text-[9px] text-slate-500">
                This security key is required during signup for new Fleet Manager profiles to prevent unauthorized access.
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                'Save Changes'
              )}
            </button>
          </form>
        </div>

        {/* Right pane - RBAC Matrix */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <i className="fas fa-shield-alt text-indigo-400 text-sm"></i>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Role-Based Access Matrix (RBAC)</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Fleet</th>
                  <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Driver</th>
                  <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Trip</th>
                  <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Fuel/Exp</th>
                  <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Analytics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                <tr className="hover:bg-slate-850/20">
                  <td className="py-3.5 font-bold text-slate-200">Fleet Manager</td>
                  <td className="py-3.5 text-center"><span className="text-emerald-400 font-bold">✔</span></td>
                  <td className="py-3.5 text-center"><span className="text-emerald-400 font-bold">✔</span></td>
                  <td className="py-3.5 text-center"><span className="text-slate-600">—</span></td>
                  <td className="py-3.5 text-center"><span className="text-emerald-400 font-bold">✔</span></td>
                  <td className="py-3.5 text-center"><span className="text-emerald-400 font-bold">✔</span></td>
                </tr>
                <tr className="hover:bg-slate-850/20">
                  <td className="py-3.5 font-bold text-slate-200">Dispatcher</td>
                  <td className="py-3.5 text-center"><span className="text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded">View</span></td>
                  <td className="py-3.5 text-center"><span className="text-slate-600">—</span></td>
                  <td className="py-3.5 text-center"><span className="text-emerald-400 font-bold">✔</span></td>
                  <td className="py-3.5 text-center"><span className="text-slate-600">—</span></td>
                  <td className="py-3.5 text-center"><span className="text-slate-600">—</span></td>
                </tr>
                <tr className="hover:bg-slate-850/20">
                  <td className="py-3.5 font-bold text-slate-200">Safety Officer</td>
                  <td className="py-3.5 text-center"><span className="text-slate-600">—</span></td>
                  <td className="py-3.5 text-center"><span className="text-emerald-400 font-bold">✔</span></td>
                  <td className="py-3.5 text-center"><span className="text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded">View</span></td>
                  <td className="py-3.5 text-center"><span className="text-slate-600">—</span></td>
                  <td className="py-3.5 text-center"><span className="text-slate-600">—</span></td>
                </tr>
                <tr className="hover:bg-slate-850/20">
                  <td className="py-3.5 font-bold text-slate-200">Financial Analyst</td>
                  <td className="py-3.5 text-center"><span className="text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded">View</span></td>
                  <td className="py-3.5 text-center"><span className="text-slate-600">—</span></td>
                  <td className="py-3.5 text-center"><span className="text-slate-600">—</span></td>
                  <td className="py-3.5 text-center"><span className="text-emerald-400 font-bold">✔</span></td>
                  <td className="py-3.5 text-center"><span className="text-emerald-400 font-bold">✔</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-[10px] text-slate-500 italic">
            Note: Role assignment permissions are automatically enforced throughout the dashboard interface. Check columns represent full management capabilities, View represents read-only scopes, and dashes represent absolute restrictions.
          </div>
        </div>
      </div>
    </div>
  );
}
