-- Fresh, dedicated AENural database only. Review before importing.
-- Better Auth 1.7.14 generated schema plus application tables.
-- No DROP, data reset or remote connection is performed by the generator.
-- All CREATE TABLE statements use IF NOT EXISTS and all indexes are
-- created only when missing, so re-importing this file is a no-op.
SET NAMES utf8mb4;

create table if not exists `user` (`id` varchar(36) not null primary key, `name` varchar(255) not null, `email` varchar(255) not null unique, `emailVerified` boolean not null, `image` text, `createdAt` timestamp(3) default CURRENT_TIMESTAMP(3) not null, `updatedAt` timestamp(3) default CURRENT_TIMESTAMP(3) not null);

create table if not exists `session` (`id` varchar(36) not null primary key, `expiresAt` timestamp(3) not null, `token` varchar(255) not null unique, `createdAt` timestamp(3) default CURRENT_TIMESTAMP(3) not null, `updatedAt` timestamp(3) not null, `ipAddress` text, `userAgent` text, `userId` varchar(36) not null, constraint `session_userId_fk` foreign key (`userId`) references `user` (`id`) on delete cascade);

create table if not exists `account` (`id` varchar(36) not null primary key, `accountId` text not null, `providerId` text not null, `userId` varchar(36) not null, `accessToken` text, `refreshToken` text, `idToken` text, `accessTokenExpiresAt` timestamp(3), `refreshTokenExpiresAt` timestamp(3), `scope` text, `password` text, `createdAt` timestamp(3) default CURRENT_TIMESTAMP(3) not null, `updatedAt` timestamp(3) not null, constraint `account_userId_fk` foreign key (`userId`) references `user` (`id`) on delete cascade);

create table if not exists `verification` (`id` varchar(36) not null primary key, `identifier` varchar(255) not null, `value` text not null, `expiresAt` timestamp(3) not null, `createdAt` timestamp(3) default CURRENT_TIMESTAMP(3) not null, `updatedAt` timestamp(3) default CURRENT_TIMESTAMP(3) not null);

create table if not exists `rateLimit` (`id` varchar(36) not null primary key, `key` varchar(255) not null unique, `count` integer not null, `lastRequest` bigint not null);

-- Index session_userId_idx on session (`userId`): created only when missing (MySQL has no CREATE INDEX IF NOT EXISTS).
SET @aenural_idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'session' AND INDEX_NAME = 'session_userId_idx');
SET @aenural_idx_sql := IF(@aenural_idx_exists = 0, 'CREATE INDEX `session_userId_idx` ON `session` (`userId`)', 'SELECT 1');
PREPARE aenural_idx_stmt FROM @aenural_idx_sql;
EXECUTE aenural_idx_stmt;
DEALLOCATE PREPARE aenural_idx_stmt;

-- Index account_userId_idx on account (`userId`): created only when missing (MySQL has no CREATE INDEX IF NOT EXISTS).
SET @aenural_idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'account' AND INDEX_NAME = 'account_userId_idx');
SET @aenural_idx_sql := IF(@aenural_idx_exists = 0, 'CREATE INDEX `account_userId_idx` ON `account` (`userId`)', 'SELECT 1');
PREPARE aenural_idx_stmt FROM @aenural_idx_sql;
EXECUTE aenural_idx_stmt;
DEALLOCATE PREPARE aenural_idx_stmt;

-- Index verification_identifier_idx on verification (`identifier`): created only when missing (MySQL has no CREATE INDEX IF NOT EXISTS).
SET @aenural_idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'verification' AND INDEX_NAME = 'verification_identifier_idx');
SET @aenural_idx_sql := IF(@aenural_idx_exists = 0, 'CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`)', 'SELECT 1');
PREPARE aenural_idx_stmt FROM @aenural_idx_sql;
EXECUTE aenural_idx_stmt;
DEALLOCATE PREPARE aenural_idx_stmt;

create table if not exists `aenural_operation_limits` (`id` varchar(128) primary key, `owner_id` varchar(36) not null, `used` integer default 0 not null, `expires_at` varchar(32) not null, constraint `aenural_operation_limits_owner_id_fk` foreign key (`owner_id`) references `user` (`id`) on delete cascade);

create table if not exists `aenural_orders` (`id` varchar(128) primary key, `owner_id` varchar(36) not null, `provider` varchar(32) not null, `provider_order_id` varchar(128) not null, `status` varchar(20) not null, `amount_minor` integer not null, `currency` varchar(3) not null, `test_mode` integer not null, `provider_updated_at` varchar(32) not null, `created_at` varchar(32) not null, constraint `aenural_orders_provider_unique` unique (`provider`, `provider_order_id`, `test_mode`), constraint `aenural_orders_owner_id_fk` foreign key (`owner_id`) references `user` (`id`) on delete cascade);

create table if not exists `aenural_checkouts` (`id` varchar(36) primary key, `owner_id` varchar(36) not null, `provider_id` varchar(128), `created_at` varchar(32) not null, constraint `aenural_checkouts_owner_id_fk` foreign key (`owner_id`) references `user` (`id`) on delete cascade);

create table if not exists `aenural_webhooks` (`id` varchar(64) primary key, `processed_at` varchar(32) not null);

