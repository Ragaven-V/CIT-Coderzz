CIT-Coderzz
CIT-Coderzz: TransitOps — Smart Transport Operations Platform
TransitOps is an end-to-end transport operations platform designed for logistics companies to seamlessly manage the complete lifecycle of their fleet—from vehicle registration and driver onboarding to real-time trip dispatching, scheduled maintenance, secure fuel/expense logging, and rich operational analytics.

🚀 Presentation
Clone the Repository: code Bash git clone https://github.com/Ragaven-V/CIT-Coderzz.git cd CIT-Coderzz Install Dependencies: code Bash npm install Run in Development Mode: code Bash npm run dev Open the Application: Once started, the full-stack server runs seamlessly on their machine. The app will be fully interactive and accessible at: http://localhost:3000

📋 The Problem
Logistics operations frequently suffer from inefficiencies caused by manual logbooks, scattered spreadsheets, and siloed tools. This results in:

Scheduling Overlaps: Drivers or vehicles accidentally double-booked.
Safety & Compliance Gaps: Dispatching vehicles to drivers with expired licenses.
Overlooked Maintenance: Unplanned vehicle breakdowns and costly repairs.
Inaccurate Expense Tracking: Scattered fuel receipts and unaccounted-for driver costs.
Lack of Visibility: Difficulty calculating key performance indicators (KPIs) like Fleet Utilization % or Vehicle ROI in real time.
🎯 Target Users (Role-Based Access Control)
TransitOps is fully optimized with robust Role-Based Access Control (RBAC) to ensure every team member has a tailored, secure workspace:

Fleet Manager 🛠️
Oversees all fleet assets, registers new vehicles, schedules vehicle maintenance, manages system settings, and defines global parameters.
Protected Registration: Signup requires the Fleet Manager Security Passcode (default is TRANSIT_ADMIN_2026, configurable in Settings).
Driver 🚛
Signs in to view assigned trips, dispatches scheduled deliveries, submits fuel receipts, and completes/cancels trips.
Safety Officer 🛡️
Onboards and updates drivers, monitors safety scores, tracks license expiration status, and suspends profiles when necessary.
Financial Analyst 📊
Accesses detailed operating reports, manages fuel and maintenance logs, reviews expense reports, and analyzes overall fleet profitability.
✨ Core Features
Real-Time KPI Dashboard: High-level metrics showing active/available vehicles, vehicles in shop, pending trips, drivers on duty, and real-time Fleet Utilization %.
Vehicle Registry & Status Engine: Active tracking of all assets through four lifecycle states: Available, On Trip, In Shop, and Retired.
Driver Profiles & Compliance Tracker: Keep records of licensing details with visual indicators for expired licenses and real-time security restrictions.
Dynamic Trip Lifecycle Scheduler: Transitions trips securely through the entire cycle: Draft ➔ Dispatched ➔ Completed or Cancelled.
Automated Asset Locking: Ensures a driver or vehicle already on an active trip cannot be assigned to any other parallel delivery.
Maintenance & Auto-Status Updates: Creating a maintenance record automatically switches a vehicle's status to In Shop. Resolving the record dynamically restores it to Available.
Integrated Fuel & Expense Logging: Track operating expenses by cost category, linking fuel logs to specific vehicles to automate fuel efficiency calculations.
Rich Operational Reports & CSV Export: Clean tables with active filtering and instant spreadsheet-ready CSV downloads.
🛡️ Business Rules & System Guardrails
To prevent human error, TransitOps enforces strict transactional rules at the database and server levels:

Uniqueness Constraints: Vehicle registration numbers and driver license numbers must be completely unique.
Dispatch Validation: Vehicles marked as Retired or In Shop (Under Maintenance) are filtered out from the dispatch queue.
Compliance Blocking: Drivers with Expired licenses or Suspended status are blocked from being assigned to any trip.
Double-Booking Prevention: A driver or vehicle already marked as On Trip cannot be assigned to another trip until the current one is completed or cancelled.
Capacity Guardrails: Trips enforce load limits; cargo weight must not exceed the vehicle's maximum load capacity.
Automatic State Synchronization:
Dispatching a trip automatically updates the assigned vehicle and driver status to On Trip.
Completing or cancelling a trip automatically restores the assigned vehicle and driver status to Available.
Filing a new maintenance log automatically marks the vehicle status as In Shop.
Closing a maintenance record automatically restores the vehicle status to Available (unless manually retired).
🛠️ Tech Stack & Architecture
Unlike complex, hard-to-maintain multi-folder projects, TransitOps is structured as an elegant, high-performance Single-Folder Full-Stack Application designed for rapid local execution and painless deployment:

Frontend: React 19, TypeScript, Vite, Tailwind CSS 4.0, and Motion for elegant, hardware-accelerated animations.
Backend: Node.js, Express (compiled via esbuild to optimized CommonJS).
Database: SQLite via better-sqlite3 (ultra-fast, self-contained local SQL database requiring zero configuration or database servers).
AI Core: Integrated Google Gemini API for smart insights and automated analysis.
📂 Project Structure
transitops/
├── src/                    # Frontend React Application
│   ├── components/         # Modular React Components (Login, Settings, Dashboard, etc.)
│   ├── App.tsx             # Primary Application UI Layout & Router
│   ├── api.ts              # Unified API Client for Express Interaction
│   ├── types.ts            # Shared TypeScript Interfaces, Enums & Types
│   ├── index.css           # Global Tailwind CSS Imports and Theme Definitions
│   └── main.tsx            # React App Mount Point
├── server.ts               # Full-Stack Node.js Express Server & API Routes
├── transitops.db           # SQLite Local Database (Auto-created on start)
├── package.json            # Unified Dependencies & Build/Dev Scripts
├── tsconfig.json           # TypeScript Compiler Configuration
├── vite.config.ts          # Vite Configuration with Tailwind Integration
├── .env.example            # Environment variables placeholder
└── README.md               # Documentation
