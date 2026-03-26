import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { pgPool } from './database';
import { logger } from './logger';

export function initPassport(): void {
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_CALLBACK_URL
  ) {
    logger.warn('Google OAuth env vars missing — Google login disabled');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
      },
      async (req, _accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const avatarUrl = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error('No email from Google profile'));
          }

          // Extract tenant from state param passed during OAuth init
          const tenantSubdomain = (req.query.state as string) || 'demo';

          const tenantResult = await pgPool.query(
            'SELECT id FROM tenants WHERE subdomain = $1 AND is_active = true',
            [tenantSubdomain],
          );

          if (tenantResult.rows.length === 0) {
            return done(new Error(`Tenant '${tenantSubdomain}' not found`));
          }

          const tenantId = tenantResult.rows[0].id;

          // Check if user already exists with this Google account
          const existingOAuth = await pgPool.query(
            `SELECT id, tenant_id, email, first_name, last_name, role
             FROM users
             WHERE tenant_id = $1 AND oauth_provider = 'google' AND oauth_id = $2`,
            [tenantId, profile.id],
          );

          if (existingOAuth.rows.length > 0) {
            return done(null, existingOAuth.rows[0]);
          }

          // Check if user exists with this email (link accounts)
          const existingEmail = await pgPool.query(
            'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
            [tenantId, email],
          );

          if (existingEmail.rows.length > 0) {
            // Link Google to existing account
            await pgPool.query(
              `UPDATE users
               SET oauth_provider = 'google', oauth_id = $1, avatar_url = $2
               WHERE id = $3`,
              [profile.id, avatarUrl, existingEmail.rows[0].id],
            );

            const updated = await pgPool.query(
              'SELECT id, tenant_id, email, first_name, last_name, role FROM users WHERE id = $1',
              [existingEmail.rows[0].id],
            );

            return done(null, updated.rows[0]);
          }

          // Create new user from Google profile
          const nameParts = profile.displayName?.split(' ') || [];
          const firstName = profile.name?.givenName || nameParts[0] || 'User';
          const lastName =
            profile.name?.familyName || nameParts.slice(1).join(' ') || '';

          const newUser = await pgPool.query(
            `INSERT INTO users
              (tenant_id, email, first_name, last_name, role,
               oauth_provider, oauth_id, avatar_url, email_verified)
             VALUES ($1, $2, $3, $4, 'patient', 'google', $5, $6, true)
             RETURNING id, tenant_id, email, first_name, last_name, role`,
            [tenantId, email, firstName, lastName, profile.id, avatarUrl],
          );

          logger.info('New user created via Google OAuth', {
            userId: newUser.rows[0].id,
            tenantId,
          });

          return done(null, newUser.rows[0]);
        } catch (err) {
          return done(err as Error);
        }
      },
    ),
  );
}
