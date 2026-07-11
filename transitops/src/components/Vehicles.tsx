import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Vehicle, VehicleType, VehicleStatus } from '../types';
import { formatIndianCurrency } from '../utils';

interface VehiclesProps {
  currentRole: string;
  showToast: (msg: string, type?: 'success' | 'warning' | 'danger') => void;
  triggerRefreshSignal: () => void;
}

export default function Vehicles({ currentRole, showToast, triggerRefreshSignal }: VehiclesProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [retireConfirmId, setRetireConfirmId] = useState<string | null>(null);

  // Form fields
  const [regNum, setRegNum] = useState('');
  const [nameModel, setNameModel] = useState('');
  const [type, setType] = useState<VehicleType>('Van');
  const [maxCapacity, setMaxCapacity] = useState(1500);
  const [odometer, setOdometer] = useState(0);
  const [acquisitionCost, setAcquisitionCost] = useState(30000);
  const [region, setRegion] = useState<'North' | 'South' | 'East' | 'West'>('North');

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const res = await api.getVehicles({
        type: typeFilter,
        status: statusFilter,
        region: regionFilter,
        search: search,
      });
      setVehicles(res.vehicles);
    } catch (error: any) {
      showToast('Failed to fetch vehicles.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [search, typeFilter, statusFilter, regionFilter]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNum || !nameModel || maxCapacity <= 0 || odometer < 0 || acquisitionCost <= 0) {
      showToast('Please check all input values.', 'warning');
      return;
    }

    try {
      await api.registerVehicle({
        registrationNumber: regNum.trim().toUpperCase(),
        nameModel,
        type,
        maxCapacity,
        odometer,
        acquisitionCost,
        region,
      });
      showToast(`Vehicle ${regNum.toUpperCase()} registered successfully!`, 'success');
      setShowAddModal(false);
      resetForm();
      fetchVehicles();
      triggerRefreshSignal();
    } catch (error: any) {
      showToast(error.message || 'Failed to register vehicle.', 'danger');
    }
  };

  const handleEditClick = (v: Vehicle) => {
    setSelectedVehicle(v);
    setNameModel(v.nameModel);
    setType(v.type);
    setMaxCapacity(v.maxCapacity);
    setOdometer(v.odometer);
    setAcquisitionCost(v.acquisitionCost);
    setRegion(v.region);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    try {
      await api.updateVehicle(selectedVehicle.registrationNumber, {
        nameModel,
        type,
        maxCapacity,
        odometer,
        acquisitionCost,
        region,
      });
      showToast(`Vehicle ${selectedVehicle.registrationNumber} details updated successfully.`, 'success');
      setShowEditModal(false);
      resetForm();
      fetchVehicles();
      triggerRefreshSignal();
    } catch (error: any) {
      showToast(error.message || 'Failed to update vehicle details.', 'danger');
    }
  };

  const handleRetireClick = async (registrationNumber: string) => {
    if (retireConfirmId !== registrationNumber) {
      setRetireConfirmId(registrationNumber);
      // Automatically reset after 3 seconds if not confirmed
      setTimeout(() => {
        setRetireConfirmId(prev => prev === registrationNumber ? null : prev);
      }, 3000);
      return;
    }

    setRetireConfirmId(null);
    try {
      await api.retireVehicle(registrationNumber);
      showToast(`Vehicle ${registrationNumber} has been successfully retired.`, 'success');
      fetchVehicles();
      triggerRefreshSignal();
    } catch (error: any) {
      showToast(error.message || 'Failed to retire vehicle.', 'danger');
    }
  };

  const resetForm = () => {
    setRegNum('');
    setNameModel('');
    setType('Van');
    setMaxCapacity(1500);
    setOdometer(0);
    setAcquisitionCost(30000);
    setRegion('North');
    setSelectedVehicle(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-white tracking-tight">Vehicle Registry</h2>
          <p className="text-xs text-slate-400">Master inventory of operational transport units, capacities, and costs</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input
              type="text"
              placeholder="Search registration or model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-indigo-500 w-56 transition-all"
            />
          </div>
          {currentRole === 'Fleet Manager' && (
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="btn-primary py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
            >
              <i className="fas fa-plus"></i> Register Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filter by Type</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3.5 py-2 text-xs outline-none cursor-pointer hover:border-indigo-500/50"
          >
            <option value="All">All Types</option>
            <option value="Truck">Trucks</option>
            <option value="Van">Vans</option>
            <option value="Trailer">Trailers</option>
            <option value="Sedan">Sedans</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filter by Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3.5 py-2 text-xs outline-none cursor-pointer hover:border-indigo-500/50"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filter by Region</span>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3.5 py-2 text-xs outline-none cursor-pointer hover:border-indigo-500/50"
          >
            <option value="All">All Regions</option>
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="East">East</option>
            <option value="West">West</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="table-responsive w-full overflow-x-auto">
          <table className="data-table w-full border-collapse text-left text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Registration</th>
                <th className="p-4">Name/Model</th>
                <th className="p-4">Type</th>
                <th className="p-4">Cargo Capacity</th>
                <th className="p-4">Odometer</th>
                <th className="p-4">Acq. Cost</th>
                <th className="p-4">Region</th>
                <th className="p-4">Status</th>
                <th className="p-4">Running Costs</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-xs text-slate-500">
                    <span className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-xs text-slate-500">
                    No vehicles found matching filters.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.registrationNumber} className="border-b border-slate-800 hover:bg-indigo-500/[0.02] transition-all">
                    <td className="p-4 font-mono font-bold text-white text-xs">{v.registrationNumber}</td>
                    <td className="p-4 text-xs font-semibold">{v.nameModel}</td>
                    <td className="p-4 text-xs">
                      <span className="badge px-2.5 py-1 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 rounded-full">
                        {v.type}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-medium font-mono">{v.maxCapacity.toLocaleString()} kg</td>
                    <td className="p-4 text-xs font-medium font-mono">{v.odometer.toLocaleString()} km</td>
                    <td className="p-4 text-xs font-medium font-mono">{formatIndianCurrency(v.acquisitionCost)}</td>
                    <td className="p-4 text-xs font-semibold">{v.region}</td>
                    <td className="p-4 text-xs">
                      <span className={`badge status-${v.status.toLowerCase().replace(' ', '')}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-semibold font-mono text-cyan-400">
                      {v.runningCost ? formatIndianCurrency(v.runningCost) : formatIndianCurrency(0)}
                    </td>
                    <td className="p-4 text-right">
                      {currentRole === 'Fleet Manager' ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEditClick(v)}
                            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1"
                          >
                            <i className="fas fa-edit text-slate-500"></i> Edit
                          </button>
                          {v.status !== 'Retired' && (
                            <button
                              onClick={() => handleRetireClick(v.registrationNumber)}
                              className={`px-2.5 py-1.5 border text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                                retireConfirmId === v.registrationNumber
                                  ? "bg-red-600 border-red-600 text-white hover:bg-red-700 animate-pulse"
                                  : "bg-slate-950 border-red-950/40 hover:border-red-500 text-red-500 hover:text-white hover:bg-red-500/10"
                              }`}
                            >
                              <i className="fas fa-archive"></i>
                              {retireConfirmId === v.registrationNumber ? "Confirm Retire?" : "Retire"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">View Only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD VEHICLE MODAL --- */}
      {showAddModal && (
        <div className="modal-overlay active">
          <div className="modal-content max-w-xl w-full">
            <div className="modal-header">
              <h3 className="modal-title text-white">Register Fleet Vehicle</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body flex flex-col gap-4">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Registration Number (Unique)*</label>
                    <input
                      type="text"
                      className="input-control mt-1"
                      placeholder="e.g. TRK-09"
                      value={regNum}
                      onChange={(e) => setRegNum(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Model Name*</label>
                    <input
                      type="text"
                      className="input-control mt-1"
                      placeholder="e.g. Scania Heavy"
                      value={nameModel}
                      onChange={(e) => setNameModel(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Vehicle Type*</label>
                    <select
                      className="input-control mt-1 mt-1 cursor-pointer"
                      value={type}
                      onChange={(e) => setType(e.target.value as VehicleType)}
                      required
                    >
                      <option value="Van">Van</option>
                      <option value="Truck">Truck</option>
                      <option value="Trailer">Trailer</option>
                      <option value="Sedan">Sedan</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Max Cargo Capacity (kg)*</label>
                    <input
                      type="number"
                      className="input-control mt-1"
                      min={1}
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Starting Odometer (km)*</label>
                    <input
                      type="number"
                      className="input-control mt-1"
                      min={0}
                      value={odometer}
                      onChange={(e) => setOdometer(parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Acquisition Cost (₹)*</label>
                    <input
                      type="number"
                      className="input-control mt-1"
                      min={1}
                      value={acquisitionCost}
                      onChange={(e) => setAcquisitionCost(parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group form-grid-full">
                    <label className="text-xs font-bold text-slate-400">Primary Dispatch Region*</label>
                    <select
                      className="input-control mt-1 cursor-pointer"
                      value={region}
                      onChange={(e) => setRegion(e.target.value as any)}
                      required
                    >
                      <option value="North">North</option>
                      <option value="South">South</option>
                      <option value="East">East</option>
                      <option value="West">West</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Register Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT VEHICLE MODAL --- */}
      {showEditModal && selectedVehicle && (
        <div className="modal-overlay active">
          <div className="modal-content max-w-xl w-full">
            <div className="modal-header">
              <h3 className="modal-title text-white">Edit Fleet Vehicle ({selectedVehicle.registrationNumber})</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body flex flex-col gap-4">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Registration Number (Locked)</label>
                    <input
                      type="text"
                      className="input-control mt-1 bg-slate-950 text-slate-500 border-slate-900 cursor-not-allowed"
                      value={selectedVehicle.registrationNumber}
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Model Name*</label>
                    <input
                      type="text"
                      className="input-control mt-1"
                      value={nameModel}
                      onChange={(e) => setNameModel(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Vehicle Type*</label>
                    <select
                      className="input-control mt-1 cursor-pointer"
                      value={type}
                      onChange={(e) => setType(e.target.value as VehicleType)}
                      required
                    >
                      <option value="Van">Van</option>
                      <option value="Truck">Truck</option>
                      <option value="Trailer">Trailer</option>
                      <option value="Sedan">Sedan</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Max Cargo Capacity (kg)*</label>
                    <input
                      type="number"
                      className="input-control mt-1"
                      min={1}
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Current Odometer (km)*</label>
                    <input
                      type="number"
                      className="input-control mt-1"
                      min={0}
                      value={odometer}
                      onChange={(e) => setOdometer(parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Acquisition Cost (₹)*</label>
                    <input
                      type="number"
                      className="input-control mt-1"
                      min={1}
                      value={acquisitionCost}
                      onChange={(e) => setAcquisitionCost(parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group form-grid-full">
                    <label className="text-xs font-bold text-slate-400">Primary Dispatch Region*</label>
                    <select
                      className="input-control mt-1 cursor-pointer"
                      value={region}
                      onChange={(e) => setRegion(e.target.value as any)}
                      required
                    >
                      <option value="North">North</option>
                      <option value="South">South</option>
                      <option value="East">East</option>
                      <option value="West">West</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Update Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
