import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Expense, Vehicle, ExpenseType, FuelLog } from '../types';
import { formatIndianCurrency } from '../utils';

interface ExpensesProps {
  currentRole: string;
  showToast: (msg: string, type?: 'success' | 'warning' | 'danger') => void;
  triggerRefreshSignal: () => void;
  refreshSignal: number;
}

export default function Expenses({ currentRole, showToast, triggerRefreshSignal, refreshSignal }: ExpensesProps) {
  const [activeTab, setActiveTab] = useState<'fuel' | 'expenses'>('fuel');
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);

  // Expense form fields
  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState<ExpenseType>('Tolls');
  const [cost, setCost] = useState(50);
  const [date, setDate] = useState('2026-07-12');
  const [description, setDescription] = useState('');

  // Fuel form fields
  const [fuelVehicleId, setFuelVehicleId] = useState('');
  const [fuelLiters, setFuelLiters] = useState(100);
  const [fuelCost, setFuelCost] = useState(120);
  const [fuelDate, setFuelDate] = useState('2026-07-12');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const expRes = await api.getExpenses();
      const vehiclesRes = await api.getVehicles();
      const fuelRes = await api.getFuelLogs();

      setExpenses(expRes.expenses);
      setVehicles(vehiclesRes.vehicles);
      setFuelLogs(fuelRes.fuelLogs);
    } catch (error) {
      showToast('Failed to load expenses ledger and fuel logs.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshSignal]);

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !type || cost <= 0 || !date || !description) {
      showToast('Please check all input values.', 'warning');
      return;
    }

    try {
      await api.logExpense({
        vehicleId,
        type,
        cost,
        date,
        description,
      });
      showToast('Expense receipt successfully logged and integrated.', 'success');
      setShowAddModal(false);
      resetExpenseForm();
      fetchData();
      triggerRefreshSignal();
    } catch (error: any) {
      showToast(error.message || 'Failed to file expense.', 'danger');
    }
  };

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelVehicleId || fuelLiters <= 0 || fuelCost <= 0 || !fuelDate) {
      showToast('Please check all input values.', 'warning');
      return;
    }

    try {
      await api.logFuel({
        vehicleId: fuelVehicleId,
        liters: fuelLiters,
        cost: fuelCost,
        date: fuelDate,
      });
      showToast('Fuel refuel log and cash expense logged.', 'success');
      setShowFuelModal(false);
      resetFuelForm();
      fetchData();
      triggerRefreshSignal();
    } catch (error: any) {
      showToast(error.message || 'Failed to file fuel log.', 'danger');
    }
  };

  const resetExpenseForm = () => {
    setVehicleId('');
    setType('Tolls');
    setCost(50);
    setDate('2026-07-12');
    setDescription('');
  };

  const resetFuelForm = () => {
    setFuelVehicleId('');
    setFuelLiters(100);
    setFuelCost(120);
    setFuelDate('2026-07-12');
  };

  // Exclude retired vehicles
  const activeVehicles = vehicles.filter(v => v.status !== 'Retired');

  const getCategoryBadgeClass = (category: ExpenseType) => {
    switch (category) {
      case 'Fuel':
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
      case 'Maintenance':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Tolls':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'Insurance':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const isWritable = currentRole === 'Fleet Manager' || currentRole === 'Dispatcher' || currentRole === 'Financial Analyst';

  // Compute operational totals for financial transparency
  const totalOperationCost = expenses.reduce((sum, item) => sum + item.cost, 0);
  const totalFuelCost = expenses.filter(e => e.type === 'Fuel').reduce((sum, item) => sum + item.cost, 0);
  const otherOperationCost = totalOperationCost - totalFuelCost;

  return (
    <div className="flex flex-col gap-6" id="expenses-screen">
      
      {/* Financial KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="expenses-kpi-summary">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm relative overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-indigo-500">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center text-xl">
            <i className="fas fa-wallet"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Operational Cost</span>
            <span className="text-2xl font-bold text-white mt-1 font-mono">{formatIndianCurrency(totalOperationCost)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm relative overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-cyan-500">
          <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-xl flex items-center justify-center text-xl">
            <i className="fas fa-gas-pump"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Fuel Cost</span>
            <span className="text-2xl font-bold text-white mt-1 font-mono">{formatIndianCurrency(totalFuelCost)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm relative overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-amber-500">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center text-xl">
            <i className="fas fa-tools"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Other Operational Costs</span>
            <span className="text-2xl font-bold text-white mt-1 font-mono">{formatIndianCurrency(otherOperationCost)}</span>
          </div>
        </div>
      </div>
      
      {/* Header and Subtabs */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-white tracking-tight">Fuel & Expenses Ledger</h2>
            <p className="text-xs text-slate-500">Track fuel refill histories and general operational expense receipts.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {isWritable && activeTab === 'fuel' && (
              <button
                onClick={() => { resetFuelForm(); setShowFuelModal(true); }}
                className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fas fa-gas-pump"></i> Log Refuel Entry
              </button>
            )}
            {isWritable && activeTab === 'expenses' && (
              <button
                onClick={() => { resetExpenseForm(); setShowAddModal(true); }}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fas fa-receipt"></i> Log Expense Receipt
              </button>
            )}
          </div>
        </div>

        {/* Custom Tab Switcher */}
        <div className="flex border-b border-slate-800/80">
          <button
            onClick={() => setActiveTab('fuel')}
            className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${activeTab === 'fuel' ? 'border-amber-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            <i className="fas fa-gas-pump mr-2"></i> Fuel Logs
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${activeTab === 'expenses' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            <i className="fas fa-file-invoice-dollar mr-2"></i> Expenses Log
          </button>
        </div>
      </div>

      {/* Main Lists Section */}
      {activeTab === 'fuel' ? (
        /* Fuel Logs Tab */
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="table-responsive w-full overflow-x-auto">
            <table className="data-table w-full border-collapse text-left text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Refuel ID</th>
                  <th className="p-4">Vehicle Unit</th>
                  <th className="p-4 text-center">Fuel Liters</th>
                  <th className="p-4 text-center">Refuel Cost</th>
                  <th className="p-4 text-center">Log Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-slate-500">
                      <span className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
                    </td>
                  </tr>
                ) : fuelLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-slate-500">
                      No fuel logs recorded.
                    </td>
                  </tr>
                ) : (
                  fuelLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-850/10 transition-all text-xs">
                      <td className="p-4 font-mono font-bold text-white text-xs">{log.id}</td>
                      <td className="p-4 font-bold text-slate-200">{log.vehicleId}</td>
                      <td className="p-4 text-center font-semibold text-slate-300 font-mono">{log.liters} L</td>
                      <td className="p-4 text-center font-bold font-mono text-emerald-400">{formatIndianCurrency(log.cost)}</td>
                      <td className="p-4 text-center font-semibold font-mono text-slate-500">{log.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* General Expenses Tab */
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="table-responsive w-full overflow-x-auto">
            <table className="data-table w-full border-collapse text-left text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Receipt ID</th>
                  <th className="p-4">Vehicle Unit</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Expense Date</th>
                  <th className="p-4">Item Description</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-slate-500">
                      <span className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-slate-500">
                      No expense items logged.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-slate-800 hover:bg-indigo-500/[0.02] transition-all text-xs">
                      <td className="p-4 font-mono font-bold text-white text-xs">{exp.id}</td>
                      <td className="p-4 font-bold text-slate-200">{exp.vehicleId}</td>
                      <td className="p-4">
                      <span className={`badge px-2 py-1 text-[10px] font-bold rounded-full ${getCategoryBadgeClass(exp.type)}`}>
                        {exp.type}
                      </span>
                      </td>
                      <td className="p-4 font-semibold font-mono text-emerald-400">{formatIndianCurrency(exp.cost)}</td>
                      <td className="p-4 font-medium font-mono text-slate-400">{exp.date}</td>
                      <td className="p-4 text-slate-300 font-medium" title={exp.description}>{exp.description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- FUEL REFUELLING MODAL --- */}
      {showFuelModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Log Fuel Refill Entry</h3>
              <button className="text-slate-500 hover:text-white font-bold text-base cursor-pointer" onClick={() => setShowFuelModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleFuelSubmit} className="flex flex-col gap-4">
              <div className="form-group flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Vehicle Unit*</label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition-all cursor-pointer"
                  value={fuelVehicleId}
                  onChange={(e) => setFuelVehicleId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Unit --</option>
                  {activeVehicles.map(v => (
                    <option key={v.registrationNumber} value={v.registrationNumber}>
                      {v.registrationNumber} - {v.nameModel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Liters Filled*</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition-all"
                    min={1}
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(parseInt(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cost charged*</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition-all"
                    min={1}
                    value={fuelCost}
                    onChange={(e) => setFuelCost(parseInt(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="form-group flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date Charged*</label>
                <input
                  type="date"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition-all cursor-pointer"
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-2">
                <button type="button" className="px-4 py-2 text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl cursor-pointer" onClick={() => setShowFuelModal(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 rounded-xl cursor-pointer">Log Refuel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- GENERAL EXPENSE MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Record General Expense Receipt</h3>
              <button className="text-slate-500 hover:text-white font-bold text-base cursor-pointer" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="flex flex-col gap-4">
              <div className="form-group flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Vehicle Unit*</label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Unit --</option>
                  {activeVehicles.map(v => (
                    <option key={v.registrationNumber} value={v.registrationNumber}>
                      {v.registrationNumber} - {v.nameModel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Expense Category*</label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  value={type}
                  onChange={(e) => setType(e.target.value as ExpenseType)}
                  required
                >
                  <option value="Fuel">Fuel Purchase (Volumetric estimation logged)</option>
                  <option value="Maintenance">Ad-hoc Maintenance Servicing</option>
                  <option value="Tolls">Road Tolls / Permits</option>
                  <option value="Insurance">Insurance / Registry Premiums</option>
                  <option value="Other">Other Miscellaneous Expenses</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Receipt Amount ($)*</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-indigo-500 transition-all"
                    min={1}
                    value={cost}
                    onChange={(e) => setCost(parseInt(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date Charged*</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Receipt Item Description*</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-indigo-500 transition-all"
                  placeholder="e.g. State road tolls for trip to Ohio"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-2">
                <button type="button" className="px-4 py-2 text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl cursor-pointer" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer">Record Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
