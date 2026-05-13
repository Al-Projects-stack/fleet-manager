import mongoose, { Document, Schema, Model } from 'mongoose';

export type WorkOrderType = 'preventive' | 'corrective' | 'inspection';
export type WorkOrderStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IWorkOrderNote {
  _id: mongoose.Types.ObjectId;
  content: string;
  authorId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IWorkOrder {
  vehicleId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  assignedToId: mongoose.Types.ObjectId | null;
  createdById: mongoose.Types.ObjectId;
  estimatedCostUsd: number;
  actualCostUsd: number | null;
  scheduledDate: Date | null;
  completedDate: Date | null;
  notes: IWorkOrderNote[];
  alertId: mongoose.Types.ObjectId | null;
  odometerAtCreationKm: number;
  partsUsed: string[];
}

export interface IWorkOrderDocument extends IWorkOrder, Document {
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<IWorkOrderNote>(
  {
    content: {
      type: String,
      required: [true, 'Note content is required'],
      trim: true,
      maxlength: [2000, 'Note cannot exceed 2000 characters'],
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const workOrderSchema = new Schema<IWorkOrderDocument>(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      enum: {
        values: ['preventive', 'corrective', 'inspection'] as WorkOrderType[],
        message: 'Invalid work order type',
      },
      required: [true, 'Type is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['open', 'in_progress', 'completed', 'cancelled'] as WorkOrderStatus[],
        message: 'Invalid status',
      },
      default: 'open' as WorkOrderStatus,
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'] as WorkOrderPriority[],
        message: 'Invalid priority',
      },
      default: 'medium' as WorkOrderPriority,
    },
    assignedToId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
    },
    estimatedCostUsd: {
      type: Number,
      default: 0,
      min: [0, 'Estimated cost cannot be negative'],
    },
    actualCostUsd: {
      type: Number,
      default: null,
      min: [0, 'Actual cost cannot be negative'],
    },
    scheduledDate: { type: Date, default: null },
    completedDate: { type: Date, default: null },
    notes: { type: [noteSchema], default: [] },
    alertId: {
      type: Schema.Types.ObjectId,
      ref: 'Alert',
      default: null,
    },
    odometerAtCreationKm: {
      type: Number,
      default: 0,
      min: [0, 'Odometer reading cannot be negative'],
    },
    partsUsed: { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  }
);

workOrderSchema.index({ vehicleId: 1, status: 1 });
workOrderSchema.index({ assignedToId: 1, status: 1 });
workOrderSchema.index({ priority: 1, status: 1 });
workOrderSchema.index({ createdAt: -1 });
workOrderSchema.index({ alertId: 1 }, { sparse: true });

export const WorkOrder: Model<IWorkOrderDocument> = mongoose.model<IWorkOrderDocument>(
  'WorkOrder',
  workOrderSchema
);
