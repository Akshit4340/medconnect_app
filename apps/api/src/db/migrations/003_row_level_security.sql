-- Enable Row Level Security on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only see rows matching their tenant
-- This is enforced at the database level, not just application level
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Allow superuser (your app's DB user) to bypass RLS for migrations
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Create a helper function to set the tenant context for a session
CREATE OR REPLACE FUNCTION set_tenant_id(p_tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id, true);
END;
$$ LANGUAGE plpgsql;