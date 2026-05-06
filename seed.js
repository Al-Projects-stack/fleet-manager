const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
mongoose.set('strictQuery', true);

// ─────────────────────────────────────────────────────────────
// CONFIG — Update if needed
// ─────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fleet_system';
const DB_NAME = 'fleet_system';

// ─────────────────────────────────────────────────────────────
// SCHEMAS — Match your exact field names & types
// ─────────────────────────────────────────────────────────────

// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { type: String, required: true, select: false },
  role: { 
    type: String, 
    enum: ['Admin', 'Manager', 'Technician', 'ReadOnly'], 
    default: 'Manager' 
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Vehicle Schema
const VehicleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g. "Truck 01"
  make: { type: String, required: true, enum: ['Ford', 'Isuzu', 'Toyota', 'Foton', 'Mercedes', 'Scania', 'Volvo', 'JAC'] },
  model: { type: String, required: true },
  year: { type: Number, required: true, min: 2010, max: 2026 },
  vin: { type: String, required: true, unique: true, uppercase: true },
  licensePlate: { type: String, required: true, uppercase: true, index: true },
  fuelType: { type: String, enum: ['gasoline', 'diesel', 'electric', 'hybrid'], default: 'diesel' },
  fuelCapacityLiters: { type: Number, default: 100 },
  status: { type: String, enum: ['active', 'maintenance', 'inactive', 'retired'], default: 'active', index: true },
  mileage: { type: Number, default: 0 },
  lastServiceDate: { type: Date },
  nextServiceDue: { type: Date },
  createdAt: { type: Date, default: Date.now }
});
const Vehicle = mongoose.model('Vehicle', VehicleSchema);

// Telemetry Schema (time-series)
const TelemetrySchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  mileage: { type: Number, required: true },
  fuelLevel: { type: Number, min: 0, max: 100 }, // %
  engineTemp: { type: Number }, // °C
  rpm: { type: Number },
  speed: { type: Number }, // km/h
  idleTimePct: { type: Number, default: 0 },
  faultCodes: [{ type: String }], // e.g. ["P0300"]
  latitude: { type: Number },
  longitude: { type: Number }
}, { 
  timestamps: true,
  // MVP: Use TTL index for raw data retention (optional)
  // expires: '30d' 
});
// Compound index for efficient time-range queries
TelemetrySchema.index({ vehicleId: 1, timestamp: -1 });
const Telemetry = mongoose.model('Telemetry', TelemetrySchema);

// Alert Schema
const AlertSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['maintenance_due', 'engine_fault', 'fuel_anomaly', 'tire_pressure', 'battery_voltage', 'oil_life', 'brake_wear', 'coolant_temp'] 
  },
  severity: { type: String, enum: ['info', 'warning', 'critical'], required: true, index: true },
  status: { type: String, enum: ['new', 'acknowledged', 'resolved', 'dismissed'], default: 'new', index: true },
  description: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 1, default: 0.8 }, // AI confidence score
  recommendedAction: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed }, // flexible: { mpgDeviation: 0.22, idlePct: 18 }
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
});
const Alert = mongoose.model('Alert', AlertSchema);

// WorkOrder Schema
const WorkOrderSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
  alertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert' }, // optional link
  type: { type: String, required: true }, // e.g. "brake_replacement"
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending', index: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, trim: true },
  partsUsed: [{ name: String, quantity: Number, cost: Number }],
  laborHours: { type: Number, min: 0 },
  totalCost: { type: Number, min: 0 },
  scheduledDate: { type: Date },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});
const WorkOrder = mongoose.model('WorkOrder', WorkOrderSchema);

