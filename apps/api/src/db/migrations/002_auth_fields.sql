-- Add password hash column to users if it doesn't exist
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Track email verification (for future use)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Track last login time
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_tenant_email
  ON users(tenant_id, email);