import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { MaintenanceLog, Vehicle } from '../types';
import { formatIndianCurrency } from '../utils';

interface MaintenanceProps {
  currentRole: string;
  showToast: (msg: string, type?: 'success' | 'warning' | 'danger') => void;
  triggerRefreshSignal: () => void;
  refreshSignal: number;
}

export default function Maintenance({ currentRole, showToast, triggerRefreshSignal, refreshSignal }: MaintenanceProps) {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [closeConfirmId, setCloseConfirmId] = useState<string | null>(null);

  // Form fields
  const [vehicleId, setVehicleId] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState(250);
  const [dateEntered, setDateEntered] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const logsRes = await api.getMaintenanceLogs();
      const vehiclesRes = await api.getVehicles();

      setLogs(logsRes.logs);
      setVehicles(vehiclesRes.vehicles);
    } catch (error) {
      showToast('Failed to load maintenance records.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshSignal]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !description || cost < 0 || !dateEntered) {
      showToast('Please check all input values.', 'warning');
      return;
    }

    // Business Rule Check: Cannot send vehicle to maintenance while active on a trip!
    const selectedVehicle = vehicles.find(v => v.registrationNumber === vehicleId);
    if (selectedVehicle && selectedVehicle.status === 'On Trip') {
      showToast(`Validation Failed: Vehicle ${vehicleId} is currently on a trip! Send to shop is blocked until completion.`, 'danger');
      return;
    }

    try {
      await api.createMaintenanceLog({
        vehicleId,
        description,
        cost,
        dateEntered,
      });
      showToast(`Maintenance log scheduled. Vehicle ${vehicleId} moved to In Shop status.`, 'success');
      setShowAddModal(false);
      resetForm();
      fetchData();
      triggerRefreshSignal();
    } catch (error: any) {
      showToast(error.message || 'Failed to file maintenance log.', 'danger');
    }
  };

  const handleCloseLog = async (id: string) => {
    if (closeConfirmId !== id) {
      setCloseConfirmId(id);
      // Automatically reset after 3 seconds if not confirmed
      setTimeout(() => {
        setCloseConfirmId(prev => prev === id ? null : prev);
      }, 3000);
      return;
    }

    setCloseConfirmId(null);
    try {
      await api.closeMaintenanceLog(id);
      showToast(`Maintenance log ${id} successfully closed. Vehicle restored to service.`, 'success');
      fetchData();
      triggerRefreshSignal();
    } catch (error: any) {
      showToast(error.message || 'Failed to close maintenance log.', 'danger');
    }
  };

  const resetForm = () => {
    setVehicleId('');
    setDescription('');
    setCost(250);
    setDateEntered(new Date('2026-07-12').toISOString().split('T')[0]);
  };

  // Eligible vehicles filter: exclude retired ones
  const activeVehicles = vehicles.filter(v => v.status !== 'Retired');

  return (
    <div className="flex flex-col gap-6">
      {/* Header Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-white tracking-tight">Maintenance Logs</h2>
          <p className="text-xs text-slate-400">Schedule servicing, track repair expenditures, and monitor fleet check-ins</p>
        </div>
        {currentRole === 'Fleet Manager' && (
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="btn-primary py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
          >
            <i className="fas fa-tools"></i> Log Servicing Cycle
          </button>
        )}
      </div>

      {/* Roster Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="table-responsive w-full overflow-x-auto">
          <table className="data-table w-full border-collapse text-left text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Log ID</th>
                <th className="p-4">Vehicle</th>
                <th className="p-4">Servicing Details</th>
                <th className="p-4">Repair Cost</th>
                <th className="p-4">Date Checked In</th>
                <th className="p-4">Date Completed</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-slate-500">
                    <span className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-slate-500">
                    No maintenance logs registered in system.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const vehicle = vehicles.find(v => v.registrationNumber === log.vehicleId);
                  return (
                    <tr key={log.id} className="border-b border-slate-800 hover:bg-indigo-500/[0.02] transition-all text-xs">
                      <td className="p-4 font-mono font-bold text-white text-xs">{log.id}</td>
                      <td className="p-4">
                        <span className="font-bold text-slate-200">{log.vehicleId}</span>
                        {vehicle && <span className="text-slate-500 block text-[10px]">{vehicle.nameModel}</span>}
                      </td>
                      <td className="p-4 font-medium text-slate-300 max-w-[280px] truncate" title={log.description}>{log.description}</td>
                      <td className="p-4 font-semibold font-mono text-amber-500">{formatIndianCurrency(log.cost)}</td>
                      <td className="p-4 font-medium font-mono text-slate-400">{log.dateEntered}</td>
                      <td className="p-4 font-medium font-mono text-slate-400">
                        {log.dateCompleted ? log.dateCompleted : <span className="text-amber-500 italic">In Progress</span>}
                      </td>
                      <td className="p-4">
                        <span className={`badge ${log.status === 'Active' ? 'status-inshop' : 'status-available'}`}>
                          {log.status === 'Active' ? 'In Workshop' : 'Closed'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {log.status === 'Active' && currentRole === 'Fleet Manager' ? (
                          <button
                            onClick={() => handleCloseLog(log.id)}
                            className={`px-2.5 py-1.5 border text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                              closeConfirmId === log.id
                                ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 animate-pulse"
                                : "bg-slate-950 border-emerald-950/40 hover:border-emerald-500 text-emerald-500 hover:text-white hover:bg-emerald-500/10"
                            }`}
                          >
                            <i className="fas fa-check-circle"></i>
                            {closeConfirmId === log.id ? "Confirm Close?" : "Close Log"}
                          </button>
                        ) : (
                          <span className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- SCHEDULE SERVICING MODAL --- */}
      {showAddModal && (
        <div className="modal-overlay active">
          <div className="modal-content max-w-md w-full">
            <div className="modal-header">
              <h3 className="modal-title text-white">Log Fleet Maintenance Record</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body flex flex-col gap-4">
                <div className="form-group flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-400">Select Target Vehicle*</label>
                  <select
                    className="input-control mt-1 cursor-pointer w-full text-slate-300"
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Unit --</option>
                    {activeVehicles.map(v => (
                      <option key={v.registrationNumber} value={v.registrationNumber} disabled={v.status === 'On Trip'}>
                        {v.registrationNumber} - {v.nameModel} {v.status === 'On Trip' ? '(Active on Trip - BLOCKED)' : `(Current: ${v.status})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-400">Servicing Description / Repair Work Needed*</label>
                  <textarea
                    className="input-control mt-1 w-full text-xs text-white"
                    placeholder="e.g. Engine Oil replacement, transmission check..."
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  ></textarea>
                </div>

                <div className="form-group flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-400">Estimated Cost of Repair (INR)*</label>
                  <input
                    type="number"
                    className="input-control mt-1 w-full"
                    min={0}
                    value={cost}
                    onChange={(e) => setCost(parseInt(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-400">Check In Date*</label>
                  <input
                    type="date"
                    className="input-control mt-1 w-full cursor-pointer text-slate-300"
                    value={dateEntered}
                    onChange={(e) => setDateEntered(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Send to Shop</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
