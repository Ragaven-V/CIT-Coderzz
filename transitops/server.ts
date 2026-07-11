import express from 'express';
import path from 'path';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { createServer as createViteServer } from 'vite';

// --- CONFIGURATION ---
const PORT = 3000;
const JWT_SECRET = 'transitops_secret_key_2026_safe';
const DB_PATH = path.join(process.cwd(), 'transitops.db');

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE SERVICE ---
let db: Database.Database;

try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  console.log(`Connected to SQLite database at: ${DB_PATH}`);
} catch (error) {
  console.error('Failed to connect to SQLite database:', error);
  process.exit(1);
}

// Ensure database tables exist
function initDb() {
  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Fleet Manager', 'Driver', 'Dispatcher', 'Safety Officer', 'Financial Analyst')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 2. Vehicles Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      registration_number TEXT PRIMARY KEY,
      name_model TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Truck', 'Van', 'Trailer', 'Sedan')),
      max_capacity REAL NOT NULL CHECK(max_capacity > 0),
      odometer REAL NOT NULL DEFAULT 0,
      acquisition_cost REAL NOT NULL CHECK(acquisition_cost > 0),
      status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available', 'On Trip', 'In Shop', 'Retired')),
      region TEXT NOT NULL CHECK(region IN ('North', 'South', 'East', 'West')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 3. Drivers Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS drivers (
      license_number TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      license_category TEXT NOT NULL CHECK(license_category IN ('Class A', 'Class B', 'Class C')),
      license_expiry TEXT NOT NULL,
      contact_number TEXT NOT NULL,
      safety_score INTEGER NOT NULL DEFAULT 100 CHECK(safety_score >= 0 AND safety_score <= 100),
      status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available', 'On Trip', 'Off Duty', 'Suspended')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 4. Trips Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      destination TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      driver_license TEXT NOT NULL,
      cargo_weight REAL NOT NULL,
      distance REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')),
      revenue REAL NOT NULL DEFAULT 0,
      date_created TEXT DEFAULT (datetime('now')),
      date_dispatched TEXT,
      date_completed TEXT,
      final_odometer REAL,
      fuel_consumed REAL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(registration_number),
      FOREIGN KEY (driver_license) REFERENCES drivers(license_number)
    )
  `);

  // 5. Maintenance Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      description TEXT NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      date_entered TEXT NOT NULL,
      date_completed TEXT,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Closed')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(registration_number)
    )
  `);

  // 6. Fuel Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS fuel_logs (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      liters REAL NOT NULL,
      cost REAL NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(registration_number)
    )
  `);

  // 7. Expenses Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Fuel', 'Maintenance', 'Tolls', 'Insurance', 'Other')),
      cost REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(registration_number)
    )
  `);

  // 8. Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Check if users exist, otherwise seed default data
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  if (userCount === 0) {
    console.log('Seeding initial database contents...');
    
    // Users
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('password123', salt);
    const insertUser = db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)');
    insertUser.run(uuidv4(), 'David Smith', 'fleet@transitops.com', passwordHash, 'Fleet Manager');
    insertUser.run(uuidv4(), 'Alex Jones', 'dispatcher@transitops.com', passwordHash, 'Dispatcher');
    insertUser.run(uuidv4(), 'Elena Rostova', 'safety@transitops.com', passwordHash, 'Safety Officer');
    insertUser.run(uuidv4(), 'Marcus Vance', 'finance@transitops.com', passwordHash, 'Financial Analyst');

    // Seed Settings
    const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    insertSetting.run('depotName', 'Gandhinagar Depot GJT4');
    insertSetting.run('currency', 'INR (Rs)');
    insertSetting.run('distanceUnit', 'Kilometers');
    insertSetting.run('fleetManagerPasscode', 'TRANSIT_ADMIN_2026');

    // Vehicles
    const insertVehicle = db.prepare(`
      INSERT INTO vehicles (registration_number, name_model, type, max_capacity, odometer, acquisition_cost, status, region)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertVehicle.run('TRK-01', 'Volvo FH16', 'Truck', 15000, 125000, 120000, 'Available', 'North');
    insertVehicle.run('VAN-02', 'Ford Transit Custom', 'Van', 2500, 45000, 35000, 'Available', 'South');
    insertVehicle.run('TRL-03', 'Scania S730 Heavy', 'Trailer', 24000, 180000, 150000, 'In Shop', 'East');
    insertVehicle.run('VAN-04', 'Mercedes-Benz Sprinter', 'Van', 3000, 62000, 42000, 'Retired', 'West');

    // Drivers
    const insertDriver = db.prepare(`
      INSERT INTO drivers (license_number, name, license_category, license_expiry, contact_number, safety_score, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertDriver.run('DL-987654', 'Alex Jones', 'Class A', '2028-12-31', '+1-555-0101', 95, 'Available');
    insertDriver.run('DL-123456', 'Sarah Connor', 'Class B', '2027-10-15', '+1-555-0102', 88, 'Available');
    insertDriver.run('DL-111222', 'John Doe', 'Class C', '2026-05-01', '+1-555-0103', 76, 'Available'); // Expired based on 2026-07 current local time
    insertDriver.run('DL-333444', 'Robert Patrick', 'Class A', '2028-01-01', '+1-555-0104', 92, 'Suspended');
    insertDriver.run('DL-555666', 'Michael Biehn', 'Class B', '2027-04-20', '+1-555-0105', 85, 'Off Duty');

    // Trips
    const insertTrip = db.prepare(`
      INSERT INTO trips (id, source, destination, vehicle_id, driver_license, cargo_weight, distance, status, revenue, date_created, date_dispatched, date_completed, final_odometer, fuel_consumed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTrip.run('TRIP-100', 'New York', 'Boston', 'TRK-01', 'DL-123456', 12000, 350, 'Completed', 2200, '2026-07-05', '2026-07-05', '2026-07-06', 125350, 140);
    insertTrip.run('TRIP-101', 'Chicago', 'Detroit', 'VAN-02', 'DL-987654', 1800, 450, 'Draft', 1500, '2026-07-10', null, null, null, null);

    // Maintenance
    const insertMaint = db.prepare(`
      INSERT INTO maintenance (id, vehicle_id, description, cost, date_entered, date_completed, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertMaint.run('MAINT-200', 'TRK-01', 'Scheduled major engine service & oil check', 650, '2026-07-01', '2026-07-02', 'Closed');
    insertMaint.run('MAINT-201', 'TRL-03', 'Transmission gearbox rebuild', 1800, '2026-07-09', null, 'Active');

    // Fuel Logs
    const insertFuel = db.prepare('INSERT INTO fuel_logs (id, vehicle_id, liters, cost, date) VALUES (?, ?, ?, ?, ?)');
    insertFuel.run('FUEL-300', 'VAN-02', 60, 90, '2026-07-09');
    insertFuel.run('FUEL-301', 'TRK-01', 140, 210, '2026-07-06');

    // Expenses
    const insertExpense = db.prepare('INSERT INTO expenses (id, vehicle_id, type, cost, date, description) VALUES (?, ?, ?, ?, ?, ?)');
    insertExpense.run('EXP-400', 'TRK-01', 'Maintenance', 650, '2026-07-02', 'Engine service (MAINT-200)');
    insertExpense.run('EXP-401', 'TRK-01', 'Tolls', 80, '2026-07-06', 'Route tolls NY to Boston');
    insertExpense.run('EXP-402', 'VAN-02', 'Fuel', 90, '2026-07-09', 'Refuel log FUEL-300');
    insertExpense.run('EXP-403', 'TRK-01', 'Fuel', 210, '2026-07-06', 'Refuel log FUEL-301');

    console.log('Database seeded successfully!');
  }
}

initDb();

// --- MAPPER HELPERS ---
function mapVehicle(row: any) {
  return {
    registrationNumber: row.registration_number,
    nameModel: row.name_model,
    type: row.type,
    maxCapacity: row.max_capacity,
    odometer: row.odometer,
    acquisitionCost: row.acquisition_cost,
    status: row.status,
    region: row.region,
    createdAt: row.created_at,
  };
}

function mapDriver(row: any) {
  return {
    licenseNumber: row.license_number,
    name: row.name,
    licenseCategory: row.license_category,
    licenseExpiry: row.license_expiry,
    contactNumber: row.contact_number,
    safetyScore: row.safety_score,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapTrip(row: any) {
  return {
    id: row.id,
    source: row.source,
    destination: row.destination,
    vehicleId: row.vehicle_id,
    driverLicense: row.driver_license,
    cargoWeight: row.cargo_weight,
    distance: row.distance,
    status: row.status,
    revenue: row.revenue,
    dateCreated: row.date_created,
    dateDispatched: row.date_dispatched,
    dateCompleted: row.date_completed,
    finalOdometer: row.final_odometer,
    fuelConsumed: row.fuel_consumed,
  };
}

function mapMaintenance(row: any) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    description: row.description,
    cost: row.cost,
    dateEntered: row.date_entered,
    dateCompleted: row.date_completed,
    status: row.status,
  };
}

function mapExpense(row: any) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    type: row.type,
    cost: row.cost,
    date: row.date,
    description: row.description,
  };
}

