import mongoose, { Document, Schema, Model } from 'mongoose';

export type AlertType =
  | 'fuel_anomaly'
  | 'maintenance_due'
  | 'engine_temp'
  | 'low_fuel'
  | 'custom';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IAlert {
  vehicleId: mongoose.Types.ObjectId;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details: Record<string, unknown>;
  isResolved: boolean;
  resolvedById: mongoose.Types.ObjectId | null;
  resolvedAt: Date | null;
  workOrderId: mongoose.Types.ObjectId | null;
  triggeredAt: Date;
}

export interface IAlertDocument extends IAlert, Document {
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<IAlertDocument>(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle ID is required'],
    },
    type: {
      type: String,
      enum: {
        values: [
          'fuel_anomaly',
          'maintenance_due',
          'engine_temp',
          'low_fuel',
          'custom',
        ] as AlertType[],
        message: 'Invalid alert type',
      },
      required: [true, 'Alert type is required'],
    },
    severity: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'critical'] as AlertSeverity[],
        message: 'Invalid severity level',
      },
      required: [true, 'Severity is required'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
      default: null,
    },
    triggeredAt: {
      type: Date,
      required: true,
      default: Date.now,
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

alertSchema.index({ vehicleId: 1, isResolved: 1 });
alertSchema.index({ triggeredAt: -1 });
alertSchema.index({ severity: 1, isResolved: 1 });
alertSchema.index({ type: 1, vehicleId: 1 });

export const Alert: Model<IAlertDocument> = mongoose.model<IAlertDocument>(
  'Alert',
  alertSchema
);
