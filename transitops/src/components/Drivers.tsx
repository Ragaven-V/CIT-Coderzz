import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Driver, LicenseCategory, DriverStatus } from '../types';

interface DriversProps {
  currentRole: string;
  showToast: (msg: string, type?: 'success' | 'warning' | 'danger') => void;
  triggerRefreshSignal: () => void;
}

export default function Drivers({ currentRole, showToast, triggerRefreshSignal }: DriversProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseCategory, setLicenseCategory] = useState<LicenseCategory>('Class C');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [safetyScore, setSafetyScore] = useState(100);
  const [status, setStatus] = useState<DriverStatus>('Available');

  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDrivers(search);
      setDrivers(res.drivers);
    } catch (error: any) {
      showToast('Failed to retrieve driver registry.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [search]);

  // Helper check for license expiration using current local date 2026-07-12
  const isLicenseExpired = (expiryStr: string) => {
    const expiry = new Date(expiryStr);
    const today = new Date('2026-07-12'); // Using designated system date
    expiry.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    return expiry < today;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !licenseNumber || !licenseExpiry || !contactNumber) {
      showToast('Please check all input values.', 'warning');
      return;
    }

    const cleanPhone = contactNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      showToast('Contact number must be exactly 10 digits.', 'warning');
      return;
    }

    try {
      await api.hireDriver({
        name,
        licenseNumber: licenseNumber.trim().toUpperCase(),
        licenseCategory,
        licenseExpiry,
        contactNumber: cleanPhone,
        safetyScore,
      });
      showToast(`Driver ${name} registered successfully!`, 'success');
      setShowAddModal(false);
      resetForm();
      fetchDrivers();
      triggerRefreshSignal();
    } catch (error: any) {
      showToast(error.message || 'Failed to hire driver.', 'danger');
    }
  };

  const handleEditClick = (d: Driver) => {
    setSelectedDriver(d);
    setName(d.name);
    setLicenseCategory(d.licenseCategory);
    setLicenseExpiry(d.licenseExpiry);
    setContactNumber(d.contactNumber);
    setSafetyScore(d.safetyScore);
    setStatus(d.status);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;

    const cleanPhone = contactNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      showToast('Contact number must be exactly 10 digits.', 'warning');
      return;
    }

    try {
      await api.updateDriver(selectedDriver.licenseNumber, {
        name,
        licenseCategory,
        licenseExpiry,
        contactNumber: cleanPhone,
        safetyScore,
        status,
      });
      showToast(`Driver ${name} updated successfully.`, 'success');
      setShowEditModal(false);
      resetForm();
      fetchDrivers();
      triggerRefreshSignal();
    } catch (error: any) {
      showToast(error.message || 'Failed to update driver.', 'danger');
    }
  };

  const handleToggleSuspension = async (licenseNumber: string) => {
    try {
      const res = await api.toggleDriverSuspension(licenseNumber);
      showToast(res.message, 'success');
      fetchDrivers();
      triggerRefreshSignal();
    } catch (error: any) {
      showToast(error.message || 'Failed to toggle suspension.', 'danger');
    }
  };

  const resetForm = () => {
    setName('');
    setLicenseNumber('');
    setLicenseCategory('Class C');
    setLicenseExpiry('');
    setContactNumber('');
    setSafetyScore(100);
    setStatus('Available');
    setSelectedDriver(null);
  };

  const isEditable = currentRole === 'Fleet Manager' || currentRole === 'Safety Officer';

  return (
    <div className="flex flex-col gap-6">
      {/* Header Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-white tracking-tight">Driver Directory</h2>
          <p className="text-xs text-slate-400">Manage driver credentials, contact rosters, and safety statistics</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input
              type="text"
              placeholder="Search name or license..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-indigo-500 w-56 transition-all"
            />
          </div>
          {isEditable && (
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="btn-primary py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
            >
              <i className="fas fa-user-plus"></i> Hire Driver
            </button>
          )}
        </div>
      </div>

      {/* Driver Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="table-responsive w-full overflow-x-auto">
          <table className="data-table w-full border-collapse text-left text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Driver Name</th>
                <th className="p-4">License Number</th>
                <th className="p-4">License Category</th>
                <th className="p-4">License Expiration</th>
                <th className="p-4">Contact Number</th>
                <th className="p-4">Safety Score</th>
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
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-slate-500">
                    No drivers logged in the directory.
                  </td>
                </tr>
              ) : (
                drivers.map((d) => {
                  const expired = isLicenseExpired(d.licenseExpiry);
                  return (
                    <tr key={d.licenseNumber} className="border-b border-slate-800 hover:bg-indigo-500/[0.02] transition-all">
                      <td className="p-4 text-xs font-semibold text-white">{d.name}</td>
                      <td className="p-4 font-mono font-bold text-xs">{d.licenseNumber}</td>
                      <td className="p-4 text-xs">
                        <span className="badge px-2.5 py-1 text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 rounded-full">
                          {d.licenseCategory}
                        </span>
                      </td>
                      <td className="p-4 text-xs">
                        {expired ? (
                          <span className="text-red-500 font-bold flex items-center gap-1.5">
                            <i className="fas fa-exclamation-circle animate-pulse"></i>
                            {d.licenseExpiry} (EXPIRED)
                          </span>
                        ) : (
                          <span className="text-slate-300 font-medium">{d.licenseExpiry}</span>
                        )}
                      </td>
                      <td className="p-4 text-xs font-mono font-medium text-slate-400">{d.contactNumber}</td>
                      <td className="p-4 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-mono">{d.safetyScore}/100</span>
                          <div className="w-16 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                            <div 
                              className={`h-full rounded-full ${d.safetyScore >= 90 ? 'bg-emerald-500' : d.safetyScore >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} 
                              style={{ width: `${d.safetyScore}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs">
                        <span className={`badge status-${d.status.toLowerCase().replace(' ', '')}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {isEditable ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleEditClick(d)}
                              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1"
                            >
                              <i className="fas fa-edit text-slate-500"></i> Edit
                            </button>
                            <button
                              onClick={() => handleToggleSuspension(d.licenseNumber)}
                              className={`px-2.5 py-1.5 bg-slate-950 border rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${d.status === 'Suspended' ? 'border-emerald-950/40 text-emerald-500 hover:bg-emerald-500/10' : 'border-red-950/40 text-red-500 hover:bg-red-500/10'}`}
                            >
                              {d.status === 'Suspended' ? (
                                <><i className="fas fa-check"></i> Activate</>
                              ) : (
                                <><i className="fas fa-ban"></i> Suspend</>
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">View Only</span>
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

      {/* --- ADD DRIVER MODAL --- */}
      {showAddModal && (
        <div className="modal-overlay active">
          <div className="modal-content max-w-xl w-full">
            <div className="modal-header">
              <h3 className="modal-title text-white">Hire New Driver</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body flex flex-col gap-4">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Driver Full Name*</label>
                    <input
                      type="text"
                      className="input-control mt-1"
                      placeholder="e.g. John Connor"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">License Number (Unique)*</label>
                    <input
                      type="text"
                      className="input-control mt-1"
                      placeholder="e.g. DL-400192"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">License Category*</label>
                    <select
                      className="input-control mt-1 cursor-pointer"
                      value={licenseCategory}
                      onChange={(e) => setLicenseCategory(e.target.value as LicenseCategory)}
                      required
                    >
                      <option value="Class A">Class A (Heavy Commercial Trucks)</option>
                      <option value="Class B">Class B (Commercial Buses/Vans)</option>
                      <option value="Class C">Class C (Standard Vehicles)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">License Expiry Date*</label>
                    <input
                      type="date"
                      className="input-control mt-1 cursor-pointer text-slate-300"
                      value={licenseExpiry}
                      onChange={(e) => setLicenseExpiry(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Contact Number*</label>
                    <input
                      type="tel"
                      className="input-control mt-1"
                      placeholder="e.g. 9876543210"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Starting Safety Score (0-100)</label>
                    <input
                      type="number"
                      className="input-control mt-1"
                      min={0}
                      max={100}
                      value={safetyScore}
                      onChange={(e) => setSafetyScore(parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Approve Hire</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT DRIVER MODAL --- */}
      {showEditModal && selectedDriver && (
        <div className="modal-overlay active">
          <div className="modal-content max-w-xl w-full">
            <div className="modal-header">
              <h3 className="modal-title text-white">Edit Driver Profile ({selectedDriver.name})</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body flex flex-col gap-4">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Driver Full Name*</label>
                    <input
                      type="text"
                      className="input-control mt-1"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">License Number (Locked)</label>
                    <input
                      type="text"
                      className="input-control mt-1 bg-slate-950 text-slate-500 border-slate-900 cursor-not-allowed"
                      value={selectedDriver.licenseNumber}
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">License Category*</label>
                    <select
                      className="input-control mt-1 cursor-pointer"
                      value={licenseCategory}
                      onChange={(e) => setLicenseCategory(e.target.value as LicenseCategory)}
                      required
                    >
                      <option value="Class A">Class A (Heavy Commercial Trucks)</option>
                      <option value="Class B">Class B (Commercial Buses/Vans)</option>
                      <option value="Class C">Class C (Standard Vehicles)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">License Expiry Date*</label>
                    <input
                      type="date"
                      className="input-control mt-1 cursor-pointer text-slate-300"
                      value={licenseExpiry}
                      onChange={(e) => setLicenseExpiry(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Contact Number*</label>
                    <input
                      type="tel"
                      className="input-control mt-1"
                      placeholder="e.g. 9876543210"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Safety Score (0-100)</label>
                    <input
                      type="number"
                      className="input-control mt-1"
                      min={0}
                      max={100}
                      value={safetyScore}
                      onChange={(e) => setSafetyScore(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="form-group form-grid-full">
                    <label className="text-xs font-bold text-slate-400">Driver Roster Status</label>
                    <select
                      className="input-control mt-1 cursor-pointer"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as DriverStatus)}
                    >
                      <option value="Available">Available & Active</option>
                      <option value="On Trip">On Active Trip</option>
                      <option value="Off Duty">Off Duty (Standard Rest)</option>
                      <option value="Suspended">Suspended (Blocked)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Update Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