// --- AUTHENTICATION MIDDLEWARE ---
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

function authorizeRoles(...allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires one of: ${allowedRoles.join(', ')}` });
    }
    next();
  };
}

// Helper to check if license is expired based on current local date (2026-07-12)
function isLicenseExpired(expiryDateStr: string) {
  const expiry = new Date(expiryDateStr);
  const today = new Date('2026-07-12'); // Using the designated environment date
  expiry.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  return expiry < today;
}

// --- REST API ENDPOINTS ---

// 1. Auth Router
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, passcode } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All registration fields (name, email, password, role) are required.' });
  }

  const validRoles = ['Fleet Manager', 'Driver', 'Dispatcher', 'Safety Officer', 'Financial Analyst'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role provided.' });
  }

  // Enforce secure registration passcode for Fleet Manager
  if (role === 'Fleet Manager') {
    let requiredPasscode = 'TRANSIT_ADMIN_2026';
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('fleetManagerPasscode') as any;
      if (row && row.value) {
        requiredPasscode = row.value;
      }
    } catch (e) {
      // Fallback
    }

    if (!passcode || passcode !== requiredPasscode) {
      return res.status(403).json({
        error: 'Invalid Fleet Manager Registration Passcode. Please enter the valid security key or ask an active manager.'
      });
    }
  }

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = uuidv4();

    db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
      .run(userId, name, email, passwordHash, role);

    const userPayload = { id: userId, name, email, role };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

    return res.status(201).json({ token, user: userPayload });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Failed to register user.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userPayload = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

    return res.json({ token, user: userPayload });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    return res.status(500).json({ error: 'Server error retrieving current profile.' });
  }
});

// 2. Vehicles CRUD Router
app.get('/api/vehicles', authenticateToken, (req, res) => {
  try {
    const { type, status, region, search } = req.query;
    let sql = 'SELECT * FROM vehicles WHERE 1=1';
    const params: any[] = [];

    if (type && type !== 'All') {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (status && status !== 'All') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (region && region !== 'All') {
      sql += ' AND region = ?';
      params.push(region);
    }
    if (search) {
      sql += ' AND (registration_number LIKE ? OR name_model LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC';
    const rows = db.prepare(sql).all(...params);
    const vehicles = rows.map(mapVehicle);

    // Compute dynamic running cost per vehicle (Fuel logs cost + maintenance costs)
    vehicles.forEach((v: any) => {
      const fuelTotal = (db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM fuel_logs WHERE vehicle_id = ?').get(v.registrationNumber) as any).total;
      const maintenanceTotal = (db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM maintenance WHERE vehicle_id = ?').get(v.registrationNumber) as any).total;
      v.runningCost = fuelTotal + maintenanceTotal;
    });

    return res.json({ vehicles });
  } catch (error) {
    console.error('Get vehicles error:', error);
    return res.status(500).json({ error: 'Failed to retrieve vehicles.' });
  }
});

app.post('/api/vehicles', authenticateToken, authorizeRoles('Fleet Manager'), (req, res) => {
  const { registrationNumber, nameModel, type, maxCapacity, odometer, acquisitionCost, region } = req.body;
  if (!registrationNumber || !nameModel || !type || !maxCapacity || odometer === undefined || !acquisitionCost || !region) {
    return res.status(400).json({ error: 'All vehicle fields are required.' });
  }

  const upperReg = registrationNumber.trim().toUpperCase();

  try {
    // Unique rule verification
    const existing = db.prepare('SELECT registration_number FROM vehicles WHERE registration_number = ?').get(upperReg);
    if (existing) {
      return res.status(400).json({ error: `Registration number ${upperReg} is already taken.` });
    }

    db.prepare(`
      INSERT INTO vehicles (registration_number, name_model, type, max_capacity, odometer, acquisition_cost, status, region)
      VALUES (?, ?, ?, ?, ?, ?, 'Available', ?)
    `).run(upperReg, nameModel, type, maxCapacity, odometer, acquisitionCost, region);

    return res.status(201).json({ message: 'Vehicle registered successfully.' });
  } catch (error) {
    console.error('Create vehicle error:', error);
    return res.status(500).json({ error: 'Failed to register vehicle.' });
  }
});

app.put('/api/vehicles/:registrationNumber', authenticateToken, authorizeRoles('Fleet Manager'), (req, res) => {
  const { registrationNumber } = req.params;
  const { nameModel, type, maxCapacity, odometer, acquisitionCost, region } = req.body;

  if (!nameModel || !type || !maxCapacity || odometer === undefined || !acquisitionCost || !region) {
    return res.status(400).json({ error: 'All fields are required for update.' });
  }

  try {
    const existing = db.prepare('SELECT status FROM vehicles WHERE registration_number = ?').get(registrationNumber);
    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    db.prepare(`
      UPDATE vehicles SET
        name_model = ?,
        type = ?,
        max_capacity = ?,
        odometer = ?,
        acquisition_cost = ?,
        region = ?
      WHERE registration_number = ?
    `).run(nameModel, type, maxCapacity, odometer, acquisitionCost, region, registrationNumber);

    return res.json({ message: 'Vehicle updated successfully.' });
  } catch (error) {
    console.error('Update vehicle error:', error);
    return res.status(500).json({ error: 'Failed to update vehicle.' });
  }
});

app.put('/api/vehicles/:registrationNumber/retire', authenticateToken, authorizeRoles('Fleet Manager'), (req, res) => {
  const { registrationNumber } = req.params;
  try {
    const vehicle = db.prepare('SELECT status FROM vehicles WHERE registration_number = ?').get(registrationNumber) as any;
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    if (vehicle.status === 'On Trip') {
      return res.status(400).json({ error: 'Cannot retire a vehicle while it is active on a trip.' });
    }

    db.prepare('UPDATE vehicles SET status = \'Retired\' WHERE registration_number = ?').run(registrationNumber);
    return res.json({ message: 'Vehicle retired successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retire vehicle.' });
  }
});

// 3. Drivers CRUD Router
app.get('/api/drivers', authenticateToken, (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM drivers WHERE 1=1';
    const params: any[] = [];

    if (search) {
      sql += ' AND (name LIKE ? OR license_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC';
    const rows = db.prepare(sql).all(...params);
    const drivers = rows.map(mapDriver);
    return res.json({ drivers });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve drivers.' });
  }
});

app.post('/api/drivers', authenticateToken, authorizeRoles('Fleet Manager', 'Safety Officer'), (req, res) => {
  const { name, licenseNumber, licenseCategory, licenseExpiry, contactNumber, safetyScore } = req.body;
  if (!name || !licenseNumber || !licenseCategory || !licenseExpiry || !contactNumber) {
    return res.status(400).json({ error: 'All driver fields are required.' });
  }

  const upperLic = licenseNumber.trim().toUpperCase();

  try {
    const existing = db.prepare('SELECT license_number FROM drivers WHERE license_number = ?').get(upperLic);
    if (existing) {
      return res.status(400).json({ error: `Driver with license number ${upperLic} already exists.` });
    }

    db.prepare(`
      INSERT INTO drivers (license_number, name, license_category, license_expiry, contact_number, safety_score, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Available')
    `).run(upperLic, name, licenseCategory, licenseExpiry, contactNumber, safetyScore || 100);

    return res.status(201).json({ message: 'Driver registered successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to register driver.' });
  }
});

app.put('/api/drivers/:licenseNumber', authenticateToken, authorizeRoles('Fleet Manager', 'Safety Officer'), (req, res) => {
  const { licenseNumber } = req.params;
  const { name, licenseCategory, licenseExpiry, contactNumber, safetyScore, status } = req.body;

  if (!name || !licenseCategory || !licenseExpiry || !contactNumber || safetyScore === undefined || !status) {
    return res.status(400).json({ error: 'All fields are required to update driver.' });
  }

  try {
    const existing = db.prepare('SELECT status FROM drivers WHERE license_number = ?').get(licenseNumber);
    if (!existing) {
      return res.status(404).json({ error: 'Driver not found.' });
    }

    db.prepare(`
      UPDATE drivers SET
        name = ?,
        license_category = ?,
        license_expiry = ?,
        contact_number = ?,
        safety_score = ?,
        status = ?
      WHERE license_number = ?
    `).run(name, licenseCategory, licenseExpiry, contactNumber, safetyScore, status, licenseNumber);

    return res.json({ message: 'Driver updated successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update driver.' });
  }
});

app.put('/api/drivers/:licenseNumber/suspend', authenticateToken, authorizeRoles('Fleet Manager', 'Safety Officer'), (req, res) => {
  const { licenseNumber } = req.params;
  try {
    const driver = db.prepare('SELECT status, name FROM drivers WHERE license_number = ?').get(licenseNumber) as any;
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found.' });
    }

    if (driver.status === 'On Trip') {
      return res.status(400).json({ error: `Cannot suspend driver ${driver.name} while they are currently on a trip.` });
    }

    const nextStatus = driver.status === 'Suspended' ? 'Available' : 'Suspended';
    db.prepare('UPDATE drivers SET status = ? WHERE license_number = ?').run(nextStatus, licenseNumber);

    return res.json({ message: `Driver status successfully updated to ${nextStatus}.`, nextStatus });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to toggle driver suspension status.' });
  }
});

// 4. Trips Lifecycle Router
app.get('/api/trips', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM trips ORDER BY date_created DESC').all();
    const trips = rows.map(mapTrip);
    return res.json({ trips });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve trips.' });
  }
});

app.post('/api/trips', authenticateToken, authorizeRoles('Fleet Manager', 'Driver'), (req, res) => {
  const { source, destination, vehicleId, driverLicense, cargoWeight, distance, revenue } = req.body;
  if (!source || !destination || !vehicleId || !driverLicense || !cargoWeight || !distance || !revenue) {
    return res.status(400).json({ error: 'All trip fields are required.' });
  }

  try {
    // Business Rule: Vehicle capacity check
    const vehicle = db.prepare('SELECT max_capacity, status FROM vehicles WHERE registration_number = ?').get(vehicleId) as any;
    if (!vehicle) {
      return res.status(404).json({ error: 'Selected vehicle not found.' });
    }

    if (cargoWeight > vehicle.max_capacity) {
      return res.status(400).json({ error: `Cargo weight (${cargoWeight} kg) exceeds vehicle max capacity (${vehicle.max_capacity} kg)!` });
    }

    // Validation: driver checks
    const driver = db.prepare('SELECT status, license_expiry, name FROM drivers WHERE license_number = ?').get(driverLicense) as any;
    if (!driver) {
      return res.status(404).json({ error: 'Selected driver not found.' });
    }

    if (driver.status === 'Suspended') {
      return res.status(400).json({ error: `Cannot assign suspended driver (${driver.name}) to a trip.` });
    }

    if (isLicenseExpired(driver.license_expiry)) {
      return res.status(400).json({ error: `Driver (${driver.name}) license is expired (${driver.license_expiry}). Assignment blocked.` });
    }

    const tripId = `TRIP-${Math.floor(1000 + Math.random() * 9000)}`;
    db.prepare(`
      INSERT INTO trips (id, source, destination, vehicle_id, driver_license, cargo_weight, distance, status, revenue, date_created)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(tripId, source, destination, vehicleId, driverLicense, cargoWeight, distance, 'Draft', revenue);

    return res.status(201).json({ message: `Trip ${tripId} created successfully in Draft state.`, tripId });
  } catch (error) {
    console.error('Create trip error:', error);
    return res.status(500).json({ error: 'Failed to create trip.' });
  }
});

