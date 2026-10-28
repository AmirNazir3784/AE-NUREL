// Read configuration names only. Never print credential values or contact a service.
import { membershipConfig } from '../../server/membership/config.mjs';
import { paymentConfiguration } from '../../server/membership/payments.mjs';
const problems=[],env=process.env;
if(Number(process.versions.node.split('.')[0])<22)problems.push('Use Node.js 22 or 24; Node.js 24 is used for local acceptance.');
if(env.AENURAL_MEMBERSHIP_ENABLED!=='1')problems.push('Set AENURAL_MEMBERSHIP_ENABLED=1 only after MySQL and email setup.');
if(env.NEXT_PUBLIC_AENURAL_AUTO_CAPTION_RELEASE!=='1')problems.push('Enable NEXT_PUBLIC_AENURAL_AUTO_CAPTION_RELEASE=1 only for the approved caption launch.');
for(const key of ['SITE_URL','BETTER_AUTH_URL','BETTER_AUTH_SECRET','DB_NAME','DB_USER','DB_PASSWORD','SMTP_HOST','SMTP_USER','SMTP_PASSWORD','MAIL_FROM','AUTH_TRUSTED_IP_HEADER'])if(!env[key])problems.push('Configure '+key+'.');
try{if(env.SITE_URL&&env.BETTER_AUTH_URL&&new URL(env.SITE_URL).origin!==new URL(env.BETTER_AUTH_URL).origin)problems.push('SITE_URL and BETTER_AUTH_URL must use the same canonical HTTPS origin.');}catch{problems.push('Set valid canonical HTTPS origins for SITE_URL and BETTER_AUTH_URL.');}
if(!['x-real-ip','x-forwarded-for','cf-connecting-ip'].includes(env.AUTH_TRUSTED_IP_HEADER||''))problems.push('Confirm a trusted client-IP header with Hostinger before enabling authentication rate limits.');
try{membershipConfig({...env,NODE_ENV:'production',AENURAL_MEMBERSHIP_ENABLED:'1'});}catch(error){problems.push(error.message);}
if(env.AENURAL_ACCOUNT_QA==='1'||env.AENURAL_AUTO_CAPTION_QA==='1'||env.AENURAL_HYBRID_ENABLED==='1')problems.push('Remove development and loopback QA switches from production.');
if(env.AENURAL_SALES_ENABLED==='1'){
  try{const payment=paymentConfiguration(env);if(!payment)problems.push('Configure all four LEMONSQUEEZY_* provider settings before opening sales.');else if(payment.testMode)problems.push('Live sales must not use LEMONSQUEEZY_TEST_MODE=1.');}catch(error){problems.push(error.message);}
}
if(problems.length){console.error('Release configuration is not complete:\n'+[...new Set(problems)].map(p=>' - '+p).join('\n'));process.exitCode=1;}
else console.log('Configuration names are complete. Still verify the actual database, email delivery, trusted proxy header, provider checkout/webhooks, license files and published business policies in staging before public release. No service was contacted or changed.');
