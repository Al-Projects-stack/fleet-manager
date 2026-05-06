import mongoose, { Document, Schema, Model } from 'mongoose';

export type VehicleStatus = 'active' | 'inactive' | 'maintenance';
export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'cng';

export interface IVehicle {
  name: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string;
  fuelType: FuelType;
  fuelCapacityLiters: number;
  currentOdometerKm: number;
  status: VehicleStatus;
  lastMaintenanceDate: Date | null;
  nextMaintenanceOdometerKm: number | null;
  assignedDriverId: mongoose.Types.ObjectId | null;
  notes: string;
}

export interface IVehicleDocument extends IVehicle, Document {
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new Schema<IVehicleDocument>(
  {
    name: {
      type: String,
      required: [true, 'Vehicle name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    make: { type: String, required: [true, 'Make is required'], trim: true },
    model: { type: String, required: [true, 'Model is required'], trim: true },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [1900, 'Year must be 1900 or later'],
      max: [new Date().getFullYear() + 1, 'Year cannot exceed next calendar year'],
      validate: {
        validator: Number.isInteger,
        message: 'Year must be an integer',
      },
    },
    vin: {
      type: String,
      required: [true, 'VIN is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [
        /^[A-HJ-NPR-Z0-9]{17}$/,
        'VIN must be 17 alphanumeric characters (no I, O, or Q)',
      ],
    },
    licensePlate: {
      type: String,
      required: [true, 'License plate is required'],
      trim: true,
      uppercase: true,
      maxlength: [20, 'License plate cannot exceed 20 characters'],
    },
    fuelType: {
      type: String,
      enum: {
        values: ['gasoline', 'diesel', 'electric', 'hybrid', 'cng'] as FuelType[],
        message: 'Invalid fuel type',
      },
      required: [true, 'Fuel type is required'],
    },
    fuelCapacityLiters: {
      type: Number,
      required: [true, 'Fuel capacity is required'],
      min: [1, 'Fuel capacity must be at least 1 liter'],
    },
    currentOdometerKm: {
      type: Number,
      default: 0,
      min: [0, 'Odometer cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'maintenance'] as VehicleStatus[],
        message: 'Invalid status',
      },
      default: 'active' as VehicleStatus,
    },
    lastMaintenanceDate: { type: Date, default: null },
    nextMaintenanceOdometerKm: {
      type: Number,
      default: null,
      min: [0, 'Next maintenance odometer cannot be negative'],
    },
    assignedDriverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      default: '',
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

vehicleSchema.index({ status: 1 });
vehicleSchema.index({ assignedDriverId: 1 });
vehicleSchema.index({ fuelType: 1, status: 1 });
// vin has a unique sparse index auto-created by `unique: true` above

export const Vehicle: Model<IVehicleDocument> = mongoose.model<IVehicleDocument>(
  'Vehicle',
  vehicleSchema
);