// ─────────────────────────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('🔌 Connected to MongoDB');

    // 1️⃣ Clear existing test data
    await Promise.all([
      User.deleteMany({}),
      Vehicle.deleteMany({}),
      Telemetry.deleteMany({}),
      Alert.deleteMany({}),
      WorkOrder.deleteMany({})
    ]);
    console.log('🧹 Cleared collections');

    // 2️⃣ Seed Users
    const users = await User.create([
      { name: 'Admin User', email: 'admin@fleet.com', password: await bcrypt.hash('Password1', 12), role: 'Admin' },
      { name: 'Fleet Manager', email: 'manager@fleet.com', password: await bcrypt.hash('Password1', 12), role: 'Manager' },
      { name: 'Tech Sam', email: 'tech@fleet.com', password: await bcrypt.hash('Password1', 12), role: 'Technician' }
    ]);
    const [admin, manager, technician] = users;
    console.log('👥 Seeded 3 users');

    // 3️⃣ Seed 8 Vehicles (varied profiles)
    const vehicles = await Vehicle.create([
      { name: 'Truck 01', make: 'Ford', model: 'F-150', year: 2022, vin: '1FTFW1ET0EFC12345', licensePlate: 'FP-001', fuelType: 'gasoline', fuelCapacityLiters: 100, status: 'active', mileage: 142500, lastServiceDate: new Date(Date.now() - 45*86400000) },
      { name: 'Truck 02', make: 'Isuzu', model: 'D-Max', year: 2023, vin: 'ISUZUDMAX2023002', licensePlate: 'FP-002', fuelType: 'diesel', fuelCapacityLiters: 80, status: 'active', mileage: 89200, lastServiceDate: new Date(Date.now() - 12*86400000) },
      { name: 'Truck 03', make: 'Toyota', model: 'Hilux', year: 2020, vin: 'TOYHILUX2020003', licensePlate: 'FP-003', fuelType: 'diesel', fuelCapacityLiters: 80, status: 'maintenance', mileage: 215000, lastServiceDate: new Date(Date.now() - 8*86400000) },
      { name: 'Truck 04', make: 'Foton', model: 'Miler', year: 2023, vin: 'FOTONMLR2023004', licensePlate: 'FP-004', fuelType: 'diesel', fuelCapacityLiters: 70, status: 'active', mileage: 45300, lastServiceDate: new Date(Date.now() - 60*86400000) },
      { name: 'Truck 05', make: 'Mercedes', model: 'Sprinter', year: 2021, vin: 'MBSPRINTER2021005', licensePlate: 'FP-005', fuelType: 'diesel', fuelCapacityLiters: 90, status: 'active', mileage: 178000, lastServiceDate: new Date(Date.now() - 22*86400000) },
      { name: 'Truck 06', make: 'Scania', model: 'P-Series', year: 2019, vin: 'SCANPSER2019006', licensePlate: 'FP-006', fuelType: 'diesel', fuelCapacityLiters: 120, status: 'active', mileage: 312000, lastServiceDate: new Date(Date.now() - 5*86400000) },
      { name: 'Truck 07', make: 'Volvo', model: 'FM', year: 2020, vin: 'VOLVOFM2020007', licensePlate: 'FP-007', fuelType: 'diesel', fuelCapacityLiters: 110, status: 'active', mileage: 245000, lastServiceDate: new Date(Date.now() - 18*86400000) },
      { name: 'Truck 08', make: 'JAC', model: 'T6', year: 2022, vin: 'JACT62022008', licensePlate: 'FP-008', fuelType: 'gasoline', fuelCapacityLiters: 60, status: 'inactive', mileage: 32100, lastServiceDate: new Date(Date.now() - 90*86400000) }
    ]);
    console.log('🚛 Seeded 8 vehicles');

    // 4️⃣ Generate Telemetry (20 records per vehicle, last 7 days)
    const telemetry = [];
    const now = Date.now();
    const daysAgo = (d) => new Date(now - d * 86400000);
    
    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i];
      const baseMileage = vehicle.mileage;
      const baseFuel = 60 + Math.random() * 20;
      
      for (let h = 0; h < 20; h++) {
        const time = daysAgo(7 - (h * 0.35)); // ~every 8 hours
        telemetry.push({
          vehicleId: vehicle._id,
          timestamp: time,
          mileage: baseMileage + (h * 45),
          fuelLevel: Math.max(10, baseFuel - (h * 2.5)),
          engineTemp: 85 + Math.random() * 12 - (i === 2 ? 8 : 0), // Truck 03 runs hot
          rpm: 1200 + Math.random() * 800 - (i === 3 ? 300 : 0),   // Truck 04 idles more
          speed: Math.random() > 0.7 ? 0 : 40 + Math.random() * 40,
          idleTimePct: i === 3 ? 18 + Math.random() * 5 : 5 + Math.random() * 8,
          faultCodes: i === 2 ? ['P0300', 'P0171'] : (i === 5 ? ['P0420'] : []),
          latitude: -26.2041 + (Math.random() - 0.5) * 0.1, // SA coordinates
          longitude: 28.0473 + (Math.random() - 0.5) * 0.1
        });
      }
    }
    await Telemetry.insertMany(telemetry);
    console.log(`📊 Seeded ${telemetry.length} telemetry records`);

    // 5️⃣ Seed Alerts (varied severity & status)
    const alerts = await Alert.create([
      { vehicleId: vehicles[0]._id, type: 'maintenance_due', severity: 'warning', status: 'new', description: 'Mileage threshold exceeded. Service due in ~800km.', confidence: 0.82, recommendedAction: 'Schedule oil change & brake inspection' },
      { vehicleId: vehicles[2]._id, type: 'engine_fault', severity: 'critical', status: 'acknowledged', description: 'Repeated misfire codes detected. Immediate inspection required.', confidence: 0.91, recommendedAction: 'Pull vehicle, diagnostic scan' },
      { vehicleId: vehicles[3]._id, type: 'fuel_anomaly', severity: 'warning', status: 'new', description: 'MPG 22% below baseline. High idle time detected.', confidence: 0.78, recommendedAction: 'Review driver behavior, check injectors' },
      { vehicleId: vehicles[5]._id, type: 'maintenance_due', severity: 'info', status: 'resolved', description: 'Scheduled oil change completed.', confidence: 0.95, resolvedAt: daysAgo(3) },
      { vehicleId: vehicles[7]._id, type: 'tire_pressure', severity: 'warning', status: 'new', description: 'Front left tire pressure 15% below spec.', confidence: 0.85, recommendedAction: 'Inflate to 35 PSI, inspect for leaks' },
      { vehicleId: vehicles[1]._id, type: 'fuel_anomaly', severity: 'info', status: 'acknowledged', description: 'Slight MPG dip. Route terrain adjusted baseline.', confidence: 0.64 },
      { vehicleId: vehicles[4]._id, type: 'battery_voltage', severity: 'warning', status: 'new', description: 'Starting voltage trending low. Recommend alternator check.', confidence: 0.73, recommendedAction: 'Test charging system' },
      { vehicleId: vehicles[6]._id, type: 'oil_life', severity: 'info', status: 'resolved', description: 'Oil life 20% remaining. Service scheduled.', confidence: 0.88, resolvedAt: daysAgo(4) },
      { vehicleId: vehicles[0]._id, type: 'brake_wear', severity: 'critical', status: 'new', description: 'Brake pad wear sensor triggered. Stop vehicle if safe.', confidence: 0.89, recommendedAction: 'Replace front brake pads immediately' },
      { vehicleId: vehicles[3]._id, type: 'coolant_temp', severity: 'warning', status: 'new', description: 'Coolant temp variance >14°C. Check thermostat/radiator.', confidence: 0.76, recommendedAction: 'Inspect cooling system' },
      { vehicleId: vehicles[5]._id, type: 'fuel_anomaly', severity: 'info', status: 'acknowledged', description: 'Fuel consumption normalized after service.', confidence: 0.92 },
      { vehicleId: vehicles[2]._id, type: 'maintenance_due', severity: 'warning', status: 'new', description: 'Transmission fluid change overdue.', confidence: 0.84, recommendedAction: 'Drain & refill ATF' }
    ]);
    console.log('🚨 Seeded 12 alerts');

    // 6️⃣ Seed Work Orders
    const workOrders = await WorkOrder.create([
      { vehicleId: vehicles[2]._id, type: 'engine_diagnostics', status: 'pending', priority: 'high', assignedTo: technician._id, notes: 'Check misfire codes & fuel injectors', scheduledDate: daysAgo(-1) },
      { vehicleId: vehicles[0]._id, type: 'brake_replacement', status: 'in_progress', priority: 'critical', assignedTo: technician._id, notes: 'Replace front pads & resurface rotors', scheduledDate: daysAgo(-0.5) },
      { vehicleId: vehicles[3]._id, type: 'fuel_system_inspect', status: 'pending', priority: 'medium', assignedTo: technician._id, notes: 'Inspect injectors, clean throttle body' },
      { vehicleId: vehicles[7]._id, type: 'tire_service', status: 'completed', priority: 'low', assignedTo: technician._id, notes: 'Replaced FL tire, balanced & aligned', completedAt: daysAgo(0.2), totalCost: 1250 },
      { vehicleId: vehicles[5]._id, type: 'routine_service', status: 'completed', priority: 'medium', assignedTo: technician._id, notes: 'Oil, filter, coolant top-up', completedAt: daysAgo(3), totalCost: 2100 },
      { vehicleId: vehicles[1]._id, type: 'battery_check', status: 'in_progress', priority: 'low', assignedTo: technician._id, notes: 'Test alternator output & battery health' },
      { vehicleId: vehicles[4]._id, type: 'cooling_system', status: 'pending', priority: 'medium', assignedTo: technician._id, notes: 'Flush coolant, inspect radiator hoses' },
      { vehicleId: vehicles[6]._id, type: 'transmission_fluid', status: 'completed', priority: 'medium', assignedTo: technician._id, notes: 'Drain & refill ATF, update filter', completedAt: daysAgo(4), totalCost: 1850 }
    ]);
    console.log('🔧 Seeded 8 work orders');

    console.log('\n🎉 SEED COMPLETE!');
    console.log(`   Users: ${users.length} | Vehicles: ${vehicles.length} | Alerts: ${alerts.length} | Work Orders: ${workOrders.length}`);
    console.log('\n🔑 Test Logins:');
    console.log(`   Admin:    admin@fleet.com / Password1`);
    console.log(`   Manager:  manager@fleet.com / Password1`);
    console.log(`   Technician: tech@fleet.com / Password1`);
    console.log('\n✅ Refresh your admin portal to see the data.');

  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if executed directly
if (require.main === module) {
  seed().catch(console.error);
}

module.exports = { seed };