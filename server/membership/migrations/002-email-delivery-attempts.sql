-- AENural migration 002 — durable email-delivery audit (Phase 4).
--
-- Apply AFTER 001-initial-mysql.sql, to the SAME database, only once
-- per database. Safe to run more than once: CREATE TABLE IF NOT EXISTS
-- with all indexes defined inline, so a re-run is a no-op.
--
-- Additive only: no DROP, no ALTER of any existing table, no data
-- deletion, no change to any Better Auth or application table.
-- Review before importing, as with 001.
--
-- What it adds: one append-only audit row per email send attempt
-- (OTP verification codes and password-reset mail), recording only
-- the recipient, the kind, the outcome and the transport error code.
-- It NEVER stores OTP values, reset tokens/URLs, message subjects or
-- bodies, passwords, or credentials. The recipient email is already
-- stored in the `user` table; this table adds no new PII surface and
-- is never serialised into any HTTP response or log line.
--
-- Column types match server/membership/schema.mjs exactly (and the
-- regenerated 001): attempted_at is varchar(32) holding the UTC
-- 'YYYY-MM-DD HH:mm:ss.SSS' string produced by toDbTimestamp() in
-- email-delivery.mjs, the same convention the other application
-- tables use for timestamps. Lexicographic order is chronological
-- order, and no timezone conversion is applied on either engine.
--
-- Fresh databases do NOT need this file separately: the next
-- `npm run membership:prepare-mysql` regeneration of
-- 001-initial-mysql.sql includes the same table (it is generated from
-- server/membership/schema.mjs), and importing that regenerated 001
-- creates it. This file exists for databases that already imported
-- the current 001.
--
-- Apply (example — use the dev database, never production, until the
-- production checklist explicitly approves it):
--   mysql --host=127.0.0.1 --port=3306 --user=<db-user> -p <db-name> \
--     < server/membership/migrations/002-email-delivery-attempts.sql
-- Verify:
--   SHOW CREATE TABLE aenural_email_delivery_attempts;
--   SELECT COUNT(*) FROM aenural_email_delivery_attempts;
SET NAMES utf8mb4;

create table if not exists `aenural_email_delivery_attempts` (
  `id` varchar(36) not null primary key,
  `email` varchar(255) not null,
  `kind` varchar(24) not null,
  `status` varchar(16) not null,
  `error_code` varchar(64),
  `attempted_at` varchar(32) not null,
  key `aenural_email_delivery_attempts_email_idx` (`email`, `kind`, `attempted_at`)
);
