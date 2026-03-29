import mongoose, { Schema, Document } from 'mongoose';

export interface IConsultationNote extends Document {
  tenantId: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  soap: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  attachments: {
    key: string;
    url: string;
    name: string;
    uploadedAt: Date;
  }[];
  isVisibleToPatient: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConsultationNoteSchema = new Schema<IConsultationNote>(
  {
    tenantId: { type: String, required: true, index: true },
    appointmentId: { type: String, required: true, index: true },
    doctorId: { type: String, required: true, index: true },
    patientId: { type: String, required: true, index: true },
    soap: {
      subjective: { type: String, default: '' },
      objective: { type: String, default: '' },
      assessment: { type: String, default: '' },
      plan: { type: String, default: '' },
    },
    attachments: [
      {
        key: String,
        url: String,
        name: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    isVisibleToPatient: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const ConsultationNote = mongoose.model<IConsultationNote>(
  'ConsultationNote',
  ConsultationNoteSchema,
);