app.put('/api/trips/:id/dispatch', authenticateToken, authorizeRoles('Fleet Manager', 'Driver'), (req, res) => {
  const { id } = req.params;

  try {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(id) as any;
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found.' });
    }

    if (trip.status !== 'Draft') {
      return res.status(400).json({ error: 'Only Draft trips can be dispatched.' });
    }

    const vehicle = db.prepare('SELECT status FROM vehicles WHERE registration_number = ?').get(trip.vehicle_id) as any;
    if (vehicle.status !== 'Available') {
      return res.status(400).json({ error: `Vehicle ${trip.vehicle_id} is currently unavailable (Status: ${vehicle.status}).` });
    }

    const driver = db.prepare('SELECT status, license_expiry FROM drivers WHERE license_number = ?').get(trip.driver_license) as any;
    if (driver.status !== 'Available') {
      return res.status(400).json({ error: `Driver is currently unavailable (Status: ${driver.status}).` });
    }

    if (isLicenseExpired(driver.license_expiry)) {
      return res.status(400).json({ error: 'Selected driver license has expired.' });
    }

    // Execute dispatch updates as a transaction (lock both to On Trip)
    const updateTrip = db.prepare('UPDATE trips SET status = \'Dispatched\', date_dispatched = date(\'now\') WHERE id = ?');
    const updateVehicle = db.prepare('UPDATE vehicles SET status = \'On Trip\' WHERE registration_number = ?');
    const updateDriver = db.prepare('UPDATE drivers SET status = \'On Trip\' WHERE license_number = ?');

    const runTransaction = db.transaction(() => {
      updateTrip.run(id);
      updateVehicle.run(trip.vehicle_id);
      updateDriver.run(trip.driver_license);
    });

    runTransaction();

    return res.json({ message: `Trip ${id} dispatched successfully!` });
  } catch (error) {
    console.error('Dispatch trip error:', error);
    return res.status(500).json({ error: 'Failed to dispatch trip.' });
  }
});

