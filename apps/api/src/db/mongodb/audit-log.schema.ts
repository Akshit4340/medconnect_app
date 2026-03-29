import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: true },
);

// Auto-expire audit logs after 2 years
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
