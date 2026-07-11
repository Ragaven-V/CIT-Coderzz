import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { KPIStats, Vehicle, MaintenanceLog, FuelLog, Expense } from '../types';
import { formatIndianCurrency } from '../utils';

interface DashboardProps {
  currentRole: string;
  showToast: (msg: string, type?: 'success' | 'warning' | 'danger') => void;
  onNavigate: (screen: string) => void;
  triggerRefreshSignal: number;
}

export default function Dashboard({ currentRole, showToast, onNavigate, triggerRefreshSignal }: DashboardProps) {
  const [kpis, setKpis] = useState<KPIStats>({
    activeVehicles: 0,
    availableVehicles: 0,
    maintenanceVehicles: 0,
    activeTrips: 0,
    pendingTrips: 0,
    driversOnDuty: 0,
    fleetUtilization: 0,
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters for chart/list data
  const [vType, setVType] = useState('All');
  const [vStatus, setVStatus] = useState('All');
  const [vRegion, setVRegion] = useState('All');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const kpiRes = await api.getDashboardKpis();
        const vehicleRes = await api.getVehicles({ type: vType, status: vStatus, region: vRegion });
        const maintRes = await api.getMaintenanceLogs();
        const expenseRes = await api.getExpenses();

        setKpis(kpiRes.stats);
        setVehicles(vehicleRes.vehicles);
        setMaintenance(maintRes.logs);
        setExpenses(expenseRes.expenses);
      } catch (error: any) {
        showToast('Failed to load dashboard statistics.', 'danger');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [vType, vStatus, vRegion, triggerRefreshSignal]);

  // SVG Chart: Fleet Status Donut Calculations
  const available = kpis.availableVehicles;
  const active = kpis.activeVehicles;
  const inShop = kpis.maintenanceVehicles;
  const total = available + active + inShop;

  // SVG Chart: Operational Costs Bar Chart Calculations
  // Get active fleet vehicles (excluding retired)
  const activeFleet = vehicles.filter(v => v.status !== 'Retired');
  const maxCost = activeFleet.length > 0 
    ? Math.max(...activeFleet.map(v => v.runningCost || 0), 500) 
    : 500;

  return (
    <div className="flex flex-col gap-6">
      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Dashboard View Controls</h3>
          <p className="text-xs text-slate-500">Filter operational KPIs and graphs in real-time</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</span>
            <select
              value={vType}
              onChange={(e) => setVType(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs outline-none cursor-pointer hover:border-indigo-500/50"
            >
              <option value="All">All Types</option>
              <option value="Truck">Trucks</option>
              <option value="Van">Vans</option>
              <option value="Trailer">Trailers</option>
              <option value="Sedan">Sedans</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</span>
            <select
              value={vStatus}
              onChange={(e) => setVStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs outline-none cursor-pointer hover:border-indigo-500/50"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="In Shop">In Shop</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Region</span>
            <select
              value={vRegion}
              onChange={(e) => setVRegion(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs outline-none cursor-pointer hover:border-indigo-500/50"
            >
              <option value="All">All Regions</option>
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="kpi-card bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm relative overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-indigo-500">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center text-xl">
            <i className="fas fa-truck-moving"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Vehicles</span>
            <span className="text-2xl font-bold text-white mt-1">{kpis.activeVehicles}</span>
          </div>
        </div>

        <div className="kpi-card bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm relative overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-emerald-500">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center text-xl">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Fleet</span>
            <span className="text-2xl font-bold text-white mt-1">{kpis.availableVehicles}</span>
          </div>
        </div>

        <div className="kpi-card bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm relative overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-amber-500">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center text-xl">
            <i className="fas fa-wrench"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Repair Shop</span>
            <span className="text-2xl font-bold text-white mt-1">{kpis.maintenanceVehicles}</span>
          </div>
        </div>

        <div className="kpi-card bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm relative overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-cyan-500">
          <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-xl flex items-center justify-center text-xl">
            <i className="fas fa-percentage"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fleet Utilization</span>
            <span className="text-2xl font-bold text-white mt-1">{kpis.fleetUtilization}%</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Analytics Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-white">Operational Cost Analysis (INR)</h3>
            <p className="text-xs text-slate-400">Total running cost (Fuel + Repairs) mapped against active registered vehicles</p>
          </div>
          <div className="h-64 w-full flex items-end justify-between px-2 pt-6 pb-2 border-b border-slate-800 relative">
            {activeFleet.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
                No active fleet vehicles logged in this context.
              </div>
            ) : (
              activeFleet.map((v, i) => {
                const cost = v.runningCost || 0;
                const percentage = (cost / maxCost) * 100;
                return (
                  <div key={v.registrationNumber} className="flex flex-col items-center justify-end h-full group relative w-full gap-2">
                    {/* Bar container with fixed height so percentage height works perfectly */}
                    <div className="h-44 w-full flex items-end justify-center relative">
                      {/* Hover tooltip */}
                      <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg z-10 pointer-events-none whitespace-nowrap">
                        {formatIndianCurrency(cost)}
                      </div>
                      {/* Bar */}
                      <div className="w-6 md:w-10 bg-indigo-600/20 group-hover:bg-indigo-500/20 border border-indigo-500/30 group-hover:border-indigo-500 rounded-t-lg transition-all flex items-end overflow-hidden" style={{ height: `${Math.max(percentage, 5)}%` }}>
                        <div className="w-full bg-gradient-to-t from-indigo-600 to-indigo-500" style={{ height: '100%' }}></div>
                      </div>
                    </div>
                    {/* Label */}
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">{v.registrationNumber}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Fleet Status Donut Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-white">Fleet Status Distribution</h3>
            <p className="text-xs text-slate-400">Ratios of running units vs repairs</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            {total === 0 ? (
              <span className="text-xs text-slate-500">No vehicles recorded.</span>
            ) : (
              <>
                <div className="relative w-40 h-40 flex items-center justify-center">
                  {/* Outer circle graphic */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#0f172a" strokeWidth="10" />
                    {/* Available Segment */}
                    {available > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth="10"
                        strokeDasharray={`${(available / total) * 251.2} 251.2`}
                        strokeDashoffset="0"
                      />
                    )}
                    {/* Active Segment */}
                    {active > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#06b6d4"
                        strokeWidth="10"
                        strokeDasharray={`${(active / total) * 251.2} 251.2`}
                        strokeDashoffset={`-${(available / total) * 251.2}`}
                      />
                    )}
                    {/* In Shop Segment */}
                    {inShop > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#f59e0b"
                        strokeWidth="10"
                        strokeDasharray={`${(inShop / total) * 251.2} 251.2`}
                        strokeDashoffset={`-${((available + active) / total) * 251.2}`}
                      />
                    )}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-extrabold text-white">{total}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Units</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                      <span>Available</span>
                    </div>
                    <span className="font-bold">{available} ({Math.round((available / total) * 100)}%)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-cyan-500 rounded-full"></span>
                      <span>On Active Trip</span>
                    </div>
                    <span className="font-bold">{active} ({Math.round((active / total) * 100)}%)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                      <span>In Maintenance</span>
                    </div>
                    <span className="font-bold">{inShop} ({Math.round((inShop / total) * 100)}%)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Panel Card */}
      <div className="flex flex-col gap-4">
        <h3 className="text-base font-bold text-white tracking-tight">Quick Actions Workspace</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="action-card bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:border-indigo-500/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center text-lg">
                <i className="fas fa-shipping-fast"></i>
              </div>
              <h4 className="font-bold text-white text-sm">Dispatch New Trip</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verify cargo loads, assign available vehicles and non-suspended drivers, and launch new transport orders instantly.
            </p>
            {(currentRole === 'Fleet Manager' || currentRole === 'Driver') ? (
              <button
                onClick={() => onNavigate('trips')}
                className="btn-primary mt-auto py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all"
              >
                Launch Dispatch Center
              </button>
            ) : (
              <span className="text-[10px] font-bold text-slate-500 mt-auto uppercase tracking-widest text-center py-2 bg-slate-950 rounded-xl border border-slate-800/50">
                Requires Fleet Manager / Driver
              </span>
            )}
          </div>

          <div className="action-card bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:border-amber-500/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center text-lg">
                <i className="fas fa-tools"></i>
              </div>
              <h4 className="font-bold text-white text-sm">Schedule Maintenance</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Take faulty or routine units out of active circulation and dispatch them straight into the workshop bays.
            </p>
            {currentRole === 'Fleet Manager' ? (
              <button
                onClick={() => onNavigate('maintenance')}
                className="btn-primary mt-auto py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all"
              >
                Schedule Servicing
              </button>
            ) : (
              <span className="text-[10px] font-bold text-slate-500 mt-auto uppercase tracking-widest text-center py-2 bg-slate-950 rounded-xl border border-slate-800/50">
                Requires Fleet Manager
              </span>
            )}
          </div>

          <div className="action-card bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:border-cyan-500/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/10 text-cyan-400 rounded-xl flex items-center justify-center text-lg">
                <i className="fas fa-file-invoice-dollar"></i>
              </div>
              <h4 className="font-bold text-white text-sm">Record Receipt Expense</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Quickly file operational receipts like state road tolls, insurance premiums, registrations, or off-trip fueling costs.
            </p>
            {(currentRole === 'Fleet Manager' || currentRole === 'Driver' || currentRole === 'Financial Analyst') ? (
              <button
                onClick={() => onNavigate('expenses')}
                className="btn-primary mt-auto py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all"
              >
                Log Expense Receipt
              </button>
            ) : (
              <span className="text-[10px] font-bold text-slate-500 mt-auto uppercase tracking-widest text-center py-2 bg-slate-950 rounded-xl border border-slate-800/50">
                Requires Manager / Analyst / Driver
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