app.put('/api/trips/:id/complete', authenticateToken, authorizeRoles('Fleet Manager', 'Driver'), (req, res) => {
  const { id } = req.params;
  const { finalOdometer, fuelConsumed, fuelCost } = req.body;

  if (finalOdometer === undefined || fuelConsumed === undefined || fuelCost === undefined) {
    return res.status(400).json({ error: 'Final odometer reading, fuel consumed (liters), and fuel total cost are required.' });
  }

  try {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(id) as any;
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found.' });
    }

    if (trip.status !== 'Dispatched') {
      return res.status(400).json({ error: 'Only active Dispatched trips can be marked as Completed.' });
    }

    const vehicle = db.prepare('SELECT odometer FROM vehicles WHERE registration_number = ?').get(trip.vehicle_id) as any;
    if (finalOdometer < vehicle.odometer) {
      return res.status(400).json({ error: `Final odometer (${finalOdometer} km) cannot be less than starting odometer (${vehicle.odometer} km).` });
    }

    const runTransaction = db.transaction(() => {
      // 1. Update trip lifecycle fields
      db.prepare(`
        UPDATE trips SET
          status = 'Completed',
          date_completed = date('now'),
          final_odometer = ?,
          fuel_consumed = ?
        WHERE id = ?
      `).run(finalOdometer, fuelConsumed, id);

      // 2. Set vehicle back to Available and update odometer
      db.prepare('UPDATE vehicles SET status = \'Available\', odometer = ? WHERE registration_number = ?')
        .run(finalOdometer, trip.vehicle_id);

      // 3. Set driver back to Available
      db.prepare('UPDATE drivers SET status = \'Available\' WHERE license_number = ?')
        .run(trip.driver_license);

      // 4. Create automatic Fuel Log
      const fuelLogId = `FUEL-${Math.floor(1000 + Math.random() * 9000)}`;
      db.prepare('INSERT INTO fuel_logs (id, vehicle_id, liters, cost, date) VALUES (?, ?, ?, ?, date(\'now\'))')
        .run(fuelLogId, trip.vehicle_id, fuelConsumed, fuelCost);

      // 5. Create automatic Expense Log for the Fuel
      const expenseId = `EXP-${Math.floor(1000 + Math.random() * 9000)}`;
      db.prepare('INSERT INTO expenses (id, vehicle_id, type, cost, date, description) VALUES (?, ?, \'Fuel\', ?, date(\'now\'), ?)')
        .run(expenseId, trip.vehicle_id, fuelCost, `Fuel consumption log ${fuelLogId} for Trip ${id}`);
    });

    runTransaction();

    return res.json({ message: `Trip ${id} completed. Vehicle mileage and stats updated.` });
  } catch (error) {
    console.error('Complete trip error:', error);
    return res.status(500).json({ error: 'Failed to complete trip.' });
  }
});

