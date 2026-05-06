# VERIFY.md — Run Commands & Expected Outputs

## Prerequisites
- Node.js 20+
- Docker + Docker Compose
- MongoDB 7.0 (via Docker or local)

---

## 1. Backend — Setup & Dev Server

```bash
cd backend
npm install
cp ../.env.example ../.env
# Edit .env — set JWT_SECRET (32+ chars) and MONGODB_URI

npm run dev
# Expected: [DB] MongoDB connected
#           [Server] Listening on port 3001 (development)
```

---

## 2. Backend — Run Tests

```bash
cd backend
npm install

# Set minimal test env
export MONGODB_URI=mongodb://localhost:27017/fleet_test
export JWT_SECRET=test_secret_that_is_at_least_32_characters
export CORS_ORIGIN=http://localhost:5173
export NODE_ENV=test

npm test
```

### Expected test output
```
PASS tests/auth.test.ts
  POST /api/v1/auth/register
    ✓ creates a new user and returns a token
    ✓ rejects duplicate email with 409
    ✓ rejects weak password with 400
  POST /api/v1/auth/login
    ✓ returns a token on valid credentials
    ✓ returns 401 on wrong password

PASS tests/vehicle.test.ts
  POST /api/v1/vehicles
    ✓ creates a vehicle for Admin
    ✓ rejects invalid VIN with 400
    ✓ returns 401 when unauthenticated
  GET /api/v1/vehicles
    ✓ lists vehicles with pagination meta

Test Suites: 2 passed, 2 total
Tests:       9 passed, 9 total
```

---

## 3. Health Check

```bash
curl http://localhost:3001/health
```
Expected:
```json
{ "success": true, "data": { "status": "ok", "timestamp": "..." } }
```

---

## 4. Auth — Register + Login

```bash
# Register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@fleet.com","password":"Password1","role":"Admin"}'

# Expected: { "success": true, "data": { "user": {...}, "token": "..." } }

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fleet.com","password":"Password1"}'
```

---

## 5. Vehicles — CRUD

```bash
TOKEN="<paste token here>"

# Create
curl -X POST http://localhost:3001/api/v1/vehicles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Truck 01","make":"Ford","model":"F-150","year":2022,
    "vin":"1FTFW1ET0EFC12345","licensePlate":"ABC-1234",
    "fuelType":"gasoline","fuelCapacityLiters":100
  }'

# List
curl http://localhost:3001/api/v1/vehicles \
  -H "Authorization: Bearer $TOKEN"
```

---

## 6. Telemetry — Ingest

```bash
VEHICLE_ID="<paste vehicle _id here>"

curl -X POST http://localhost:3001/api/v1/telemetry/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"vehicleId\":\"$VEHICLE_ID\",
    \"odometerKm\":12500,
    \"fuelLevelPercent\":12,
    \"fuelConsumedLiters\":8.5,
    \"speedKmh\":60,
    \"engineTempCelsius\":92
  }"

# Fuel < 15% → alert created automatically
# Check alerts:
curl "http://localhost:3001/api/v1/alerts?isResolved=false" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 7. Docker Compose — Full Stack

```bash
cp .env.example .env
# Edit .env with real JWT_SECRET

docker compose up --build
# All 4 services start: mongo, backend, ai-service, frontend
# Backend at :3001, Frontend at :5173
```

---

## 8. CSV Telemetry Ingest

```bash
# Create sample.csv with headers:
# vehicleId,odometerKm,fuelLevelPercent,fuelConsumedLiters,speedKmh

curl -X POST http://localhost:3001/api/v1/telemetry/ingest/csv \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: text/csv" \
  --data-binary @sample.csv

# Expected: { "success": true, "data": { "inserted": N, "errors": [] } }
```

---

## 9. Reports

```bash
curl "http://localhost:3001/api/v1/reports/summary" \
  -H "Authorization: Bearer $TOKEN"

curl "http://localhost:3001/api/v1/reports/fuel/$VEHICLE_ID?from=2024-01-01T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN"
```

---

## RBAC Summary

| Role        | Vehicles     | Telemetry Ingest | Alerts Resolve | Work Orders      | Delete |
|-------------|-------------|-----------------|----------------|-----------------|--------|
| Admin       | Full CRUD   | Yes             | Yes            | Full CRUD       | Yes    |
| Manager     | Read + Write| Yes             | Yes            | Create + Update | No     |
| Technician  | Read        | No              | Yes            | Update + Notes  | No     |
| ReadOnly    | Read        | No              | No             | Read            | No     |
