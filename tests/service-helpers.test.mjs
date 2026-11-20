// Pure tests for the membership service helpers (Phase 4 audit).
// No better-auth/kysely/mysql2 needed: service.mjs imports only the
// caption policy (type-stripped by Node 24), and ensureGuest is tested
// against a duck-typed fake Kysely db.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dbTimestamp, isUniqueViolation } from '../server/membership/service.mjs';
import { ensureGuest } from '../server/membership/guest.mjs';

describe('dbTimestamp', () => {
  it('formats UTC as YYYY-MM-DD HH:MM:SS.mmm', () => {
    assert.equal(dbTimestamp(0), '1970-01-01 00:00:00.000');
    assert.match(dbTimestamp(), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
    // A known instant: 2026-11-19T07:11:18.967Z.
    assert.equal(dbTimestamp(Date.parse('2026-11-19T07:11:18.967Z')), '2026-11-19 07:11:18.967');
  });
  it('is a string, never a number or Date (both engines must bind it)', () => {
    const value = dbTimestamp();
    assert.equal(typeof value, 'string');
    assert.notEqual(typeof value, 'number');
    assert.equal(value instanceof Date, false);
  });
});

describe('isUniqueViolation', () => {
  it('recognises MySQL duplicate-key errors', () => {
    assert.equal(isUniqueViolation({ code: 'ER_DUP_ENTRY', message: "Duplicate entry 'x' for key 'aenural_caption_jobs.aenural_video_day_unique'" }), true);
  });
  it('recognises SQLite unique-constraint errors', () => {
    assert.equal(isUniqueViolation({ code: 'ERR_SQLITE_ERROR', message: 'UNIQUE constraint failed: aenural_caption_jobs.owner_id, aenural_caption_jobs.video_id, aenural_caption_jobs.day' }), true);
    assert.equal(isUniqueViolation({ code: 'SQLITE_CONSTRAINT_UNIQUE', message: 'UNIQUE constraint failed' }), true);
  });
  it('rejects unrelated errors and empty values', () => {
    assert.equal(isUniqueViolation({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' }), false);
    assert.equal(isUniqueViolation({ code: 'ER_ACCESS_DENIED_ERROR', message: 'Access denied' }), false);
    assert.equal(isUniqueViolation(null), false);
    assert.equal(isUniqueViolation(undefined), false);
    assert.equal(isUniqueViolation({}), false);
  });
});

describe('ensureGuest (MySQL-safe timestamps)', () => {
  it('writes createdAt/updatedAt as dbTimestamp strings, not epoch numbers', async () => {
    let captured;
    const fakeDb = {
      insertInto: () => ({
        values: (row) => {
          captured = row;
          return { onConflict: () => ({ execute: async () => {} }) };
        },
      }),
    };
    await ensureGuest(fakeDb, 'g0123456789abcdef0123456789abcdef');
    assert.equal(captured.id, 'g0123456789abcdef0123456789abcdef');
    assert.equal(captured.email, 'g0123456789abcdef0123456789abcdef@guest.invalid');
    assert.equal(captured.emailVerified, 0);
    assert.match(captured.createdAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
    assert.equal(captured.createdAt, captured.updatedAt);
  });
});