app.put('/api/trips/:id/cancel', authenticateToken, authorizeRoles('Fleet Manager', 'Driver'), (req, res) => {
  const { id } = req.params;

  try {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(id) as any;
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found.' });
    }

    if (trip.status === 'Completed' || trip.status === 'Cancelled') {
      return res.status(400).json({ error: 'Completed or already Cancelled trips cannot be modified.' });
    }

    const runTransaction = db.transaction(() => {
      // If trip was Dispatched, we must restore vehicle and driver to Available
      if (trip.status === 'Dispatched') {
        db.prepare('UPDATE vehicles SET status = \'Available\' WHERE registration_number = ? AND status = \'On Trip\'')
          .run(trip.vehicle_id);
        db.prepare('UPDATE drivers SET status = \'Available\' WHERE license_number = ? AND status = \'On Trip\'')
          .run(trip.driver_license);
      }

      db.prepare('UPDATE trips SET status = \'Cancelled\' WHERE id = ?').run(id);
    });

    runTransaction();

    return res.json({ message: `Trip ${id} successfully cancelled.` });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to cancel trip.' });
  }
});

// 5. Maintenance Tracker Router
app.get('/api/maintenance', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM maintenance ORDER BY date_entered DESC').all();
    const logs = rows.map(mapMaintenance);
    return res.json({ logs });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve maintenance logs.' });
  }
});

