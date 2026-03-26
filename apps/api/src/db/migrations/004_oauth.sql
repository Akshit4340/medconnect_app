ALTER TABLE users
  ADD COLUMN IF NOT EXISTS oauth_provider  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS oauth_id        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS avatar_url      VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_users_oauth
  ON users(oauth_provider, oauth_id)
  WHERE oauth_provider IS NOT NULL;