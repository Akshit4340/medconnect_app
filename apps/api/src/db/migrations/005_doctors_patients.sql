-- ─── Doctors ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS doctors (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialisation   VARCHAR(100) NOT NULL,
  license_number   VARCHAR(100) NOT NULL,
  bio              TEXT,
  avatar_url       VARCHAR(500),
  consultation_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_available     BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id),
  UNIQUE(tenant_id, license_number)
);

CREATE INDEX IF NOT EXISTS idx_doctors_tenant       ON doctors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialisation ON doctors(tenant_id, specialisation);
CREATE INDEX IF NOT EXISTS idx_doctors_available     ON doctors(tenant_id, is_available);

-- ─── Patients ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS patients (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth    DATE,
  blood_group      VARCHAR(5),
  allergies        TEXT[],
  medical_summary  TEXT,
  emergency_contact_name  VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_patients_tenant  ON patients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(tenant_id, user_id);

-- ─── Availability slots ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS availability_slots (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  doctor_id   UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  slot_duration_minutes INT NOT NULL DEFAULT 30,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_slots_doctor    ON availability_slots(doctor_id);
CREATE INDEX IF NOT EXISTS idx_slots_day       ON availability_slots(tenant_id, day_of_week);

-- ─── Appointments ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES doctors(id),
  patient_id      UUID NOT NULL REFERENCES patients(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','completed','cancelled')),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  notes           TEXT,
  cancellation_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant     ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor     ON appointments(doctor_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_patient    ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status     ON appointments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled  ON appointments(tenant_id, scheduled_at);