create table if not exists `aenural_daily_usage` (`id` varchar(80) primary key, `owner_id` varchar(36) not null, `day` varchar(10) not null, `used` integer default 0 not null, constraint `aenural_daily_usage_owner_id_fk` foreign key (`owner_id`) references `user` (`id`) on delete cascade);

create table if not exists `aenural_caption_jobs` (`id` varchar(36) primary key, `owner_id` varchar(36) not null, `video_id` varchar(36) not null, `day` varchar(10) not null, `duration_ms` integer not null, `quality` varchar(16) not null, `status` varchar(16) not null, `created_at` varchar(32) not null, constraint `aenural_video_day_unique` unique (`owner_id`, `video_id`, `day`), constraint `aenural_caption_jobs_owner_id_fk` foreign key (`owner_id`) references `user` (`id`) on delete cascade);

create table if not exists `aenural_projects` (`id` varchar(36) primary key, `owner_id` varchar(36) not null, `title` varchar(100) not null, `payload` longtext not null, `revision` integer default 1 not null, `created_at` varchar(32) not null, `updated_at` varchar(32) not null, constraint `aenural_projects_owner_id_fk` foreign key (`owner_id`) references `user` (`id`) on delete cascade);

create table if not exists `aenural_activity` (`id` varchar(36) primary key, `owner_id` varchar(36) not null, `action` varchar(24) not null, `project_id` varchar(36), `created_at` varchar(32) not null, constraint `aenural_activity_owner_id_fk` foreign key (`owner_id`) references `user` (`id`) on delete cascade);

create table if not exists `aenural_email_delivery_attempts` (`id` varchar(36) primary key, `email` varchar(255) not null, `kind` varchar(24) not null, `status` varchar(16) not null, `error_code` varchar(64), `attempted_at` varchar(32) not null);

-- Index aenural_orders_owner_idx on aenural_orders (`owner_id`, `test_mode`): created only when missing (MySQL has no CREATE INDEX IF NOT EXISTS).
SET @aenural_idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'aenural_orders' AND INDEX_NAME = 'aenural_orders_owner_idx');
SET @aenural_idx_sql := IF(@aenural_idx_exists = 0, 'CREATE INDEX `aenural_orders_owner_idx` ON `aenural_orders` (`owner_id`, `test_mode`)', 'SELECT 1');
PREPARE aenural_idx_stmt FROM @aenural_idx_sql;
EXECUTE aenural_idx_stmt;
DEALLOCATE PREPARE aenural_idx_stmt;

-- Index aenural_projects_owner_idx on aenural_projects (`owner_id`, `updated_at`): created only when missing (MySQL has no CREATE INDEX IF NOT EXISTS).
SET @aenural_idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'aenural_projects' AND INDEX_NAME = 'aenural_projects_owner_idx');
SET @aenural_idx_sql := IF(@aenural_idx_exists = 0, 'CREATE INDEX `aenural_projects_owner_idx` ON `aenural_projects` (`owner_id`, `updated_at`)', 'SELECT 1');
PREPARE aenural_idx_stmt FROM @aenural_idx_sql;
EXECUTE aenural_idx_stmt;
DEALLOCATE PREPARE aenural_idx_stmt;

-- Index aenural_activity_owner_idx on aenural_activity (`owner_id`, `created_at`): created only when missing (MySQL has no CREATE INDEX IF NOT EXISTS).
SET @aenural_idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'aenural_activity' AND INDEX_NAME = 'aenural_activity_owner_idx');
SET @aenural_idx_sql := IF(@aenural_idx_exists = 0, 'CREATE INDEX `aenural_activity_owner_idx` ON `aenural_activity` (`owner_id`, `created_at`)', 'SELECT 1');
PREPARE aenural_idx_stmt FROM @aenural_idx_sql;
EXECUTE aenural_idx_stmt;
DEALLOCATE PREPARE aenural_idx_stmt;

-- Index aenural_checkouts_owner_idx on aenural_checkouts (`owner_id`, `created_at`): created only when missing (MySQL has no CREATE INDEX IF NOT EXISTS).
SET @aenural_idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'aenural_checkouts' AND INDEX_NAME = 'aenural_checkouts_owner_idx');
SET @aenural_idx_sql := IF(@aenural_idx_exists = 0, 'CREATE INDEX `aenural_checkouts_owner_idx` ON `aenural_checkouts` (`owner_id`, `created_at`)', 'SELECT 1');
PREPARE aenural_idx_stmt FROM @aenural_idx_sql;
EXECUTE aenural_idx_stmt;
DEALLOCATE PREPARE aenural_idx_stmt;

-- Index aenural_email_delivery_attempts_email_idx on aenural_email_delivery_attempts (`email`, `kind`, `attempted_at`): created only when missing (MySQL has no CREATE INDEX IF NOT EXISTS).
SET @aenural_idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'aenural_email_delivery_attempts' AND INDEX_NAME = 'aenural_email_delivery_attempts_email_idx');
SET @aenural_idx_sql := IF(@aenural_idx_exists = 0, 'CREATE INDEX `aenural_email_delivery_attempts_email_idx` ON `aenural_email_delivery_attempts` (`email`, `kind`, `attempted_at`)', 'SELECT 1');
PREPARE aenural_idx_stmt FROM @aenural_idx_sql;
EXECUTE aenural_idx_stmt;
DEALLOCATE PREPARE aenural_idx_stmt;