app.post('/api/maintenance', authenticateToken, authorizeRoles('Fleet Manager'), (req, res) => {
  const { vehicleId, description, cost, dateEntered } = req.body;
  if (!vehicleId || !description || cost === undefined || !dateEntered) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const vehicle = db.prepare('SELECT status FROM vehicles WHERE registration_number = ?').get(vehicleId) as any;
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    if (vehicle.status === 'On Trip') {
      return res.status(400).json({ error: `Cannot send vehicle ${vehicleId} to maintenance while it is active on a trip.` });
    }

    const maintId = `MAINT-${Math.floor(1000 + Math.random() * 9000)}`;
    const expenseId = `EXP-${Math.floor(1000 + Math.random() * 9000)}`;

    const runTransaction = db.transaction(() => {
      // 1. Create maintenance entry
      db.prepare(`
        INSERT INTO maintenance (id, vehicle_id, description, cost, date_entered, status)
        VALUES (?, ?, ?, ?, ?, 'Active')
      `).run(maintId, vehicleId, description, cost, dateEntered);

      // 2. Set vehicle to 'In Shop'
      db.prepare('UPDATE vehicles SET status = \'In Shop\' WHERE registration_number = ?').run(vehicleId);

      // 3. Create automatic Expense record
      db.prepare(`
        INSERT INTO expenses (id, vehicle_id, type, cost, date, description)
        VALUES (?, ?, 'Maintenance', ?, ?, ?)
      `).run(expenseId, vehicleId, cost, dateEntered, `Maintenance Log ${maintId}: ${description}`);
    });

    runTransaction();

    return res.status(201).json({ message: `Maintenance log ${maintId} opened. Vehicle set to In Shop.`, maintId });
  } catch (error) {
    console.error('Create maintenance error:', error);
    return res.status(500).json({ error: 'Failed to open maintenance log.' });
  }
});

