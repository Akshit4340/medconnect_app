import PDFDocument from 'pdfkit';
import { pgPool } from '../../config/database';
import { ConsultationNote } from '../../db/mongodb/consultation-note.schema';
import { AuditLog } from '../../db/mongodb/audit-log.schema';
import { logger } from '../../config/logger';
import { s3, getFileUrl } from '../../config/storage';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.MINIO_BUCKET || 'medconnect-files';

// ─── Audit helper ─────────────────────────────────────────────────────────────

export async function createAuditLog(data: {
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    await AuditLog.create(data);
  } catch (err) {
    logger.error('Failed to create audit log', { err });
  }
}

// ─── Consultation notes ───────────────────────────────────────────────────────

export async function createOrUpdateNote(
  tenantId: string,
  doctorId: string,
  appointmentId: string,
  soap: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  },
) {
  // Get patient from appointment
  const apptResult = await pgPool.query(
    'SELECT patient_id FROM appointments WHERE id = $1 AND tenant_id = $2',
    [appointmentId, tenantId],
  );

  if (apptResult.rows.length === 0) throw new Error('Appointment not found');
  const patientId = apptResult.rows[0].patient_id;

  const note = await ConsultationNote.findOneAndUpdate(
    { tenantId, appointmentId, doctorId },
    { tenantId, appointmentId, doctorId, patientId, soap },
    { upsert: true, new: true },
  );

  logger.info('Consultation note saved', { noteId: note._id, appointmentId });
  return note;
}

export async function getNoteByAppointment(
  tenantId: string,
  appointmentId: string,
  requestingUserId: string,
  requestingRole: string,
) {
  const note = await ConsultationNote.findOne({ tenantId, appointmentId });

  if (!note) throw new Error('Note not found');

  // Patients can only see notes marked as visible
  if (requestingRole === 'patient' && !note.isVisibleToPatient) {
    throw new Error('Note not accessible');
  }

  await createAuditLog({
    tenantId,
    userId: requestingUserId,
    action: 'read',
    resource: 'consultation_note',
    resourceId: String(note._id),
  });

  return note;
}

export async function getPatientNotes(
  tenantId: string,
  patientId: string,
  requestingRole: string,
) {
  const query: Record<string, unknown> = { tenantId, patientId };
  if (requestingRole === 'patient') {
    query.isVisibleToPatient = true;
  }
  return ConsultationNote.find(query).sort({ createdAt: -1 });
}

export async function toggleNoteVisibility(
  tenantId: string,
  noteId: string,
  isVisible: boolean,
) {
  return ConsultationNote.findOneAndUpdate(
    { _id: noteId, tenantId },
    { isVisibleToPatient: isVisible },
    { new: true },
  );
}

// ─── Prescriptions ────────────────────────────────────────────────────────────

export async function createPrescription(
  tenantId: string,
  data: {
    appointmentId: string;
    doctorId: string;
    patientId: string;
    medications: {
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
    }[];
    instructions?: string;
    validUntil?: string;
  },
) {
  const result = await pgPool.query(
    `INSERT INTO prescriptions
      (tenant_id, appointment_id, doctor_id, patient_id, medications, instructions, valid_until)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      tenantId,
      data.appointmentId,
      data.doctorId,
      data.patientId,
      JSON.stringify(data.medications),
      data.instructions ?? null,
      data.validUntil ?? null,
    ],
  );

  const prescription = result.rows[0];

  // Generate PDF asynchronously
  generatePrescriptionPdf(tenantId, prescription.id, data).catch((err) =>
    logger.error('PDF generation failed', { err }),
  );

  return prescription;
}

export async function getPatientPrescriptions(
  tenantId: string,
  patientId: string,
) {
  const result = await pgPool.query(
    `SELECT p.*, d.specialisation as doctor_specialisation
     FROM prescriptions p
     JOIN doctors d ON d.id = p.doctor_id
     WHERE p.patient_id = $1 AND p.tenant_id = $2
     ORDER BY p.created_at DESC`,
    [patientId, tenantId],
  );
  return result.rows;
}

// ─── PDF generation ───────────────────────────────────────────────────────────

async function generatePrescriptionPdf(
  tenantId: string,
  prescriptionId: string,
  data: {
    medications: {
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
    }[];
    instructions?: string;
    validUntil?: string;
  },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(chunks);
      const key = `prescriptions/${tenantId}/${prescriptionId}.pdf`;

      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
          }),
        );

        const pdfUrl = getFileUrl(key);

        await pgPool.query(
          'UPDATE prescriptions SET pdf_url = $1 WHERE id = $2',
          [pdfUrl, prescriptionId],
        );

        logger.info('Prescription PDF generated', { prescriptionId, key });
        resolve(pdfUrl);
      } catch (err) {
        reject(err);
      }
    });

    // Build PDF content
    doc.fontSize(20).text('MedConnect Prescription', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`);

    if (data.validUntil) {
      doc.text(
        `Valid until: ${new Date(data.validUntil).toLocaleDateString()}`,
      );
    }

    doc.moveDown();
    doc.fontSize(14).text('Medications:', { underline: true });
    doc.moveDown(0.5);

    data.medications.forEach((med, i) => {
      doc.fontSize(12).text(`${i + 1}. ${med.name}`);
      doc
        .fontSize(10)
        .text(`   Dosage: ${med.dosage}`)
        .text(`   Frequency: ${med.frequency}`)
        .text(`   Duration: ${med.duration}`);
      doc.moveDown(0.3);
    });

    if (data.instructions) {
      doc.moveDown();
      doc.fontSize(14).text('Instructions:', { underline: true });
      doc.fontSize(12).text(data.instructions);
    }

    doc.end();
  });
}

// ─── Full-text search ─────────────────────────────────────────────────────────

export async function searchNotes(
  tenantId: string,
  patientId: string,
  query: string,
) {
  return ConsultationNote.find({
    tenantId,
    patientId,
    $or: [
      { 'soap.subjective': { $regex: query, $options: 'i' } },
      { 'soap.objective': { $regex: query, $options: 'i' } },
      { 'soap.assessment': { $regex: query, $options: 'i' } },
      { 'soap.plan': { $regex: query, $options: 'i' } },
    ],
  }).sort({ createdAt: -1 });
}
