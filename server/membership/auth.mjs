import { betterAuth } from 'better-auth';
import { membershipDatabase } from './database.mjs';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { APIError } from 'better-auth/api';

// Cache infrastructure per module; development HMR must refresh auth options.
let authPromise;
export function authOptions(database, config) {
  let transport;
  async function send(to, subject, url) {
    if (config.ownerOnly) throw new APIError('SERVICE_UNAVAILABLE', { message: 'Email recovery is unavailable for this private owner account.' });
    if (new URL(url).origin !== config.origin) throw new Error('Unexpected account email origin.');
    if (config.sqlite ?? config.local) {
      await writeFile(config.directory + '/mail-' + randomUUID() + '.json', JSON.stringify({ to, subject, url, createdAt: new Date().toISOString() }), { mode: 0o600 });
      return;
    }
    transport ||= nodemailer.createTransport({ host: config.env.SMTP_HOST, port: Number(config.env.SMTP_PORT || 465), secure: config.env.SMTP_SECURE !== 'false', requireTLS:config.env.SMTP_SECURE==='false', connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,auth: { user: config.env.SMTP_USER, pass: config.env.SMTP_PASSWORD } });
    await transport.sendMail({ from: config.env.MAIL_FROM, to, subject, text: subject + '\n\n' + url + '\n\nIf you did not request this, you can ignore this email.' });
  }
  return {
    appName: 'AENural', baseURL: config.origin, secret: config.secret, database,
    trustedOrigins: [config.origin],
    emailAndPassword: { enabled: true, disableSignUp: !!config.ownerOnly, minPasswordLength: 12, maxPasswordLength: 128, requireEmailVerification: true, autoSignIn: false, revokeSessionsOnPasswordReset: true, resetPasswordTokenExpiresIn: 1800, sendResetPassword: async ({ user, url }) => send(user.email, 'Reset your AENural password', url) },
    emailVerification: { sendOnSignUp: !config.ownerOnly, sendOnSignIn: !config.ownerOnly, autoSignInAfterVerification: false, expiresIn: 3600, sendVerificationEmail: async ({ user, url }) => send(user.email, 'Verify your AENural email', url) },
    user: { changeEmail: { enabled: false }, deleteUser: { enabled: !config.ownerOnly } },
    session: { expiresIn: 7 * 86400, updateAge: 86400, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 60, customRules: { '/sign-in/email': { window: 60, max: 8 }, '/sign-up/email': { window: 60, max: 4 }, '/request-password-reset': { window: 60, max: 3 }, '/send-verification-email': { window: 60, max: 3 } } },
    advanced: { useSecureCookies: !config.local, ipAddress: { ipAddressHeaders: [config.local?'x-forwarded-for':config.env.AUTH_TRUSTED_IP_HEADER||'x-real-ip'] } },
    databaseHooks: { user: {
      create: { before: async user => { if(typeof user.name!=='string'||!user.name.trim()||user.name.length>80)throw new APIError('BAD_REQUEST',{message:'Use a name between 1 and 80 characters.'});return {data:{...user,name:user.name.trim()}}; } },
      update: { before: async user => { if(user.name!==undefined&&(typeof user.name!=='string'||!user.name.trim()||user.name.length>80))throw new APIError('BAD_REQUEST',{message:'Use a name between 1 and 80 characters.'});return {data:user}; } },
      delete: { before: async user => { const {db}=await membershipDatabase();await db.transaction().execute(async tx=>{for(const table of ['aenural_activity','aenural_projects','aenural_caption_jobs','aenural_daily_usage','aenural_checkouts','aenural_orders','aenural_operation_limits'])await tx.deleteFrom(table).where('owner_id','=',user.id).execute();}); } },
    } },
    logger: { disabled: config.local },
  };
}
export async function membershipAuth() {
  if (!authPromise) authPromise = (async () => {
    const { authDatabase, config, db, dialect } = await membershipDatabase();
    const options = authOptions(authDatabase, config);
    const auth = betterAuth(options);
    if (config.sqlite ?? config.local) {
      const { getMigrations } = await import('better-auth/db/migration');
      const migrations = await getMigrations(options); await migrations.runMigrations();
      const { ensureMembershipSchema } = await import('./schema.mjs');
      await ensureMembershipSchema(db, dialect);
    }
    return auth;
  })();
  try { return await authPromise; } catch (error) { authPromise = undefined; throw error; }
}
export async function verifiedMember(requestHeaders) {
  // Anonymous visits to public tools do not initialize the DB/auth library.
  if (!/\b(?:__Secure-)?better-auth\.session_token=/.test(requestHeaders.get('cookie') || '')) return null;
  const auth = await membershipAuth();
  const session = await auth.api.getSession({ headers: requestHeaders, query: { disableCookieCache: true } });
  return session?.user?.emailVerified ? session.user : null;
}