app.put('/api/maintenance/:id/close', authenticateToken, authorizeRoles('Fleet Manager'), (req, res) => {
  const { id } = req.params;

  try {
    const log = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(id) as any;
    if (!log) {
      return res.status(404).json({ error: 'Maintenance log not found.' });
    }

    if (log.status !== 'Active') {
      return res.status(400).json({ error: 'This maintenance log is already closed.' });
    }

    const runTransaction = db.transaction(() => {
      // 1. Close log
      db.prepare('UPDATE maintenance SET status = \'Closed\', date_completed = date(\'now\') WHERE id = ?').run(id);

      // 2. Restore vehicle to Available (unless already Retired)
      db.prepare('UPDATE vehicles SET status = \'Available\' WHERE registration_number = ? AND status = \'In Shop\'')
        .run(log.vehicle_id);
    });

    runTransaction();

    return res.json({ message: `Maintenance log ${id} closed. Vehicle restored to Available status.` });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to close maintenance log.' });
  }
});

// 6. Expenses Router
app.get('/api/expenses', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
    const expenses = rows.map(mapExpense);
    return res.json({ expenses });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve expenses.' });
  }
});

app.post('/api/expenses', authenticateToken, authorizeRoles('Fleet Manager', 'Driver', 'Financial Analyst'), (req, res) => {
  const { vehicleId, type, cost, date, description } = req.body;
  if (!vehicleId || !type || cost === undefined || !date || !description) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const vehicle = db.prepare('SELECT registration_number FROM vehicles WHERE registration_number = ?').get(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    const expenseId = `EXP-${Math.floor(1000 + Math.random() * 9000)}`;

    const runTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO expenses (id, vehicle_id, type, cost, date, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(expenseId, vehicleId, type, cost, date, description);

      // If category is Fuel, also log to Fuel Logs!
      if (type === 'Fuel') {
        const fuelLogId = `FUEL-${Math.floor(1000 + Math.random() * 9000)}`;
        const estimatedLiters = Math.round(cost / 1.5) || 1; // estimate based on standard rate
        db.prepare('INSERT INTO fuel_logs (id, vehicle_id, liters, cost, date) VALUES (?, ?, ?, ?, ?)')
          .run(fuelLogId, vehicleId, estimatedLiters, cost, date);
      }
    });

    runTransaction();

    return res.status(201).json({ message: 'Expense receipt logged successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to log expense.' });
  }
});

// 7. KPIs Dashboard Endpoint
app.get('/api/dashboard/kpis', authenticateToken, (req, res) => {
  try {
    // Total vehicles not retired
    const totalVehicles = (db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE status != \'Retired\'').get() as any).count;
    const activeVehicles = (db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE status = \'On Trip\'').get() as any).count;
    const availableVehicles = (db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE status = \'Available\'').get() as any).count;
    const maintenanceVehicles = (db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE status = \'In Shop\'').get() as any).count;

    const activeTrips = (db.prepare('SELECT COUNT(*) as count FROM trips WHERE status = \'Dispatched\'').get() as any).count;
    const pendingTrips = (db.prepare('SELECT COUNT(*) as count FROM trips WHERE status = \'Draft\'').get() as any).count;

    const driversOnDuty = (db.prepare('SELECT COUNT(*) as count FROM drivers WHERE status IN (\'Available\', \'On Trip\')').get() as any).count;

    const fleetUtilization = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0;

    return res.json({
      stats: {
        activeVehicles,
        availableVehicles,
        maintenanceVehicles,
        activeTrips,
        pendingTrips,
        driversOnDuty,
        fleetUtilization,
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to compute dashboard KPIs.' });
  }
});

