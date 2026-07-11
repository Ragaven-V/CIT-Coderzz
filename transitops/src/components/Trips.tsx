import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Trip, Vehicle, Driver, TripStatus } from '../types';
import { formatIndianCurrency } from '../utils';

interface TripsProps {
  currentRole: string;
  showToast: (msg: string, type?: 'success' | 'warning' | 'danger') => void;
  triggerRefreshSignal: () => void;
  refreshSignal: number;
}

export default function Trips({ currentRole, showToast, triggerRefreshSignal, refreshSignal }: TripsProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTrip, setSelectedVehicleForTrip] = useState<Trip | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  // Form fields - Create
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [cargoWeight, setCargoWeight] = useState(500);
  const [distance, setDistance] = useState(100);
  const [revenue, setRevenue] = useState(1000);

  // Form fields - Complete
  const [finalOdometer, setFinalOdometer] = useState(0);
  const [fuelConsumed, setFuelConsumed] = useState(0);
  const [fuelCost, setFuelCost] = useState(0);
  const [startingOdometer, setStartingOdometer] = useState(0);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const tripRes = await api.getTrips();
      const vehicleRes = await api.getVehicles();
      const driverRes = await api.getDrivers();

      setTrips(tripRes.trips);
      setVehicles(vehicleRes.vehicles);
      setDrivers(driverRes.drivers);
    } catch (error) {
      showToast('Failed to load trips or roster data.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshSignal]);

  const isLicenseExpired = (expiryStr: string) => {
    const expiry = new Date(expiryStr);
    const today = new Date('2026-07-12');
    expiry.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    return expiry < today;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !destination || !vehicleId || !driverLicense || cargoWeight <= 0 || distance <= 0 || revenue <= 0) {
      showToast('Please check all input values.', 'warning');
      return;
    }

    // Client-side rule validations
    const selectedVehicle = vehicles.find(v => v.registrationNumber === vehicleId);
    if (selectedVehicle && cargoWeight > selectedVehicle.maxCapacity) {
      showToast(`Validation Failed: Cargo weight (${cargoWeight} kg) exceeds vehicle max capacity (${selectedVehicle.maxCapacity} kg)!`, 'danger');
      return;
    }

    const selectedDriver = drivers.find(d => d.licenseNumber === driverLicense);
    if (selectedDriver && isLicenseExpired(selectedDriver.licenseExpiry)) {
      showToast('Validation Failed: Selected driver license is expired. Assignment blocked.', 'danger');
      return;
    }

    try {
      await api.createTrip({
        source,
        destination,
        vehicleId,
        driverLicense,
        cargoWeight,
        distance,
        revenue,
      });
      showToast('Trip draft created successfully!', 'success');
      setShowAddModal(false);
      resetCreateForm();
      fetchData();
      triggerRefreshSignal();
    } catch (error: any) {
      showToast(error.message || 'Failed to create trip.', 'danger');
    }
  };

  const handleDispatch = async (tripId: string) => {
    try {
      await api.dispatchTrip(tripId);
      showToast(`Trip ${tripId} successfully dispatched! Assets updated to 'On Trip'.`, 'success');
      fetchData();
      triggerRefreshSignal();
    } catch (error: any) {
      showToast(error.message || 'Failed to dispatch trip.', 'danger');
    }
  };

  const handleOpenCompleteModal = (trip: Trip) => {
    const vehicle = vehicles.find(v => v.registrationNumber === trip.vehicleId);
    if (!vehicle) return;

    setSelectedVehicleForTrip(trip);
    setStartingOdometer(vehicle.odometer);
    setFinalOdometer(vehicle.odometer + trip.distance);
    
    // Estimate fuel consumption (Truck/Trailer: 35L per 100km, Van/Sedan: 10L per 100km)
    const factor = (vehicle.type === 'Truck' || vehicle.type === 'Trailer') ? 0.35 : 0.10;
    const estimatedFuel = Math.round(trip.distance * factor);
    setFuelConsumed(estimatedFuel);
    setFuelCost(Math.round(estimatedFuel * 1.5)); // standard scale

    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip) return;

    if (finalOdometer < startingOdometer) {
      showToast(`Final odometer (${finalOdometer} km) cannot be less than starting odometer (${startingOdometer} km).`, 'warning');
      return;
    }

    try {
      await api.completeTrip(selectedTrip.id, finalOdometer, fuelConsumed, fuelCost);
      showToast(`Trip ${selectedTrip.id} completed. Fuel logs and operational receipts filed!`, 'success');
      setShowCompleteModal(false);
      setSelectedVehicleForTrip(null);
      fetchData();
      triggerRefreshSignal();
    } catch (error: any) {
      showToast(error.message || 'Failed to log completion.', 'danger');
    }
  };

  const handleCancelTrip = async (tripId: string) => {
    if (cancelConfirmId !== tripId) {
      setCancelConfirmId(tripId);
      // Automatically reset after 3 seconds if not confirmed
      setTimeout(() => {
        setCancelConfirmId(prev => prev === tripId ? null : prev);
      }, 3000);
      return;
    }

    setCancelConfirmId(null);
    try {
      await api.cancelTrip(tripId);
      showToast(`Trip ${tripId} has been cancelled. Active assets released to Available.`, 'success');
      fetchData();
      triggerRefreshSignal();
    } catch (error: any) {
      showToast(error.message || 'Failed to cancel trip.', 'danger');
    }
  };

  const resetCreateForm = () => {
    setSource('');
    setDestination('');
    setVehicleId('');
    setDriverLicense('');
    setCargoWeight(500);
    setDistance(100);
    setRevenue(1000);
  };

  // Business Rule Filter: retired or in shop vehicles must never appear in dispatch selection
  const availableVehicles = vehicles.filter(v => v.status === 'Available');

  // Business Rule Filter: drivers with expired licenses or Suspended status cannot be assigned to trips
  const availableDrivers = drivers.filter(d => d.status === 'Available' && !isLicenseExpired(d.licenseExpiry));

  const isTripWriteable = currentRole === 'Fleet Manager' || currentRole === 'Dispatcher';

  return (
    <div className="flex flex-col gap-6">
      {/* Header Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-white tracking-tight">Trip Dispatch Center</h2>
          <p className="text-xs text-slate-400">Queue delivery routes, match vehicle loading limits, and dispatch active crews</p>
        </div>
        {isTripWriteable && (
          <button
            onClick={() => { resetCreateForm(); setShowAddModal(true); }}
            className="btn-primary py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
          >
            <i className="fas fa-plus"></i> Queue Dispatch Route
          </button>
        )}
      </div>

      {/* Trips Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-center gap-3">
          <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center text-lg text-slate-400">
            <i className="fas fa-map-marked-alt"></i>
          </div>
          <p className="text-xs">No dispatched or drafted routes logged yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((t) => {
            const vehicle = vehicles.find(v => v.registrationNumber === t.vehicleId);
            const driver = drivers.find(d => d.licenseNumber === t.driverLicense);

            return (
              <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                {/* Header */}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{t.id}</span>
                  <span className={`badge trip-${t.status.toLowerCase()}`}>
                    {t.status}
                  </span>
                </div>

                {/* Hub Map */}
                <div className="flex items-center gap-3 py-1">
                  <div className="text-sm font-bold text-white max-w-[120px] truncate">{t.source}</div>
                  <i className="fas fa-arrow-right text-slate-500 text-xs"></i>
                  <div className="text-sm font-bold text-white max-w-[120px] truncate">{t.destination}</div>
                </div>

                {/* Logistics breakdown */}
                <div className="border-t border-b border-slate-800/80 py-2.5 flex flex-col gap-1.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Vehicle assigned:</span>
                    <span className="font-semibold text-white font-mono">{t.vehicleId} {vehicle ? `(${vehicle.nameModel})` : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Driver assigned:</span>
                    <span className="font-semibold text-white">{driver ? driver.name : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cargo Weight:</span>
                    <span className="font-semibold text-white font-mono">{t.cargoWeight.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Planned Distance:</span>
                    <span className="font-semibold text-white font-mono">{t.distance} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Planned Revenue:</span>
                    <span className="font-bold text-emerald-400 font-mono">{formatIndianCurrency(t.revenue)}</span>
                  </div>
                  {t.status === 'Completed' && (
                    <>
                      <div className="flex justify-between border-t border-slate-800/50 mt-1 pt-1.5">
                        <span>Fuel Consumed:</span>
                        <span className="font-semibold text-white font-mono">{t.fuelConsumed} L</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Final Odometer:</span>
                        <span className="font-semibold text-white font-mono">{t.finalOdometer?.toLocaleString()} km</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                {isTripWriteable && (
                  <div className="mt-auto flex flex-col gap-2">
                    {t.status === 'Draft' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDispatch(t.id)}
                          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                        >
                          <i className="fas fa-shipping-fast"></i> Dispatch Route
                        </button>
                        <button
                          onClick={() => handleCancelTrip(t.id)}
                          className={`px-3 py-2 border rounded-xl transition-all ${
                            cancelConfirmId === t.id
                              ? "bg-red-600 border-red-600 text-white hover:bg-red-700 font-bold text-[10px] min-w-[70px] flex items-center justify-center animate-pulse"
                              : "bg-slate-950 border-slate-800 hover:border-red-500/50 text-red-500"
                          }`}
                          title={cancelConfirmId === t.id ? "Confirm Cancellation" : "Cancel Order"}
                        >
                          {cancelConfirmId === t.id ? "Confirm?" : <i className="fas fa-times"></i>}
                        </button>
                      </div>
                    )}

                    {t.status === 'Dispatched' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenCompleteModal(t)}
                          className="flex-1 py-2 bg-gradient-to-tr from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                        >
                          <i className="fas fa-clipboard-check"></i> Complete Log
                        </button>
                        <button
                          onClick={() => handleCancelTrip(t.id)}
                          className={`px-3 py-2 border rounded-xl transition-all ${
                            cancelConfirmId === t.id
                              ? "bg-red-600 border-red-600 text-white hover:bg-red-700 font-bold text-[10px] min-w-[70px] flex items-center justify-center animate-pulse"
                              : "bg-slate-950 border-slate-800 hover:border-red-500/50 text-red-500"
                          }`}
                          title={cancelConfirmId === t.id ? "Confirm Cancellation" : "Cancel Dispatched Order"}
                        >
                          {cancelConfirmId === t.id ? "Confirm?" : <i className="fas fa-times"></i>}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- QUEUE DISPATCH MODAL --- */}
      {showAddModal && (
        <div className="modal-overlay active">
          <div className="modal-content max-w-xl w-full">
            <div className="modal-header">
              <h3 className="modal-title text-white">Queue Dispatch Route</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body flex flex-col gap-4">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Source Hub*</label>
                    <input
                      type="text"
                      className="input-control mt-1"
                      placeholder="e.g. Chicago Warehouse"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Destination Hub*</label>
                    <input
                      type="text"
                      className="input-control mt-1"
                      placeholder="e.g. Detroit Terminal"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Select Available Vehicle*</label>
                    <select
                      className="input-control mt-1 cursor-pointer"
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Unit --</option>
                      {availableVehicles.map(v => (
                        <option key={v.registrationNumber} value={v.registrationNumber}>
                          {v.registrationNumber} - {v.nameModel} (Max: {v.maxCapacity} kg)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Select Available Driver*</label>
                    <select
                      className="input-control mt-1 cursor-pointer"
                      value={driverLicense}
                      onChange={(e) => setDriverLicense(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Crew Member --</option>
                      {availableDrivers.map(d => (
                        <option key={d.licenseNumber} value={d.licenseNumber}>
                          {d.name} ({d.licenseCategory})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Cargo Weight (kg)*</label>
                    <input
                      type="number"
                      className="input-control mt-1"
                      min={1}
                      value={cargoWeight}
                      onChange={(e) => setCargoWeight(parseInt(e.target.value))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400">Route Distance (km)*</label>
                    <input
                      type="number"
                      className="input-control mt-1"
                      min={1}
                      value={distance}
                      onChange={(e) => setDistance(parseInt(e.target.value))}
                      required
                    />
                  </div>

                  <div className="form-group form-grid-full">
                    <label className="text-xs font-bold text-slate-400">Estimated Gross Revenue (INR)*</label>
                    <input
                      type="number"
                      className="input-control mt-1"
                      min={1}
                      value={revenue}
                      onChange={(e) => setRevenue(parseInt(e.target.value))}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Queue Route (Draft)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LOG COMPLETION MODAL --- */}
      {showCompleteModal && selectedTrip && (
        <div className="modal-overlay active">
          <div className="modal-content max-w-md w-full">
            <div className="modal-header">
              <h3 className="modal-title text-white">Log Trip Completion ({selectedTrip.id})</h3>
              <button className="modal-close" onClick={() => { setShowCompleteModal(false); setSelectedVehicleForTrip(null); }}>&times;</button>
            </div>
            <form onSubmit={handleCompleteSubmit}>
              <div className="modal-body flex flex-col gap-4 text-slate-300">
                <div className="flex flex-col gap-1.5 bg-slate-950 p-4 border border-slate-800 rounded-xl text-xs">
                  <div className="flex justify-between">
                    <span>Assigned Vehicle ID:</span>
                    <span className="font-bold text-white font-mono">{selectedTrip.vehicleId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Starting Odometer:</span>
                    <span className="font-bold text-indigo-400 font-mono">{startingOdometer} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Route Distance:</span>
                    <span className="font-bold text-white font-mono">{selectedTrip.distance} km</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400">Final Odometer Reading (km)*</label>
                  <input
                    type="number"
                    className="input-control mt-1 w-full"
                    min={startingOdometer}
                    value={finalOdometer}
                    onChange={(e) => setFinalOdometer(parseInt(e.target.value))}
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1">Must be equal or greater than the starting odometer reading of {startingOdometer} km.</span>
                </div>

                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400">Total Fuel Consumed (Liters)*</label>
                  <input
                    type="number"
                    className="input-control mt-1 w-full"
                    min={1}
                    value={fuelConsumed}
                    onChange={(e) => setFuelConsumed(parseInt(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400">Fuel Expenditure Cost (INR)*</label>
                  <input
                    type="number"
                    className="input-control mt-1 w-full"
                    min={1}
                    value={fuelCost}
                    onChange={(e) => setFuelCost(parseInt(e.target.value))}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => { setShowCompleteModal(false); setSelectedVehicleForTrip(null); }}>Cancel</button>
                <button type="submit" className="btn-primary">Record Completion</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
