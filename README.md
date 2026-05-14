# FleetManager — AI-Powered Fleet Maintenance & Fuel Optimization

A full-stack MVP for managing commercial vehicle fleets with real-time telematics ingestion, rule-based predictive alerts, fuel anomaly detection, and a complete work order workflow.

**Live demo:** https://fleet-frontend-kqhi.onrender.com

> Register a new account from the landing page to try it — no invite needed.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, React Query v5, Zustand, Recharts, React Router v6 |
| Backend | Node.js 20, Express, TypeScript, Zod validation, JWT auth, Mongoose |
| Database | MongoDB 7 with native time-series collection for telemetry |
| AI Engine | Node.js statistical microservice (rolling z-score anomaly detection, threshold-based maintenance prediction) |
| Infra | Docker, Docker Compose, GitHub Actions CI/CD |

---

## Features

### Fleet Dashboard
- Live stat cards (total vehicles, unresolved alerts, open work orders, in-maintenance count)
- Each card is clickable and navigates directly to the relevant section
- Recent unresolved alert feed with severity indicators
- Vehicle status breakdown

### Vehicles
- Full CRUD with VIN validation, fuel type, capacity, and odometer tracking
- Click any row to open a detailed side panel (status, maintenance dates, assigned driver, notes)
- Status filter (active / inactive / maintenance)
- Admin-only delete with confirmation

### Telematics Ingestion
- REST webhook endpoint for real-time telemetry data
- CSV bulk upload endpoint (`POST /api/v1/telemetry/ingest/csv`, `Content-Type: text/csv`)
- Mock data generator for development seeding
- All readings stored in a native MongoDB time-series collection with 90-day TTL

### Predictive Alerts
- **Low fuel** — triggers below 15%, critical below 5%
- **Engine temperature** — triggers above 105°C, critical above 115°C
- **Maintenance due** — triggers within 500 km of scheduled interval
- **Fuel anomaly** — rolling z-score detects consumption spikes vs recent history
- Deduplication: only one unresolved alert per type per vehicle at a time
- Resolve alerts and optionally link to a work order

### Work Orders
- Create, assign, and track maintenance jobs with full status lifecycle: `open → in_progress → completed / cancelled`
- Click any row to open a detail panel with description, costs, scheduled/completed dates, parts used
- Add technician notes with author and timestamp
- Role-gated status transitions
- Cost tracking (estimated vs actual)

### Reports
- Fleet summary (vehicle status breakdown, alert severity counts, work order cost totals)
- Per-vehicle daily fuel trend chart (avg fuel level % + total consumed litres)
- Date range filter

### Auth & RBAC
| Role | Capabilities |
|---|---|
| Admin | Full access — all CRUD, delete vehicles, manage all work orders |
| Manager | Create and update vehicles, work orders, and alerts |
| Technician | Update work order status, add notes, resolve alerts |
| ReadOnly | View only — no mutations |

---

## Project Structure

```
├── backend/          Express API — routes, controllers, validators, services
├── frontend/         React SPA — pages, hooks, components, stores
├── ai-service/       Node.js statistical engine — fuel anomaly & maintenance prediction
├── docker/           Dockerfiles for all three services
├── .github/          GitHub Actions CI workflow
├── docker-compose.yml
└── .env.example
```

---

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- MongoDB running locally (or MongoDB Atlas connection string)

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET (32+ chars) and MONGODB_URI
```

### 2. Install and run each service

```bash
# Backend
cd backend && npm install && npm run dev

# AI Service (new terminal)
cd ai-service && npm install && npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

### 3. Open the app

```
http://localhost:5173
```

Register your first Admin account from the landing page.

---

## Docker (Full Stack)

```bash
cp .env.example .env   # fill in JWT_SECRET
docker compose up --build
```

Services:
- Frontend → `http://localhost:5173`
- Backend API → `http://localhost:3001/api/v1`
- AI Engine → `http://localhost:3002`
- MongoDB → `localhost:27017`

---

## API Overview

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me

GET    /api/v1/vehicles
POST   /api/v1/vehicles
PATCH  /api/v1/vehicles/:id
DELETE /api/v1/vehicles/:id

POST   /api/v1/telemetry/ingest
POST   /api/v1/telemetry/ingest/csv
GET    /api/v1/telemetry?vehicleId=&from=&to=
GET    /api/v1/telemetry/latest/:vehicleId

GET    /api/v1/alerts
PATCH  /api/v1/alerts/:id/resolve
GET    /api/v1/alerts/stats

GET    /api/v1/work-orders
POST   /api/v1/work-orders
PATCH  /api/v1/work-orders/:id
POST   /api/v1/work-orders/:id/notes
DELETE /api/v1/work-orders/:id

GET    /api/v1/reports/summary
GET    /api/v1/reports/fuel/:vehicleId
```

All endpoints return `{ success: boolean, data?: T, error?: string, meta?: object }`.

---

## Running Tests

```bash
cd backend
npm test
```

Runs 9 integration tests across auth and vehicle endpoints against a real MongoDB test database.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend port | `3001` |
| `MONGODB_URI` | MongoDB connection string | — |
| `JWT_SECRET` | Min 32 characters | — |
| `JWT_EXPIRES_IN` | Token expiry | `7d` |
| `CORS_ORIGIN` | Frontend origin | `http://localhost:5173` |
| `AI_SERVICE_URL` | AI engine URL | `http://ai-service:3002` |
| `VITE_API_BASE_URL` | Backend URL (frontend) | `http://localhost:3001/api/v1` |

---

## License

MIT
