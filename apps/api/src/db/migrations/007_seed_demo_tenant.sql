-- Seed the default 'demo' tenant so auth flows work out of the box
INSERT INTO tenants (name, subdomain, plan, is_active)
VALUES ('Demo Clinic', 'demo', 'free', true)
ON CONFLICT (subdomain) DO NOTHING;
