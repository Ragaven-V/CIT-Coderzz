/**
 * TransitOps - Backend API Service Layer
 */

import { Vehicle, Driver, Trip, MaintenanceLog, Expense, KPIStats, User, SystemSettings, FuelLog } from './types';

const API_BASE_URL = ''; // Same host as client since we run full-stack Express + Vite

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('transitops_token');
  }

  setToken(token: string) {
    localStorage.setItem('transitops_token', token);
  }

  clearToken() {
    localStorage.removeItem('transitops_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    const token = this.getToken();
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    return data as T;
  }

  // --- AUTH ---
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async register(name: string, email: string, password: string, role: string, passcode?: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, passcode }),
    });
    this.setToken(data.token);
    return data;
  }

  async getProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  // --- VEHICLES ---
  async getVehicles(filters: { type?: string; status?: string; region?: string; search?: string } = {}): Promise<{ vehicles: Vehicle[] }> {
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.status) params.set('status', filters.status);
    if (filters.region) params.set('region', filters.region);
    if (filters.search) params.set('search', filters.search);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ vehicles: Vehicle[] }>(`/api/vehicles${query}`);
  }

  async registerVehicle(vehicle: Omit<Vehicle, 'status'>): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicle),
    });
  }

  async updateVehicle(registrationNumber: string, vehicle: Partial<Vehicle>): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/vehicles/${registrationNumber}`, {
      method: 'PUT',
      body: JSON.stringify(vehicle),
    });
  }

  async retireVehicle(registrationNumber: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/vehicles/${registrationNumber}/retire`, {
      method: 'PUT',
    });
  }

  // --- DRIVERS ---
  async getDrivers(search?: string): Promise<{ drivers: Driver[] }> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<{ drivers: Driver[] }>(`/api/drivers${query}`);
  }

  async hireDriver(driver: Omit<Driver, 'status'>): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/drivers', {
      method: 'POST',
      body: JSON.stringify(driver),
    });
  }

  async updateDriver(licenseNumber: string, driver: Partial<Driver>): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/drivers/${licenseNumber}`, {
      method: 'PUT',
      body: JSON.stringify(driver),
    });
  }

  async toggleDriverSuspension(licenseNumber: string): Promise<{ message: string; nextStatus: string }> {
    return this.request<{ message: string; nextStatus: string }>(`/api/drivers/${licenseNumber}/suspend`, {
      method: 'PUT',
    });
  }

  // --- TRIPS ---
  async getTrips(): Promise<{ trips: Trip[] }> {
    return this.request<{ trips: Trip[] }>('/api/trips');
  }

  async createTrip(trip: Omit<Trip, 'id' | 'status'>): Promise<{ message: string; tripId: string }> {
    return this.request<{ message: string; tripId: string }>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(trip),
    });
  }

  async dispatchTrip(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/trips/${id}/dispatch`, {
      method: 'PUT',
    });
  }

  async completeTrip(id: string, finalOdometer: number, fuelConsumed: number, fuelCost: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/trips/${id}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ finalOdometer, fuelConsumed, fuelCost }),
    });
  }

  async cancelTrip(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/trips/${id}/cancel`, {
      method: 'PUT',
    });
  }

  // --- MAINTENANCE ---
  async getMaintenanceLogs(): Promise<{ logs: MaintenanceLog[] }> {
    return this.request<{ logs: MaintenanceLog[] }>('/api/maintenance');
  }

  async createMaintenanceLog(log: Omit<MaintenanceLog, 'id' | 'status'>): Promise<{ message: string; maintId: string }> {
    return this.request<{ message: string; maintId: string }>('/api/maintenance', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }

  async closeMaintenanceLog(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/maintenance/${id}/close`, {
      method: 'PUT',
    });
  }

  // --- EXPENSES ---
  async getExpenses(): Promise<{ expenses: Expense[] }> {
    return this.request<{ expenses: Expense[] }>('/api/expenses');
  }

  async logExpense(expense: Omit<Expense, 'id'>): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  }

  // --- ANALYTICS ---
  async getDashboardKpis(): Promise<{ stats: KPIStats }> {
    return this.request<{ stats: KPIStats }>('/api/dashboard/kpis');
  }

  async getReports(): Promise<{ reports: any[] }> {
    return this.request<{ reports: any[] }>('/api/reports');
  }

  // --- SETTINGS ---
  async getSettings(): Promise<SystemSettings> {
    return this.request<SystemSettings>('/api/settings');
  }

  async updateSettings(settings: SystemSettings): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  // --- FUEL LOGS ---
  async getFuelLogs(): Promise<{ fuelLogs: FuelLog[] }> {
    return this.request<{ fuelLogs: FuelLog[] }>('/api/fuel-logs');
  }

  async logFuel(fuel: { vehicleId: string; liters: number; cost: number; date: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/fuel-logs', {
      method: 'POST',
      body: JSON.stringify(fuel),
    });
  }
}

export const api = new ApiClient();
