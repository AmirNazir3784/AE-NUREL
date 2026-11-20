#!/usr/bin/env node
// Generate a new owner activation token + its scrypt hash (S5-04).
//
// Run on the operator's own machine only, in the project folder:
//   node scripts/membership/generate-owner-token.mjs
//
// The token is printed ONCE to stdout. Save it immediately in a password
// manager — it is never written to any file by this script, never logged
// anywhere, and cannot be recovered from the hash. Put ONLY the hash in
// the server env var AENURAL_OWNER_ACTIVATION_TOKEN_HASH, and the real
// owner address in AENURAL_OWNER_EMAIL. Never paste either value into
// chat, email, a ticket, a screenshot, or a commit.
//
// The hash format must match server/membership/owner-activation.mjs:
//   scrypt$N$r$p$<salt-b64>$<hash-b64>   (N=16384, r=8, p=1, 64-byte key)
// This script is dependency-free (node:crypto only) so it runs before
// `npm install` if needed; it imports no server code.

import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scryptCallback);
const N = 16384;
const r = 8;
const p = 1;
const KEY_LENGTH = 64;

const token = randomBytes(32).toString('base64url');
const salt = randomBytes(16);
const derived = await scryptAsync(token, salt, KEY_LENGTH, { N, r, p });
const hash = `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${derived.toString('base64')}`;

console.log('================================================================');
console.log('OWNER ACTIVATION TOKEN — GENERATED ONCE, NEVER SHOWN AGAIN');
console.log('================================================================');
console.log('');
console.log('Save the token below in a password manager RIGHT NOW.');
console.log('This script does NOT write it to any file, and nobody can');
console.log('recover it from the hash. If you lose it, generate a new one.');
console.log('Never paste the token or the hash into chat, email, a ticket,');
console.log('a screenshot, terminal output you share, or a commit.');
console.log('');
console.log('--- Activation token (save this, use it once to activate) ---');
console.log(token);
console.log('');
console.log('--- Set these two server env vars (Hostinger env / .env.local) ---');
console.log('AENURAL_OWNER_EMAIL=<the real owner email address, not owner@aenural.com>');
console.log(`AENURAL_OWNER_ACTIVATION_TOKEN_HASH=${hash}`);
console.log('');
console.log('After a successful activation, ROTATE again (run this script');
console.log('again and replace the env var) so the used token is dead — see');
console.log('docs/authentication/owner-activation-rotation.md §2.');
console.log('The old committed SHA-256 hash is compromised: do not reuse');
console.log('any token whose hash was ever committed to the repo.');
