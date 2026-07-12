-- TransitOps Database Schema
-- Run this first: createdb transitops

CREATE TYPE user_role AS ENUM ('fleet_manager', 'driver', 'safety_officer', 'financial_analyst');
CREATE TYPE vehicle_status AS ENUM ('Available', 'On Trip', 'In Shop', 'Retired');
CREATE TYPE driver_status AS ENUM ('Available', 'On Trip', 'Off Duty', 'Suspended');
CREATE TYPE trip_status AS ENUM ('Draft', 'Dispatched', 'Completed', 'Cancelled');
CREATE TYPE maintenance_status AS ENUM ('Open', 'Closed');

-- ========== USERS (Task 1 owns) ==========
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========== VEHICLES (Task 1 owns) ==========
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,           -- e.g. Truck, Van, Bike
    max_load_capacity_kg NUMERIC(10,2) NOT NULL CHECK (max_load_capacity_kg > 0),
    odometer_km NUMERIC(10,2) DEFAULT 0,
    acquisition_cost NUMERIC(12,2) NOT NULL,
    region VARCHAR(100),
    status vehicle_status NOT NULL DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========== DRIVERS (Task 1 owns) ==========
CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    license_category VARCHAR(20) NOT NULL,   -- e.g. LMV, HMV
    license_expiry_date DATE NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    safety_score NUMERIC(5,2) DEFAULT 100,
    status driver_status NOT NULL DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========== TRIPS (Task 1 owns) ==========
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    source VARCHAR(150) NOT NULL,
    destination VARCHAR(150) NOT NULL,
    vehicle_id INT NOT NULL REFERENCES vehicles(id),
    driver_id INT NOT NULL REFERENCES drivers(id),
    cargo_weight_kg NUMERIC(10,2) NOT NULL CHECK (cargo_weight_kg > 0),
    planned_distance_km NUMERIC(10,2) NOT NULL,
    actual_distance_km NUMERIC(10,2),        -- filled on completion
    fuel_consumed_liters NUMERIC(10,2),      -- filled on completion
    status trip_status NOT NULL DEFAULT 'Draft',
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    dispatched_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP
);

-- ========== MAINTENANCE LOGS (Task 2 owns) ==========
CREATE TABLE maintenance_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INT NOT NULL REFERENCES vehicles(id),
    description VARCHAR(255) NOT NULL,    -- e.g. Oil Change
    cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    status maintenance_status NOT NULL DEFAULT 'Open',
    opened_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP
);

-- ========== FUEL LOGS (Task 2 owns) ==========
CREATE TABLE fuel_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INT NOT NULL REFERENCES vehicles(id),
    liters NUMERIC(10,2) NOT NULL CHECK (liters > 0),
    cost NUMERIC(10,2) NOT NULL CHECK (cost >= 0),
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========== EXPENSES (Task 2 owns) ==========
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    vehicle_id INT NOT NULL REFERENCES vehicles(id),
    type VARCHAR(50) NOT NULL,     -- e.g. Toll, Fine
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes VARCHAR(255)
);

-- Indexes for common lookups
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_maintenance_vehicle ON maintenance_logs(vehicle_id);
CREATE INDEX idx_fuel_vehicle ON fuel_logs(vehicle_id);