// 8. Reports & ROI Dataset Endpoint
app.get('/api/reports', authenticateToken, (req, res) => {
  try {
    // Return performance metrics per vehicle
    const vehicles = db.prepare('SELECT * FROM vehicles WHERE status != \'Retired\'').all().map(mapVehicle);

    const reportRows = vehicles.map((v: any) => {
      const trips = db.prepare('SELECT distance, revenue, fuel_consumed FROM trips WHERE vehicle_id = ? AND status = \'Completed\'').all(v.registrationNumber) as any[];

      const totalDistance = trips.reduce((sum, t) => sum + parseFloat(t.distance || 0), 0);
      const totalRevenue = trips.reduce((sum, t) => sum + parseFloat(t.revenue || 0), 0);

      const fuelLiters = (db.prepare('SELECT COALESCE(SUM(liters), 0) as total FROM fuel_logs WHERE vehicle_id = ?').get(v.registrationNumber) as any).total;
      const fuelCost = (db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM fuel_logs WHERE vehicle_id = ?').get(v.registrationNumber) as any).total;
      const maintenanceCost = (db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM maintenance WHERE vehicle_id = ?').get(v.registrationNumber) as any).total;
      const otherCost = (db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM expenses WHERE vehicle_id = ? AND type NOT IN (\'Fuel\', \'Maintenance\')').get(v.registrationNumber) as any).total;

      const operationalCost = fuelCost + maintenanceCost + otherCost;
      const netProfit = totalRevenue - operationalCost;

      // ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost * 100%
      const roiNumerator = totalRevenue - (maintenanceCost + fuelCost);
      const roi = v.acquisitionCost > 0 ? (roiNumerator / v.acquisitionCost) * 100 : 0;

      // Fuel efficiency = distance / liters
      const fuelEfficiency = fuelLiters > 0 ? (totalDistance / fuelLiters) : 0;

      return {
        registrationNumber: v.registrationNumber,
        nameModel: v.nameModel,
        acquisitionCost: v.acquisitionCost,
        distance: totalDistance,
        fuelLiters,
        fuelEfficiency,
        operationalCost,
        revenue: totalRevenue,
        netProfit,
        roi,
      };
    });

    return res.json({ reports: reportRows });
  } catch (error) {
    console.error('Reports endpoint error:', error);
    return res.status(500).json({ error: 'Failed to generate reports.' });
  }
});

// 9. Global Settings Endpoints
app.get('/api/settings', authenticateToken, (req: any, res) => {
  try {
    const depotNameRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('depotName') as any;
    const currencyRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('currency') as any;
    const distanceUnitRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('distanceUnit') as any;

    const data: any = {
      depotName: depotNameRow ? depotNameRow.value : 'Gandhinagar Depot GJT4',
      currency: currencyRow ? currencyRow.value : 'INR (Rs)',
      distanceUnit: distanceUnitRow ? distanceUnitRow.value : 'Kilometers',
    };

    if (req.user && req.user.role === 'Fleet Manager') {
      const passcodeRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('fleetManagerPasscode') as any;
      data.fleetManagerPasscode = passcodeRow ? passcodeRow.value : 'TRANSIT_ADMIN_2026';
    }

    return res.json(data);
  } catch (error) {
    return res.json({
      depotName: 'Gandhinagar Depot GJT4',
      currency: 'INR (Rs)',
      distanceUnit: 'Kilometers',
    });
  }
});

app.post('/api/settings', authenticateToken, authorizeRoles('Fleet Manager'), (req, res) => {
  const { depotName, currency, distanceUnit, fleetManagerPasscode } = req.body;
  try {
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    if (depotName) upsert.run('depotName', depotName);
    if (currency) upsert.run('currency', currency);
    if (distanceUnit) upsert.run('distanceUnit', distanceUnit);
    if (fleetManagerPasscode) upsert.run('fleetManagerPasscode', fleetManagerPasscode);

    return res.json({ message: 'Settings saved successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// 10. Fuel Logs Endpoints
app.get('/api/fuel-logs', authenticateToken, (req, res) => {
  try {
    const fuelLogs = db.prepare('SELECT * FROM fuel_logs ORDER BY date DESC').all();
    return res.json({ fuelLogs });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve fuel logs.' });
  }
});

app.post('/api/fuel-logs', authenticateToken, (req, res) => {
  const { vehicleId, liters, cost, date } = req.body;
  if (!vehicleId || !liters || !cost || !date) {
    return res.status(400).json({ error: 'All fuel log fields are required.' });
  }
  try {
    const logId = `FUEL-${uuidv4().substring(0, 8).toUpperCase()}`;
    db.prepare('INSERT INTO fuel_logs (id, vehicle_id, liters, cost, date) VALUES (?, ?, ?, ?, ?)')
      .run(logId, vehicleId, liters, cost, date);

    // Also record it as a Fuel expense!
    const expenseId = `EXP-${uuidv4().substring(0, 8).toUpperCase()}`;
    db.prepare('INSERT INTO expenses (id, vehicle_id, type, cost, date, description) VALUES (?, ?, ?, ?, ?, ?)')
      .run(expenseId, vehicleId, 'Fuel', cost, date, `Refuel log ${logId}`);

    return res.status(201).json({ message: 'Fuel log and expense recorded successfully.' });
  } catch (error) {
    console.error('Log fuel error:', error);
    return res.status(500).json({ error: 'Failed to record fuel log.' });
  }
});


// --- INTEGRATE VITE DEV MIDDLEWARE / STATIC FILES IN PRODUCTION ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening at http://localhost:${PORT}`);
  });
}

startServer();
