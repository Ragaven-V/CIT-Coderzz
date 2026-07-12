# CIT-Coderzz
# TransitOps — Smart Transport Operations Platform

An end-to-end transport operations platform for logistics companies to manage the complete lifecycle of their fleet — from vehicle registration and driver management to trip dispatching, maintenance, fuel logging, and operational analytics.

## Problem

Many logistics companies still rely on spreadsheets and manual logbooks to manage transport operations, leading to scheduling conflicts, underutilized vehicles, missed maintenance, expired driver licenses, inaccurate expense tracking, and poor operational visibility.

## Target Users

- **Fleet Manager** — Oversees fleet assets, maintenance, vehicle lifecycle, and operational efficiency
- **Driver** — Creates trips, assigns vehicles and drivers, monitors active deliveries
- **Safety Officer** — Ensures driver compliance, tracks license validity, monitors safety scores
- **Financial Analyst** — Reviews operational expenses, fuel consumption, maintenance costs, and profitability

## Core Features

- **Authentication** — Secure login with Role-Based Access Control (RBAC)
- **Dashboard** — Real-time KPIs (Active Vehicles, Available Vehicles, Vehicles in Maintenance, Active Trips, Pending Trips, Drivers On Duty, Fleet Utilization %)
- **Vehicle Registry** — Master list of vehicles with status tracking (Available, On Trip, In Shop, Retired)
- **Driver Management** — Driver profiles with license tracking and safety scores
- **Trip Management** — Trip lifecycle: Draft → Dispatched → Completed → Cancelled
- **Maintenance** — Maintenance logs that auto-update vehicle status
- **Fuel & Expense Tracking** — Fuel logs, expenses, and automatic operational cost calculation
- **Reports & Analytics** — Fuel Efficiency, Fleet Utilization, Operational Cost, Vehicle ROI (CSV export)

## Business Rules

- Vehicle registration numbers must be unique
- Retired or In Shop vehicles never appear in the dispatch selection
- Drivers with expired licenses or Suspended status cannot be assigned to trips
- A driver or vehicle already On Trip cannot be assigned to another trip
- Cargo weight must not exceed the vehicle's maximum load capacity
- Dispatching a trip automatically sets vehicle and driver status to On Trip
- Completing/cancelling a trip automatically restores vehicle and driver to Available
- Creating an active maintenance record automatically sets vehicle status to In Shop
- Closing maintenance restores vehicle status to Available (unless retired)

## Tech Stack

- **Backend:** Node.js / Express (`backend/src`)
- **Frontend:** _(add framework here, e.g. React)_
- **Database:** _(add DB here, e.g. MongoDB / PostgreSQL)_

## Project Structure

```
transitops/
├── backend/
│   └── src/
│       ├── routes/
│       └── server.js
├── frontend/
└── db/
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation

```bash
git clone https://github.com/Ragaven-V/CIT-Coderzz.git
cd CIT-Coderzz/transitops/backend
npm install
```

### Environment Variables

Create a `.env` file in `backend/` with:

```
PORT=5000
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret
```

### Running the App

```bash
npm run dev
```

## Contributors

- Ragaven-V
- priyanprabaraba2007-create

## License

_(add license here)_
