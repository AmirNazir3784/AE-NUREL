// Read configuration names only. Never print credential values or contact a service.
import { existsSync, readFileSync } from 'node:fs';
import { membershipConfig, TRUSTED_IP_HEADERS } from '../../server/membership/config.mjs';
import { paymentConfiguration } from '../../server/membership/payments.mjs';
import { isLoopbackHost } from '../../server/membership/mysql-tls.mjs';
const problems=[],env=process.env;
if(Number(process.versions.node.split('.')[0])<22)problems.push('Use Node.js 22 or 24; Node.js 24 is used for local acceptance.');
if(env.AENURAL_MEMBERSHIP_ENABLED!=='1')problems.push('Set AENURAL_MEMBERSHIP_ENABLED=1 only after MySQL and email setup.');
// Phase 4 fix (SEC-03): the membershipConfig() call below forces
// NODE_ENV='production', so a real deployment with NODE_ENV unset/missing
// used to pass this check while the app itself ran in local/SQLite mode
// (config.mjs treats any NODE_ENV other than 'production' as local unless
// AENURAL_MEMBERSHIP_DATABASE=mysql). Membership enabled means production
// mode: check the real NODE_ENV here, before the forced call masks it.
if(env.AENURAL_MEMBERSHIP_ENABLED==='1'&&env.NODE_ENV!=='production')problems.push('Set NODE_ENV=production in the production environment. With AENURAL_MEMBERSHIP_ENABLED=1 and NODE_ENV unset (or anything other than production), the app treats the run as local/SQLite mode instead of production MySQL mode.');
if(env.NEXT_PUBLIC_AENURAL_AUTO_CAPTION_RELEASE!=='1')problems.push('Enable NEXT_PUBLIC_AENURAL_AUTO_CAPTION_RELEASE=1 only for the approved caption launch.');
// Step 5 security review (S5-19, release-check part): site preview is
// default-OPEN in production (src/lib/site-preview.ts) unless this is
// '0', so a production release check must fail while it is anything else.
if(env.NEXT_PUBLIC_AENURAL_SITE_PREVIEW!=='0')problems.push('Set NEXT_PUBLIC_AENURAL_SITE_PREVIEW=0 in a production release to keep the preview explicitly closed (preview is opt-in only since Step 5, S5-19: OFF unless explicitly set to 1).');
for(const key of ['SITE_URL','BETTER_AUTH_URL','BETTER_AUTH_SECRET','DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD','SMTP_HOST','SMTP_PORT','SMTP_SECURE','SMTP_USER','SMTP_PASSWORD','MAIL_FROM','AUTH_TRUSTED_IP_HEADER'])if(!env[key])problems.push('Configure '+key+'.');
if(env.DB_HOST && env.DB_HOST.trim().toLowerCase()==='localhost')problems.push('Set DB_HOST=127.0.0.1, not localhost: Node resolves localhost to IPv6 ::1 and Hostinger MySQL rejects it. The remote hostname (srv*.hstgr.io) is for development from outside Hostinger only, never for the hosted app.');
if(env.DB_PORT && !/^\d+$/.test(env.DB_PORT))problems.push('DB_PORT must be a number (3306).');
if(env.SMTP_PORT && !/^\d+$/.test(env.SMTP_PORT))problems.push('SMTP_PORT must be a number (465 for implicit TLS, 587 for STARTTLS).');
if(env.SMTP_SECURE && !['true','false'].includes(env.SMTP_SECURE))problems.push('SMTP_SECURE must be true (port 465) or false (port 587 STARTTLS).');
if(env.SMTP_PORT==='465'&&env.SMTP_SECURE==='false')problems.push('SMTP_PORT=465 requires SMTP_SECURE=true; 465 with STARTTLS will fail.');
if(env.SMTP_PORT==='587'&&env.SMTP_SECURE!=='false')problems.push('SMTP_PORT=587 requires SMTP_SECURE=false (STARTTLS); 587 with implicit TLS will fail.');
if(env.DB_TLS_ALLOW_PUBLIC_CA && !['0','1'].includes(env.DB_TLS_ALLOW_PUBLIC_CA))problems.push('DB_TLS_ALLOW_PUBLIC_CA must be 1 to opt in, or 0/unset to require a CA file for remote MySQL.');
// Remote MySQL TLS (fail-closed): a non-loopback host needs a readable CA
// bundle (DB_SSL_CA_FILE) or the explicit public-CA opt-in. Never
// rejectUnauthorized: false. Whether the Hostinger server certificate
// chains to a public CA is unverified — probe it from the allowlisted PC
// before relying on the opt-in; see config/membership.env.example.
if(env.DB_HOST && !isLoopbackHost(env.DB_HOST)) {
  if(env.DB_SSL_CA_FILE) {
    if(!existsSync(env.DB_SSL_CA_FILE))problems.push('DB_SSL_CA_FILE points to a file that does not exist ('+env.DB_SSL_CA_FILE+').');
    else try { const ca=readFileSync(env.DB_SSL_CA_FILE,'utf8'); if(!ca.trim())problems.push('DB_SSL_CA_FILE is empty ('+env.DB_SSL_CA_FILE+').'); } catch { problems.push('DB_SSL_CA_FILE cannot be read ('+env.DB_SSL_CA_FILE+').'); }
  } else if(env.DB_TLS_ALLOW_PUBLIC_CA!=='1') {
    problems.push('Remote MySQL host ('+env.DB_HOST+') requires verified TLS. Set DB_SSL_CA_FILE to a readable PEM CA bundle, or set DB_TLS_ALLOW_PUBLIC_CA=1 only if the server certificate chains to a public CA. Unverified remote MySQL connections are refused; rejectUnauthorized is never disabled.');
  }
} else if(env.DB_SSL_CA_FILE) {
  if(!existsSync(env.DB_SSL_CA_FILE))problems.push('DB_SSL_CA_FILE points to a file that does not exist ('+env.DB_SSL_CA_FILE+').');
  else try { const ca=readFileSync(env.DB_SSL_CA_FILE,'utf8'); if(!ca.trim())problems.push('DB_SSL_CA_FILE is empty ('+env.DB_SSL_CA_FILE+').'); } catch { problems.push('DB_SSL_CA_FILE cannot be read ('+env.DB_SSL_CA_FILE+').'); }
}
// AUTH_TRUSTED_IP_HEADER value is still UNCONFIRMED with Hostinger —
// confirm which header its trusted proxy overwrites before launch.
// Step 5 security review (S5-02): accept ONLY the shared allowlist from
// server/membership/config.mjs (currently just 'x-real-ip'). The two
// other headers are rejected with a DISTINCT message explaining why each
// is unsafe — never silently treated as acceptable.
const trustedHeader = (env.AUTH_TRUSTED_IP_HEADER || '').trim().toLowerCase();
if (trustedHeader === 'x-forwarded-for') problems.push("AUTH_TRUSTED_IP_HEADER=x-forwarded-for is not safe here: without trustedProxies (this code sets none), multi-entry x-forwarded-for collapses to one shared rate-limit counter and its leftmost entry is client-forgeable. Set x-real-ip only after the checks in docs/authentication/trusted-proxy-ip.md §4 pass.");
else if (trustedHeader === 'cf-connecting-ip') problems.push("AUTH_TRUSTED_IP_HEADER=cf-connecting-ip is not safe here: Hostinger CDN strips cf-connecting-ip from incoming requests, so any visitor can forge it. Set x-real-ip only after the checks in docs/authentication/trusted-proxy-ip.md §4 pass.");
else if (trustedHeader && !TRUSTED_IP_HEADERS.includes(trustedHeader)) problems.push('Confirm a trusted client-IP header with Hostinger before enabling authentication rate limits. Only the Hostinger-confirmed value is accepted (currently x-real-ip — see docs/authentication/trusted-proxy-ip.md).');
try{if(env.SITE_URL&&env.BETTER_AUTH_URL&&new URL(env.SITE_URL).origin!==new URL(env.BETTER_AUTH_URL).origin)problems.push('SITE_URL and BETTER_AUTH_URL must use the same canonical HTTPS origin.');}catch{problems.push('Set valid canonical HTTPS origins for SITE_URL and BETTER_AUTH_URL.');}
try{membershipConfig({...env,NODE_ENV:'production',AENURAL_MEMBERSHIP_ENABLED:'1'});}catch(error){problems.push(error.message);}
if(env.AENURAL_ACCOUNT_QA==='1'||env.AENURAL_AUTO_CAPTION_QA==='1'||env.AENURAL_HYBRID_ENABLED==='1')problems.push('Remove development and loopback QA switches from production.');
if(env.AENURAL_SALES_ENABLED==='1'){
  try{const payment=paymentConfiguration(env);if(!payment)problems.push('Configure all four LEMONSQUEEZY_* provider settings before opening sales.');else if(payment.testMode)problems.push('Live sales must not use LEMONSQUEEZY_TEST_MODE=1.');}catch(error){problems.push(error.message);}
}
if(problems.length){console.error('Release configuration is not complete:\n'+[...new Set(problems)].map(p=>' - '+p).join('\n'));process.exitCode=1;}
else console.log('Configuration names are complete. Still verify the actual database, email delivery, trusted proxy header, provider checkout/webhooks, license files and published business policies in staging before public release. No service was contacted or changed. Run `npm run membership:verify-mysql` against the target database to prove the connection, TLS (where required) and schema before enabling membership.');
