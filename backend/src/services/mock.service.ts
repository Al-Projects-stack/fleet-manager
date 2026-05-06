import mongoose from 'mongoose';
import { Telemetry, Vehicle } from '../models';
import { AlertService } from './alert.service';

// Generates plausible hourly telemetry for development & demo seeding.
// Not for production use.

export class MockService {
  static async generateTelemetryBatch(
    vehicleId: string,
    hoursBack = 24
  ): Promise<number> {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) throw new Error(`Vehicle ${vehicleId} not found`);

    const now = Date.now();
    let odometer = vehicle.currentOdometerKm;
    let fuelLevel = 75 + Math.random() * 20; // start 75–95%

    for (let i = hoursBack; i >= 0; i--) {
      const timestamp = new Date(now - i * 60 * 60 * 1000);
      const consumed = 2 + Math.random() * 5;       // 2–7 L/h
      const travelled = 30 + Math.random() * 70;    // 30–100 km

      fuelLevel = Math.max(
        0,
        fuelLevel - (consumed / vehicle.fuelCapacityLiters) * 100
      );
      odometer += travelled;

      const reading = await Telemetry.create({
        vehicleId: new mongoose.Types.ObjectId(vehicleId),
        timestamp,
        odometerKm: parseFloat(odometer.toFixed(1)),
        fuelLevelPercent: parseFloat(fuelLevel.toFixed(2)),
        fuelConsumedLiters: parseFloat(consumed.toFixed(3)),
        latitude: 40.7128 + (Math.random() - 0.5) * 0.2,
        longitude: -74.006 + (Math.random() - 0.5) * 0.2,
        speedKmh: parseFloat((Math.random() * 120).toFixed(1)),
        engineTempCelsius: parseFloat((85 + Math.random() * 20).toFixed(1)),
        engineHours: parseFloat((odometer / 80).toFixed(2)),
        rawPayload: { source: 'mock' },
      });

      // Only run alert evaluation on the final (most recent) reading
      if (i === 0) {
        vehicle.currentOdometerKm = odometer;
        await vehicle.save();
        await AlertService.evaluateRules(vehicle, reading).catch(() => {});
      }
    }

    return hoursBack;
  }

  static async seedAllActiveVehicles(hoursBack = 24): Promise<void> {
    const vehicles = await Vehicle.find({ status: 'active' });
    for (const v of vehicles) {
      await MockService.generateTelemetryBatch(v.id as string, hoursBack);
    }
    console.info(
      `[MockService] Seeded ${hoursBack}h of telemetry for ${vehicles.length} vehicle(s)`
    );
  }
}
